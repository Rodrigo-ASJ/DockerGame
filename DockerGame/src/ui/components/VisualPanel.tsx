import type { Container } from '../../core/types'

type VisualPanelProps = {
  readonly containers: readonly Container[]
}

export function VisualPanel({ containers }: VisualPanelProps) {
  return (
    <section
      aria-labelledby="containers-title"
      className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="containers-title" className="text-lg font-semibold text-slate-100">
          Contenedores activos
        </h2>
        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
          {containers.length}
        </span>
      </div>

      {containers.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-700 p-6 text-center">
          <p className="text-sm font-medium text-slate-300">
            Todavía no hay contenedores
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Cuando crees uno con <code>docker run</code>, aparecerá aquí.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {containers.map((container) => (
            <li
              key={container.id}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-sm font-semibold text-slate-100">
                  {container.name}
                </p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                  />
                  Activo
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-slate-500">ID</dt>
                <dd className="font-mono text-slate-300">{container.id}</dd>
                <dt className="text-slate-500">Imagen</dt>
                <dd className="font-mono text-slate-300">{container.image}</dd>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
