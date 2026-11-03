export type LessonIndexItem = {
  readonly id: string
  readonly level: number
  readonly title: string
  readonly completed: boolean
}

type LessonIndexProps = {
  readonly items: readonly LessonIndexItem[]
  readonly activeLessonId: string
  readonly onSelectLesson?: (lessonId: string) => void
}

export function LessonIndex({
  items,
  activeLessonId,
  onSelectLesson,
}: LessonIndexProps) {
  return (
    <aside
      aria-labelledby="lesson-index-title"
      className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg lg:sticky lg:top-6 lg:self-start"
    >
      <p className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">
        Curso de Docker
      </p>
      <h2
        id="lesson-index-title"
        className="mt-1 text-xl font-semibold text-slate-100"
      >
        Nivel 1
      </h2>
      <p className="mt-1 text-sm text-slate-500">Fundamentos de contenedores</p>

      <ul className="mt-5 space-y-2">
        {items.map((item) => {
          const isActive = item.id === activeLessonId

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelectLesson?.(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  isActive
                    ? 'border-cyan-500/50 bg-cyan-500/10'
                    : 'border-slate-800 bg-slate-950/50 hover:border-slate-600'
                }`}
              >
                <span className="block text-xs font-medium text-slate-500">
                  Nivel {item.level}
                </span>
                <span className="mt-1 block text-sm font-semibold text-slate-100">
                  {item.title}
                </span>
                <span
                  className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.completed
                      ? 'bg-emerald-500/15 text-emerald-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.completed ? 'Completada' : 'Pendiente'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
