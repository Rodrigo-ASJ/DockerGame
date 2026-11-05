import { describe, expect, it } from 'vitest'
import { buildImage, resolveStartCommand } from './build'
import { parseDockerfile } from './dockerfile'
import { createInitialSimState } from './engine'
import { formatHistoryTable, formatSize, getImageSizeKb } from './images'
import type {
  BuildAttempt,
  CommandErrorCode,
  Image,
  ProjectFile,
  SimState,
  StartCommand,
} from './types'
import { baseImages } from '../content/images/base-images'

const projectFiles: readonly ProjectFile[] = [
  { path: 'index.html', content: '<h1>Hola</h1>', sizeKb: 2 },
  { path: 'app.js', content: 'console.log("hola")', sizeKb: 3 },
  { path: 'styles.css', content: 'body { margin: 0; }', sizeKb: 1 },
]

const completeDockerfile = [
  'FROM nginx:latest',
  'WORKDIR /usr/share/nginx/html',
  'COPY index.html .',
  'COPY app.js .',
  'COPY styles.css .',
  'RUN echo listo',
  'CMD ["nginx", "-g", "daemon off;"]',
].join('\n')

function createState(): SimState {
  return createInitialSimState({ baseImages, projectFiles })
}

function lastImage(state: SimState): Image {
  const image = state.images[state.images.length - 1]

  if (image === undefined) {
    throw new Error('No hay imágenes en el estado.')
  }

  return image
}

function lastBuild(state: SimState): BuildAttempt {
  const build = state.builds[state.builds.length - 1]

  if (build === undefined) {
    throw new Error('No hay construcciones en el estado.')
  }

  return build
}

function startCommandFor(content: string): StartCommand | null {
  const parsed = parseDockerfile(content)

  if (!parsed.ok) {
    throw new Error(`No se esperaba un error de parseo: ${parsed.error.message}`)
  }

  return resolveStartCommand(parsed.instructions)
}

function expectBuildError(
  state: SimState,
  reference: string,
  dockerfile: string,
  code: CommandErrorCode,
) {
  const result = buildImage(state, reference, dockerfile)

  expect(result.ok).toBe(false)
  expect(result.error?.code).toBe(code)
  expect(result.state.lastError?.code).toBe(code)
  expect(result.state.images).toEqual(state.images)
  expect(result.state.containers).toEqual(state.containers)
  expect(result.state.selectedImage).toBe(state.selectedImage)
  expect(result.state.nextImageNumber).toBe(state.nextImageNumber)
  expect(result.state.nextBuildNumber).toBe(state.nextBuildNumber + 1)
  expect(result.state.builds).toHaveLength(state.builds.length + 1)

  const build = lastBuild(result.state)

  expect(build).toMatchObject({
    ok: false,
    imageId: null,
    cacheKeys: [],
    cacheHits: 0,
    cacheMisses: 0,
    error: { code },
  })

  return result
}

