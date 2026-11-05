import type { Image } from '../../core/types'
import { formatSize, getImageSizeKb } from '../../core/images'

type ImagesPanelProps = {
  readonly images: readonly Image[]
}

/**
 * Panel de imágenes: muestra todas las imágenes (base y construidas) con
 * nombre, tag, ID y tamaño total (`formatSize`). No muestra capas.
 */
export function ImagesPanel({ images }: ImagesPanelProps) {
  const totalKb = images.reduce(
    (total, image) => total + getImageSizeKb(image),
    0,
  )

  return (
    <section
      aria-labelledby="images-title"
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
              id="images-title"
              className="font-display text-lg leading-none tracking-wide text-bone sm:text-xl"
            >
              Imágenes
            </h2>
          </div>
          <span className="tc-badge tc-badge--muted">
            {images.length.toString().padStart(2, '0')}
          </span>
        </div>

        <p className="mt-4 text-sm text-bone/75">
          Tamaño total: <span className="font-mono font-bold text-acid">{formatSize(totalKb)}</span>
        </p>

        <ul className="mt-5 space-y-3">
          {images.length === 0 ? (
            <li className="text-center py-4 text-bone/50 text-sm">
              Sin imágenes.
            </li>
          ) : (
            images.map((image) => (
              <li
                key={image.reference}
                className="flex flex-wrap items-center justify-between gap-2 border-4 border-ink bg-surface-2 p-3 shadow-[3px_3px_0_#0b0a0a]"
              >
                <div>
                  <p className="font-mono text-sm font-bold text-bone">
                    {image.repository}
                  </p>
                  <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
                    <dt className="font-mono text-[0.58rem] font-bold uppercase tracking-[0.18em] text-bone/55">
                      TAG
                    </dt>
                    <dd className="break-all font-mono text-bone/80">
                      {image.tag}
                    </dd>
                    <dt className="font-mono text-[0.58rem] font-bold uppercase tracking-[0.18em] text-bone/55">
                      IMAGE ID
                    </dt>
                    <dd className="break-all font-mono text-bone/80">
                      {image.id}
                    </dd>
                    <dt className="font-mono text-[0.58rem] font-bold uppercase tracking-[0.18em] text-bone/55">
                      ORIGEN
                    </dt>
                    <dd className="break-all font-mono text-bone/80">
                      {image.origin}
                    </dd>
                  </dl>
                </div>
                <span className="font-mono text-sm font-bold text-acid">
                  {formatSize(getImageSizeKb(image))}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  )
}
