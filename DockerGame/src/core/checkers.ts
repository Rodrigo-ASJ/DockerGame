import { parseDockerfile } from './dockerfile'
import type {
  CommandErrorCode,
  CommandLogEntry,
  DockerfileInstructionKind,
  StepChecker,
  StepCheckContext,
} from './types'
import { formatSize, getImageSizeKb } from './images'

export const STEP_IDS = {
  emptyList: 'empty-list',
  createContainer: 'create-container',
  listContainer: 'list-container',
  duplicateName: 'duplicate-name',
  missingImage: 'missing-image',
  correctAndList: 'correct-and-list',
} as const

export type LessonStepId = (typeof STEP_IDS)[keyof typeof STEP_IDS]

function isSuccessfulRun(
  entry: CommandLogEntry,
  name: string,
  image: string,
): boolean {
  return (
    entry.ok &&
    entry.command?.kind === 'run' &&
    entry.command.name === name &&
    entry.command.image === image
  )
}

function findSuccessfulRun(
  log: readonly CommandLogEntry[],
  name: string,
  image: string,
): number {
  return log.findIndex((entry) => isSuccessfulRun(entry, name, image))
}

function hasSuccessfulListAfter(
  log: readonly CommandLogEntry[],
  index: number,
  minimumContainerCount: number,
): boolean {
  return log.some(
    (entry, entryIndex) =>
      entryIndex > index &&
      entry.ok &&
      entry.command?.kind === 'ps' &&
      entry.containerCountBefore >= minimumContainerCount,
  )
}

function hasError(
  log: readonly CommandLogEntry[],
  code: string,
  name: string,
): boolean {
  return log.some(
    (entry) =>
      !entry.ok &&
      entry.error?.code === code &&
      entry.command?.kind === 'run' &&
      entry.command.name === name,
  )
}

export const checkEmptyList: StepChecker = ({ log }) =>
  log.some(
    (entry) =>
      entry.ok &&
      entry.command?.kind === 'ps' &&
      entry.containerCountBefore === 0,
  )

export const checkCreateContainer: StepChecker = ({ state }) =>
  state.containers.some(
    (container) =>
      container.name === 'web' &&
      container.image === 'nginx' &&
      container.status === 'running',
  )

export const checkListContainer: StepChecker = ({ state, log }) => {
  const hasWeb = state.containers.some(
    (container) => container.name === 'web' && container.status === 'running',
  )

  if (!hasWeb) {
    return false
  }

  const creationIndex = findSuccessfulRun(log, 'web', 'nginx')
  return creationIndex >= 0 && hasSuccessfulListAfter(log, creationIndex, 1)
}

export const checkDuplicateName: StepChecker = ({ state, log }) => {
  const hasOnlyOneWeb =
    state.containers.filter((container) => container.name === 'web').length === 1

  return hasOnlyOneWeb && hasError(log, 'duplicate-name', 'web')
}

export const checkMissingImage: StepChecker = ({ log }) =>
  hasError(log, 'image-not-found', 'web2')

export const checkCorrectAndList: StepChecker = ({ state, log }) => {
  const hasWeb = state.containers.some(
    (container) =>
      container.name === 'web' &&
      container.image === 'nginx' &&
      container.status === 'running',
  )
  const hasWeb2 = state.containers.some(
    (container) =>
      container.name === 'web2' &&
      container.image === 'nginx' &&
      container.status === 'running',
  )

  if (!hasWeb || !hasWeb2) {
    return false
  }

  const web2CreationIndex = findSuccessfulRun(log, 'web2', 'nginx')
  return (
    web2CreationIndex >= 0 &&
    hasSuccessfulListAfter(log, web2CreationIndex, 2)
  )
}

export const stepCheckers: Record<LessonStepId, StepChecker> = {
  [STEP_IDS.emptyList]: checkEmptyList,
  [STEP_IDS.createContainer]: checkCreateContainer,
  [STEP_IDS.listContainer]: checkListContainer,
  [STEP_IDS.duplicateName]: checkDuplicateName,
  [STEP_IDS.missingImage]: checkMissingImage,
  [STEP_IDS.correctAndList]: checkCorrectAndList,
}