describe('buildImage success', () => {
  it('creates a built image from the base layers plus one layer per instruction', () => {
    const state = createState()
    const result = buildImage(state, 'mi-sitio:1.0', completeDockerfile)

    expect(result.ok).toBe(true)
    expect(result.error).toBeNull()
    expect(result.state.images).toHaveLength(state.images.length + 1)

    const image = lastImage(result.state)

    expect(image).toMatchObject({
      id: 'image-1',
      repository: 'mi-sitio',
      tag: '1.0',
      reference: 'mi-sitio:1.0',
      origin: 'built',
      baseReference: 'nginx:latest',
    })
    expect(image.layers.map((layer) => layer.instruction)).toEqual([
      'FROM',
      'FROM',
      'FROM',
      'WORKDIR',
      'COPY',
      'COPY',
      'COPY',
      'RUN',
      'CMD',
    ])
    expect(image.layers.map((layer) => layer.sizeKb)).toEqual([
      100000, 70000, 17000, 1, 2, 3, 1, 1, 1,
    ])
    expect(image.layers.every((layer) => layer.fromCache === false)).toBe(true)
    expect(getImageSizeKb(image)).toBe(187009)
    expect(formatSize(getImageSizeKb(image))).toBe('187 MB')
    expect(image.startCommand.final).toEqual([
      'nginx',
      '-g',
      'daemon off;',
    ])
    expect(image.startCommand.display).toBe('nginx -g "daemon off;"')

    expect(result.state.selectedImage).toBe('mi-sitio:1.0')
    expect(result.state.lastError).toBeNull()
    expect(result.state.nextImageNumber).toBe(2)
    expect(result.state.nextBuildNumber).toBe(2)

    const build = lastBuild(result.state)

    expect(build).toMatchObject({
      id: 'build-1',
      dockerfile: completeDockerfile,
      repository: 'mi-sitio',
      tag: '1.0',
      reference: 'mi-sitio:1.0',
      ok: true,
      error: null,
      imageId: 'image-1',
      cacheHits: 0,
      cacheMisses: 9,
    })
    expect(build.cacheKeys).toEqual(image.layers.map((layer) => layer.cacheKey))
    expect(build.cacheKeys).toEqual([
      'FROM:nginx:latest',
      'FROM:nginx:latest',
      'FROM:nginx:latest',
      'WORKDIR:/usr/share/nginx/html',
      'COPY:index.html:.:2',
      'COPY:app.js:.:3',
      'COPY:styles.css:.:1',
      'RUN:echo listo',
      'CMD:exec:nginx -g daemon off;',
    ])
  })

  it('reports the per-instruction lines, the total size and the start command', () => {
    const result = buildImage(createState(), 'mi-sitio:1.0', completeDockerfile)
    const output = result.lines.join('\n')

    expect(output).toContain('Successfully tagged mi-sitio:1.0')
    expect(output).toContain('Tamaño total: 187 MB')
    expect(output).toContain('Comando de arranque: nginx -g "daemon off;"')
    expect(output).not.toContain('[caché]')
  })

  it('builds over nginx:alpine with a 43 MB total', () => {
    const dockerfile = [
      'FROM nginx:alpine',
      'WORKDIR /app',
      'COPY index.html .',
      'COPY app.js .',
      'COPY styles.css .',
      'RUN echo listo',
      'CMD ["nginx", "-g", "daemon off;"]',
    ].join('\n')
    const result = buildImage(createState(), 'optimizada:2.0', dockerfile)
    const image = lastImage(result.state)

    expect(result.ok).toBe(true)
    expect(image.baseReference).toBe('nginx:alpine')
    expect(getImageSizeKb(image)).toBe(43009)
    expect(formatSize(getImageSizeKb(image))).toBe('43 MB')
    expect(result.lines.join('\n')).toContain('Tamaño total: 43 MB')
  })

  it('does not add a layer for FROM but keeps the three base layers', () => {
    const result = buildImage(
      createState(),
      'solo-base:1.0',
      ['FROM nginx:latest', 'CMD ["sh"]'].join('\n'),
    )
    const image = lastImage(result.state)

    expect(result.ok).toBe(true)
    expect(image.layers).toHaveLength(4)
    expect(image.layers.map((layer) => layer.instruction)).toEqual([
      'FROM',
      'FROM',
      'FROM',
      'CMD',
    ])
  })

  it('sizes COPY layers from the project file and metadata layers as 1 KB', () => {
    const dockerfile = [
      'FROM nginx:latest',
      'WORKDIR /app',
      'COPY app.js .',
      'RUN echo ok',
      'ENTRYPOINT ["node"]',
      'CMD ["app.js"]',
    ].join('\n')
    const result = buildImage(createState(), 'capas:1.0', dockerfile)
    const image = lastImage(result.state)

    expect(result.ok).toBe(true)
    expect(image.layers.slice(3).map((layer) => layer.sizeKb)).toEqual([
      1, 3, 1, 1, 1,
    ])
  })

  it('is deterministic: the same build from the initial state produces the same image and attempt', () => {
    const first = buildImage(createState(), 'mi-sitio:1.0', completeDockerfile)
    const second = buildImage(createState(), 'mi-sitio:1.0', completeDockerfile)

    expect(first.state.images).toEqual(second.state.images)
    expect(first.state.builds).toEqual(second.state.builds)
    expect(first.lines).toEqual(second.lines)
  })
})

