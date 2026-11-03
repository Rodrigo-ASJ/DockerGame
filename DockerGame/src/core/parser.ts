import type { ParseResult } from './types'

const CONTAINER_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/

const USAGE =
  'Comando no soportado. En esta lección usa "docker ps" o "docker run -d --name web nginx".'

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

export function parseCommand(input: string): ParseResult {
  const normalizedCommand = normalizeCommand(input)

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

  if (tokens[1] !== 'run') {
    return unsupported(normalizedCommand)
  }

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

