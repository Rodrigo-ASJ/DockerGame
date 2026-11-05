import { DEFAULT_SUPPORTED_COMMANDS } from './commands'
import type { CommandKind, ParseResult } from './types'

const CONTAINER_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/

const USAGE =
  'Comando no soportado. En esta lección usa "docker ps" o "docker run -d --name web nginx".'

type ParseOptions = {
  readonly supportedCommands?: readonly CommandKind[]
}

export function normalizeCommand(input: string): string {
  return input.trim().split(/\s+/).filter(Boolean).join(' ')
}

function unsupported(normalizedCommand: string, message = USAGE): ParseResult {
  return {
    ok: false,
    normalizedCommand,
    error: {
      code: 'unsupported-command',
      message,
    },
  }
}

function invalidSyntax(
  normalizedCommand: string,
  message: string,
): ParseResult {
  return {
    ok: false,
    normalizedCommand,
    error: {
      code: 'invalid-command-syntax',
      message,
    },
  }
}

export function parseCommand(
  input: string,
  options: ParseOptions = {},
): ParseResult {
  const normalizedCommand = normalizeCommand(input)
  const supportedCommands =
    options.supportedCommands ?? DEFAULT_SUPPORTED_COMMANDS

  if (normalizedCommand.length === 0) {
    return unsupported(
      normalizedCommand,
      'Escribe un comando. En esta lección usa "docker ps" o "docker run -d --name web nginx".',
    )
  }

  const tokens = normalizedCommand.split(' ')

  if (tokens[0] !== 'docker') {
    return unsupported(normalizedCommand)
  }

  if (tokens[1] === 'ps') {
    if (!supportedCommands.includes('ps')) {
      return unsupported(normalizedCommand)
    }

    if (tokens.length === 2) {
      return {
        ok: true,
        normalizedCommand,
        command: { kind: 'ps' },
      }
    }

    return unsupported(
      normalizedCommand,
      'En esta lección "docker ps" no admite opciones ni filtros.',
    )
  }

  if (tokens[1] === 'run') {
    if (!supportedCommands.includes('run')) {
      return unsupported(normalizedCommand)
    }

    return parseRun(normalizedCommand, tokens)
  }

  if (tokens[1] === 'images') {
    if (!supportedCommands.includes('images')) {
      return unsupported(normalizedCommand)
    }

    if (tokens.length === 2) {
      return {
        ok: true,
        normalizedCommand,
        command: { kind: 'images' },
      }
    }

    return unsupported(
      normalizedCommand,
      'El comando "docker images" no admite opciones ni argumentos.',
    )
  }

  if (tokens[1] === 'history') {
    if (!supportedCommands.includes('history')) {
      return unsupported(normalizedCommand)
    }

    if (tokens.length !== 3) {
      return invalidSyntax(
        normalizedCommand,
        'La sintaxis admitida es "docker history <imagen>".',
      )
    }

    return {
      ok: true,
      normalizedCommand,
      command: { kind: 'history', image: tokens[2] },
    }
  }

  if (tokens[1] === 'build') {
    if (!supportedCommands.includes('build')) {
      return unsupported(normalizedCommand)
    }

    if (tokens.length !== 5 || tokens[2] !== '-t' || tokens[4] !== '.') {
      return invalidSyntax(
        normalizedCommand,
        'La sintaxis admitida es "docker build -t <nombre> .".',
      )
    }

    return {
      ok: true,
      normalizedCommand,
      command: { kind: 'build', reference: tokens[3] },
    }
  }

  return unsupported(normalizedCommand)
}

function parseRun(
  normalizedCommand: string,
  tokens: readonly string[],
): ParseResult {
  let detached = false
  let name: string | undefined
  let image: string | undefined

  for (let index = 2; index < tokens.length; index += 1) {
    const token = tokens[index]

    if (token === '-d') {
      detached = true
      continue
    }

    if (token === '--name') {
      const value = tokens[index + 1]

      if (value === undefined) {
        return unsupported(
          normalizedCommand,
          'Falta el nombre del contenedor después de "--name".',
        )
      }

      name = value
      index += 1
      continue
    }

    if (token.startsWith('--name=')) {
      name = token.slice('--name='.length)
      continue
    }

    if (token.startsWith('-')) {
      return unsupported(
        normalizedCommand,
        `Opción no soportada en esta lección: "${token}".`,
      )
    }

    if (image !== undefined) {
      return unsupported(
        normalizedCommand,
        'La sintaxis admitida es "docker run -d --name web nginx".',
      )
    }

    image = token
  }

  if (!detached) {
    return unsupported(
      normalizedCommand,
      'Falta la opción "-d" para ejecutar el contenedor en segundo plano.',
    )
  }

  if (name === undefined || name.length === 0) {
    return unsupported(
      normalizedCommand,
      'Falta el nombre del contenedor. Usa "--name web".',
    )
  }

  if (!CONTAINER_NAME_PATTERN.test(name)) {
    return unsupported(
      normalizedCommand,
      'El nombre del contenedor debe empezar por letra o número y solo puede contener letras, números, "_", "." y "-".',
    )
  }

  if (image === undefined) {
    return unsupported(
      normalizedCommand,
      'Falta la imagen del contenedor. En esta lección usa "nginx".',
    )
  }

  return {
    ok: true,
    normalizedCommand,
    command: {
      kind: 'run',
      name,
      image,
    },
  }
}