describe('buildImage cache', () => {
  it('does not reuse any layer when there is no previous successful build', () => {
    const result = buildImage(createState(), 'mi-sitio:1.0', completeDockerfile)
    const image = lastImage(result.state)
    const build = lastBuild(result.state)

    expect(image.layers.every((layer) => layer.fromCache === false)).toBe(true)
    expect(build.cacheHits).toBe(0)
    expect(build.cacheMisses).toBe(image.layers.length)
    expect(build.cacheKeys).toHaveLength(image.layers.length)
  })

  it('reuses every layer when rebuilding without changes under a new tag', () => {
    const first = buildImage(createState(), 'mi-sitio:1.0', completeDockerfile)
    const second = buildImage(first.state, 'mi-sitio:1.1', completeDockerfile)
    const image = lastImage(second.state)
    const build = lastBuild(second.state)

    expect(second.ok).toBe(true)
    expect(image.layers.every((layer) => layer.fromCache)).toBe(true)
    expect(build.cacheHits).toBe(build.cacheKeys.length)
    expect(build.cacheMisses).toBe(0)
    expect(build.cacheKeys).toEqual(
      first.state.builds[first.state.builds.length - 1]?.cacheKeys,
    )
    expect(second.lines.join('\n')).toContain('[caché]')
  })

  it('keeps the cached prefix and rebuilds the changed layer and the ones after it', () => {
    const first = buildImage(createState(), 'mi-sitio:1.0', completeDockerfile)
    const changed = completeDockerfile.replace(
      'RUN echo listo',
      'RUN echo cambiado',
    )
    const second = buildImage(first.state, 'mi-sitio:1.1', changed)
    const image = lastImage(second.state)
    const build = lastBuild(second.state)

    expect(second.ok).toBe(true)
    expect(image.layers.map((layer) => layer.fromCache)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
    ])
    expect(build.cacheHits).toBe(7)
    expect(build.cacheMisses).toBe(2)
  })

  it('invalidates every layer after a change in the first instruction', () => {
    const first = buildImage(createState(), 'mi-sitio:1.0', completeDockerfile)
    const changed = completeDockerfile.replace(
      'WORKDIR /usr/share/nginx/html',
      'WORKDIR /app',
    )
    const second = buildImage(first.state, 'mi-sitio:1.1', changed)
    const image = lastImage(second.state)

    expect(image.layers.map((layer) => layer.fromCache)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ])
  })

  it('rebuilds everything when the base changes', () => {
    const first = buildImage(createState(), 'mi-sitio:1.0', completeDockerfile)
    const changed = completeDockerfile.replace(
      'FROM nginx:latest',
      'FROM nginx:alpine',
    )
    const second = buildImage(first.state, 'mi-sitio:2.0', changed)
    const image = lastImage(second.state)
    const build = lastBuild(second.state)

    expect(second.ok).toBe(true)
    expect(image.layers.every((layer) => layer.fromCache === false)).toBe(true)
    expect(build.cacheHits).toBe(0)
    expect(build.cacheMisses).toBe(build.cacheKeys.length)
    expect(formatSize(getImageSizeKb(image))).toBe('43 MB')
  })

  it('compares against the last successful build', () => {
    const first = buildImage(createState(), 'app:1.0', completeDockerfile)
    const changed = completeDockerfile.replace(
      'RUN echo listo',
      'RUN echo cambiado',
    )
    const second = buildImage(first.state, 'app:1.1', changed)
    const third = buildImage(second.state, 'app:1.2', changed)
    const build = lastBuild(third.state)

    expect(third.ok).toBe(true)
    expect(lastImage(third.state).layers.every((layer) => layer.fromCache)).toBe(
      true,
    )
    expect(build.cacheHits).toBe(build.cacheKeys.length)
    expect(build.cacheMisses).toBe(0)
  })

  it('ignores failed builds when choosing the cache reference', () => {
    const first = buildImage(createState(), 'app:1.0', completeDockerfile)
    const failed = buildImage(first.state, 'app:1.1', '')
    const second = buildImage(failed.state, 'app:1.2', completeDockerfile)
    const build = lastBuild(second.state)

    expect(failed.ok).toBe(false)
    expect(second.ok).toBe(true)
    expect(build.cacheHits).toBe(build.cacheKeys.length)
    expect(build.cacheMisses).toBe(0)
  })

  it('rejects a duplicate tag before computing cache and keeps the previous reference', () => {
    const first = buildImage(createState(), 'app:1.0', completeDockerfile)
    const duplicate = buildImage(first.state, 'app:1.0', completeDockerfile)
    const duplicateBuild = lastBuild(duplicate.state)

    expect(duplicate.error?.code).toBe('duplicate-image-tag')
    expect(duplicateBuild).toMatchObject({
      cacheKeys: [],
      cacheHits: 0,
      cacheMisses: 0,
    })

    const next = buildImage(duplicate.state, 'app:1.1', completeDockerfile)
    const nextBuild = lastBuild(next.state)

    expect(nextBuild.cacheHits).toBe(nextBuild.cacheKeys.length)
    expect(nextBuild.cacheMisses).toBe(0)
  })

  it('keeps the history cache column in sync with layer.fromCache', () => {
    const first = buildImage(createState(), 'app:1.0', completeDockerfile)
    const changed = completeDockerfile.replace(
      'RUN echo listo',
      'RUN echo cambiado',
    )
    const second = buildImage(first.state, 'app:1.1', changed)
    const image = lastImage(second.state)
    const history = formatHistoryTable(image)

    expect(history[0]).toContain('CACHÉ')

    image.layers.forEach((layer, index) => {
      expect(history[index + 1]?.endsWith(layer.fromCache ? 'sí' : 'no')).toBe(
        true,
      )
    })
  })

  it('shows the exact 187 MB and 43 MB totals for the entrypoint example', () => {
    const dockerfile = [
      'FROM nginx:latest',
      'WORKDIR /app',
      'COPY index.html .',
      'COPY app.js .',
      'COPY styles.css .',
      'RUN echo listo',
      'CMD ["nginx"]',
      'ENTRYPOINT ["/docker-entrypoint.sh"]',
    ].join('\n')
    const latest = buildImage(createState(), 'optimizada:1.0', dockerfile)
    const latestImage = lastImage(latest.state)

    expect(getImageSizeKb(latestImage)).toBe(187010)
    expect(formatSize(getImageSizeKb(latestImage))).toBe('187 MB')
    expect(latest.lines.join('\n')).toContain('Tamaño total: 187 MB')

    const alpineDockerfile = dockerfile.replace(
      'FROM nginx:latest',
      'FROM nginx:alpine',
    )
    const optimized = buildImage(
      createState(),
      'optimizada:2.0',
      alpineDockerfile,
    )
    const optimizedImage = lastImage(optimized.state)

    expect(getImageSizeKb(optimizedImage)).toBe(43010)
    expect(formatSize(getImageSizeKb(optimizedImage))).toBe('43 MB')
    expect(optimized.lines.join('\n')).toContain('Tamaño total: 43 MB')
  })
})