export function checkStep(
  stepId: LessonStepId,
  context: StepCheckContext,
): boolean {
  return stepCheckers[stepId](context)
}

// ── Checkers de nivel 2 ──────────────────────────────────────────────

export const checkImagesListed: StepChecker = ({ state, log }) =>
  state.images.length >= 2 &&
  log.some((entry) => entry.ok && entry.command?.kind === 'images')

export function checkHistorySelected(reference: string): StepChecker {
  return ({ state, log }) => {
    const image = state.images.find((img) => img.reference === reference)
    const hasHistoryEntry = log.some(
      (entry) =>
        entry.ok &&
        entry.command?.kind === 'history' &&
        entry.command.image === reference,
    )

    return (
      image !== undefined &&
      state.selectedImage === reference &&
      image.layers.length === 3 &&
      hasHistoryEntry
    )
  }
}

export function checkHistoryError(code: string): StepChecker {
  return ({ state, log }) =>
    log.some(
      (entry) =>
        !entry.ok &&
        entry.command?.kind === 'history' &&
        entry.error?.code === code,
    ) && state.selectedImage !== null
}

export function checkContainer(name: string, image: string): StepChecker {
  return ({ state }) =>
    state.containers.some(
      (container) =>
        container.name === name &&
        container.image === image &&
        container.status === 'running',
    )
}

export function checkContainerWithCommand(
  name: string,
  image: string,
): StepChecker {
  return ({ state }) => {
    const container = state.containers.find((c) => c.name === name)
    const imageObj = state.images.find((img) => img.reference === image)

    return (
      container !== undefined &&
      container.status === 'running' &&
      container.image === image &&
      imageObj !== undefined &&
      container.command !== undefined &&
      container.command.length === imageObj.startCommand.final.length &&
      container.command.every((cmd, index) => cmd === imageObj.startCommand.final[index])
    )
  }
}

export const checkDockerfileFromAndWorkdir: StepChecker = ({
  dockerfile,
}) => {
  if (!dockerfile) {
    return false
  }

  const parsed = parseDockerfile(dockerfile)

  if (!parsed.ok) {
    return false
  }

  const instructions = parsed.instructions

  return (
    instructions.length >= 2 &&
    instructions[0]?.kind === 'FROM' &&
    instructions[0]?.args[0] === 'nginx:latest' &&
    instructions[1]?.kind === 'WORKDIR' &&
    instructions[1]?.args[0] === '/usr/share/nginx/html'
  )
}

export const checkDockerfileCopies: StepChecker = ({ dockerfile }) => {
  if (!dockerfile) {
    return false
  }

  const parsed = parseDockerfile(dockerfile)

  if (!parsed.ok) {
    return false
  }

  const copies = parsed.instructions.filter((instruction) => instruction.kind === 'COPY')
  const sources = copies.map((copy) => copy.args[0]).filter(Boolean)

  return (
    copies.length === 3 &&
    copies.every((copy) => copy.args.length === 2) &&
    sources.includes('index.html') &&
    sources.includes('app.js') &&
    sources.includes('styles.css')
  )
}

export const checkDockerfileRunAndCmd: StepChecker = ({ dockerfile }) => {
  if (!dockerfile) {
    return false
  }

  const parsed = parseDockerfile(dockerfile)

  if (!parsed.ok) {
    return false
  }

  const instructions = parsed.instructions

  return (
    instructions.some((instruction) => instruction.kind === 'RUN') &&
    instructions.some((instruction) => instruction.kind === 'CMD')
  )
}

