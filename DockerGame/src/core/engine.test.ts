import { describe, expect, it } from 'vitest'
import { createInitialSimState, executeCommand } from './engine'
import type { Container, SimState } from './types'

function run(state: SimState, command: string): SimState {
  return executeCommand(state, command).state
}

function runWithAllowed(
  state: SimState,
  command: string,
  allowedCommands: readonly ('ps' | 'run')[],
): SimState {
  return executeCommand(state, command, { allowedCommands }).state
}

describe('createInitialSimState', () => {
  it('starts with no containers, no error and no log', () => {
    expect(createInitialSimState()).toEqual({
      containers: [],
      lastError: null,
      nextContainerNumber: 1,
      log: [],
    })
  })
})

describe('executeCommand', () => {
  it('lists an empty container list without changing the state', () => {
    const state = createInitialSimState()
    const result = executeCommand(state, 'docker ps')

    expect(result.ok).toBe(true)
    expect(result.lines).toEqual(['No hay contenedores activos.'])
    expect(result.state.containers).toEqual([])
    expect(result.state.log).toHaveLength(1)
    expect(result.state.log[0]?.command).toEqual({ kind: 'ps' })
  })

  it('creates a running container with a deterministic id', () => {
    const state = createInitialSimState()
    const result = executeCommand(state, 'docker run -d --name web nginx')

    expect(result.ok).toBe(true)
    expect(result.lines).toEqual(['container-1'])
    expect(result.state.containers).toEqual<Container[]>([
      {
        id: 'container-1',
        name: 'web',
        image: 'nginx',
        status: 'running',
      },
    ])
    expect(result.state.nextContainerNumber).toBe(2)
    expect(result.state.lastError).toBeNull()
  })

  it('lists running containers with name, image and status', () => {
    const state = run(createInitialSimState(), 'docker run -d --name web nginx')
    const result = executeCommand(state, 'docker ps')

    expect(result.ok).toBe(true)
    expect(result.lines[0]).toContain('CONTAINER ID')
    expect(result.lines[1]).toContain('web')
    expect(result.lines[1]).toContain('nginx')
    expect(result.lines[1]).toContain('running')
  })

  it('rejects a duplicate container name without adding a container', () => {
    const state = run(createInitialSimState(), 'docker run -d --name web nginx')
    const result = executeCommand(state, 'docker run -d --name web nginx')

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('duplicate-name')
    expect(result.lines[0]).toContain('Ya existe')
    expect(result.state.containers).toHaveLength(1)
    expect(result.state.lastError?.code).toBe('duplicate-name')
  })

  it('rejects an unknown image without adding a container', () => {
    const state = createInitialSimState()
    const result = executeCommand(
      state,
      'docker run -d --name web2 nginx:inexistente',
    )

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('image-not-found')
    expect(result.lines[0]).toContain('nginx:inexistente')
    expect(result.state.containers).toEqual([])
    expect(result.state.lastError?.code).toBe('image-not-found')
  })

  it('rejects unsupported commands without changing containers', () => {
    const state = createInitialSimState()
    const result = executeCommand(state, 'docker images')

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('unsupported-command')
    expect(result.state.containers).toEqual([])
  })

  it('rejects commands not allowed for the current step', () => {
    const state = createInitialSimState()
    const result = executeCommand(state, 'docker run -d --name web nginx', {
      allowedCommands: ['ps'],
    })

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('command-not-allowed')
    expect(result.state.containers).toEqual([])
  })

  it('allows docker ps when it is the only allowed command', () => {
    const state = runWithAllowed(createInitialSimState(), 'docker ps', ['ps'])

    expect(state.log).toHaveLength(1)
    expect(state.log[0]?.ok).toBe(true)
  })

  it('keeps ids deterministic after failed attempts', () => {
    let state = createInitialSimState()
    state = run(state, 'docker run -d --name web nginx')
    state = run(state, 'docker run -d --name web nginx')
    state = run(state, 'docker run -d --name web2 nginx')

    expect(state.containers.map((container) => container.id)).toEqual([
      'container-1',
      'container-2',
    ])
  })

  it('does not mutate the previous state', () => {
    const state = createInitialSimState()
    const result = executeCommand(state, 'docker run -d --name web nginx')

    expect(state.containers).toEqual([])
    expect(state.log).toEqual([])
    expect(state.lastError).toBeNull()
    expect(result.state.log).toHaveLength(1)
  })

  it('clears the last error after a successful command', () => {
    let state = run(createInitialSimState(), 'docker run -d --name web nginx')
    state = run(state, 'docker run -d --name web nginx')

    expect(state.lastError?.code).toBe('duplicate-name')

    state = run(state, 'docker ps')
    expect(state.lastError).toBeNull()
  })

  it('records the raw and normalized command in the log', () => {
    const state = createInitialSimState()
    const result = executeCommand(state, '  docker   ps  ')

    expect(result.state.log[0]).toMatchObject({
      rawCommand: '  docker   ps  ',
      normalizedCommand: 'docker ps',
      command: { kind: 'ps' },
      ok: true,
      containerCountBefore: 0,
      containerCountAfter: 0,
    })
  })
})
