export type LessonIndexItem = {
  readonly id: string
  readonly level: number
  readonly title: string
  readonly status: 'locked' | 'available' | 'completed'
  readonly prerequisiteTitle?: string
}

type LessonIndexLevel = {
  readonly number: number
  readonly title: string
  readonly subtitle: string
}

type LessonIndexProps = {
  readonly items: readonly LessonIndexItem[]
  readonly levels: readonly LessonIndexLevel[]
  readonly activeLessonId: string
  readonly onSelectLesson: (lessonId: string) => void
  readonly onLockedLessonAttempt: (lessonId: string) => void
}

function statusLabel(status: LessonIndexItem['status']): string {
  switch (status) {
    case 'completed':
      return 'Completada'
    case 'available':
      return 'Disponible'
    case 'locked':
      return 'Bloqueada'
  }
}

function statusVariant(status: LessonIndexItem['status'], isActive: boolean) {
  switch (status) {
    case 'completed':
      return 'bg-ink text-acid'
    case 'available':
      return isActive ? 'bg-ink/10 text-ink' : 'bg-surface text-bone/65'
    case 'locked':
      return 'bg-surface-2 text-bone/40'
  }
}

export function LessonIndex({
  items,
  levels,
  activeLessonId,
  onSelectLesson,
  onLockedLessonAttempt,
}: LessonIndexProps) {
  const itemsByLevel = new Map<number, readonly LessonIndexItem[]>()

  for (const level of levels) {
    itemsByLevel.set(
      level.number,
      items.filter((item) => item.level === level.number),
    )
  }

  return (
    <aside
      aria-labelledby="lesson-index-title"
      className="tc-card tc-wobble tc-tape relative lg:sticky lg:top-6 lg:self-start"
    >
      <div aria-hidden="true" className="tc-stripe text-acid" />

      <div className="relative p-5 pt-7">
        {levels.map((level) => {
          const levelItems = itemsByLevel.get(level.number) ?? []
          const completedCount = levelItems.filter(
            (item) => item.status === 'completed',
          ).length
          const completedPercent =
            levelItems.length === 0
              ? 0
              : Math.round((completedCount / levelItems.length) * 100)
          const levelCompleted =
            levelItems.length > 0 && completedCount === levelItems.length
          const hasAvailable = levelItems.some(
            (item) => item.status === 'available',
          )
          const levelLocked =
            !hasAvailable && levelItems.some((item) => item.status === 'locked')
          const firstLocked = levelItems.find((item) => item.status === 'locked')
          const unlockText = firstLocked
            ? `Se desbloquea al completar "${firstLocked.prerequisiteTitle ?? 'la lección anterior'}".`
            : null

          return (
            <section key={`level-${level.number}`} className="mb-8 last:mb-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="tc-kicker">Ruta de aprendizaje</p>
                  <h2
                    id={`lesson-index-title-${level.number}`}
                    className="tc-title-shadow mt-2 font-display text-3xl leading-none tracking-wide text-bone"
                  >
                    Nivel {level.number}
                  </h2>
                  <p className="mt-2 text-sm text-bone/60">{level.subtitle}</p>
                </div>
                <span className="tc-stamp tc-stamp--acid shrink-0">
                  L{String(level.number).padStart(2, '0')}
                </span>
              </div>

              {levelLocked && unlockText && (
                <p className="mt-3 text-sm font-mono text-bone/60">{unlockText}</p>
              )}

              <div aria-hidden="true" className="tc-divider mt-5" />

              <ul className="mt-5 space-y-3">
                {levelItems.map((item) => {
                  const isActive = item.id === activeLessonId
                  const isLocked = item.status === 'locked'

                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="button"
                        aria-disabled={isLocked || undefined}
                        aria-current={isActive ? 'page' : undefined}
                        aria-describedby={
                          isLocked ? `prereq-${item.id}` : undefined
                        }
                        onClick={() => {
                          if (isLocked) {
                            onLockedLessonAttempt(item.id)
                            return
                          }
                          onSelectLesson(item.id)
                        }}
                        className={`group relative w-full overflow-hidden border-4 border-ink p-3 text-left transition ${isLocked
                          ? 'bg-surface-2 text-bone/40 shadow-[3px_3px_0_#0b0a0a]'
                          : isActive
                            ? '-rotate-[0.5deg] bg-acid text-ink shadow-[4px_4px_0_#0b0a0a]'
                            : 'bg-surface-2 text-bone shadow-[3px_3px_0_#0b0a0a] hover:-translate-y-0.5 hover:bg-[#352c30]'}`}
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
                            className={`inline-flex shrink-0 border-2 border-ink px-2 py-1 font-mono text-[0.58rem] font-bold uppercase tracking-wider ${statusVariant(
                              item.status,
                              isActive,
                            )}`}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </div>
                        <span
                          className={`relative mt-3 block font-mono text-[0.6rem] font-bold uppercase tracking-[0.25em] ${
                            isActive ? 'text-ink/60' : 'text-bone/55'
                          }`}
                        >
                          NIVEL_{String(item.level).padStart(2, '0')}
                        </span>
                        {isLocked && item.prerequisiteTitle && (
                          <p
                            id={`prereq-${item.id}`}
                            className="mt-2 text-xs font-mono text-bone/50"
                            hidden
                          >
                            Requiere completar: "{item.prerequisiteTitle}".
                          </p>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-5 border-4 border-ink bg-surface-2 p-3 shadow-[3px_3px_0_#0b0a0a]">
                <p className="tc-label text-[0.58rem]">
                  Progreso del nivel {level.number}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-3 flex-1 border-2 border-ink bg-ink">
                    <div
                      className="h-full bg-acid transition-[width] duration-300"
                      style={{ width: `${completedPercent}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-acid">
                    {completedCount}/{levelItems.length}
                  </span>
                  {levelCompleted && (
                    <span className="ml-2 font-mono text-xs font-bold text-acid">
                      — Nivel completado
                    </span>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </aside>
  )
}
