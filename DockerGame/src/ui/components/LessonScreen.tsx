import type { Lesson } from '../../core/types'
import type { TerminalFactory } from '../terminal/types'
import { useLesson } from '../hooks/useLesson'
import { LessonView } from './LessonView'

type LessonScreenProps = {
  readonly lesson: Lesson
  readonly isLessonCompleted: boolean
  readonly onComplete: (lessonId: string) => void
  readonly terminalFactory?: TerminalFactory
}

/**
 * Monta el estado de una lección y renderiza su vista.
 *
 * `App` lo monta con `key={activeLesson.id}`, de modo que al cambiar o
 * recargar la lección se reinicia editor, terminal, simulación y paso.
 */
export function LessonScreen({
  lesson,
  isLessonCompleted,
  onComplete,
  terminalFactory,
}: LessonScreenProps) {
  const lessonState = useLesson(lesson, { isLessonCompleted, onComplete })

  return (
    <LessonView
      lesson={lessonState.lesson}
      simState={lessonState.simState}
      currentStep={lessonState.currentStep}
      currentStepNumber={lessonState.currentStepNumber}
      totalSteps={lessonState.totalSteps}
      isStepPassed={lessonState.isStepPassed}
      isLessonCompleted={lessonState.isLessonCompleted}
      feedback={lessonState.feedback}
      terminalEntries={lessonState.terminalEntries}
      dockerfile={lessonState.dockerfile}
      onDockerfileChange={lessonState.onDockerfileChange}
      onRunCommand={lessonState.runCommand}
      onCheckStep={lessonState.checkStep}
      onAdvance={lessonState.advance}
      terminalFactory={terminalFactory}
    />
  )
}
