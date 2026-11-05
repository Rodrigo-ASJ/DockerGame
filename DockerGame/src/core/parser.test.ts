import { describe, expect, it } from 'vitest'
import { normalizeCommand, parseCommand } from './parser'

describe('normalizeCommand', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeCommand('  docker   run  -d  --name web   nginx  ')).toBe(
      'docker run -d --name web nginx',
    )
  })

  it('returns an empty string for blank input', () => {
    expect(normalizeCommand('   ')).toBe('')
  })
})

describe('parseCommand', () => {
  it('parses docker ps', () => {
    expect(parseCommand('docker ps')).toEqual({
      ok: true,
      normalizedCommand: 'docker ps',
      command: { kind: 'ps' },
    })
  })

  it('normalizes whitespace before parsing', () => {
    expect(parseCommand('  docker   ps  ')).toEqual({
      ok: true,
      normalizedCommand: 'docker ps',
      command: { kind: 'ps' },
    })
  })

  it('parses docker run with detached mode and name', () => {
    expect(parseCommand('docker run -d --name web nginx')).toEqual({
      ok: true,
      normalizedCommand: 'docker run -d --name web nginx',
      command: { kind: 'run', name: 'web', image: 'nginx' },
    })
  })

  it('accepts flags in a different order', () => {
    expect(parseCommand('docker run --name web -d nginx')).toEqual({
      ok: true,
      normalizedCommand: 'docker run --name web -d nginx',
      command: { kind: 'run', name: 'web', image: 'nginx' },
    })
  })

  it('accepts the --name=value form', () => {
    expect(parseCommand('docker run -d --name=web nginx')).toEqual({
      ok: true,
      normalizedCommand: 'docker run -d --name=web nginx',
      command: { kind: 'run', name: 'web', image: 'nginx' },
    })
  })

  it('rejects an empty command', () => {
    const result = parseCommand('   ')

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.normalizedCommand).toBe('')
      expect(result.error.code).toBe('unsupported-command')
    }
  })

  it('rejects docker ps with options', () => {
    const result = parseCommand('docker ps -a')

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error.code).toBe('unsupported-command')
      expect(result.error.message).toContain('no admite opciones')
    }
  })

  it('rejects unsupported commands', () => {
    const result = parseCommand('docker images')

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error.code).toBe('unsupported-command')
      expect(result.error.message).toBe(
        'Comando no soportado. En esta lección usa "docker ps" o "docker run -d --name web nginx".',
      )
    }
  })

  it('rejects docker history and docker build when they are not supported', () => {
    for (const input of [
      'docker history nginx:latest',
      'docker build -t mi-sitio:1.0 .',
    ]) {
      const result = parseCommand(input)

      expect(result.ok).toBe(false)

      if (!result.ok) {
        expect(result.error.code).toBe('unsupported-command')
      }
    }
  })

  it('rejects docker run without detached mode', () => {
    const result = parseCommand('docker run --name web nginx')

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error.message).toContain('-d')
    }
  })

  it('rejects docker run without a name', () => {
    const result = parseCommand('docker run -d nginx')

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error.message).toContain('--name')
    }
  })

  it('rejects docker run without an image', () => {
    const result = parseCommand('docker run -d --name web')

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error.message).toContain('imagen')
    }
  })

  it('rejects an invalid container name', () => {
    const result = parseCommand('docker run -d --name bad/name nginx')

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error.message).toContain('nombre del contenedor')
    }
  })

  it('rejects unsupported options', () => {
    const result = parseCommand('docker run -d --name web -p 8080:80 nginx')

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error.message).toContain('-p')
    }
  })

  it('rejects extra arguments', () => {
    const result = parseCommand('docker run -d --name web nginx extra')

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error.message).toContain('sintaxis')
    }
  })

  it('accepts a non-nginx image for the engine to reject', () => {
    expect(parseCommand('docker run -d --name web nginx:inexistente')).toEqual({
      ok: true,
      normalizedCommand: 'docker run -d --name web nginx:inexistente',
      command: { kind: 'run', name: 'web', image: 'nginx:inexistente' },
    })
  })
})

const level2Commands = ['ps', 'run', 'images', 'history', 'build'] as const

describe('parseCommand with level 2 commands', () => {
  it('parses docker images', () => {
    expect(
      parseCommand('docker images', { supportedCommands: level2Commands }),
    ).toEqual({
      ok: true,
      normalizedCommand: 'docker images',
      command: { kind: 'images' },
    })
  })

  it('rejects docker images with options', () => {
    const result = parseCommand('docker images -a', {
      supportedCommands: level2Commands,
    })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error.code).toBe('unsupported-command')
      expect(result.error.message).toContain('no admite opciones')
    }
  })

  it('parses docker history with exactly one image', () => {
    expect(
      parseCommand('docker history nginx:latest', {
        supportedCommands: level2Commands,
      }),
    ).toEqual({
      ok: true,
      normalizedCommand: 'docker history nginx:latest',
      command: { kind: 'history', image: 'nginx:latest' },
    })
  })

  it('rejects docker history without an image or with more than one', () => {
    for (const input of [
      'docker history',
      'docker history nginx:latest nginx:alpine',
    ]) {
      const result = parseCommand(input, {
        supportedCommands: level2Commands,
      })

      expect(result.ok).toBe(false)

      if (!result.ok) {
        expect(result.error.code).toBe('invalid-command-syntax')
        expect(result.error.message).toContain('sintaxis')
      }
    }
  })

  it('parses docker build with -t and the current context', () => {
    expect(
      parseCommand('docker build -t mi-sitio:1.0 .', {
        supportedCommands: level2Commands,
      }),
    ).toEqual({
      ok: true,
      normalizedCommand: 'docker build -t mi-sitio:1.0 .',
      command: { kind: 'build', reference: 'mi-sitio:1.0' },
    })
  })

  it('rejects docker build with a different syntax', () => {
    for (const input of [
      'docker build mi-sitio:1.0 .',
      'docker build -t mi-sitio:1.0',
      'docker build -t',
      'docker build -t mi-sitio:1.0 ./',
      'docker build -t mi-sitio:1.0 . extra',
    ]) {
      const result = parseCommand(input, {
        supportedCommands: level2Commands,
      })

      expect(result.ok).toBe(false)

      if (!result.ok) {
        expect(result.error.code).toBe('invalid-command-syntax')
        expect(result.error.message).toContain('sintaxis')
      }
    }
  })

  it('keeps docker ps and docker run unchanged when the level supports them', () => {
    expect(
      parseCommand('docker ps', { supportedCommands: level2Commands }),
    ).toEqual({
      ok: true,
      normalizedCommand: 'docker ps',
      command: { kind: 'ps' },
    })
    expect(
      parseCommand('docker run -d --name web nginx:alpine', {
        supportedCommands: level2Commands,
      }),
    ).toEqual({
      ok: true,
      normalizedCommand: 'docker run -d --name web nginx:alpine',
      command: { kind: 'run', name: 'web', image: 'nginx:alpine' },
    })
  })

  it('rejects docker ps and docker run when the level does not support them', () => {
    for (const input of [
      'docker ps',
      'docker run -d --name web nginx',
    ]) {
      const result = parseCommand(input, { supportedCommands: ['images'] })

      expect(result.ok).toBe(false)

      if (!result.ok) {
        expect(result.error.code).toBe('unsupported-command')
      }
    }
  })
})
