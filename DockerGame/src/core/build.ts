import { parseDockerfile } from './dockerfile'
import { formatSize, getImageSizeKb, parseImageReference } from './images'
import type {
  BuildAttempt,
  CommandError,
  CommandErrorCode,
  DockerfileInstruction,
  Image,
  ImageLayer,
  ProjectFile,
  SimState,
  StartCommand,
} from './types'

export type BuildImageResult = {
  readonly ok: boolean
  readonly lines: readonly string[]
  readonly state: SimState
  readonly error: CommandError | null
}

type BuildRequestMetadata = {
  readonly repository: string
  readonly tag: string
  readonly reference: string
}

function commandError(
  code: CommandErrorCode,
  message: string,
): CommandError {
  return { code, message }
}

export function formatCommandDisplay(command: readonly string[]): string {
  return command
    .map((argument) => (/\s/.test(argument) ? `"${argument}"` : argument))
    .join(' ')
}

function lastInstruction(
  instructions: readonly DockerfileInstruction[],
  kind: 'CMD' | 'ENTRYPOINT',
): DockerfileInstruction | undefined {
  for (let index = instructions.length - 1; index >= 0; index -= 1) {
    const instruction = instructions[index]

    if (instruction?.kind === kind) {
      return instruction
    }
  }

  return undefined
}

export function resolveStartCommand(
  instructions: readonly DockerfileInstruction[],
): StartCommand | null {
  const entrypointInstruction = lastInstruction(instructions, 'ENTRYPOINT')
  const cmdInstruction = lastInstruction(instructions, 'CMD')

  if (entrypointInstruction === undefined && cmdInstruction === undefined) {
    return null
  }

  const entrypoint = entrypointInstruction?.args ?? null
  const cmd = cmdInstruction?.args ?? null
  const entrypointForm = entrypointInstruction?.form ?? null
  const cmdForm = cmdInstruction?.form ?? null

  let final: readonly string[]

  if (entrypointInstruction !== undefined) {
    if (entrypointForm === 'shell') {
      final = ['/bin/sh', '-c', entrypoint?.[0] ?? '']
    } else if (cmdInstruction === undefined) {
      final = entrypoint ?? []
    } else if (cmdForm === 'shell') {
      final = [
        ...(entrypoint ?? []),
        '/bin/sh',
        '-c',
        cmd?.[0] ?? '',
      ]
    } else {
      final = [...(entrypoint ?? []), ...(cmd ?? [])]
    }
  } else if (cmdForm === 'shell') {
    final = ['/bin/sh', '-c', cmd?.[0] ?? '']
  } else {
    final = cmd ?? []
  }

  return {
    entrypoint,
    cmd,
    entrypointForm,
    cmdForm,
    final,
    display: formatCommandDisplay(final),
  }
}

function requestMetadata(reference: string): BuildRequestMetadata {
  const parsed = parseImageReference(reference)

  if (parsed.ok) {
    return {
      repository: parsed.repository,
      tag: parsed.tag,
      reference: parsed.reference,
    }
  }

  const separator = reference.indexOf(':')

  if (separator === -1) {
    return { repository: reference, tag: 'latest', reference }
  }

  return {
    repository: reference.slice(0, separator),
    tag: reference.slice(separator + 1),
    reference,
  }
}

function failedBuild(
  state: SimState,
  dockerfile: string,
  metadata: BuildRequestMetadata,
  error: CommandError,
): BuildImageResult {
  const attempt: BuildAttempt = {
    id: `build-${state.nextBuildNumber}`,
    dockerfile,
    repository: metadata.repository,
    tag: metadata.tag,
    reference: metadata.reference,
    ok: false,
    error,
    imageId: null,
    cacheKeys: [],
    cacheHits: 0,
    cacheMisses: 0,
  }

  return {
    ok: false,
    lines: [error.message],
    error,
    state: {
      ...state,
      builds: [...state.builds, attempt],
      lastError: error,
      nextBuildNumber: state.nextBuildNumber + 1,
    },
  }
}

function normalizedLabel(instruction: DockerfileInstruction): string {
  return instruction.raw.replace(/^\S+/, instruction.kind)
}