export function checkBuiltImage(
  reference: string,
  expectedKinds: readonly DockerfileInstructionKind[],
  options?: { readonly base?: string; readonly size?: string },
): StepChecker {
  return ({ state }) => {
    const image = state.images.find((img) => img.reference === reference)

    if (!image || image.origin !== 'built') {
      return false
    }

    if (state.selectedImage !== reference) {
      return false
    }

    if (options?.base !== undefined && image.baseReference !== options.base) {
      return false
    }

    const layerKinds = image.layers.map((layer) => layer.instruction)

    const allKindsPresent = expectedKinds.every((kind) =>
      layerKinds.includes(kind),
    )

    const sizeOk =
      options?.size === undefined ||
      formatSize(getImageSizeKb(image)) === options.size

    return allKindsPresent && sizeOk
  }
}

export function checkBuildError(
  code: CommandErrorCode,
  reference: string,
): StepChecker {
  return ({ state, log }) => {
    const failedBuildLog = log.some(
      (entry) =>
        !entry.ok &&
        entry.command?.kind === 'build' &&
        entry.command?.reference === reference &&
        entry.error?.code === code,
    )
    const failedAttempt = state.builds.some(
      (build) => build.reference === reference && build.ok === false,
    )

    return failedBuildLog && failedAttempt
  }
}

export function checkFailedImageRun(
  reference: string,
  containerName: string,
): StepChecker {
  return ({ state, log }) => {
    const failedAttempt = state.builds.some(
      (build) => build.reference === reference && build.ok === false,
    )
    const runFailed = log.some(
      (entry) =>
        !entry.ok &&
        entry.command?.kind === 'run' &&
        entry.command.name === containerName &&
        entry.error?.code === 'image-build-failed',
    )
    const containerExists = state.containers.some(
      (container) => container.name === containerName,
    )

    return failedAttempt && runFailed && !containerExists
  }
}

export function checkRecoveredImage(
  reference: string,
  containerName: string,
): StepChecker {
  return ({ state }) => {
    const image = state.images.find((img) => img.reference === reference)
    const container = state.containers.find((c) => c.name === containerName)

    return (
      image !== undefined &&
      image.origin === 'built' &&
      container !== undefined &&
      container.status === 'running' &&
      container.image === reference
    )
  }
}

export function checkAllLayersCached(reference: string): StepChecker {
  return ({ state }) => {
    const image = state.images.find((img) => img.reference === reference)

    if (!image || image.origin !== 'built') {
      return false
    }

    return (
      image.layers.length > 0 &&
      image.layers.every((layer) => layer.fromCache === true)
    )
  }
}

export function checkPartialCache(reference: string): StepChecker {
  return ({ state }) => {
    const image = state.images.find((img) => img.reference === reference)

    if (!image || image.origin !== 'built') {
      return false
    }

    const cached = image.layers.filter((layer) => layer.fromCache === true)
    const rebuilt = image.layers.filter((layer) => layer.fromCache === false)

    return cached.length > 0 && rebuilt.length > 0
  }
}

export function checkComparison(
  baselineReference: string,
  optimizedReference: string,
): StepChecker {
  return ({ state }) => {
    const baseline = state.images.find(
      (img) => img.reference === baselineReference,
    )
    const optimized = state.images.find(
      (img) => img.reference === optimizedReference,
    )

    if (!baseline || !optimized) {
      return false
    }

    const baselineSize = getImageSizeKb(baseline)
    const optimizedSize = getImageSizeKb(optimized)

    return (
      formatSize(baselineSize) === '187 MB' &&
      formatSize(optimizedSize) === '43 MB' &&
      baselineSize > optimizedSize
    )
  }
}

export const checkDockerfileEntrypointAndCmd: StepChecker = ({
  dockerfile,
}) => {
  if (!dockerfile) {
    return false
  }

  const parsed = parseDockerfile(dockerfile)

  if (!parsed.ok) {
    return false
  }

  const hasEntrypoint = parsed.instructions.some(
    (instruction) => instruction.kind === 'ENTRYPOINT',
  )
  const hasCmd = parsed.instructions.some(
    (instruction) => instruction.kind === 'CMD',
  )

  return hasEntrypoint && hasCmd
}
