import type { CommandError, Image, ImageLayer } from './types'

export const KB_PER_MB = 1000

const REPOSITORY_PATTERN = /^[a-z0-9][a-z0-9._-]*$/
const TAG_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/

export type ImageReference = {
  readonly repository: string
  readonly tag: string
  readonly reference: string
}

export type ParsedImageReference =
  | ({ readonly ok: true } & ImageReference)
  | { readonly ok: false; readonly error: CommandError }

export function parseImageReference(raw: string): ParsedImageReference {
  const separator = raw.indexOf(':')
  const repository = separator === -1 ? raw : raw.slice(0, separator)
  const tag = separator === -1 ? 'latest' : raw.slice(separator + 1)

  if (!REPOSITORY_PATTERN.test(repository) || !TAG_PATTERN.test(tag)) {
    return {
      ok: false,
      error: {
        code: 'invalid-image-tag',
        message: `Nombre o tag no válido: "${raw}". El repositorio debe ir en minúsculas y el tag no puede contener espacios ni caracteres especiales como "!".`,
      },
    }
  }

  return {
    ok: true,
    repository,
    tag,
    reference: `${repository}:${tag}`,
  }
}

export function formatSize(sizeKb: number): string {
  if (sizeKb < KB_PER_MB) {
    return `${sizeKb} KB`
  }

  return `${Math.floor(sizeKb / KB_PER_MB)} MB`
}

export function getImageSizeKb(image: Pick<Image, 'layers'>): number {
  return image.layers.reduce((total, layer) => total + layer.sizeKb, 0)
}

function formatRow(columns: readonly string[], widths: readonly number[]): string {
  return columns
    .map((column, index) => {
      const width = widths[index]

      return width === undefined ? column : column.padEnd(width)
    })
    .join(' ')
    .trimEnd()
}

const IMAGE_COLUMNS = ['REPOSITORY', 'TAG', 'IMAGE ID', 'SIZE'] as const
const IMAGE_WIDTHS = [12, 8, 12, 6] as const

export function formatImagesTable(images: readonly Image[]): readonly string[] {
  return [
    formatRow(IMAGE_COLUMNS, IMAGE_WIDTHS),
    ...images.map((image) =>
      formatRow(
        [
          image.repository,
          image.tag,
          image.id,
          formatSize(getImageSizeKb(image)),
        ],
        IMAGE_WIDTHS,
      ),
    ),
  ]
}

const HISTORY_COLUMNS = ['INSTRUCCIÓN', 'TAMAÑO', 'CACHÉ'] as const
const HISTORY_WIDTHS = [20, 8, 5] as const

function formatHistoryRow(layer: ImageLayer): string {
  return formatRow(
    [layer.label, formatSize(layer.sizeKb), layer.fromCache ? 'sí' : 'no'],
    HISTORY_WIDTHS,
  )
}

export function formatHistoryTable(
  image: Pick<Image, 'layers'>,
): readonly string[] {
  return [
    formatRow(HISTORY_COLUMNS, HISTORY_WIDTHS),
    ...image.layers.map(formatHistoryRow),
  ]
}
