import { useCallback, useMemo, useState } from 'react'
import { createInitialSimState, executeCommand } from '../../core/engine'
import { curriculum } from '../../content/curriculum'
import type {
  CommandLogEntry,
  Lesson,
  LessonStep,
  SimState,
} from '../../core/types'
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
  readonly dockerfile: string
  readonly onDockerfileChange: (value: string) => void
  readonly runCommand: (command: string) => void
  readonly checkStep: () => void
  readonly advance: () => void
}

export function useLesson(
  lesson: Lesson,
  options: { readonly isLessonCompleted: boolean; readonly onComplete: (lessonId: string) => void },
): LessonState {
  const { isLessonCompleted, onComplete } = options
  const [simState, setSimState] = useState<SimState>(() =>
    createInitialSimState({
      baseImages: curriculum.baseImages,
      projectFiles: lesson.workspace?.projectFiles,
    }),
  )
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isStepPassed, setIsStepPassed] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)
  const [dockerfile, setDockerfile] = useState(
    lesson.workspace?.initialDockerfile ?? '',
  )

  const currentStep = getStep(lesson, currentStepIndex)
  const terminalEntries = useMemo(
    () => buildTerminalEntries(simState.log),
    [simState.log],
  )

  const runCommand = useCallback(
    (command: string) => {
      const result = executeCommand(simState, command, {
        availableCommands: lesson.availableCommands,
        allowedCommands: currentStep.allowedCommands,
        dockerfile,
      })

      setSimState(result.state)

      if (result.error?.code === 'command-not-allowed') {
        setFeedback({ tone: 'error', message: currentStep.errorHint })
      } else if (!isStepPassed) {
        setFeedback(null)
      }
    },
    [simState, currentStep, isStepPassed, dockerfile, lesson.availableCommands],
  )

  const checkStep = useCallback(() => {
    const passed = currentStep.checker({
      state: simState,
      log: simState.log,
      dockerfile,
    })

    setIsStepPassed(passed)
    setFeedback(
      passed
        ? { tone: 'success', message: currentStep.successMessage }
        : { tone: 'error', message: currentStep.errorHint },
    )
  }, [currentStep, simState, dockerfile])

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
      onComplete(lesson.id)
      return
    }

    setCurrentStepIndex((index) => index + 1)
    setIsStepPassed(false)
    setFeedback(null)
  }, [currentStepIndex, isStepPassed, lesson, onComplete])

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
    dockerfile,
    onDockerfileChange: setDockerfile,
    runCommand,
    checkStep,
    advance,
  }
}
