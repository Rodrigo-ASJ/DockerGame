import type { Lesson } from '../../core/types'
import {
  checkAllLayersCached,
  checkBuiltImage,
  checkContainerWithCommand,
  checkDockerfileEntrypointAndCmd,
  checkPartialCache,
  checkComparison,
} from '../../core/checkers'
import { LEVEL2_AVAILABLE_COMMANDS } from '../../core/commands'
import { staticSiteProject } from '../projects/static-site'

export const LEVEL2_04_ENTRYPOINT_CACHE_SIZE_LESSON_ID =
  'level2-04-entrypoint-cache-size'

const INITIAL_DOCKERFILE = [
  'FROM nginx:latest',
  'WORKDIR /usr/share/nginx/html',
  'COPY index.html .',
  'COPY app.js .',
  'COPY styles.css .',
  'RUN echo "Sitio listo"',
  'CMD ["nginx", "-g", "daemon off;"]',
].join('\n')

export const level204EntrypointCacheSizeLesson: Lesson = {
  id: LEVEL2_04_ENTRYPOINT_CACHE_SIZE_LESSON_ID,
  level: 2,
  title: 'ENTRYPOINT, caché y tamaño',
  objective:
    'Componer el arranque con ENTRYPOINT y CMD, reutilizar capas desde caché y comparar 187 MB frente a 43 MB.',
  explanation:
    'ENTRYPOINT fija el ejecutable del contenedor y CMD aporta argumentos por defecto; juntos forman el comando final que se ejecuta al iniciar. Al reconstruir sin cambios se reutilizan las capas desde caché. Cambiar una instrucción invalida la caché desde esa punto y reconstruye las posteriores. Cambiar la base a nginx:alpine reduce el tamaño de 187 MB a 43 MB.',
  diagram: {
    title: 'Arranque, caché y comparación',
    steps: [
      {
        label: 'ENTRYPOINT y CMD',
        detail: 'ENTRYPOINT fija el ejecutable y CMD sus argumentos.',
      },
      {
        label: 'Capas en caché',
        detail: 'Sin cambios, las capas se reutilizan desde caché.',
      },
      {
        label: 'Comparar tamaños',
        detail: 'nginx:latest suma 187 MB; nginx:alpine suma 43 MB.',
      },
    ],
  },
  availableCommands: LEVEL2_AVAILABLE_COMMANDS,
  workspace: {
    projectFiles: staticSiteProject.files,
    initialDockerfile: INITIAL_DOCKERFILE,
    comparison: {
      baselineReference: 'optimizada:1.0',
      optimizedReference: 'optimizada:2.0',
    },
  },
  exampleDockerfiles: undefined,
  steps: [
    {
      id: '2.4.1',
      title: 'Añadir ENTRYPOINT y mantener CMD',
      instruction:
        'Edita el Dockerfile para añadir una instrucción ENTRYPOINT sin eliminar la CMD existente. Ambos deben estar presentes.',
      allowedCommands: [],
      checker: checkDockerfileEntrypointAndCmd,
      successMessage:
        'El Dockerfile declara tanto ENTRYPOINT como CMD; juntos componen el comando de arranque.',
      errorHint:
        'Añade una línea ENTRYPOINT (por ejemplo ENTRYPOINT ["nginx"]) y deja la CMD ["nginx", "-g", "daemon off;"].',
    },
    {
      id: '2.4.2',
      title: 'Construir optimizada:1.0 (187 MB)',
      instruction:
        'Ejecuta "docker build -t optimizada:1.0 .". La imagen debe construirse con base nginx:latest, ocupar 187 MB y mostrar el comando de arranque compuesto.',
      allowedCommands: ['build'],
      checker: checkBuiltImage('optimizada:1.0', [
        'FROM',
        'WORKDIR',
        'COPY',
        'RUN',
        'CMD',
        'ENTRYPOINT',
      ]),
      successMessage:
        'Has construido "optimizada:1.0" sobre "nginx:latest". Ocupa 187 MB y el comando de arranque combina ENTRYPOINT y CMD.',
      errorHint:
        'Ejecuta exactamente "docker build -t optimizada:1.0 ." con el Dockerfile del editor.',
    },
    {
      id: '2.4.3',
      title: 'Rebuild sin cambios: todo en caché',
      instruction:
        'Sin modificar el Dockerfile, ejecuta "docker build -t optimizada:1.1 .". Todas las capas deben reutilizarse desde caché.',
      allowedCommands: ['build'],
      checker: checkAllLayersCached('optimizada:1.1'),
      successMessage:
        'Has reconstruido sin cambios y todas las capas se reutilizaron desde caché.',
      errorHint:
        'No toques el Dockerfile y ejecuta "docker build -t optimizada:1.1 .".',
    },
    {
      id: '2.4.4',
      title: 'Invalidación parcial de caché',
      instruction:
        'Cambia el texto de la instrucción RUN intermedia y ejecuta "docker build -t optimizada:1.2 .". Las capas anteriores se reutilizan y las posteriores se reconstruyen.',
      allowedCommands: ['build'],
      checker: checkPartialCache('optimizada:1.2'),
      successMessage:
        'Has invalidado la caché parcialmente: prefijo cacheado y sufijo reconstruido.',
      errorHint:
        'Cambia el comando de una línea RUN (por ejemplo "RUN echo listo") y ejecuta "docker build -t optimizada:1.2 .".',
    },
    {
      id: '2.4.5',
      title: 'Cambiar la base a nginx:alpine (43 MB)',
      instruction:
        'Cambia FROM a "nginx:alpine" y ejecuta "docker build -t optimizada:2.0 .". La imagen debe ocupar 43 MB y reconstruirse completamente.',
      allowedCommands: ['build'],
      checker: checkBuiltImage('optimizada:2.0', [
        'FROM',
        'WORKDIR',
        'COPY',
        'RUN',
        'CMD',
        'ENTRYPOINT',
      ], { base: 'nginx:alpine', size: '43 MB' }),
      successMessage:
        'Has construido "optimizada:2.0" sobre "nginx:alpine". Ocupa 43 MB, mucho menos que los 187 MB de la base completa.',
      errorHint:
        'Cambia la primera línea a "FROM nginx:alpine" y ejecuta "docker build -t optimizada:2.0 .".',
    },
    {
      id: '2.4.6',
      title: 'Comparar tamaños 187 MB frente a 43 MB',
      instruction:
        'Pulsa «Comprobar» sin ejecutar ningún comando. Deben existir ambas imágenes, "optimizada:1.0" con 187 MB y "optimizada:2.0" con 43 MB, y 187 debe ser mayor que 43.',
      allowedCommands: [],
      checker: checkComparison('optimizada:1.0', 'optimizada:2.0'),
      successMessage:
        'Has comprobado la optimización: 187 MB con nginx:latest frente a 43 MB con nginx:alpine.',
      errorHint:
        'Asegúrate de haber construido "optimizada:1.0" y "optimizada:2.0" y pulsa «Comprobar».',
    },
    {
      id: '2.4.7',
      title: 'Ejecutar el contenedor optimizado',
      instruction:
        'Ejecuta "docker run -d --name optimizada optimizada:2.0". El contenedor debe arrancar con el comando compuesto de ENTRYPOINT y CMD.',
      allowedCommands: ['run', 'ps'],
      checker: checkContainerWithCommand('optimizada', 'optimizada:2.0'),
      successMessage:
        'Has creado el contenedor "optimizada" a partir de "optimizada:2.0". Está en ejecución con el comando compuesto.',
      errorHint:
        'Ejecuta exactamente "docker run -d --name optimizada optimizada:2.0".',
    },
  ],
}
