import type { BaseImage, ImageLayer } from '../../core/types'

const NGINX_DEFAULT_COMMAND = [
  '/docker-entrypoint.sh',
  'nginx',
  '-g',
  'daemon off;',
] as const

function baseLayer(
  id: string,
  label: string,
  sizeKb: number,
  reference: string,
): ImageLayer {
  return {
    id,
    instruction: 'FROM',
    label,
    sizeKb,
    cacheKey: `FROM:${reference}`,
    fromCache: false,
  }
}

export const nginxLatestBaseImage: BaseImage = {
  id: 'nginx-latest',
  repository: 'nginx',
  tag: 'latest',
  reference: 'nginx:latest',
  layers: [
    baseLayer('nginx-latest-layer-1', 'sistema', 100000, 'nginx:latest'),
    baseLayer('nginx-latest-layer-2', 'binarios', 70000, 'nginx:latest'),
    baseLayer(
      'nginx-latest-layer-3',
      'configuración',
      17000,
      'nginx:latest',
    ),
  ],
  defaultCommand: NGINX_DEFAULT_COMMAND,
}

export const nginxAlpineBaseImage: BaseImage = {
  id: 'nginx-alpine',
  repository: 'nginx',
  tag: 'alpine',
  reference: 'nginx:alpine',
  layers: [
    baseLayer('nginx-alpine-layer-1', 'sistema', 20000, 'nginx:alpine'),
    baseLayer('nginx-alpine-layer-2', 'binarios', 18000, 'nginx:alpine'),
    baseLayer(
      'nginx-alpine-layer-3',
      'configuración',
      5000,
      'nginx:alpine',
    ),
  ],
  defaultCommand: NGINX_DEFAULT_COMMAND,
}

export const baseImages: readonly BaseImage[] = [
  nginxLatestBaseImage,
  nginxAlpineBaseImage,
]
