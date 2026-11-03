import type { CommandLogEntry, StepChecker, StepCheckContext } from './types'

export const STEP_IDS = {
  emptyList: 'empty-list',
  createContainer: 'create-container',
  listContainer: 'list-container',
  duplicateName: 'duplicate-name',
  missingImage: 'missing-image',
  correctAndList: 'correct-and-list',
} as const

export type LessonStepId = (typeof STEP_IDS)[keyof typeof STEP_IDS]

function isSuccessfulRun(
  entry: CommandLogEntry,
  name: string,
  image: string,
): boolean {
  return (
    entry.ok &&
    entry.command?.kind === 'run' &&
    entry.command.name === name &&
    entry.command.image === image
  )
}

function findSuccessfulRun(
  log: readonly CommandLogEntry[],
  name: string,
  image: string,
): number {
  return log.findIndex((entry) => isSuccessfulRun(entry, name, image))
}

function hasSuccessfulListAfter(
  log: readonly CommandLogEntry[],
  index: number,
  minimumContainerCount: number,
): boolean {
  return log.some(
    (entry, entryIndex) =>
      entryIndex > index &&
      entry.ok &&
      entry.command?.kind === 'ps' &&
      entry.containerCountBefore >= minimumContainerCount,
  )
}

function hasError(
  log: readonly CommandLogEntry[],
  code: string,
  name: string,
): boolean {
  return log.some(
    (entry) =>
      !entry.ok &&
      entry.error?.code === code &&
      entry.command?.kind === 'run' &&
      entry.command.name === name,
  )
}

export const checkEmptyList: StepChecker = ({ log }) =>
  log.some(
    (entry) =>
      entry.ok &&
      entry.command?.kind === 'ps' &&
      entry.containerCountBefore === 0,
  )

export const checkCreateContainer: StepChecker = ({ state }) =>
  state.containers.some(
    (container) =>
      container.name === 'web' &&
      container.image === 'nginx' &&
      container.status === 'running',
  )

export const checkListContainer: StepChecker = ({ state, log }) => {
  const hasWeb = state.containers.some(
    (container) => container.name === 'web' && container.status === 'running',
  )

  if (!hasWeb) {
    return false
  }

  const creationIndex = findSuccessfulRun(log, 'web', 'nginx')
  return creationIndex >= 0 && hasSuccessfulListAfter(log, creationIndex, 1)
}

export const checkDuplicateName: StepChecker = ({ state, log }) => {
  const hasOnlyOneWeb =
    state.containers.filter((container) => container.name === 'web').length === 1

  return hasOnlyOneWeb && hasError(log, 'duplicate-name', 'web')
}

export const checkMissingImage: StepChecker = ({ log }) =>
  hasError(log, 'image-not-found', 'web2')

export const checkCorrectAndList: StepChecker = ({ state, log }) => {
  const hasWeb = state.containers.some(
    (container) =>
      container.name === 'web' &&
      container.image === 'nginx' &&
      container.status === 'running',
  )
  const hasWeb2 = state.containers.some(
    (container) =>
      container.name === 'web2' &&
      container.image === 'nginx' &&
      container.status === 'running',
  )

  if (!hasWeb || !hasWeb2) {
    return false
  }

  const web2CreationIndex = findSuccessfulRun(log, 'web2', 'nginx')
  return (
    web2CreationIndex >= 0 &&
    hasSuccessfulListAfter(log, web2CreationIndex, 2)
  )
}

export const stepCheckers: Record<LessonStepId, StepChecker> = {
  [STEP_IDS.emptyList]: checkEmptyList,
  [STEP_IDS.createContainer]: checkCreateContainer,
  [STEP_IDS.listContainer]: checkListContainer,
  [STEP_IDS.duplicateName]: checkDuplicateName,
  [STEP_IDS.missingImage]: checkMissingImage,
  [STEP_IDS.correctAndList]: checkCorrectAndList,
}

export function checkStep(
  stepId: LessonStepId,
  context: StepCheckContext,
): boolean {
  return stepCheckers[stepId](context)
}
