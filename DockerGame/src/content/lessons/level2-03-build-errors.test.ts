import { describe, expect, it } from 'vitest'
import { createInitialSimState, executeCommand } from '../../core/engine'
import {
  checkBuildError,
  checkFailedImageRun,
  checkRecoveredImage,
} from '../../core/checkers'
import { LEVEL2_AVAILABLE_COMMANDS } from '../../core/commands'
import type { SimState, StepCheckContext } from '../../core/types'
import { baseImages } from '../images/base-images'
import { staticSiteProject } from '../projects/static-site'
import {
  LEVEL2_03_BUILD_ERRORS_LESSON_ID,
  level203BuildErrorsLesson,
} from './level2-03-build-errors'

const AVAILABLE_COMMANDS = LEVEL2_AVAILABLE_COMMANDS

function runCommands(
  commands: readonly string[],
  dockerfile: string,
): SimState {
  return commands.reduce(
    (state, command) =>
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

const VALID_DOCKERFILE = [
  'FROM nginx:latest',
  'CMD ["nginx", "-g", "daemon off;"]',
].join('\n')

describe('level203BuildErrorsLesson', () => {
  it('declares identity, level and available commands', () => {
    expect(level203BuildErrorsLesson.id).toBe(
      LEVEL2_03_BUILD_ERRORS_LESSON_ID,
    )
    expect(level203BuildErrorsLesson.level).toBe(2)
    expect(level203BuildErrorsLesson.title).toBe('Errores de construcción')
    expect(level203BuildErrorsLesson.availableCommands).toEqual(
      AVAILABLE_COMMANDS,
    )
  })

  it('declares workspace with static site project and initial Dockerfile', () => {
    expect(level203BuildErrorsLesson.workspace).toBeDefined()
    expect(
      level203BuildErrorsLesson.workspace?.projectFiles,
    ).toEqual(staticSiteProject.files)
    expect(level203BuildErrorsLesson.workspace?.initialDockerfile).toBe(
      'FROM nginx:latest',
    )
  })

  it('includes student-facing Spanish content', () => {
    expect(level203BuildErrorsLesson.explanation).toContain('FROM')
    expect(level203BuildErrorsLesson.explanation).toContain('CMD')
    expect(level203BuildErrorsLesson.diagram.steps).toHaveLength(3)

    for (const step of level203BuildErrorsLesson.steps) {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.instruction.length).toBeGreaterThan(0)
      expect(step.successMessage.length).toBeGreaterThan(0)
      expect(step.errorHint.length).toBeGreaterThan(0)
      expect(step.checker).toBeDefined()
    }
  })

  it('declares the eight guided steps in order', () => {
    expect(level203BuildErrorsLesson.steps.map((step) => step.id)).toEqual([
      '2.3.1',
      '2.3.2',
      '2.3.3',
      '2.3.4',
      '2.3.5',
      '2.3.6',
      '2.3.7',
      '2.3.8',
    ])
  })

  it('build steps only allow docker build and run steps allow build and run', () => {
    for (const step of level203BuildErrorsLesson.steps.slice(0, 6)) {
      expect(step.allowedCommands).toEqual(['build'])
    }
    for (const step of level203BuildErrorsLesson.steps.slice(6, 8)) {
      expect(step.allowedCommands).toEqual(['build', 'run'])
    }
  })

  describe('checkers against the guided sequence', () => {
    it('2.3.1 missing-from fails before and passes after empty build', () => {
      expect(
        checkBuildError('missing-from', 'errores:0.0')(
          context(runCommands([], '')),
        ),
      ).toBe(false)

      const state = runCommands(['docker build -t errores:0.0 .'], '')
      expect(
        checkBuildError('missing-from', 'errores:0.0')(context(state, '')),
      ).toBe(true)
      expect(
        state.images.some((img) => img.reference === 'errores:0.0'),
      ).toBe(false)
    })

    it('2.3.2 from-not-first fails before and passes after', () => {
      const badDockerfile = ['WORKDIR /app', 'FROM nginx:latest'].join('\n')
      expect(
        checkBuildError('from-not-first', 'errores:0.1')(
          context(runCommands([], badDockerfile), badDockerfile),
        ),
      ).toBe(false)

      const state = runCommands(['docker build -t errores:0.1 .'], badDockerfile)
      expect(
        checkBuildError('from-not-first', 'errores:0.1')(context(state, badDockerfile)),
      ).toBe(true)
    })

    it('2.3.3 run-failed fails before and passes after', () => {
      const failDockerfile = [
        'FROM nginx:latest',
        'WORKDIR /usr/share/nginx/html',
        'COPY index.html .',
        'CMD ["nginx", "-g", "daemon off;"]',
        'RUN exit 1',
      ].join('\n')
      expect(
        checkBuildError('run-failed', 'errores:0.2')(
          context(runCommands([], failDockerfile), failDockerfile),
        ),
      ).toBe(false)

      const state = runCommands(['docker build -t errores:0.2 .'], failDockerfile)
      expect(
        checkBuildError('run-failed', 'errores:0.2')(context(state, failDockerfile)),
      ).toBe(true)
    })

    it('2.3.4 missing-start-command fails before and passes after', () => {
      const noStartDockerfile = [
        'FROM nginx:latest',
        'WORKDIR /usr/share/nginx/html',
        'COPY index.html .',
        'RUN echo ok',
      ].join('\n')
      expect(
        checkBuildError('missing-start-command', 'errores:0.3')(
          context(runCommands([], noStartDockerfile), noStartDockerfile),
        ),
      ).toBe(false)

      const state = runCommands(['docker build -t errores:0.3 .'], noStartDockerfile)
      expect(
        checkBuildError('missing-start-command', 'errores:0.3')(
          context(state, noStartDockerfile),
        ),
      ).toBe(true)
    })

    it('2.3.5 invalid-image-tag fails before and passes after', () => {
      expect(
        checkBuildError('invalid-image-tag', 'Mi-Sitio:1.0')(
          context(runCommands([], VALID_DOCKERFILE), VALID_DOCKERFILE),
        ),
      ).toBe(false)

      const state = runCommands(
        ['docker build -t Mi-Sitio:1.0 .'],
        VALID_DOCKERFILE,
      )
      expect(
        checkBuildError('invalid-image-tag', 'Mi-Sitio:1.0')(
          context(state, VALID_DOCKERFILE),
        ),
      ).toBe(true)
    })

    it('2.3.6 duplicate-image-tag fails before and passes after', () => {
      expect(
        checkBuildError('duplicate-image-tag', 'nginx:latest')(
          context(runCommands([], VALID_DOCKERFILE), VALID_DOCKERFILE),
        ),
      ).toBe(false)

      const state = runCommands(['docker build -t nginx:latest .'], VALID_DOCKERFILE)
      expect(
        checkBuildError('duplicate-image-tag', 'nginx:latest')(
          context(state, VALID_DOCKERFILE),
        ),
      ).toBe(true)
    })

    it('2.3.7 failed image run fails before and passes after', () => {
      const failDockerfile = [
        'FROM nginx:latest',
        'CMD ["nginx", "-g", "daemon off;"]',
        'RUN exit 1',
      ].join('\n')
      expect(
        checkFailedImageRun('errores:0.4', 'roto')(
          context(runCommands([], failDockerfile), failDockerfile),
        ),
      ).toBe(false)

      const state = runCommands(
        ['docker build -t errores:0.4 .', 'docker run -d --name roto errores:0.4'],
        failDockerfile,
      )
      expect(
        checkFailedImageRun('errores:0.4', 'roto')(context(state, failDockerfile)),
      ).toBe(true)
      expect(state.containers.some((c) => c.name === 'roto')).toBe(false)
    })

    it('2.3.8 recovered image fails before and passes after', () => {
      expect(
        checkRecoveredImage('errores:1.0', 'errores')(
          context(runCommands([], VALID_DOCKERFILE), VALID_DOCKERFILE),
        ),
      ).toBe(false)

      const state = runCommands(
        ['docker build -t errores:1.0 .', 'docker run -d --name errores errores:1.0'],
        VALID_DOCKERFILE,
      )
      expect(
        checkRecoveredImage('errores:1.0', 'errores')(context(state, VALID_DOCKERFILE)),
      ).toBe(true)
    })

    it('every step passes after the complete guided flow', () => {
      const state = runCommands(
        [
          'docker build -t errores:1.0 .',
          'docker run -d --name errores errores:1.0',
        ],
        VALID_DOCKERFILE,
      )
      const ctx = context(state, VALID_DOCKERFILE)

      expect(checkRecoveredImage('errores:1.0', 'errores')(ctx)).toBe(true)
    })
  })
})
