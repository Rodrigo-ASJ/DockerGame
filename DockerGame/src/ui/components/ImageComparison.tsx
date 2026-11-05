import type { Image } from '../../core/types'
import { formatSize, getImageSizeKb } from '../../core/images'

type ImageComparisonProps = {
  readonly images: readonly Image[]
  readonly baselineReference: string
  readonly optimizedReference: string
}

/**
 * Compara la primera imagen construida (baseline) frente a la optimizada.
 * Muestra 187 MB frente a 43 MB (según `formatSize`).
 */
export function ImageComparison({
  images,
  baselineReference,
  optimizedReference,
}: ImageComparisonProps) {
  const baseline = images.find(
    (image) => image.reference === baselineReference,
  )
  const optimized = images.find(
    (image) => image.reference === optimizedReference,
  )

  if (baseline === undefined || optimized === undefined) {
    return null
  }

  const baselineSize = getImageSizeKb(baseline)
  const optimizedSize = getImageSizeKb(optimized)

  return (
    <section
      aria-labelledby="image-comparison-title"
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
            id="image-comparison-title"
            className="font-display text-lg leading-none tracking-wide text-bone sm:text-xl"
          >
            Comparación de tamaños
          </h2>
        </div>

        <dl className="mt-4 space-y-4 grid grid-cols-[1fr_1fr] gap-x-4 gap-y-3">
          <div className="border-4 border-ink bg-surface-2 p-3 shadow-[3px_3px_0_#0b0a0a]">
            <p className="tc-label">Imagen inicial</p>
            <p className="mt-1 font-mono text-sm text-bone/80 truncate">
              {baseline.reference}
            </p>
            <p className="mt-1 font-mono text-sm font-bold text-acid">
              {formatSize(baselineSize)}
            </p>
          </div>
          <div className="border-4 border-ink bg-acid p-3 shadow-[3px_3px_0_#0b0a0a]">
            <p className="tc-label">Imagen optimizada</p>
            <p className="mt-1 font-mono text-sm text-bone/80 truncate">
              {optimized.reference}
            </p>
            <p className="mt-1 font-mono text-sm font-bold text-ink">
              {formatSize(optimizedSize)}
            </p>
          </div>
        </dl>

        <p className="mt-4 text-center font-mono text-sm font-bold text-bone uppercase tracking-wider">
          {formatSize(baselineSize)} frente a {formatSize(optimizedSize)}
        </p>
      </div>
    </section>
  )
}
