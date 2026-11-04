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
  const completedCount = items.filter((item) => item.completed).length
  const completedPercent =
    items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100)

  return (
    <aside
      aria-labelledby="lesson-index-title"
      className="tc-card tc-wobble tc-tape relative lg:sticky lg:top-6 lg:self-start"
    >
      <div aria-hidden="true" className="tc-stripe text-acid" />

      <div className="relative p-5 pt-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="tc-kicker">Ruta de aprendizaje</p>
            <h2
              id="lesson-index-title"
              className="tc-title-shadow mt-2 font-display text-3xl leading-none tracking-wide text-bone"
            >
              Nivel 1
            </h2>
            <p className="mt-2 text-sm text-bone/60">Fundamentos de contenedores</p>
          </div>
          <span className="tc-stamp tc-stamp--acid shrink-0">L01</span>
        </div>

        <div aria-hidden="true" className="tc-divider mt-5" />

        <ul className="mt-5 space-y-3">
          {items.map((item) => {
            const isActive = item.id === activeLessonId

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectLesson?.(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative w-full overflow-hidden border-4 border-ink p-3 text-left transition ${
                    isActive
                      ? '-rotate-[0.5deg] bg-acid text-ink shadow-[4px_4px_0_#0b0a0a]'
                      : 'bg-surface-2 text-bone shadow-[3px_3px_0_#0b0a0a] hover:-translate-y-0.5 hover:bg-[#352c30]'
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-2 bg-ink"
                    />
                  )}
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <span
                        className={`block font-mono text-[0.6rem] font-bold uppercase tracking-[0.22em] ${
                          isActive ? 'text-ink/60' : 'text-bone/55'
                        }`}
                      >
                        Paso / Lección
                      </span>
                      <span
                        className={`mt-1 block text-sm font-bold leading-snug ${
                          isActive ? 'text-ink' : 'text-bone'
                        }`}
                      >
                        {item.title}
                      </span>
                    </div>
                    <span
                      className={`inline-flex shrink-0 border-2 border-ink px-2 py-1 font-mono text-[0.58rem] font-bold uppercase tracking-wider ${
                        item.completed
                          ? 'bg-ink text-acid'
                          : isActive
                            ? 'bg-ink/10 text-ink'
                            : 'bg-surface text-bone/65'
                      }`}
                    >
                      {item.completed ? 'Completada' : 'Pendiente'}
                    </span>
                  </div>
                  <span
                    className={`relative mt-3 block font-mono text-[0.6rem] font-bold uppercase tracking-[0.25em] ${
                      isActive ? 'text-ink/60' : 'text-bone/55'
                    }`}
                  >
                    NIVEL_{item.level.toString().padStart(2, '0')}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="mt-5 border-4 border-ink bg-surface-2 p-3 shadow-[3px_3px_0_#0b0a0a]">
          <p className="tc-label text-[0.58rem]">Progreso del nivel</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-3 flex-1 border-2 border-ink bg-ink">
              <div
                className="h-full bg-acid transition-[width] duration-300"
                style={{ width: `${completedPercent}%` }}
              />
            </div>
            <span className="font-mono text-xs font-bold text-acid">
              {completedCount}/{items.length}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
