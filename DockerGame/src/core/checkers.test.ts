import { describe, expect, it } from 'vitest'
import {
  checkCorrectAndList,
  checkCreateContainer,
  checkDuplicateName,
  checkEmptyList,
  checkListContainer,
  checkMissingImage,
  checkStep,
  STEP_IDS,
  stepCheckers,
} from './checkers'
import { createInitialSimState, executeCommand } from './engine'
import type { SimState, StepCheckContext } from './types'

function runCommands(commands: readonly string[]): SimState {
  return commands.reduce(
    (state, command) => executeCommand(state, command).state,
    createInitialSimState(),
  )
}

function context(state: SimState): StepCheckContext {
  return { state, log: state.log }
}

const firstContainer = [
  'docker ps',
  'docker run -d --name web nginx',
  'docker ps',
]

const withDuplicateError = [
  ...firstContainer,
  'docker run -d --name web nginx',
]

const withMissingImageError = [
  ...withDuplicateError,
  'docker run -d --name web2 nginx:inexistente',
]

const completeLesson = [
  ...withMissingImageError,
  'docker run -d --name web2 nginx',
  'docker ps',
]

describe('lesson checkers', () => {
  describe('empty list', () => {
    it('fails before running docker ps', () => {
      expect(checkEmptyList(context(createInitialSimState()))).toBe(false)
    })

    it('passes after docker ps with no containers', () => {
      const state = runCommands(['docker ps'])

      expect(checkEmptyList(context(state))).toBe(true)
    })

    it('fails if docker ps only ran with containers', () => {
      const state = runCommands([
        'docker run -d --name web nginx',
        'docker ps',
      ])

      expect(checkEmptyList(context(state))).toBe(false)
    })
  })

  describe('create container', () => {
    it('fails before the container exists', () => {
      const state = runCommands(['docker ps'])

      expect(checkCreateContainer(context(state))).toBe(false)
    })

    it('passes after creating web from nginx', () => {
      const state = runCommands([
        'docker ps',
        'docker run -d --name web nginx',
      ])

      expect(checkCreateContainer(context(state))).toBe(true)
    })
  })

  describe('list container', () => {
    it('fails before listing the created container', () => {
      const state = runCommands([
        'docker ps',
        'docker run -d --name web nginx',
      ])

      expect(checkListContainer(context(state))).toBe(false)
    })

    it('passes after listing web', () => {
      const state = runCommands(firstContainer)

      expect(checkListContainer(context(state))).toBe(true)
    })
  })

  describe('duplicate name', () => {
    it('fails without the duplicate error', () => {
      const state = runCommands(firstContainer)

      expect(checkDuplicateName(context(state))).toBe(false)
    })

    it('passes after trying to reuse the web name', () => {
      const state = runCommands(withDuplicateError)

      expect(checkDuplicateName(context(state))).toBe(true)
    })
  })

  describe('missing image', () => {
    it('fails without the image error', () => {
      const state = runCommands(withDuplicateError)

      expect(checkMissingImage(context(state))).toBe(false)
    })

    it('passes after trying a non-nginx image for web2', () => {
      const state = runCommands(withMissingImageError)

      expect(checkMissingImage(context(state))).toBe(true)
    })
  })

  describe('correct and list', () => {
    it('fails before web2 is created', () => {
      const state = runCommands(withMissingImageError)

      expect(checkCorrectAndList(context(state))).toBe(false)
    })

    it('fails after creating web2 without listing both containers', () => {
      const state = runCommands([
        ...withMissingImageError,
        'docker run -d --name web2 nginx',
      ])

      expect(checkCorrectAndList(context(state))).toBe(false)
    })

    it('passes after creating web2 and listing both containers', () => {
      const state = runCommands(completeLesson)

      expect(checkCorrectAndList(context(state))).toBe(true)
    })
  })

  it('passes every step during the complete lesson flow', () => {
    const state = runCommands(completeLesson)
    const checkContext = context(state)

    expect(checkEmptyList(checkContext)).toBe(true)
    expect(checkCreateContainer(checkContext)).toBe(true)
    expect(checkListContainer(checkContext)).toBe(true)
    expect(checkDuplicateName(checkContext)).toBe(true)
    expect(checkMissingImage(checkContext)).toBe(true)
    expect(checkCorrectAndList(checkContext)).toBe(true)
  })

  it('exposes checkers by step id', () => {
    const state = runCommands(completeLesson)

    expect(checkStep(STEP_IDS.emptyList, context(state))).toBe(true)
    expect(stepCheckers[STEP_IDS.emptyList]).toBe(checkEmptyList)
    expect(stepCheckers[STEP_IDS.createContainer]).toBe(checkCreateContainer)
    expect(stepCheckers[STEP_IDS.listContainer]).toBe(checkListContainer)
    expect(stepCheckers[STEP_IDS.duplicateName]).toBe(checkDuplicateName)
    expect(stepCheckers[STEP_IDS.missingImage]).toBe(checkMissingImage)
    expect(stepCheckers[STEP_IDS.correctAndList]).toBe(checkCorrectAndList)
  })
})
