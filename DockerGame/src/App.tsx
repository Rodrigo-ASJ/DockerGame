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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-4">
          <p className="text-lg font-semibold tracking-tight text-slate-50">
            Docker<span className="text-cyan-400">Game</span>
          </p>
          <p className="text-sm text-slate-500">
            Aprende Docker practicando, sin instalar nada
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
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
    </div>
  )
}

export default App
