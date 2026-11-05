import type { Image } from '../../core/types'

type ImageStartCommandProps = {
  readonly image: Image | null
}

/**
 * Panel de arranque de la imagen seleccionada construida: muestra ENTRYPOINT,
 * CMD y el comando final compuesto (`startCommand.final.display`).
 */
export function ImageStartCommand({ image }: ImageStartCommandProps) {
  if (image === null || image.origin !== 'built') {
    return (
      <section
        aria-labelledby="image-start-command-title"
        className="tc-card tc-wobble-sm relative overflow-hidden p-4 sm:p-6"
      >
        <div aria-hidden="true" className="tc-stripe text-mutant" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-3 w-3 border-2 border-ink bg-mutant shadow-[2px_2px_0_#0b0a0a]"
            />
            <h2
              id="image-start-command-title"
              className="font-display text-lg leading-none tracking-wide text-bone sm:text-xl"
            >
              Comando de arranque
            </h2>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-bone/75">
            Selecciona una imagen construida para ver su comando de arranque.
          </p>
        </div>
      </section>
    )
  }

  const { entrypoint, cmd, entrypointForm, cmdForm, final } =
    image.startCommand

  return (
    <section
      aria-labelledby="image-start-command-title"
      className="tc-card tc-wobble-sm relative overflow-hidden p-4 sm:p-6"
    >
      <div aria-hidden="true" className="tc-stripe text-acid" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-3 w-3 border-2 border-ink bg-acid shadow-[2px_2px_0_#0b0a0a]"
          />
          <h2
            id="image-start-command-title"
            className="font-display text-lg leading-none tracking-wide text-bone sm:text-xl"
          >
            Comando de arranque
          </h2>
        </div>

        <dl className="mt-4 space-y-3 grid grid-cols-[1fr_1fr] gap-x-4 gap-y-3">
          <div className="border-4 border-ink bg-surface-2 p-3 shadow-[3px_3px_0_#0b0a0a]">
            <p className="tc-label">ENTRYPOINT</p>
            <p className="mt-1 font-mono text-sm text-bone/80">
              {entrypoint === null || entrypoint.length === 0 ? (
                <span className="text-bone/50">—</span>
              ) : (
                <>
                  {entrypointForm === 'shell' ? 'shell: ' : ''}
                  <span className="text-acid font-bold">
                    {formatCommandDisplay(entrypoint)}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="border-4 border-ink bg-surface-2 p-3 shadow-[3px_3px_0_#0b0a0a]">
            <p className="tc-label">CMD</p>
            <p className="mt-1 font-mono text-sm text-bone/80">
              {cmd === null || cmd.length === 0 ? (
                <span className="text-bone/50">—</span>
              ) : (
                <>
                  {cmdForm === 'shell' ? 'shell: ' : ''}
                  <span className="text-acid font-bold">{formatCommandDisplay(cmd)}</span>
                </>
              )}
            </p>
          </div>
          <div className="col-span-2 border-4 border-ink bg-acid p-3 shadow-[3px_3px_0_#0b0a0a]">
            <p className="tc-label">Comando final</p>
            <p className="mt-1 font-mono text-sm font-bold text-ink break-all">
              {formatCommandDisplay(final)}
            </p>
          </div>
        </dl>
      </div>
    </section>
  )
}

function formatCommandDisplay(command: readonly string[]): string {
  return command
    .map((argument) => (/\s/.test(argument) ? `"${argument}"` : argument))
    .join(' ')
}
