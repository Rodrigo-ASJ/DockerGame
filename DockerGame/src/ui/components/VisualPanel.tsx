import type { Container } from '../../core/types'

type VisualPanelProps = {
  readonly containers: readonly Container[]
}

export function VisualPanel({ containers }: VisualPanelProps) {
  return (
    <section
      aria-labelledby="containers-title"
      className="tc-card tc-wobble-sm relative overflow-hidden p-4 sm:p-6"
    >
      <div aria-hidden="true" className="tc-stripe text-mutant" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-3 border-2 border-ink bg-mutant shadow-[2px_2px_0_#0b0a0a]"
            />
            <h2
              id="containers-title"
              className="font-display text-lg leading-none tracking-wide text-bone sm:text-xl"
            >
              Runtime · Contenedores
            </h2>
          </div>
          <span className="tc-badge">
            {containers.length.toString().padStart(2, '0')}
          </span>
        </div>

        {containers.length === 0 ? (
          <div className="mt-5 border-4 border-dashed border-mud bg-ink/30 p-6 text-center">
            <p className="font-display text-base uppercase tracking-wide text-bone">
              Sin contenedores
            </p>
            <p className="mt-2 text-sm leading-relaxed text-bone/60">
              Usa{' '}
              <code className="border-2 border-ink bg-ink px-1.5 py-0.5 font-mono text-xs font-bold text-acid">
                docker run
              </code>{' '}
              para instanciar uno.
            </p>
          </div>
        ) : (
          <ul className="mt-5 space-y-4">
            {containers.map((container) => (
              <li key={container.id} className="tc-container-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm font-bold text-bone">
                    {container.name}
                  </p>
                  <span className="tc-badge">UP</span>
                </div>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  <dt className="font-mono text-[0.58rem] font-bold uppercase tracking-[0.18em] text-bone/55">
                    CONTAINER_ID
                  </dt>
                  <dd className="break-all font-mono text-bone/80">
                    {container.id}
                  </dd>
                  <dt className="font-mono text-[0.58rem] font-bold uppercase tracking-[0.18em] text-bone/55">
                    IMAGE
                  </dt>
                  <dd className="break-all font-mono text-bone/80">
                    {container.image}
                  </dd>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
