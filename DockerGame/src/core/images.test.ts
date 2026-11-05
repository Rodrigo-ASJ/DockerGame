import { describe, expect, it } from 'vitest'
import {
  formatHistoryTable,
  formatImagesTable,
  formatSize,
  getImageSizeKb,
  parseImageReference,
} from './images'
import type { Image, ImageLayer } from './types'
import {
  baseImages,
  nginxAlpineBaseImage,
  nginxLatestBaseImage,
} from '../content/images/base-images'

function toImage(baseImage: (typeof baseImages)[number]): Image {
  return {
    id: baseImage.id,
    repository: baseImage.repository,
    tag: baseImage.tag,
    reference: baseImage.reference,
    origin: 'base',
    baseReference: null,
    layers: baseImage.layers,
    startCommand: {
      entrypoint: null,
      cmd: baseImage.defaultCommand,
      entrypointForm: null,
      cmdForm: 'exec',
      final: baseImage.defaultCommand,
      display: baseImage.defaultCommand.join(' '),
    },
  }
}

describe('formatSize', () => {
  it('keeps sizes below one MB in KB', () => {
    expect(formatSize(0)).toBe('0 KB')
    expect(formatSize(1)).toBe('1 KB')
    expect(formatSize(999)).toBe('999 KB')
  })

  it('truncates sizes from one MB onwards', () => {
    expect(formatSize(1000)).toBe('1 MB')
    expect(formatSize(187000)).toBe('187 MB')
    expect(formatSize(43000)).toBe('43 MB')
    expect(formatSize(187009)).toBe('187 MB')
    expect(formatSize(43010)).toBe('43 MB')
    expect(formatSize(1999)).toBe('1 MB')
  })
})

describe('getImageSizeKb', () => {
  it('sums every layer of the image', () => {
    const image = toImage(nginxLatestBaseImage)

    expect(getImageSizeKb(image)).toBe(187000)
  })

  it('returns zero for an image without layers', () => {
    const image: Image = {
      ...toImage(nginxLatestBaseImage),
      layers: [],
    }

    expect(getImageSizeKb(image)).toBe(0)
  })
})

describe('base image catalogue', () => {
  it('declares the two nginx bases in order', () => {
    expect(baseImages.map((image) => image.reference)).toEqual([
      'nginx:latest',
      'nginx:alpine',
    ])
  })

  it('splits nginx:latest into exactly 187000 KB across three layers', () => {
    expect(
      nginxLatestBaseImage.layers.map((layer) => layer.sizeKb),
    ).toEqual([100000, 70000, 17000])
    expect(
      nginxLatestBaseImage.layers.map((layer) => layer.label),
    ).toEqual(['sistema', 'binarios', 'configuración'])
    expect(
      nginxLatestBaseImage.layers.reduce(
        (total, layer) => total + layer.sizeKb,
        0,
      ),
    ).toBe(187000)
  })

  it('splits nginx:alpine into exactly 43000 KB across three layers', () => {
    expect(nginxAlpineBaseImage.layers.map((layer) => layer.sizeKb)).toEqual([
      20000, 18000, 5000,
    ])
    expect(nginxAlpineBaseImage.layers.map((layer) => layer.label)).toEqual([
      'sistema',
      'binarios',
      'configuración',
    ])
    expect(
      nginxAlpineBaseImage.layers.reduce(
        (total, layer) => total + layer.sizeKb,
        0,
      ),
    ).toBe(43000)
  })

  it('marks base layers as not cached and repeats the FROM cache key', () => {
    for (const baseImage of baseImages) {
      for (const layer of baseImage.layers) {
        expect(layer.fromCache).toBe(false)
        expect(layer.cacheKey).toBe(`FROM:${baseImage.reference}`)
        expect(layer.instruction).toBe('FROM')
      }
    }
  })

  it('declares the nginx default command for every base', () => {
    for (const baseImage of baseImages) {
      expect(baseImage.defaultCommand).toEqual([
        '/docker-entrypoint.sh',
        'nginx',
        '-g',
        'daemon off;',
      ])
    }
  })
})

