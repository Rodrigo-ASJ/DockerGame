import type {
  CommandKind,
  Lesson,
  LessonStep,
  SimState,
} from '../../core/types'
import type { TerminalEntry, TerminalFactory } from '../terminal/types'
import type { FeedbackMessage } from '../types'
import { ConceptDiagram } from './ConceptDiagram'
import { Feedback } from './Feedback'
import { StepControls } from './StepControls'
import { TerminalPanel } from './TerminalPanel'
import { VisualPanel } from './VisualPanel'

const COMMAND_LABELS: Record<CommandKind, string> = {
  ps: 'docker ps',
  run: 'docker run',
}

type LessonViewProps = {
  readonly lesson: Lesson
  readonly simState: SimState
  readonly currentStep: LessonStep
  readonly currentStepNumber: number
  readonly totalSteps: number
  readonly isStepPassed: boolean
  readonly isLessonCompleted: boolean
  readonly feedback: FeedbackMessage | null
  readonly terminalEntries: readonly TerminalEntry[]
  readonly onRunCommand: (command: string) => void
  readonly onCheckStep: () => void
  readonly onAdvance: () => void
  readonly terminalFactory?: TerminalFactory
}

export function LessonView({
  lesson,
  simState,
  currentStep,
  currentStepNumber,
  totalSteps,
  isStepPassed,
  isLessonCompleted,
  feedback,
  terminalEntries,
  onRunCommand,
  onCheckStep,
  onAdvance,
  terminalFactory,
}: LessonViewProps) {
  const isLastStep = currentStepNumber === totalSteps

  return (
    <div className="min-w-0 space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-lg">
        <p className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">
          Nivel {lesson.level} · Lección
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">
          {lesson.title}
        </h1>
        <p className="mt-3 max-w-3xl text-slate-400">{lesson.objective}</p>
      </header>

      {isLessonCompleted && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          Lección completada. Puedes practicar de nuevo sin perder la insignia
          del índice.
        </div>
      )}

      <section
        aria-labelledby="explanation-title"
        className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg"
      >
        <h2 id="explanation-title" className="text-lg font-semibold text-slate-100">
          ¿Qué vas a aprender?
        </h2>
        <p className="mt-2 leading-relaxed text-slate-400">
          {lesson.explanation}
        </p>
      </section>

      <ConceptDiagram diagram={lesson.diagram} />

      <section
        aria-labelledby="step-title"
        className="rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-5 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">
            Paso {currentStepNumber} de {totalSteps}
          </p>
          {isStepPassed && (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
              Paso superado
            </span>
          )}
        </div>

        <h2 id="step-title" className="mt-2 text-xl font-semibold text-slate-100">
          {currentStep.title}
        </h2>
        <p className="mt-2 leading-relaxed text-slate-300">
          {currentStep.instruction}
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Comandos permitidos:{' '}
          <span className="font-mono text-slate-300">
            {currentStep.allowedCommands.map((kind) => COMMAND_LABELS[kind]).join(' · ')}
          </span>
        </p>

        <div className="mt-5 space-y-3">
          <StepControls
            canCheck
            canAdvance={isStepPassed}
            isLastStep={isLastStep}
            onCheck={onCheckStep}
            onAdvance={onAdvance}
          />
          <Feedback feedback={feedback} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <TerminalPanel
          entries={terminalEntries}
          onSubmitCommand={onRunCommand}
          terminalFactory={terminalFactory}
        />
        <VisualPanel containers={simState.containers} />
      </div>
    </div>
  )
}
