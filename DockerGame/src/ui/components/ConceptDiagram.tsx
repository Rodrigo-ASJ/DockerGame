import type { LessonDiagram } from '../../core/types'

type ConceptDiagramProps = {
  readonly diagram: LessonDiagram
}

export function ConceptDiagram({ diagram }: ConceptDiagramProps) {
  return (
    <section
      aria-labelledby="diagram-title"
      className="tc-card tc-wobble relative overflow-hidden p-5 sm:p-6"
    >
      <div aria-hidden="true" className="tc-stripe text-radioactive" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="diagram-title"
            className="font-display text-xl leading-tight tracking-wide text-bone sm:text-2xl"
          >
            {diagram.title}
          </h2>
          <span className="tc-badge tc-badge--muted">Esquema</span>
        </div>

        <ol className="mt-5 grid gap-5 md:grid-cols-3">
          {diagram.steps.map((step, index) => (
            <li key={step.label} className="tc-diagram-step">
              {index < diagram.steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-[1.55rem] top-1/2 z-10 hidden -translate-y-1/2 font-display text-2xl leading-none text-mutant [text-shadow:2px_2px_0_#0b0a0a] md:block"
                >
                  →
                </span>
              )}
              <div className="tc-wobble-sm h-full border-4 border-ink bg-ink/30 p-4 shadow-[4px_4px_0_#0b0a0a]">
                <div className="flex items-center justify-between gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-8 w-8 items-center justify-center border-2 border-ink bg-acid font-mono text-xs font-bold text-ink shadow-[2px_2px_0_#0b0a0a]"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.2em] text-bone/55">
                    Paso
                  </span>
                </div>
                <p className="mt-3 break-words font-mono text-sm font-bold leading-snug text-acid">
                  {step.label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-bone/70">
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