describe('parseImageReference', () => {
  it('adds the latest tag when the reference has no tag', () => {
    expect(parseImageReference('nginx')).toEqual({
      ok: true,
      repository: 'nginx',
      tag: 'latest',
      reference: 'nginx:latest',
    })
  })

  it('accepts a valid repository and tag', () => {
    expect(parseImageReference('mi-sitio:1.0')).toEqual({
      ok: true,
      repository: 'mi-sitio',
      tag: '1.0',
      reference: 'mi-sitio:1.0',
    })
    expect(parseImageReference('nginx:alpine')).toMatchObject({
      ok: true,
      reference: 'nginx:alpine',
    })
  })

  it('accepts underscores, dots and dashes in tags', () => {
    expect(parseImageReference('app:Release_1.0-beta')).toMatchObject({
      ok: true,
      tag: 'Release_1.0-beta',
    })
  })

  it('rejects an empty or missing repository', () => {
    for (const raw of ['', ':latest', ' nginx', 'nginx ']) {
      const result = parseImageReference(raw)

      expect(result.ok).toBe(false)

      if (!result.ok) {
        expect(result.error.code).toBe('invalid-image-tag')
      }
    }
  })

  it('rejects uppercase repositories and namespaces', () => {
    for (const raw of ['Mi-Sitio:1.0', 'Nginx', 'repo/name:latest']) {
      const result = parseImageReference(raw)

      expect(result.ok).toBe(false)

      if (!result.ok) {
        expect(result.error.code).toBe('invalid-image-tag')
      }
    }
  })

  it('rejects invalid tags and references with several colons', () => {
    for (const raw of [
      'nginx:',
      'nginx:1.0!',
      'nginx:-tag',
      'nginx:.tag',
      'nginx:tag with space',
      'nginx:tag:extra',
    ]) {
      const result = parseImageReference(raw)

      expect(result.ok).toBe(false)

      if (!result.ok) {
        expect(result.error.code).toBe('invalid-image-tag')
        expect(result.error.message).toContain('Nombre o tag no válido')
      }
    }
  })

  it('rejects a repository that does not start with a letter or number', () => {
    for (const raw of ['.nginx', '-nginx', '_nginx']) {
      expect(parseImageReference(raw).ok).toBe(false)
    }
  })
})

describe('formatImagesTable', () => {
  it('lists every image with repository, tag, image id and total size', () => {
    const lines = formatImagesTable(baseImages.map(toImage))

    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('REPOSITORY')
    expect(lines[0]).toContain('TAG')
    expect(lines[0]).toContain('IMAGE ID')
    expect(lines[0]).toContain('SIZE')
    expect(lines[1]).toContain('nginx')
    expect(lines[1]).toContain('latest')
    expect(lines[1]).toContain('nginx-latest')
    expect(lines[1]).toContain('187 MB')
    expect(lines[2]).toContain('alpine')
    expect(lines[2]).toContain('nginx-alpine')
    expect(lines[2]).toContain('43 MB')
  })
})

describe('formatHistoryTable', () => {
  it('lists base layers from first to last with size and cache mark', () => {
    const lines = formatHistoryTable(nginxLatestBaseImage)

    expect(lines).toHaveLength(4)
    expect(lines[0]).toContain('INSTRUCCIÓN')
    expect(lines[0]).toContain('TAMAÑO')
    expect(lines[0]).toContain('CACHÉ')
    expect(lines[1]).toContain('sistema')
    expect(lines[1]).toContain('100 MB')
    expect(lines[1]).toContain('no')
    expect(lines[2]).toContain('binarios')
    expect(lines[2]).toContain('70 MB')
    expect(lines[3]).toContain('configuración')
    expect(lines[3]).toContain('17 MB')
  })

  it('shows small layer sizes in KB', () => {
    const layers: readonly ImageLayer[] = [
      {
        id: 'layer-1',
        instruction: 'RUN',
        label: 'RUN echo ok',
        sizeKb: 1,
        cacheKey: 'RUN:echo ok',
        fromCache: false,
      },
    ]

    expect(formatHistoryTable({ layers })).toEqual([
      expect.stringContaining('INSTRUCCIÓN'),
      expect.stringContaining('1 KB'),
    ])
  })
})
