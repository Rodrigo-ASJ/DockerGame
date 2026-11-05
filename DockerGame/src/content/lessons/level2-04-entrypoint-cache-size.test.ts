import { describe, expect, it } from 'vitest'
import { createInitialSimState, executeCommand } from '../../core/engine'
import {
  checkAllLayersCached,
  checkBuiltImage,
  checkContainerWithCommand,
  checkComparison,
  checkDockerfileEntrypointAndCmd,
  checkPartialCache,
} from '../../core/checkers'
import { LEVEL2_AVAILABLE_COMMANDS } from '../../core/commands'
import type { SimState, StepCheckContext } from '../../core/types'
import { baseImages } from '../images/base-images'
import { staticSiteProject } from '../projects/static-site'
import {
  LEVEL2_04_ENTRYPOINT_CACHE_SIZE_LESSON_ID,
  level204EntrypointCacheSizeLesson,
} from './level2-04-entrypoint-cache-size'

const AVAILABLE_COMMANDS = LEVEL2_AVAILABLE_COMMANDS

type CommandStep = readonly [command: string, dockerfile: string]

function runCommands(steps: readonly CommandStep[]): SimState {
  return steps.reduce(
    (state, [command, dockerfile]) =>
      executeCommand(state, command, {
        availableCommands: AVAILABLE_COMMANDS,
        dockerfile,
      }).state,
    createInitialSimState({ baseImages, projectFiles: staticSiteProject.files }),
  )
}

function context(
  state: SimState,
  dockerfile?: string,
): StepCheckContext {
  return { state, log: state.log, dockerfile }
}

const DOCKERFILE_WITH_ENTRYPOINT = [
  'FROM nginx:latest',
  'WORKDIR /usr/share/nginx/html',
  'COPY index.html .',
  'COPY app.js .',
  'COPY styles.css .',
  'RUN echo "Sitio listo"',
  'CMD ["nginx", "-g", "daemon off;"]',
  'ENTRYPOINT ["nginx"]',
].join('\n')

const DOCKERFILE_CHANGED_RUN = [
  'FROM nginx:latest',
  'WORKDIR /usr/share/nginx/html',
  'COPY index.html .',
  'COPY app.js .',
  'COPY styles.css .',
  'RUN echo "Sitio listo y actualizado"',
  'CMD ["nginx", "-g", "daemon off;"]',
  'ENTRYPOINT ["nginx"]',
].join('\n')

const DOCKERFILE_ALPINE = [
  'FROM nginx:alpine',
  'WORKDIR /usr/share/nginx/html',
  'COPY index.html .',
  'COPY app.js .',
  'COPY styles.css .',
  'RUN echo "Sitio listo"',
  'CMD ["nginx", "-g", "daemon off;"]',
  'ENTRYPOINT ["nginx"]',
].join('\n')

