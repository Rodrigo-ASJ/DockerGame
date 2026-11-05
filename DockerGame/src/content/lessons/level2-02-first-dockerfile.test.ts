import { describe, expect, it } from 'vitest'
import { createInitialSimState, executeCommand } from '../../core/engine'
import { parseDockerfile } from '../../core/dockerfile'
import {
  checkBuiltImage,
  checkContainerWithCommand,
  checkDockerfileCopies,
  checkDockerfileFromAndWorkdir,
  checkDockerfileRunAndCmd,
} from '../../core/checkers'
import type { SimState, StepCheckContext } from '../../core/types'
import { baseImages } from '../images/base-images'
import { staticSiteProject } from '../projects/static-site'
import {
  LEVEL2_02_FIRST_DOCKERFILE_LESSON_ID,
  level202FirstDockerfileLesson,
} from './level2-02-first-dockerfile'

const COMPLETE_DOCKERFILE = [
  '# Sitio estático sobre nginx',
  'FROM nginx:latest',
  'WORKDIR /usr/share/nginx/html',
  'COPY index.html .',
  'COPY app.js .',
  'COPY styles.css .',
  'RUN echo "Sitio listo"',
  'CMD ["nginx", "-g", "daemon off;"]',
].join('\n')

function runCommands(
  commands: readonly string[],
  dockerfile: string,
): SimState {
  return commands.reduce(
    (state, command) =>
      executeCommand(state, command, {
        availableCommands: ['ps', 'run', 'build', 'images', 'history'],
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

describe('level202FirstDockerfileLesson', () => {
  it('declares identity, level and available commands', () => {
    expect(level202FirstDockerfileLesson.id).toBe(
      LEVEL2_02_FIRST_DOCKERFILE_LESSON_ID,
    )
    expect(level202FirstDockerfileLesson.level).toBe(2)
    expect(level202FirstDockerfileLesson.title).toBe('Primer Dockerfile')
    expect(level202FirstDockerfileLesson.availableCommands).toEqual([
      'ps',
      'run',
      'images',
      'history',
      'build',
    ])
  })

  it('declares workspace with static site project and initial Dockerfile', () => {
    expect(level202FirstDockerfileLesson.workspace).toBeDefined()
    expect(
      level202FirstDockerfileLesson.workspace?.projectFiles,
    ).toEqual(staticSiteProject.files)
    expect(level202FirstDockerfileLesson.workspace?.initialDockerfile).toBe(
      COMPLETE_DOCKERFILE,
    )
  })

  it('includes student-facing Spanish content', () => {
    expect(level202FirstDockerfileLesson.explanation).toContain('Dockerfile')
    expect(level202FirstDockerfileLesson.explanation).toContain('FROM')
    expect(level202FirstDockerfileLesson.explanation).toContain('CMD')
    expect(level202FirstDockerfileLesson.diagram.steps).toHaveLength(3)

    for (const step of level202FirstDockerfileLesson.steps) {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.instruction.length).toBeGreaterThan(0)
      expect(step.successMessage.length).toBeGreaterThan(0)
      expect(step.errorHint.length).toBeGreaterThan(0)
      expect(step.checker).toBeDefined()
    }
  })

  it('declares the five guided steps in order', () => {
    expect(level202FirstDockerfileLesson.steps.map((step) => step.id)).toEqual([
      '2.2.1',
      '2.2.2',
      '2.2.3',
      '2.2.4',
      '2.2.5',
    ])
  })

  it('editor steps have empty allowedCommands', () => {
    for (const step of level202FirstDockerfileLesson.steps.slice(0, 3)) {
      expect(step.allowedCommands).toEqual([])
    }
  })

  it('blocks docker build when not allowed in editor steps', () => {
    const [step] = level202FirstDockerfileLesson.steps
    const result = executeCommand(
      createInitialSimState({
        baseImages,
        projectFiles: staticSiteProject.files,
      }),
      'docker build -t mi-sitio:1.0 .',
      {
        availableCommands: ['ps', 'run', 'build', 'images', 'history'],
        allowedCommands: step?.allowedCommands,
        dockerfile: COMPLETE_DOCKERFILE,
      },
    )

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('command-not-allowed')
  })

  describe('checkers against the guided sequence', () => {
    const step1Dockerfile = [
      '# Sitio estático sobre nginx',
      'FROM nginx:latest',
      'WORKDIR /usr/share/nginx/html',
    ].join('\n')

    const step2Dockerfile = [
      '# Sitio estático sobre nginx',
      'FROM nginx:latest',
      'WORKDIR /usr/share/nginx/html',
      'COPY index.html .',
      'COPY app.js .',
      'COPY styles.css .',
    ].join('\n')

    const step3Dockerfile = [
      '# Sitio estático sobre nginx',
      'FROM nginx:latest',
      'WORKDIR /usr/share/nginx/html',
      'COPY index.html .',
      'COPY app.js .',
      'COPY styles.css .',
      'RUN echo "Sitio listo"',
      'CMD ["nginx", "-g", "daemon off;"]',
    ].join('\n')

    it('step 2.2.1 fails before editing and passes with FROM + WORKDIR', () => {
      expect(
        checkDockerfileFromAndWorkdir(context(runCommands([], ''))),
      ).toBe(false)

      const ctx = context(
        runCommands([], step1Dockerfile),
        step1Dockerfile,
      )
      expect(checkDockerfileFromAndWorkdir(ctx)).toBe(true)

      const parsed = parseDockerfile(step1Dockerfile)
      expect(parsed.ok).toBe(true)
      if (parsed.ok) {
        expect(parsed.instructions[0]?.args[0]).toBe('nginx:latest')
        expect(parsed.instructions[1]?.args[0]).toBe('/usr/share/nginx/html')
      }
    })

    it('step 2.2.2 fails before copies and passes with three COPY instructions', () => {
      expect(
        checkDockerfileCopies(context(runCommands([], step1Dockerfile))),
      ).toBe(false)

      const ctx = context(runCommands([], step2Dockerfile), step2Dockerfile)
      expect(checkDockerfileCopies(ctx)).toBe(true)
    })

    it('step 2.2.3 fails before RUN+CMD and passes with both', () => {
      expect(
        checkDockerfileRunAndCmd(context(runCommands([], step2Dockerfile))),
      ).toBe(false)

      const ctx = context(runCommands([], step3Dockerfile), step3Dockerfile)
      expect(checkDockerfileRunAndCmd(ctx)).toBe(true)
    })

    it('step 2.2.4 builds mi-sitio:1.0, selects it, and shows 187 MB', () => {
      const stateBefore = runCommands([], step3Dockerfile)
      expect(
        checkBuiltImage('mi-sitio:1.0', [
          'FROM',
          'WORKDIR',
          'COPY',
          'RUN',
          'CMD',
        ])(context(stateBefore, step3Dockerfile)),
      ).toBe(false)
      expect(stateBefore.selectedImage).toBeNull()

      const state = runCommands(
        ['docker build -t mi-sitio:1.0 .'],
        step3Dockerfile,
      )
      expect(
        checkBuiltImage('mi-sitio:1.0', [
          'FROM',
          'WORKDIR',
          'COPY',
          'RUN',
          'CMD',
        ])(context(state, step3Dockerfile)),
      ).toBe(true)

      const image = state.images.find((img) => img.reference === 'mi-sitio:1.0')
      expect(image?.origin).toBe('built')
      expect(image?.baseReference).toBe('nginx:latest')
      expect(image?.layers).toHaveLength(9)
      expect(state.selectedImage).toBe('mi-sitio:1.0')
    })

    it('step 2.2.5 fails before run and passes with sitio container running', () => {
      const built = runCommands(
        ['docker build -t mi-sitio:1.0 .'],
        step3Dockerfile,
      )
      expect(
        checkContainerWithCommand('sitio', 'mi-sitio:1.0')(
          context(built, step3Dockerfile),
        ),
      ).toBe(false)

      const state = runCommands(
        [
          'docker build -t mi-sitio:1.0 .',
          'docker run -d --name sitio mi-sitio:1.0',
        ],
        step3Dockerfile,
      )
      expect(
        checkContainerWithCommand('sitio', 'mi-sitio:1.0')(
          context(state, step3Dockerfile),
        ),
      ).toBe(true)

      const container = state.containers.find((c) => c.name === 'sitio')
      expect(container?.status).toBe('running')
      expect(container?.command).toEqual([
        'nginx',
        '-g',
        'daemon off;',
      ])
    })

    it('every step passes after the complete guided flow', () => {
      const state = runCommands(
        [
          'docker build -t mi-sitio:1.0 .',
          'docker run -d --name sitio mi-sitio:1.0',
        ],
        step3Dockerfile,
      )
      const ctx = context(state, step3Dockerfile)

      expect(checkDockerfileFromAndWorkdir(ctx)).toBe(true)
      expect(checkDockerfileCopies(ctx)).toBe(true)
      expect(checkDockerfileRunAndCmd(ctx)).toBe(true)
      expect(
        checkBuiltImage('mi-sitio:1.0', [
          'FROM',
          'WORKDIR',
          'COPY',
          'RUN',
          'CMD',
        ])(ctx),
      ).toBe(true)
      expect(checkContainerWithCommand('sitio', 'mi-sitio:1.0')(ctx)).toBe(
        true,
      )
    })
  })
})