function cacheKeyFor(
  instruction: DockerfileInstruction,
  sizeKb: number,
): string {
  switch (instruction.kind) {
    case 'FROM':
      return `FROM:${instruction.args[0] ?? ''}`
    case 'WORKDIR':
      return `WORKDIR:${instruction.args[0] ?? ''}`
    case 'COPY':
      return `COPY:${instruction.args[0] ?? ''}:${instruction.args[1] ?? ''}:${sizeKb}`
    case 'RUN':
      return `RUN:${instruction.args[0] ?? ''}`
    case 'CMD':
    case 'ENTRYPOINT':
      return `${instruction.kind}:${instruction.form ?? 'shell'}:${instruction.args.join(' ')}`
  }
}

function findProjectFile(
  projectFiles: readonly ProjectFile[],
  path: string,
): ProjectFile | undefined {
  return projectFiles.find((file) => file.path === path)
}

function instructionSizeKb(
  instruction: DockerfileInstruction,
  projectFiles: readonly ProjectFile[],
): number {
  if (instruction.kind === 'COPY') {
    return findProjectFile(projectFiles, instruction.args[0] ?? '')?.sizeKb ?? 1
  }

  return 1
}

function buildLayers(
  baseImage: Image,
  instructions: readonly DockerfileInstruction[],
  projectFiles: readonly ProjectFile[],
  imageId: string,
  previousCacheKeys: readonly string[] | null,
): readonly ImageLayer[] {
  const baseLayers = baseImage.layers.map((layer) => ({
    ...layer,
    fromCache: false,
  }))
  const instructionLayers: ImageLayer[] = []
  let layerNumber = 1

  for (const instruction of instructions) {
    if (instruction.kind === 'FROM') {
      continue
    }

    const sizeKb = instructionSizeKb(instruction, projectFiles)

    instructionLayers.push({
      id: `${imageId}-layer-${layerNumber}`,
      instruction: instruction.kind,
      label: normalizedLabel(instruction),
      sizeKb,
      cacheKey: cacheKeyFor(instruction, sizeKb),
      fromCache: false,
    })
    layerNumber += 1
  }

  return markCachedLayers([...baseLayers, ...instructionLayers], previousCacheKeys)
}

function markCachedLayers(
  layers: readonly ImageLayer[],
  previousCacheKeys: readonly string[] | null,
): ImageLayer[] {
  let stillCached = previousCacheKeys !== null

  return layers.map((layer, index) => {
    const previousKey =
      previousCacheKeys === null ? undefined : previousCacheKeys[index]
    const cached =
      stillCached && previousKey !== undefined && layer.cacheKey === previousKey

    if (!cached) {
      stillCached = false
    }

    return { ...layer, fromCache: cached }
  })
}

function isFailingRun(command: string): boolean {
  const normalized = command.toLowerCase()

  return normalized === 'false' || normalized === 'exit 1'
}

function buildOutputLines(
  image: Image,
  baseImage: Image,
): readonly string[] {
  const instructionLayers = image.layers.slice(baseImage.layers.length)
  const lines = [
    `FROM ${baseImage.reference} (${formatSize(getImageSizeKb(baseImage))})`,
    ...instructionLayers.map(
      (layer) =>
        `${layer.label} (${formatSize(layer.sizeKb)})${layer.fromCache ? ' [caché]' : ''}`,
    ),
  ]

  lines.push(`Successfully tagged ${image.reference}`)
  lines.push(`Tamaño total: ${formatSize(getImageSizeKb(image))}`)
  lines.push(`Comando de arranque: ${image.startCommand.display}`)

  return lines
}

