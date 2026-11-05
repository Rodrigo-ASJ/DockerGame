import { describe, expect, it } from 'vitest'
import { createInitialSimState, executeCommand } from '../../core/engine'
import {
  checkContainer,
  checkHistoryError,
  checkHistorySelected,
  checkImagesListed,
} from '../../core/checkers'
import type { SimState, StepCheckContext } from '../../core/types'
import { baseImages } from '../images/base-images'
import {
  LEVEL2_01_IMAGES_LAYERS_LESSON_ID,
  level201ImagesLayersLesson,
} from './level2-01-images-layers'

function runCommands(
  commands: readonly string[],
): SimState {
  return commands.reduce(
    (state, command) =>
      executeCommand(state, command, {
        availableCommands: ['ps', 'run', 'images', 'history'],
      }).state,
    createInitialSimState({ baseImages }),
  )
}

function context(
  state: SimState,
  dockerfile?: string,
): StepCheckContext {
  return { state, log: state.log, dockerfile }
}

describe('level201ImagesLayersLesson', () => {
  it('declares identity, level and available commands', () => {
    expect(level201ImagesLayersLesson.id).toBe(
      LEVEL2_01_IMAGES_LAYERS_LESSON_ID,
    )
    expect(level201ImagesLayersLesson.level).toBe(2)
    expect(level201ImagesLayersLesson.title).toBe('Imágenes y capas')
    expect(level201ImagesLayersLesson.availableCommands).toEqual([
      'ps',
      'run',
      'images',
      'history',
      'build',
    ])
  })

  it('includes student-facing Spanish content', () => {
    expect(level201ImagesLayersLesson.explanation).toContain('imagen')
    expect(level201ImagesLayersLesson.explanation).toContain('contenedor')
    expect(level201ImagesLayersLesson.explanation).toContain('capas')
    expect(level201ImagesLayersLesson.diagram.steps).toHaveLength(3)
    expect(level201ImagesLayersLesson.diagram.steps[0]?.label).toContain(
      'Imagen',
    )
    expect(level201ImagesLayersLesson.diagram.steps[1]?.label).toBe(
      'docker run',
    )
    expect(level201ImagesLayersLesson.diagram.steps[2]?.label).toContain(
      'Contenedor',
    )

    for (const step of level201ImagesLayersLesson.steps) {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.instruction.length).toBeGreaterThan(0)
      expect(step.successMessage.length).toBeGreaterThan(0)
      expect(step.errorHint.length).toBeGreaterThan(0)
      expect(step.checker).toBeDefined()
    }
  })

  it('declares the five guided steps in order', () => {
    expect(level201ImagesLayersLesson.steps.map((step) => step.id)).toEqual([
      '2.1.1',
      '2.1.2',
      '2.1.3',
      '2.1.4',
      '2.1.5',
    ])
  })

  it('allows only docker images during step 2.1.1', () => {
    const [step] = level201ImagesLayersLesson.steps

    expect(step?.allowedCommands).toEqual(['images'])
  })

  it('blocks docker run when not allowed', () => {
    const [step] = level201ImagesLayersLesson.steps
    const result = executeCommand(
      createInitialSimState({ baseImages }),
      'docker run -d --name web nginx:alpine',
      { allowedCommands: step?.allowedCommands },
    )

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('command-not-allowed')
    expect(result.state.containers).toEqual([])
  })

  describe('checkers against the guided sequence', () => {
    const guided = [
      'docker images',
      'docker history nginx:latest',
      'docker history nginx:alpine',
      'docker history nginx:no-existe',
      'docker run -d --name web nginx:alpine',
    ]

    it('step 2.1.1 fails before docker images and passes after', () => {
      expect(checkImagesListed(context(createInitialSimState({ baseImages })))).toBe(false)

      const state = runCommands(['docker images'])
      expect(checkImagesListed(context(state))).toBe(true)
      expect(state.selectedImage).toBeNull()
      expect(state.images).toHaveLength(2)
    })

    it('step 2.1.2 fails before history and passes after', () => {
      const stateBefore = runCommands(['docker images'])
      expect(
        checkHistorySelected('nginx:latest')(context(stateBefore)),
      ).toBe(false)

      const state = runCommands([
        'docker images',
        'docker history nginx:latest',
      ])
      expect(checkHistorySelected('nginx:latest')(context(state))).toBe(true)
      expect(state.selectedImage).toBe('nginx:latest')

      const image = state.images.find((img) => img.reference === 'nginx:latest')
      expect(image?.layers).toHaveLength(3)
      expect(image?.layers.map((layer) => layer.sizeKb)).toEqual([
        100000, 70000, 17000,
      ])
    })

    it('step 2.1.3 selects nginx:alpine with 20/18/5 MB layers', () => {
      const state = runCommands([
        'docker images',
        'docker history nginx:latest',
        'docker history nginx:alpine',
      ])
      expect(checkHistorySelected('nginx:alpine')(context(state))).toBe(true)
      expect(state.selectedImage).toBe('nginx:alpine')

      const image = state.images.find((img) => img.reference === 'nginx:alpine')
      expect(image?.layers.map((layer) => layer.sizeKb)).toEqual([
        20000, 18000, 5000,
      ])
    })

    it('step 2.1.4 fails with image-not-found and keeps selectedImage', () => {
      const stateBefore = runCommands([
        'docker images',
        'docker history nginx:latest',
        'docker history nginx:alpine',
      ])
      expect(stateBefore.selectedImage).toBe('nginx:alpine')

      const state = runCommands([
        ...guided.slice(0, 3),
        'docker history nginx:no-existe',
      ])
      expect(checkHistoryError('image-not-found')(context(state))).toBe(true)
      expect(state.selectedImage).toBe('nginx:alpine')
      expect(state.images).toHaveLength(2)
    })

    it('step 2.1.5 fails before run and passes after creating web', () => {
      const stateBefore = runCommands(guided.slice(0, 4))
      expect(
        checkContainer('web', 'nginx:alpine')(context(stateBefore)),
      ).toBe(false)

      const state = runCommands(guided)
      expect(checkContainer('web', 'nginx:alpine')(context(state))).toBe(true)
      const container = state.containers.find((c) => c.name === 'web')
      expect(container?.status).toBe('running')
      expect(container?.image).toBe('nginx:alpine')
    })

    it('every step passes after the complete guided flow', () => {
      const ctx = context(runCommands(guided))

      expect(checkImagesListed(ctx)).toBe(true)
      // checkHistorySelected('nginx:latest') no persiste: selectedImage cambia
      // al inspeccionar nginx:alpine en el paso 2.1.3.
      expect(checkHistorySelected('nginx:alpine')(ctx)).toBe(true)
      expect(checkHistoryError('image-not-found')(ctx)).toBe(true)
      expect(checkContainer('web', 'nginx:alpine')(ctx)).toBe(true)
    })
  })
})
