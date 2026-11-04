import { level1CreateListLesson } from './content/lessons/level1-create-list'
import { LessonIndex } from './ui/components/LessonIndex'
import { LessonView } from './ui/components/LessonView'
import { useLesson } from './ui/hooks/useLesson'
import type { TerminalFactory } from './ui/terminal/types'

type AppProps = {
  readonly terminalFactory?: TerminalFactory
}

function App({ terminalFactory }: AppProps = {}) {
  const lessonState = useLesson(level1CreateListLesson)

  return (
    <div className="relative min-h-screen text-bone">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border-4 focus:border-ink focus:bg-acid focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:font-bold focus:uppercase focus:tracking-widest focus:text-ink focus:shadow-[4px_4px_0_#0b0a0a]"
      >
        Saltar al contenido principal
      </a>

      <header className="relative z-20 border-b-[5px] border-ink bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="tc-wobble-sm flex h-12 w-12 -rotate-2 items-center justify-center border-4 border-ink bg-acid shadow-[4px_4px_0_#0b0a0a]">
              <span aria-hidden="true" className="font-mono text-lg font-bold text-ink">
                {'>'}_
              </span>
            </div>
            <div>
              <p className="tc-title-shadow font-display text-2xl leading-none tracking-wide text-bone sm:text-3xl">
                Docker<span className="text-acid">Game</span>
              </p>
              <p className="tc-kicker mt-1 text-[0.6rem]">Simulador interactivo</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="tc-badge tc-badge--muted">Nivel 01</span>
            <span className="tc-badge">
              <span
                aria-hidden="true"
                className="h-2 w-2 border border-ink bg-ink shadow-[1px_1px_0_#f5f2f4]"
              />
              Sin ejecución real
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 border-b-[5px] border-ink bg-acid px-4 py-2 text-center">
        <p className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.28em] text-ink">
          Aprende Docker a base de prueba y error · 100% en el navegador
        </p>
      </div>

      <main
        id="contenido-principal"
        className="relative mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(250px,300px)_minmax(0,1fr)]"
      >
        <LessonIndex
          items={[
            {
              id: level1CreateListLesson.id,
              level: level1CreateListLesson.level,
              title: level1CreateListLesson.title,
              completed: lessonState.isLessonCompleted,
            },
          ]}
          activeLessonId={level1CreateListLesson.id}
        />

        <LessonView
          lesson={level1CreateListLesson}
          simState={lessonState.simState}
          currentStep={lessonState.currentStep}
          currentStepNumber={lessonState.currentStepNumber}
          totalSteps={lessonState.totalSteps}
          isStepPassed={lessonState.isStepPassed}
          isLessonCompleted={lessonState.isLessonCompleted}
          feedback={lessonState.feedback}
          terminalEntries={lessonState.terminalEntries}
          onRunCommand={lessonState.runCommand}
          onCheckStep={lessonState.checkStep}
          onAdvance={lessonState.advance}
          terminalFactory={terminalFactory}
        />
      </main>

      <footer className="relative z-10 mt-4 border-t-[5px] border-ink bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-8">
          <p className="tc-kicker">DockerGame · Simulación educativa</p>
          <p className="font-mono text-[0.62rem] font-bold uppercase tracking-[0.18em] text-bone/60">
            Ningún comando se ejecuta en tu equipo
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
