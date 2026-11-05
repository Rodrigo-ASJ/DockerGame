import { describe, expect, it } from 'vitest'
import { createInitialSimState, executeCommand } from './engine'
import type {
  BaseImage,
  CommandKind,
  Container,
  ProjectFile,
  SimState,
} from './types'
import { baseImages } from '../content/images/base-images'

const level2Commands: readonly CommandKind[] = [
  'ps',
  'run',
  'images',
  'history',
  'build',
]

function run(state: SimState, command: string): SimState {
  return executeCommand(state, command).state
}

function runWithAllowed(
  state: SimState,
  command: string,
  allowedCommands: readonly CommandKind[],
): SimState {
  return executeCommand(state, command, { allowedCommands }).state
}

describe('createInitialSimState', () => {
  it('starts with a minimal nginx base, no containers, no error and no log', () => {
    expect(createInitialSimState()).toEqual({
      containers: [],
      images: [
        {
          id: 'nginx-latest',
          repository: 'nginx',
          tag: 'latest',
          reference: 'nginx:latest',
          origin: 'base',
          baseReference: null,
          layers: [],
          startCommand: {
            entrypoint: null,
            cmd: ['/docker-entrypoint.sh', 'nginx', '-g', 'daemon off;'],
            entrypointForm: null,
            cmdForm: 'exec',
            final: ['/docker-entrypoint.sh', 'nginx', '-g', 'daemon off;'],
            display: '/docker-entrypoint.sh nginx -g "daemon off;"',
          },
        },
      ],
      projectFiles: [],
      builds: [],
      selectedImage: null,
      lastError: null,
      nextContainerNumber: 1,
      nextImageNumber: 1,
      nextBuildNumber: 1,
      log: [],
    })
  })

  it('uses the provided base images and project files', () => {
    const baseImage: BaseImage = {
      id: 'base-1',
      repository: 'nginx',
      tag: 'alpine',
      reference: 'nginx:alpine',
      layers: [
        {
          id: 'base-1-layer-1',
          instruction: 'FROM',
          label: 'nginx:alpine',
          sizeKb: 43000,
          cacheKey: 'FROM:nginx:alpine',
          fromCache: false,
        },
      ],
      defaultCommand: ['nginx', '-g', 'daemon off;'],
    }
    const projectFile: ProjectFile = {
      path: 'index.html',
      content: '<h1>Hola</h1>',
      sizeKb: 2,
    }

    const state = createInitialSimState({
      baseImages: [baseImage],
      projectFiles: [projectFile],
    })

    expect(state.images).toEqual([
      {
        id: 'base-1',
        repository: 'nginx',
        tag: 'alpine',
        reference: 'nginx:alpine',
        origin: 'base',
        baseReference: null,
        layers: baseImage.layers,
        startCommand: {
          entrypoint: null,
          cmd: ['nginx', '-g', 'daemon off;'],
          entrypointForm: null,
          cmdForm: 'exec',
          final: ['nginx', '-g', 'daemon off;'],
          display: 'nginx -g "daemon off;"',
        },
      },
    ])
    expect(state.projectFiles).toEqual([projectFile])
    expect(state.nextImageNumber).toBe(1)
    expect(state.nextBuildNumber).toBe(1)
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
    expect(result.state.images).toEqual(state.images)
  })

  it('rejects docker images when the level only supports ps and run', () => {
    const state = createInitialSimState()
    const result = executeCommand(state, 'docker images', {
      availableCommands: ['ps', 'run'],
    })

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('unsupported-command')
    expect(result.state.images).toEqual(state.images)
  })

  it('accepts level 2 commands at the parser and blocks them when the step does not allow them', () => {
    for (const command of [
      'docker images',
      'docker history nginx:latest',
      'docker build -t mi-sitio:1.0 .',
    ]) {
      const state = createInitialSimState()
      const result = executeCommand(state, command, {
        availableCommands: level2Commands,
        allowedCommands: ['ps', 'run'],
      })

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('command-not-allowed')
      expect(result.state.images).toEqual(state.images)
      expect(result.state.builds).toEqual([])
    }
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

function level2State(): SimState {
  return createInitialSimState({ baseImages })
}

function runLevel2(state: SimState, command: string): SimState {
  return executeCommand(state, command, {
    availableCommands: level2Commands,
  }).state
}

describe('docker images', () => {
  it('lists every image with repository, tag, image id and formatted size', () => {
    const result = executeCommand(level2State(), 'docker images', {
      availableCommands: level2Commands,
    })

    expect(result.ok).toBe(true)
    expect(result.lines).toHaveLength(3)
    expect(result.lines[0]).toContain('REPOSITORY')
    expect(result.lines[0]).toContain('IMAGE ID')
    expect(result.lines[1]).toContain('nginx')
    expect(result.lines[1]).toContain('latest')
    expect(result.lines[1]).toContain('nginx-latest')
    expect(result.lines[1]).toContain('187 MB')
    expect(result.lines[2]).toContain('alpine')
    expect(result.lines[2]).toContain('nginx-alpine')
    expect(result.lines[2]).toContain('43 MB')
    expect(result.state.selectedImage).toBeNull()
  })

  it('does not change the selected image nor the image list', () => {
    const state = runLevel2(level2State(), 'docker history nginx:alpine')
    const result = executeCommand(state, 'docker images', {
      availableCommands: level2Commands,
    })

    expect(result.ok).toBe(true)
    expect(result.state.selectedImage).toBe('nginx:alpine')
    expect(result.state.images).toEqual(state.images)
  })
})

describe('docker history', () => {
  it('lists nginx:latest layers from first to last and selects the normalized reference', () => {
    const result = executeCommand(level2State(), 'docker history nginx', {
      availableCommands: level2Commands,
    })

    expect(result.ok).toBe(true)
    expect(result.lines).toHaveLength(4)
    expect(result.lines[0]).toContain('INSTRUCCIÓN')
    expect(result.lines[0]).toContain('TAMAÑO')
    expect(result.lines[0]).toContain('CACHÉ')
    expect(result.lines[1]).toContain('sistema')
    expect(result.lines[1]).toContain('100 MB')
    expect(result.lines[2]).toContain('binarios')
    expect(result.lines[2]).toContain('70 MB')
    expect(result.lines[3]).toContain('configuración')
    expect(result.lines[3]).toContain('17 MB')
    expect(result.state.selectedImage).toBe('nginx:latest')
    expect(result.state.lastError).toBeNull()
  })

  it('lists nginx:alpine layers with their exact sizes', () => {
    const result = executeCommand(level2State(), 'docker history nginx:alpine', {
      availableCommands: level2Commands,
    })

    expect(result.ok).toBe(true)
    expect(result.lines[1]).toContain('20 MB')
    expect(result.lines[2]).toContain('18 MB')
    expect(result.lines[3]).toContain('5 MB')
    expect(result.state.selectedImage).toBe('nginx:alpine')
  })

  it('reports image-not-found without mutating images or the selection', () => {
    const state = runLevel2(level2State(), 'docker history nginx:alpine')
    const result = executeCommand(state, 'docker history nginx:no-existe', {
      availableCommands: level2Commands,
    })

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('image-not-found')
    expect(result.lines[0]).toContain('nginx:no-existe')
    expect(result.state.selectedImage).toBe('nginx:alpine')
    expect(result.state.images).toEqual(state.images)
    expect(result.state.lastError?.code).toBe('image-not-found')
  })

  it('treats an invalid reference as a missing image without mutating state', () => {
    const state = level2State()
    const result = executeCommand(state, 'docker history Mi-Sitio:1.0', {
      availableCommands: level2Commands,
    })

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('image-not-found')
    expect(result.state.selectedImage).toBeNull()
    expect(result.state.images).toEqual(state.images)
  })

  it('rejects a history command without an image or with more than one', () => {
    for (const command of [
      'docker history',
      'docker history nginx:latest nginx:alpine',
    ]) {
      const result = executeCommand(level2State(), command, {
        availableCommands: level2Commands,
      })

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('invalid-command-syntax')
      expect(result.state.selectedImage).toBeNull()
    }
  })
})

const projectFiles: readonly ProjectFile[] = [
  { path: 'index.html', content: '<h1>Hola</h1>', sizeKb: 2 },
  { path: 'app.js', content: 'console.log("hola")', sizeKb: 3 },
  { path: 'styles.css', content: 'body { margin: 0; }', sizeKb: 1 },
]

const validDockerfile = [
  'FROM nginx:latest',
  'WORKDIR /usr/share/nginx/html',
  'COPY index.html .',
  'COPY app.js .',
  'COPY styles.css .',
  'RUN echo listo',
  'CMD ["nginx", "-g", "daemon off;"]',
].join('\n')

const failingDockerfile = [
  'FROM nginx:latest',
  'RUN exit 1',
  'CMD ["sh"]',
].join('\n')

function level2ProjectState(): SimState {
  return createInitialSimState({ baseImages, projectFiles })
}

function buildWith(
  state: SimState,
  command: string,
  dockerfile: string,
): SimState {
  return executeCommand(state, command, {
    availableCommands: level2Commands,
    dockerfile,
  }).state
}

describe('docker build', () => {
  it('builds the current editor Dockerfile, creates the image and selects it', () => {
    const state = level2ProjectState()
    const result = executeCommand(state, 'docker build -t mi-sitio:1.0 .', {
      availableCommands: level2Commands,
      dockerfile: validDockerfile,
    })

    expect(result.ok).toBe(true)
    expect(result.error).toBeNull()
    expect(result.state.images).toHaveLength(3)
    expect(result.state.selectedImage).toBe('mi-sitio:1.0')
    expect(result.state.builds).toHaveLength(1)
    expect(result.state.builds[0]?.ok).toBe(true)
    expect(result.state.lastError).toBeNull()
    expect(result.lines.join('\n')).toContain('Successfully tagged mi-sitio:1.0')
    expect(result.lines.join('\n')).toContain('Tamaño total: 187 MB')
    expect(result.lines.join('\n')).toContain('Comando de arranque:')
    expect(result.state.log[0]).toMatchObject({
      ok: true,
      command: { kind: 'build', reference: 'mi-sitio:1.0' },
    })
  })

  it('records a failed attempt with lastError and keeps the images untouched', () => {
    const state = level2ProjectState()
    const result = executeCommand(state, 'docker build -t errores:0.0 .', {
      availableCommands: level2Commands,
      dockerfile: '',
    })

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('missing-from')
    expect(result.state.images).toEqual(state.images)
    expect(result.state.selectedImage).toBeNull()
    expect(result.state.builds).toHaveLength(1)
    expect(result.state.builds[0]).toMatchObject({
      ok: false,
      imageId: null,
      cacheKeys: [],
      cacheHits: 0,
      cacheMisses: 0,
    })
    expect(result.state.lastError?.code).toBe('missing-from')
    expect(result.state.nextBuildNumber).toBe(2)
    expect(result.state.nextImageNumber).toBe(1)
  })

  it('does not record a build attempt when the command syntax is invalid', () => {
    for (const command of [
      'docker build mi-sitio:1.0 .',
      'docker build -t mi-sitio:1.0',
      'docker build -t mi-sitio:1.0 ./otro',
      'docker build -t mi-sitio:1.0 . extra',
    ]) {
      const state = level2ProjectState()
      const result = executeCommand(state, command, {
        availableCommands: level2Commands,
        dockerfile: validDockerfile,
      })

      expect(result.ok).toBe(false)
      expect(result.error?.code).toBe('invalid-command-syntax')
      expect(result.state.builds).toEqual([])
      expect(result.state.images).toEqual(state.images)
    }
  })

  it('records a Dockerfile parse error as a failed build attempt', () => {
    const result = executeCommand(
      level2ProjectState(),
      'docker build -t errores:0.0 .',
      {
        availableCommands: level2Commands,
        dockerfile: 'LABEL foo=bar',
      },
    )

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('unsupported-instruction')
    expect(result.state.builds).toHaveLength(1)
    expect(result.state.builds[0]?.ok).toBe(false)
    expect(result.state.images).toHaveLength(2)
  })

  it('keeps the previous image and selection when a rebuild fails', () => {
    let state = buildWith(
      level2ProjectState(),
      'docker build -t app:1.0 .',
      validDockerfile,
    )
    const previousImages = state.images

    state = buildWith(state, 'docker build -t app:1.0 .', validDockerfile)

    expect(state.lastError?.code).toBe('duplicate-image-tag')
    expect(state.images).toEqual(previousImages)
    expect(state.selectedImage).toBe('app:1.0')
    expect(state.builds).toHaveLength(2)
    expect(state.builds[1]?.ok).toBe(false)
  })
})

describe('docker run with built images', () => {
  it('uses the resolved start command and prints it for a built image', () => {
    const state = buildWith(
      level2ProjectState(),
      'docker build -t mi-sitio:1.0 .',
      validDockerfile,
    )
    const image = state.images.find((candidate) => candidate.reference === 'mi-sitio:1.0')

    const result = executeCommand(state, 'docker run -d --name sitio mi-sitio:1.0', {
      availableCommands: level2Commands,
    })

    expect(result.ok).toBe(true)
    expect(result.state.containers).toEqual<Container[]>([
      {
        id: 'container-1',
        name: 'sitio',
        image: 'mi-sitio:1.0',
        status: 'running',
        command: ['nginx', '-g', 'daemon off;'],
      },
    ])
    expect(result.lines).toEqual([
      'container-1',
      'Comando de arranque: nginx -g "daemon off;"',
    ])
    expect(result.state.containers[0]?.command).toEqual(image?.startCommand.final)
    expect(result.state.selectedImage).toBe('mi-sitio:1.0')
  })

  it('composes ENTRYPOINT and CMD in the container command', () => {
    const dockerfile = [
      'FROM nginx:latest',
      'ENTRYPOINT ["/docker-entrypoint.sh"]',
      'CMD ["nginx", "-g", "daemon off;"]',
    ].join('\n')
    const state = buildWith(
      level2ProjectState(),
      'docker build -t compuesta:1.0 .',
      dockerfile,
    )
    const result = executeCommand(
      state,
      'docker run -d --name compuesta compuesta:1.0',
      { availableCommands: level2Commands },
    )

    expect(result.state.containers[0]?.command).toEqual([
      '/docker-entrypoint.sh',
      'nginx',
      '-g',
      'daemon off;',
    ])
    expect(result.lines[1]).toBe(
      'Comando de arranque: /docker-entrypoint.sh nginx -g "daemon off;"',
    )
  })

  it('keeps the level 1 output when running a base image but records its start command', () => {
    const result = executeCommand(
      level2ProjectState(),
      'docker run -d --name web nginx:alpine',
      { availableCommands: level2Commands },
    )

    expect(result.ok).toBe(true)
    expect(result.lines).toEqual(['container-1'])
    expect(result.state.containers).toEqual<Container[]>([
      {
        id: 'container-1',
        name: 'web',
        image: 'nginx:alpine',
        status: 'running',
        command: ['/docker-entrypoint.sh', 'nginx', '-g', 'daemon off;'],
      },
    ])
  })

  it('rejects running an image whose last build failed with image-build-failed', () => {
    const state = buildWith(
      level2ProjectState(),
      'docker build -t errores:0.4 .',
      failingDockerfile,
    )
    const result = executeCommand(
      state,
      'docker run -d --name roto errores:0.4',
      { availableCommands: level2Commands },
    )

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('image-build-failed')
    expect(result.lines[0]).toContain('errores:0.4')
    expect(result.lines[0]).toContain('construcción falló')
    expect(result.state.containers).toEqual([])
    expect(result.state.lastError?.code).toBe('image-build-failed')
  })

  it('reports image-not-found when the reference was never built', () => {
    const result = executeCommand(
      level2ProjectState(),
      'docker run -d --name nunca nunca:1.0',
      { availableCommands: level2Commands },
    )

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('image-not-found')
    expect(result.state.containers).toEqual([])
  })

  it('still runs an existing image after a failed rebuild with a duplicate tag', () => {
    let state = buildWith(
      level2ProjectState(),
      'docker build -t app:1.0 .',
      validDockerfile,
    )
    state = buildWith(state, 'docker build -t app:1.0 .', validDockerfile)

    const result = executeCommand(state, 'docker run -d --name app app:1.0', {
      availableCommands: level2Commands,
    })

    expect(result.ok).toBe(true)
    expect(result.state.containers).toHaveLength(1)
    expect(result.state.containers[0]?.image).toBe('app:1.0')
  })
})