describe('level204EntrypointCacheSizeLesson', () => {
  it('declares identity, level and available commands', () => {
    expect(level204EntrypointCacheSizeLesson.id).toBe(
      LEVEL2_04_ENTRYPOINT_CACHE_SIZE_LESSON_ID,
    )
    expect(level204EntrypointCacheSizeLesson.level).toBe(2)
    expect(level204EntrypointCacheSizeLesson.title).toBe(
      'ENTRYPOINT, caché y tamaño',
    )
    expect(level204EntrypointCacheSizeLesson.availableCommands).toEqual(
      AVAILABLE_COMMANDS,
    )
  })

  it('declares workspace with static site project, initial Dockerfile and comparison', () => {
    expect(level204EntrypointCacheSizeLesson.workspace).toBeDefined()
    expect(
      level204EntrypointCacheSizeLesson.workspace?.projectFiles,
    ).toEqual(staticSiteProject.files)
    expect(
      level204EntrypointCacheSizeLesson.workspace?.initialDockerfile,
    ).toContain('FROM nginx:latest')
    expect(
      level204EntrypointCacheSizeLesson.workspace?.initialDockerfile,
    ).not.toContain('ENTRYPOINT')
    expect(level204EntrypointCacheSizeLesson.workspace?.comparison).toEqual({
      baselineReference: 'optimizada:1.0',
      optimizedReference: 'optimizada:2.0',
    })
  })

  it('includes student-facing Spanish content with a three-step diagram', () => {
    expect(level204EntrypointCacheSizeLesson.explanation).toContain('ENTRYPOINT')
    expect(level204EntrypointCacheSizeLesson.explanation).toContain('CMD')
    expect(level204EntrypointCacheSizeLesson.explanation).toContain('caché')
    expect(level204EntrypointCacheSizeLesson.diagram.steps).toHaveLength(3)

    for (const step of level204EntrypointCacheSizeLesson.steps) {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.instruction.length).toBeGreaterThan(0)
      expect(step.successMessage.length).toBeGreaterThan(0)
      expect(step.errorHint.length).toBeGreaterThan(0)
      expect(step.checker).toBeDefined()
    }
  })

  it('declares the seven guided steps in order', () => {
    expect(level204EntrypointCacheSizeLesson.steps.map((step) => step.id)).toEqual([
      '2.4.1',
      '2.4.2',
      '2.4.3',
      '2.4.4',
      '2.4.5',
      '2.4.6',
      '2.4.7',
    ])
  })

  it('editor steps have empty allowedCommands', () => {
    expect(
      level204EntrypointCacheSizeLesson.steps[0]?.allowedCommands,
    ).toEqual([])
    expect(
      level204EntrypointCacheSizeLesson.steps[5]?.allowedCommands,
    ).toEqual([])
  })

  describe('checkers against the guided sequence', () => {
    it('2.4.1 ENTRYPOINT + CMD fails before and passes after editing', () => {
      const initial = level204EntrypointCacheSizeLesson.workspace?.initialDockerfile ?? ''
      expect(
        checkDockerfileEntrypointAndCmd(context(runCommands([]), initial)),
      ).toBe(false)

      const ctx = context(runCommands([]), DOCKERFILE_WITH_ENTRYPOINT)
      expect(checkDockerfileEntrypointAndCmd(ctx)).toBe(true)
    })

    it('2.4.2 builds optimizada:1.0 with 187 MB and all instruction kinds', () => {
      const stateBefore = runCommands([])
      expect(
        checkBuiltImage('optimizada:1.0', [
          'FROM',
          'WORKDIR',
          'COPY',
          'RUN',
          'CMD',
          'ENTRYPOINT',
        ])(context(stateBefore, DOCKERFILE_WITH_ENTRYPOINT)),
      ).toBe(false)
      expect(stateBefore.selectedImage).toBeNull()

      const state = runCommands([
        ['docker build -t optimizada:1.0 .', DOCKERFILE_WITH_ENTRYPOINT],
      ])
      expect(
        checkBuiltImage('optimizada:1.0', [
          'FROM',
          'WORKDIR',
          'COPY',
          'RUN',
          'CMD',
          'ENTRYPOINT',
        ])(context(state, DOCKERFILE_WITH_ENTRYPOINT)),
      ).toBe(true)

      const image = state.images.find((img) => img.reference === 'optimizada:1.0')
      expect(image?.origin).toBe('built')
      expect(image?.baseReference).toBe('nginx:latest')
      expect(state.selectedImage).toBe('optimizada:1.0')
    })

    it('2.4.3 rebuild without changes: all layers cached', () => {
      const state = runCommands([
        ['docker build -t optimizada:1.0 .', DOCKERFILE_WITH_ENTRYPOINT],
        ['docker build -t optimizada:1.1 .', DOCKERFILE_WITH_ENTRYPOINT],
      ])
      expect(
        checkAllLayersCached('optimizada:1.1')(context(state, DOCKERFILE_WITH_ENTRYPOINT)),
      ).toBe(true)
    })

    it('2.4.4 change intermediate RUN: partial cache', () => {
      const state = runCommands([
        ['docker build -t optimizada:1.0 .', DOCKERFILE_WITH_ENTRYPOINT],
        ['docker build -t optimizada:1.1 .', DOCKERFILE_WITH_ENTRYPOINT],
        ['docker build -t optimizada:1.2 .', DOCKERFILE_CHANGED_RUN],
      ])
      expect(
        checkPartialCache('optimizada:1.2')(context(state, DOCKERFILE_CHANGED_RUN)),
      ).toBe(true)
    })

    it('2.4.5 change base to nginx:alpine: 43 MB, all rebuilt', () => {
      const state = runCommands([
        ['docker build -t optimizada:2.0 .', DOCKERFILE_ALPINE],
      ])
      expect(
        checkBuiltImage('optimizada:2.0', [
          'FROM',
          'WORKDIR',
          'COPY',
          'RUN',
          'CMD',
          'ENTRYPOINT',
        ], { base: 'nginx:alpine', size: '43 MB' })(context(state, DOCKERFILE_ALPINE)),
      ).toBe(true)

      const image = state.images.find((img) => img.reference === 'optimizada:2.0')
      expect(image?.baseReference).toBe('nginx:alpine')
    })

    it('2.4.6 comparison: 187 MB vs 43 MB', () => {
      const state = runCommands([
        ['docker build -t optimizada:1.0 .', DOCKERFILE_WITH_ENTRYPOINT],
        ['docker build -t optimizada:2.0 .', DOCKERFILE_ALPINE],
      ])
      expect(
        checkComparison('optimizada:1.0', 'optimizada:2.0')(context(state)),
      ).toBe(true)
    })

    it('2.4.7 run optimizada container', () => {
      const built = runCommands([
        ['docker build -t optimizada:2.0 .', DOCKERFILE_ALPINE],
      ])
      expect(
        checkContainerWithCommand('optimizada', 'optimizada:2.0')(
          context(built, DOCKERFILE_ALPINE),
        ),
      ).toBe(false)

      const state = runCommands([
        ['docker build -t optimizada:2.0 .', DOCKERFILE_ALPINE],
        ['docker run -d --name optimizada optimizada:2.0', DOCKERFILE_ALPINE],
      ])
      expect(
        checkContainerWithCommand('optimizada', 'optimizada:2.0')(
          context(state, DOCKERFILE_ALPINE),
        ),
      ).toBe(true)
    })

    it('every step passes after the complete guided flow', () => {
      const state = runCommands([
        ['docker build -t optimizada:1.0 .', DOCKERFILE_WITH_ENTRYPOINT],
        ['docker build -t optimizada:2.0 .', DOCKERFILE_ALPINE],
        ['docker run -d --name optimizada optimizada:2.0', DOCKERFILE_ALPINE],
      ])
      const ctx = context(state, DOCKERFILE_ALPINE)

      expect(
        checkBuiltImage('optimizada:2.0', [
          'FROM',
          'WORKDIR',
          'COPY',
          'RUN',
          'CMD',
          'ENTRYPOINT',
        ], { base: 'nginx:alpine', size: '43 MB' })(ctx),
      ).toBe(true)
      expect(checkComparison('optimizada:1.0', 'optimizada:2.0')(ctx)).toBe(true)
      expect(checkContainerWithCommand('optimizada', 'optimizada:2.0')(ctx)).toBe(
        true,
      )
    })
  })
})
