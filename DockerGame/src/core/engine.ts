import { parseCommand } from './parser'
import type {
  CommandError,
  CommandKind,
  CommandLogEntry,
  CommandResult,
  Container,
  ExecuteOptions,
  SimState,
} from './types'

const AVAILABLE_IMAGE = 'nginx'
const ALL_COMMANDS: readonly CommandKind[] = ['ps', 'run']

function commandError(code: CommandError['code'], message: string): CommandError {
  return { code, message }
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

export function createInitialSimState(): SimState {
  return {
    containers: [],
    lastError: null,
    nextContainerNumber: 1,
    log: [],
  }
}

export function executeCommand(
  state: SimState,
  rawCommand: string,
  options: ExecuteOptions = {},
): CommandResult {
  const parsed = parseCommand(rawCommand)
  const allowedCommands = options.allowedCommands ?? ALL_COMMANDS
  const containerCountBefore = state.containers.length

  let containers = state.containers
  let nextContainerNumber = state.nextContainerNumber
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
    } else if (state.containers.some((container) => container.name === command.name)) {
      error = commandError(
        'duplicate-name',
        `Ya existe un contenedor llamado "${command.name}".`,
      )
    } else if (command.image !== AVAILABLE_IMAGE) {
      error = commandError(
        'image-not-found',
        `No se encontró la imagen "${command.image}". En esta lección solo está disponible "nginx".`,
      )
    } else {
      const container: Container = {
        id: `container-${nextContainerNumber}`,
        name: command.name,
        image: command.image,
        status: 'running',
      }

      containers = [...state.containers, container]
      nextContainerNumber += 1
      lines = [container.id]
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
    containerCountAfter: containers.length,
  }

  const nextState: SimState = {
    containers,
    lastError: error,
    nextContainerNumber,
    log: [...state.log, logEntry],
  }

  return {
    ok: error === null,
    lines,
    state: nextState,
    error,
  }
}
