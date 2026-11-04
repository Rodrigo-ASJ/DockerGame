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
    <div className="min-w-0 space-y-7">
      <header className="tc-card tc-wobble relative overflow-hidden p-6 sm:p-7">
        <div aria-hidden="true" className="tc-stripe text-mutant" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="tc-kicker">
                Nivel {lesson.level.toString().padStart(2, '0')} · Módulo
              </p>
              <h1 className="tc-title-shadow mt-3 font-display text-3xl leading-[1.05] tracking-wide text-bone sm:text-4xl lg:text-5xl">
                {lesson.title}
              </h1>
            </div>
            <span className="tc-stamp tc-stamp--acid shrink-0">
              {currentStepNumber}/{totalSteps}
            </span>
          </div>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-bone/75">
            {lesson.objective}
          </p>
        </div>
      </header>

      {isLessonCompleted && (
        <div
          role="status"
          className="tc-feedback tc-feedback--success flex items-start gap-3"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center border-2 border-ink font-mono text-xs font-bold"
          >
            ✓
          </span>
          <span>
            Lección completada. Puedes practicar de nuevo sin perder la insignia
            del índice.
          </span>
        </div>
      )}

      <section
        aria-labelledby="explanation-title"
        className="tc-card tc-wobble relative overflow-hidden p-5 sm:p-6"
      >
        <div aria-hidden="true" className="tc-stripe text-acid" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="explanation-title"
              className="font-display text-xl leading-tight tracking-wide text-bone sm:text-2xl"
            >
              ¿Qué vas a aprender?
            </h2>
            <span className="tc-badge tc-badge--muted">Teoría</span>
          </div>
          <p className="mt-3 leading-relaxed text-bone/75">{lesson.explanation}</p>
        </div>
      </section>

      <ConceptDiagram diagram={lesson.diagram} />

      <section
        aria-labelledby="step-title"
        className="tc-card tc-wobble relative overflow-hidden p-5 sm:p-6"
      >
        <div aria-hidden="true" className="tc-stripe text-mutant" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="tc-kicker">
              Desafío · Paso {currentStepNumber} de {totalSteps}
            </p>
            {isStepPassed && <span className="tc-badge">Paso superado</span>}
          </div>

          <h2
            id="step-title"
            className="mt-3 font-display text-2xl leading-tight tracking-wide text-bone sm:text-3xl"
          >
            {currentStep.title}
          </h2>
          <p className="mt-3 leading-relaxed text-bone/75">{currentStep.instruction}</p>

          <div className="mt-5 border-4 border-ink bg-ink/40 p-3 shadow-[3px_3px_0_#0b0a0a]">
            <p className="tc-label">Comandos permitidos</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {currentStep.allowedCommands.map((kind) => (
                <span
                  key={kind}
                  className="inline-flex items-center border-2 border-ink bg-acid px-2.5 py-1 font-mono text-[0.68rem] font-bold text-ink shadow-[2px_2px_0_#0b0a0a]"
                >
                  {COMMAND_LABELS[kind]}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <StepControls
              canCheck
              canAdvance={isStepPassed}
              isLastStep={isLastStep}
              onCheck={onCheckStep}
              onAdvance={onAdvance}
            />
            <Feedback feedback={feedback} />
          </div>
        </div>
      </section>

      <section
        aria-labelledby="workspace-title"
        className="tc-card tc-wobble relative overflow-hidden p-4 sm:p-6"
      >
        <div aria-hidden="true" className="tc-stripe text-acid" />
        <div className="relative">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2
              id="workspace-title"
              className="font-display text-xl leading-tight tracking-wide text-bone sm:text-2xl"
            >
              Espacio de trabajo
            </h2>
            <span className="tc-badge tc-badge--muted">Terminal &amp; Runtime</span>
          </div>

          <div className="grid gap-7 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
            <TerminalPanel
              entries={terminalEntries}
              onSubmitCommand={onRunCommand}
              terminalFactory={terminalFactory}
            />
            <VisualPanel containers={simState.containers} />
          </div>
        </div>
      </section>
    </div>
  )
}