export function buildImage(
  state: SimState,
  reference: string,
  dockerfile: string,
): BuildImageResult {
  const metadata = requestMetadata(reference)
  const parsed = parseDockerfile(dockerfile)

  if (!parsed.ok) {
    return failedBuild(state, dockerfile, metadata, parsed.error)
  }

  const instructions = parsed.instructions

  if (instructions.length === 0) {
    return failedBuild(
      state,
      dockerfile,
      metadata,
      commandError(
        'missing-from',
        'FROM es obligatorio: el Dockerfile no contiene ninguna imagen base.',
      ),
    )
  }

  const fromInstruction = instructions.find(
    (instruction) => instruction.kind === 'FROM',
  )

  if (fromInstruction === undefined) {
    return failedBuild(
      state,
      dockerfile,
      metadata,
      commandError(
        'missing-from',
        'FROM es obligatorio: el Dockerfile no contiene ninguna imagen base.',
      ),
    )
  }

  if (instructions[0]?.kind !== 'FROM') {
    return failedBuild(
      state,
      dockerfile,
      metadata,
      commandError(
        'from-not-first',
        `FROM debe ser la primera instrucción del Dockerfile (línea ${instructions[0]?.line}).`,
      ),
    )
  }

  const fromInstructions = instructions.filter(
    (instruction) => instruction.kind === 'FROM',
  )

  if (fromInstructions.length > 1) {
    return failedBuild(
      state,
      dockerfile,
      metadata,
      commandError(
        'multiple-from',
        `Solo se admite un FROM por Dockerfile (línea ${fromInstructions[1]?.line}).`,
      ),
    )
  }

  const baseReference = fromInstruction.args[0] ?? ''
  const parsedBaseReference = parseImageReference(baseReference)
  const baseImage = parsedBaseReference.ok
    ? state.images.find(
        (image) =>
          image.reference === parsedBaseReference.reference &&
          image.origin === 'base',
      )
    : undefined

  if (baseImage === undefined) {
    return failedBuild(
      state,
      dockerfile,
      metadata,
      commandError(
        'base-image-not-found',
        `No existe la imagen base "${baseReference}" en el catálogo de esta lección.`,
      ),
    )
  }

  for (const instruction of instructions) {
    if (instruction.kind !== 'COPY') {
      continue
    }

    const source = instruction.args[0] ?? ''
    const destination = instruction.args[1] ?? ''

    if (
      destination.length === 0 ||
      findProjectFile(state.projectFiles, source) === undefined
    ) {
      return failedBuild(
        state,
        dockerfile,
        metadata,
        commandError(
          'copy-source-not-found',
          `No existe el archivo "${source}" en el proyecto simulado. Revisa la ruta de COPY (línea ${instruction.line}).`,
        ),
      )
    }
  }

  for (const instruction of instructions) {
    if (instruction.kind !== 'RUN') {
      continue
    }

    const command = instruction.args[0] ?? ''

    if (isFailingRun(command)) {
      return failedBuild(
        state,
        dockerfile,
        metadata,
        commandError(
          'run-failed',
          `La instrucción RUN ${command} falló (línea ${instruction.line}): el comando terminó con código 1.`,
        ),
      )
    }
  }

  const startCommand = resolveStartCommand(instructions)

  if (startCommand === null) {
    return failedBuild(
      state,
      dockerfile,
      metadata,
      commandError(
        'missing-start-command',
        'Falta CMD o ENTRYPOINT: la imagen necesita una instrucción de arranque.',
      ),
    )
  }

  const targetReference = parseImageReference(reference)

  if (!targetReference.ok) {
    return failedBuild(state, dockerfile, metadata, targetReference.error)
  }

  if (
    state.images.some(
      (image) => image.reference === targetReference.reference,
    )
  ) {
    return failedBuild(
      state,
      dockerfile,
      metadata,
      commandError(
        'duplicate-image-tag',
        `Ya existe una imagen "${targetReference.reference}". Usa otro nombre o tag.`,
      ),
    )
  }

  const lastSuccessfulBuild = state.builds.filter((build) => build.ok).pop()
  const previousCacheKeys =
    lastSuccessfulBuild === undefined ? null : lastSuccessfulBuild.cacheKeys
  const imageId = `image-${state.nextImageNumber}`
  const layers = buildLayers(
    baseImage,
    instructions,
    state.projectFiles,
    imageId,
    previousCacheKeys,
  )
  const cacheHits = layers.filter((layer) => layer.fromCache).length
  const image: Image = {
    id: imageId,
    repository: targetReference.repository,
    tag: targetReference.tag,
    reference: targetReference.reference,
    origin: 'built',
    baseReference: baseImage.reference,
    layers,
    startCommand,
  }
  const attempt: BuildAttempt = {
    id: `build-${state.nextBuildNumber}`,
    dockerfile,
    repository: image.repository,
    tag: image.tag,
    reference: image.reference,
    ok: true,
    error: null,
    imageId: image.id,
    cacheKeys: layers.map((layer) => layer.cacheKey),
    cacheHits,
    cacheMisses: layers.length - cacheHits,
  }

  return {
    ok: true,
    lines: buildOutputLines(image, baseImage),
    error: null,
    state: {
      ...state,
      images: [...state.images, image],
      builds: [...state.builds, attempt],
      selectedImage: image.reference,
      lastError: null,
      nextImageNumber: state.nextImageNumber + 1,
      nextBuildNumber: state.nextBuildNumber + 1,
    },
  }
}
