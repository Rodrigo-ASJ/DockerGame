import type { LessonDiagram } from '../../core/types'

type ConceptDiagramProps = {
  readonly diagram: LessonDiagram
}

export function ConceptDiagram({ diagram }: ConceptDiagramProps) {
  return (
    <section
      aria-labelledby="diagram-title"
      className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg"
    >
      <h2 id="diagram-title" className="text-lg font-semibold text-slate-100">
        {diagram.title}
      </h2>

      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {diagram.steps.map((step, index) => (
          <li
            key={step.label}
            className="relative rounded-xl border border-slate-800 bg-slate-950/70 p-4"
          >
            <span
              aria-hidden="true"
              className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/15 text-sm font-semibold text-cyan-300"
            >
              {index + 1}
            </span>
            <p className="font-mono text-sm text-cyan-300">{step.label}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {step.detail}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
