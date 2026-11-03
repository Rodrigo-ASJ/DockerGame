import { useCallback, useMemo, useState } from 'react'
import { createInitialSimState, executeCommand } from '../../core/engine'
import type {
  CommandLogEntry,
  Lesson,
  LessonStep,
  SimState,
} from '../../core/types'
import { loadProgress, saveProgress } from '../storage/progressStorage'
import type { TerminalEntry } from '../terminal/types'
import type { FeedbackMessage } from '../types'

function getStep(lesson: Lesson, index: number): LessonStep {
  const step = lesson.steps[index]

  if (step === undefined) {
    throw new Error(`La lección "${lesson.id}" no tiene paso en el índice ${index}.`)
  }

  return step
}

function buildTerminalEntries(
  log: readonly CommandLogEntry[],
): TerminalEntry[] {
  const entries: TerminalEntry[] = []

  for (const entry of log) {
    entries.push({
      text: `$ ${entry.normalizedCommand}`,
      tone: 'command',
    })

    for (const line of entry.lines) {
      entries.push({
        text: line,
        tone: entry.ok ? 'output' : 'error',
      })
    }
  }

  return entries
}

export type LessonState = {
  readonly lesson: Lesson
  readonly simState: SimState
  readonly currentStep: LessonStep
  readonly currentStepIndex: number
  readonly currentStepNumber: number
  readonly totalSteps: number
  readonly isStepPassed: boolean
  readonly isLessonCompleted: boolean
  readonly feedback: FeedbackMessage | null
  readonly terminalEntries: readonly TerminalEntry[]
  readonly runCommand: (command: string) => void
  readonly checkStep: () => void
  readonly advance: () => void
}

export function useLesson(lesson: Lesson): LessonState {
  const [simState, setSimState] = useState<SimState>(createInitialSimState)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isStepPassed, setIsStepPassed] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)
  const [progress, setProgress] = useState(() => loadProgress())

  const currentStep = getStep(lesson, currentStepIndex)
  const isLessonCompleted = progress.completedLessonIds.includes(lesson.id)
  const terminalEntries = useMemo(
    () => buildTerminalEntries(simState.log),
    [simState.log],
  )

  const runCommand = useCallback(
    (command: string) => {
      const result = executeCommand(simState, command, {
        allowedCommands: currentStep.allowedCommands,
      })

      setSimState(result.state)

      if (result.error?.code === 'command-not-allowed') {
        setFeedback({ tone: 'error', message: currentStep.errorHint })
      } else if (!isStepPassed) {
        setFeedback(null)
      }
    },
    [simState, currentStep, isStepPassed],
  )

  const checkStep = useCallback(() => {
    const passed = currentStep.checker({
      state: simState,
      log: simState.log,
    })

    setIsStepPassed(passed)
    setFeedback(
      passed
        ? { tone: 'success', message: currentStep.successMessage }
        : { tone: 'error', message: currentStep.errorHint },
    )
  }, [currentStep, simState])

  const advance = useCallback(() => {
    if (!isStepPassed) {
      setFeedback({
        tone: 'error',
        message: 'Primero debes superar el paso actual con «Comprobar».',
      })
      return
    }

    const isLastStep = currentStepIndex === lesson.steps.length - 1

    if (isLastStep) {
      const completedLessonIds = progress.completedLessonIds.includes(lesson.id)
        ? progress.completedLessonIds
        : [...progress.completedLessonIds, lesson.id]
      const nextProgress = { completedLessonIds }

      saveProgress(nextProgress)
      setProgress(nextProgress)
      setFeedback({
        tone: 'success',
        message:
          '¡Lección completada! Puedes repetirla cuando quieras; tu progreso queda guardado en el índice.',
      })
      return
    }

    setCurrentStepIndex((index) => index + 1)
    setIsStepPassed(false)
    setFeedback(null)
  }, [
    currentStepIndex,
    isStepPassed,
    lesson.id,
    lesson.steps.length,
    progress.completedLessonIds,
  ])

  return {
    lesson,
    simState,
    currentStep,
    currentStepIndex,
    currentStepNumber: currentStepIndex + 1,
    totalSteps: lesson.steps.length,
    isStepPassed,
    isLessonCompleted,
    feedback,
    terminalEntries,
    runCommand,
    checkStep,
    advance,
  }
}
