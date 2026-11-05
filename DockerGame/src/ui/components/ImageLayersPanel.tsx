import type { Image } from '../../core/types'
import { formatSize, getImageSizeKb } from '../../core/images'

type ImageLayersPanelProps = {
  readonly image: Image | null
}

/**
 * Panel de capas de la imagen seleccionada: instrucción, tamaño por capa y
 * marca de caché (`fromCache`). Si no hay selección, muestra un mensaje
 * orientativo.
 */
export function ImageLayersPanel({ image }: ImageLayersPanelProps) {
  if (image === null) {
    return (
      <section
        aria-labelledby="image-layers-title"
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
              id="image-layers-title"
              className="font-display text-lg leading-none tracking-wide text-bone sm:text-xl"
            >
              Capas de la imagen
            </h2>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-bone/75">
            Ejecuta <code className="border-2 border-ink bg-ink px-1.5 py-0.5 font-mono text-xs font-bold text-acid">docker history</code> o construye una imagen para ver sus capas.
          </p>
        </div>
      </section>
    )
  }

  const totalKb = getImageSizeKb(image)

  return (
    <section
      aria-labelledby="image-layers-title"
      className="tc-card tc-wobble-sm relative overflow-hidden p-4 sm:p-6"
    >
      <div aria-hidden="true" className="tc-stripe text-acid" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-3 w-3 border-2 border-ink bg-acid shadow-[2px_2px_0_#0b0a0a]"
            />
            <h2
              id="image-layers-title"
              className="font-display text-lg leading-none tracking-wide text-bone sm:text-xl"
            >
              Capas de {image.reference}
            </h2>
          </div>
          <span className="tc-badge tc-badge--muted">
            {formatSize(totalKb)}
          </span>
        </div>

        <ul className="mt-5 space-y-2">
          {image.layers.map((layer) => (
            <li
              key={layer.id}
              className="flex items-center justify-between gap-2 border-2 border-ink bg-surface-2 p-2 shadow-[2px_2px_0_#0b0a0a]"
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs font-bold text-bone truncate">
                  {layer.label}
                </p>
                <span className="text-[0.58rem] font-mono uppercase tracking-[0.15em] text-bone/50">
                  {layer.instruction}
                </span>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="font-mono text-xs font-bold text-acid">
                  {formatSize(layer.sizeKb)}
                </span>
                <span
                  className={`inline-flex items-center border-2 rounded px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider ${
                    layer.fromCache
                      ? 'border-acid bg-acid/10 text-acid'
                      : 'border-mud bg-mud/10 text-mud'
                  }`}
                >
                  {layer.fromCache ? 'Caché' : 'Reconstruida'}
                </span>
              </div>
            </li>
          ))}
          <li className="mt-2 border-4 border-ink bg-acid p-2 shadow-[2px_2px_0_#0b0a0a] flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-ink uppercase tracking-[0.15em]">
              Total
            </span>
            <span className="font-mono text-sm font-bold text-ink">
              {formatSize(totalKb)}
            </span>
          </li>
        </ul>
      </div>
    </section>
  )
}
