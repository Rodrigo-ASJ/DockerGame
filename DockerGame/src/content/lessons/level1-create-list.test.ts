import { describe, expect, it } from 'vitest'
import { STEP_IDS, stepCheckers } from '../../core/checkers'
import { createInitialSimState, executeCommand } from '../../core/engine'
import type { SimState, StepCheckContext } from '../../core/types'
import {
  LEVEL1_CREATE_LIST_LESSON_ID,
  level1CreateListLesson,
} from './level1-create-list'

const completeLessonCommands = [
  'docker ps',
  'docker run -d --name web nginx',
  'docker ps',
  'docker run -d --name web nginx',
  'docker run -d --name web2 nginx:inexistente',
  'docker run -d --name web2 nginx',
  'docker ps',
]

function playLesson(): StepCheckContext {
  const state = completeLessonCommands.reduce<SimState>(
    (currentState, command) => executeCommand(currentState, command).state,
    createInitialSimState(),
  )

  return { state, log: state.log }
}

describe('level1CreateListLesson', () => {
  it('declares the expected identity and level', () => {
    expect(level1CreateListLesson.id).toBe(LEVEL1_CREATE_LIST_LESSON_ID)
    expect(level1CreateListLesson.level).toBe(1)
    expect(level1CreateListLesson.title).toBe('Crear y listar contenedores')
  })

  it('includes student-facing Spanish content', () => {
    expect(level1CreateListLesson.explanation).toContain('contenedor')
    expect(level1CreateListLesson.objective).toContain('nginx')
    expect(level1CreateListLesson.diagram.steps).toHaveLength(3)
    expect(level1CreateListLesson.diagram.steps[0]?.label).toContain(
      'docker run',
    )
    expect(level1CreateListLesson.diagram.steps[2]?.label).toBe('docker ps')

    for (const step of level1CreateListLesson.steps) {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.instruction.length).toBeGreaterThan(0)
      expect(step.successMessage.length).toBeGreaterThan(0)
      expect(step.errorHint.length).toBeGreaterThan(0)
    }
  })

  it('declares the six guided steps in order with their checkers', () => {
    expect(level1CreateListLesson.steps.map((step) => step.id)).toEqual(
      Object.values(STEP_IDS),
    )
    expect(level1CreateListLesson.steps.map((step) => step.checker)).toEqual(
      Object.values(stepCheckers),
    )
  })

  it('only allows docker ps during the empty-list step', () => {
    const [emptyListStep] = level1CreateListLesson.steps

    expect(emptyListStep?.allowedCommands).toEqual(['ps'])

    for (const step of level1CreateListLesson.steps.slice(1)) {
      expect(step.allowedCommands).toEqual(['ps', 'run'])
    }
  })

  it('blocks docker run in the empty-list step', () => {
    const [emptyListStep] = level1CreateListLesson.steps
    const result = executeCommand(
      createInitialSimState(),
      'docker run -d --name web nginx',
      { allowedCommands: emptyListStep?.allowedCommands },
    )

    expect(result.ok).toBe(false)
    expect(result.error?.code).toBe('command-not-allowed')
    expect(result.state.containers).toEqual([])
  })

  it('every step passes after the complete guided flow', () => {
    const context = playLesson()

    for (const step of level1CreateListLesson.steps) {
      expect(step.checker(context)).toBe(true)
    }
  })
})
