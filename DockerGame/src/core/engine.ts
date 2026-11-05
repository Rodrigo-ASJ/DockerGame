import { buildImage, formatCommandDisplay } from './build'
import { ALL_COMMANDS, DEFAULT_SUPPORTED_COMMANDS } from './commands'
import {
  formatHistoryTable,
  formatImagesTable,
  parseImageReference,
} from './images'
import { parseCommand } from './parser'
import type {
  BaseImage,
  CommandError,
  CommandLogEntry,
  CommandResult,
  Container,
  CreateInitialSimStateOptions,
  ExecuteOptions,
  Image,
  SimState,
  StartCommand,
} from './types'

const COMPATIBILITY_BASE_IMAGE: BaseImage = {
  id: 'nginx-latest',
  repository: 'nginx',
  tag: 'latest',
  reference: 'nginx:latest',
  layers: [],
  defaultCommand: ['/docker-entrypoint.sh', 'nginx', '-g', 'daemon off;'],
}

function commandError(code: CommandError['code'], message: string): CommandError {
  return { code, message }
}

function toStartCommand(command: readonly string[]): StartCommand {
  return {
    entrypoint: null,
    cmd: command,
    entrypointForm: null,
    cmdForm: 'exec',
    final: command,
    display: formatCommandDisplay(command),
  }
}

function toBaseImage(baseImage: BaseImage): Image {
  return {
    id: baseImage.id,
    repository: baseImage.repository,
    tag: baseImage.tag,
    reference: baseImage.reference,
    origin: 'base',
    baseReference: null,
    layers: baseImage.layers,
    startCommand: toStartCommand(baseImage.defaultCommand),
  }
}

function formatContainers(containers: readonly Container[]): readonly string[] {
  if (containers.length === 0) {
    return ['No hay contenedores activos.']
  }

  return [
    'CONTAINER ID   NAME   IMAGE   STATUS',
    ...containers.map(
      (container) =>
        `${container.id.padEnd(14)} ${container.name.padEnd(10)} ${container.image.padEnd(10)} ${container.status}`,
    ),
  ]
}

export function createInitialSimState(
  options: CreateInitialSimStateOptions = {},
): SimState {
  const baseImages = options.baseImages ?? [COMPATIBILITY_BASE_IMAGE]

  return {
    containers: [],
    images: baseImages.map(toBaseImage),
    projectFiles: options.projectFiles ?? [],
    builds: [],
    selectedImage: null,
    lastError: null,
    nextContainerNumber: 1,
    nextImageNumber: 1,
    nextBuildNumber: 1,
    log: [],
  }
}

export function executeCommand(
  state: SimState,
  rawCommand: string,
  options: ExecuteOptions = {},
): CommandResult {
  const availableCommands =
    options.availableCommands ?? DEFAULT_SUPPORTED_COMMANDS
  const parsed = parseCommand(rawCommand, {
    supportedCommands: availableCommands,
  })
  const allowedCommands = options.allowedCommands ?? ALL_COMMANDS
  const containerCountBefore = state.containers.length

  let nextState = state
  let error: CommandError | null = null
  let lines: readonly string[] = []

  if (!parsed.ok) {
    error = parsed.error
  } else {
    const command = parsed.command

    if (!allowedCommands.includes(command.kind)) {
      error = commandError(
        'command-not-allowed',
        'Ese comando no está permitido en este paso.',
      )
    } else if (command.kind === 'ps') {
      lines = formatContainers(state.containers)
    } else if (command.kind === 'run') {
      if (
        state.containers.some((container) => container.name === command.name)
      ) {
        error = commandError(
          'duplicate-name',
          `Ya existe un contenedor llamado "${command.name}".`,
        )
      } else {
        const parsedReference = parseImageReference(command.image)
        const reference = parsedReference.ok
          ? parsedReference.reference
          : command.image
        const image = parsedReference.ok
          ? state.images.find(
              (candidate) => candidate.reference === parsedReference.reference,
            )
          : undefined

        if (image === undefined) {
          const lastAttempt = [...state.builds]
            .reverse()
            .find((build) => build.reference === reference)

          if (lastAttempt !== undefined && !lastAttempt.ok) {
            error = commandError(
              'image-build-failed',
              `No se puede ejecutar "${command.image}": su construcción falló. Revisa el Dockerfile y vuelve a construir la imagen.`,
            )
          } else {
            error = commandError(
              'image-not-found',
              `No se encontró la imagen "${command.image}".`,
            )
          }
        } else {
          const hasStartCommand =
            image.origin === 'built' || image.layers.length > 0
          const container: Container = {
            id: `container-${state.nextContainerNumber}`,
            name: command.name,
            image: command.image,
            status: 'running',
            ...(hasStartCommand ? { command: image.startCommand.final } : {}),
          }

          nextState = {
            ...state,
            containers: [...state.containers, container],
            nextContainerNumber: state.nextContainerNumber + 1,
          }
          lines =
            image.origin === 'built'
              ? [
                  container.id,
                  `Comando de arranque: ${image.startCommand.display}`,
                ]
              : [container.id]
        }
      }
    } else if (command.kind === 'images') {
      lines = formatImagesTable(state.images)
    } else if (command.kind === 'history') {
      const parsedReference = parseImageReference(command.image)
      const image = parsedReference.ok
        ? state.images.find(
            (candidate) => candidate.reference === parsedReference.reference,
          )
        : undefined

      if (image === undefined) {
        error = commandError(
          'image-not-found',
          `No se encontró la imagen "${command.image}".`,
        )
      } else {
        nextState = { ...state, selectedImage: image.reference }
        lines = formatHistoryTable(image)
      }
    } else {
      const buildResult = buildImage(
        state,
        command.reference,
        options.dockerfile ?? '',
      )

      nextState = buildResult.state
      lines = buildResult.lines
      error = buildResult.error
    }
  }

  if (error !== null) {
    lines = [error.message]
  }

  const logEntry: CommandLogEntry = {
    rawCommand,
    normalizedCommand: parsed.normalizedCommand,
    command: parsed.ok ? parsed.command : null,
    ok: error === null,
    lines,
    error,
    containerCountBefore,
    containerCountAfter: nextState.containers.length,
  }

  const finalState: SimState = {
    ...nextState,
    lastError: error,
    log: [...state.log, logEntry],
  }

  return {
    ok: error === null,
    lines,
    state: finalState,
    error,
  }
}