describe('buildImage errors', () => {
  it('rejects an empty, whitespace-only or comments-only Dockerfile with missing-from', () => {
    for (const dockerfile of ['', '   \n\t\n', '# solo un comentario\n   # otro']) {
      const result = expectBuildError(
        createState(),
        'errores:0.0',
        dockerfile,
        'missing-from',
      )

      expect(result.error?.message).toContain('FROM')
    }
  })

  it('rejects a Dockerfile whose first instruction is not FROM with from-not-first', () => {
    const result = expectBuildError(
      createState(),
      'errores:0.1',
      ['WORKDIR /app', 'FROM nginx:latest', 'CMD ["sh"]'].join('\n'),
      'from-not-first',
    )

    expect(result.error?.message).toContain('FROM')
  })

  it('rejects more than one FROM with multiple-from', () => {
    const result = expectBuildError(
      createState(),
      'errores:0.1',
      ['FROM nginx:latest', 'FROM nginx:alpine', 'CMD ["sh"]'].join('\n'),
      'multiple-from',
    )

    expect(result.error?.message).toContain('FROM')
  })

  it('rejects a base outside the catalogue with base-image-not-found', () => {
    const result = expectBuildError(
      createState(),
      'errores:0.1',
      ['FROM nginx:no-existe', 'CMD ["sh"]'].join('\n'),
      'base-image-not-found',
    )

    expect(result.error?.message).toContain('nginx:no-existe')
  })

  it('rejects a built image used as a base with base-image-not-found', () => {
    const built = buildImage(
      createState(),
      'mi-sitio:1.0',
      ['FROM nginx:latest', 'CMD ["sh"]'].join('\n'),
    ).state

    expectBuildError(
      built,
      'otra:1.0',
      ['FROM mi-sitio:1.0', 'CMD ["sh"]'].join('\n'),
      'base-image-not-found',
    )
  })

  it('rejects a COPY whose source is missing from the project with copy-source-not-found', () => {
    for (const source of ['index.htm', 'missing.html']) {
      const result = expectBuildError(
        createState(),
        'errores:0.1',
        ['FROM nginx:latest', `COPY ${source} .`, 'CMD ["sh"]'].join('\n'),
        'copy-source-not-found',
      )

      expect(result.error?.message).toContain(source)
    }
  })

  it('rejects RUN false and RUN exit 1 with run-failed, including instruction, line and cause', () => {
    for (const [command, expected] of [
      ['false', 'RUN false'],
      ['exit 1', 'RUN exit 1'],
      ['EXIT 1', 'RUN EXIT 1'],
    ] as const) {
      const result = expectBuildError(
        createState(),
        'errores:0.2',
        ['FROM nginx:latest', `RUN ${command}`, 'CMD ["sh"]'].join('\n'),
        'run-failed',
      )

      expect(result.error?.message).toContain(expected)
      expect(result.error?.message).toContain('línea 2')
      expect(result.error?.message).toContain('falló')
    }
  })

  it('does not reject other RUN commands', () => {
    for (const command of ['echo ok', 'true', 'false || true', 'exit 0']) {
      const result = buildImage(
        createState(),
        'ok:1.0',
        ['FROM nginx:latest', `RUN ${command}`, 'CMD ["sh"]'].join('\n'),
      )

      expect(result.ok).toBe(true)
    }
  })

  it('rejects a Dockerfile without CMD or ENTRYPOINT with missing-start-command', () => {
    const result = expectBuildError(
      createState(),
      'errores:0.3',
      ['FROM nginx:latest', 'WORKDIR /app', 'RUN echo ok'].join('\n'),
      'missing-start-command',
    )

    expect(result.error?.message).toContain('CMD')
  })

  it('rejects an invalid target reference with invalid-image-tag', () => {
    for (const reference of ['Mi-Sitio:1.0', 'errores:1.0!', ':1.0']) {
      const result = expectBuildError(
        createState(),
        reference,
        ['FROM nginx:latest', 'CMD ["sh"]'].join('\n'),
        'invalid-image-tag',
      )

      expect(result.error?.message).toContain('Nombre o tag no válido')
    }
  })

  it('rejects a reference that already exists with duplicate-image-tag and keeps the base intact', () => {
    const state = createState()
    const result = expectBuildError(
      state,
      'nginx:latest',
      ['FROM nginx:latest', 'CMD ["sh"]'].join('\n'),
      'duplicate-image-tag',
    )

    expect(result.error?.message).toContain('nginx:latest')
    expect(result.state.images.find((image) => image.reference === 'nginx:latest')).toEqual(
      state.images.find((image) => image.reference === 'nginx:latest'),
    )
  })

  it('rejects rebuilding an existing built reference and keeps the previous image', () => {
    const first = buildImage(createState(), 'app:1.0', completeDockerfile)
    const previousImage = lastImage(first.state)

    const result = expectBuildError(
      first.state,
      'app:1.0',
      ['FROM nginx:latest', 'CMD ["sh"]'].join('\n'),
      'duplicate-image-tag',
    )

    expect(result.state.images).toHaveLength(first.state.images.length)
    expect(
      result.state.images.find((image) => image.reference === 'app:1.0'),
    ).toEqual(previousImage)
    expect(result.state.selectedImage).toBe('app:1.0')
    expect(result.state.builds).toHaveLength(2)
  })

  it('follows the fixed precedence for the first failure', () => {
    const cases: readonly [string, string, CommandErrorCode][] = [
      ['', 'Mi-Sitio:1.0', 'missing-from'],
      [
        ['WORKDIR /app', 'FROM nginx:latest', 'CMD ["sh"]'].join('\n'),
        'Mi-Sitio:1.0',
        'from-not-first',
      ],
      [
        ['FROM nginx:no-existe', 'COPY missing.html .', 'CMD ["sh"]'].join('\n'),
        'Mi-Sitio:1.0',
        'base-image-not-found',
      ],
      [
        ['FROM nginx:latest', 'COPY missing.html .', 'RUN exit 1', 'CMD ["sh"]'].join(
          '\n',
        ),
        'Mi-Sitio:1.0',
        'copy-source-not-found',
      ],
      [
        ['FROM nginx:latest', 'RUN exit 1'].join('\n'),
        'Mi-Sitio:1.0',
        'run-failed',
      ],
      [
        ['FROM nginx:latest', 'RUN echo ok'].join('\n'),
        'Mi-Sitio:1.0',
        'missing-start-command',
      ],
      [
        ['FROM nginx:latest', 'CMD ["sh"]'].join('\n'),
        'Mi-Sitio:1.0',
        'invalid-image-tag',
      ],
      [
        ['FROM nginx:latest', 'CMD ["sh"]'].join('\n'),
        'nginx:latest',
        'duplicate-image-tag',
      ],
    ]

    for (const [dockerfile, reference, code] of cases) {
      const result = buildImage(createState(), reference, dockerfile)

      expect(result.error?.code).toBe(code)
    }
  })

  it('does not mutate existing images, containers or the selection after a failure', () => {
    const built = buildImage(createState(), 'app:1.0', completeDockerfile).state
    const result = buildImage(built, 'errores:0.0', '')

    expect(result.ok).toBe(false)
    expect(result.state.images).toEqual(built.images)
    expect(result.state.containers).toEqual(built.containers)
    expect(result.state.selectedImage).toBe('app:1.0')
    expect(result.state.nextImageNumber).toBe(built.nextImageNumber)
    expect(result.state.builds).toHaveLength(built.builds.length + 1)
    expect(result.state.lastError?.code).toBe('missing-from')
  })
})

describe('resolveStartCommand', () => {
  it('composes exec ENTRYPOINT with exec CMD', () => {
    const start = startCommandFor(
      [
        'FROM nginx:latest',
        'ENTRYPOINT ["/docker-entrypoint.sh"]',
        'CMD ["nginx", "-g", "daemon off;"]',
      ].join('\n'),
    )

    expect(start).toEqual({
      entrypoint: ['/docker-entrypoint.sh'],
      cmd: ['nginx', '-g', 'daemon off;'],
      entrypointForm: 'exec',
      cmdForm: 'exec',
      final: ['/docker-entrypoint.sh', 'nginx', '-g', 'daemon off;'],
      display: '/docker-entrypoint.sh nginx -g "daemon off;"',
    })
  })

  it('composes exec ENTRYPOINT with shell CMD through /bin/sh -c', () => {
    const start = startCommandFor(
      ['FROM node:latest', 'ENTRYPOINT ["node"]', 'CMD server.js'].join('\n'),
    )

    expect(start).toMatchObject({
      entrypointForm: 'exec',
      cmdForm: 'shell',
      final: ['node', '/bin/sh', '-c', 'server.js'],
      display: 'node /bin/sh -c server.js',
    })
  })

  it('uses the exec ENTRYPOINT alone when CMD is absent', () => {
    const start = startCommandFor(
      ['FROM nginx:latest', 'ENTRYPOINT ["node", "server.js"]'].join('\n'),
    )

    expect(start).toMatchObject({
      entrypointForm: 'exec',
      cmdForm: null,
      final: ['node', 'server.js'],
      display: 'node server.js',
    })
  })

  it('ignores CMD when ENTRYPOINT is in shell form', () => {
    const start = startCommandFor(
      [
        'FROM nginx:latest',
        'ENTRYPOINT /docker-entrypoint.sh',
        'CMD ["nginx"]',
      ].join('\n'),
    )

    expect(start).toMatchObject({
      entrypoint: ['/docker-entrypoint.sh'],
      cmd: ['nginx'],
      entrypointForm: 'shell',
      cmdForm: 'exec',
      final: ['/bin/sh', '-c', '/docker-entrypoint.sh'],
      display: '/bin/sh -c /docker-entrypoint.sh',
    })
  })

  it('uses shell ENTRYPOINT with shell CMD as a single shell command', () => {
    const start = startCommandFor(
      ['FROM nginx:latest', 'ENTRYPOINT echo hola', 'CMD mundo'].join('\n'),
    )

    expect(start).toMatchObject({
      entrypointForm: 'shell',
      cmdForm: 'shell',
      final: ['/bin/sh', '-c', 'echo hola'],
      display: '/bin/sh -c "echo hola"',
    })
  })

  it('uses exec CMD alone when ENTRYPOINT is absent', () => {
    const start = startCommandFor(
      ['FROM nginx:latest', 'CMD ["nginx", "-g", "daemon off;"]'].join('\n'),
    )

    expect(start).toMatchObject({
      entrypoint: null,
      entrypointForm: null,
      cmd: ['nginx', '-g', 'daemon off;'],
      cmdForm: 'exec',
      final: ['nginx', '-g', 'daemon off;'],
      display: 'nginx -g "daemon off;"',
    })
  })

  it('uses shell CMD alone through /bin/sh -c when ENTRYPOINT is absent', () => {
    const start = startCommandFor(
      ['FROM nginx:latest', 'CMD echo hola'].join('\n'),
    )

    expect(start).toMatchObject({
      entrypoint: null,
      cmdForm: 'shell',
      final: ['/bin/sh', '-c', 'echo hola'],
      display: '/bin/sh -c "echo hola"',
    })
  })

  it('returns null when there is neither CMD nor ENTRYPOINT', () => {
    expect(
      startCommandFor(['FROM nginx:latest', 'WORKDIR /app'].join('\n')),
    ).toBeNull()
  })

  it('uses the last CMD and the last ENTRYPOINT but keeps every layer', () => {
    const dockerfile = [
      'FROM nginx:latest',
      'CMD ["primero"]',
      'ENTRYPOINT ["/bin/uno"]',
      'CMD ["segundo"]',
      'ENTRYPOINT ["/bin/dos"]',
    ].join('\n')
    const result = buildImage(createState(), 'varias:1.0', dockerfile)
    const image = lastImage(result.state)

    expect(result.ok).toBe(true)
    expect(image.startCommand.final).toEqual(['/bin/dos', 'segundo'])
    expect(
      image.layers.filter((layer) => layer.instruction === 'CMD'),
    ).toHaveLength(2)
    expect(
      image.layers.filter((layer) => layer.instruction === 'ENTRYPOINT'),
    ).toHaveLength(2)
  })
})
