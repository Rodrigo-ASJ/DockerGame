import type { Lesson } from '../../core/types'
import {
  checkBuiltImage,
  checkContainerWithCommand,
  checkDockerfileCopies,
  checkDockerfileFromAndWorkdir,
  checkDockerfileRunAndCmd,
} from '../../core/checkers'
import { LEVEL2_AVAILABLE_COMMANDS } from '../../core/commands'
import { staticSiteProject } from '../projects/static-site'

export const LEVEL2_02_FIRST_DOCKERFILE_LESSON_ID =
  'level2-02-first-dockerfile'

const INITIAL_DOCKERFILE = [
  '# Sitio estático sobre nginx',
  'FROM nginx:latest',
  'WORKDIR /usr/share/nginx/html',
  'COPY index.html .',
  'COPY app.js .',
  'COPY styles.css .',
  'RUN echo "Sitio listo"',
  'CMD ["nginx", "-g", "daemon off;"]',
].join('\n')

export const level202FirstDockerfileLesson: Lesson = {
  id: LEVEL2_02_FIRST_DOCKERFILE_LESSON_ID,
  level: 2,
  title: 'Primer Dockerfile',
  objective:
    'Escribir un Dockerfile válido con FROM, WORKDIR, COPY, RUN y CMD sobre el proyecto de sitio estático y construir la imagen.',
  explanation:
    'Un Dockerfile receta la imagen instrucción a instrucción: FROM elige la imagen base, WORKDIR fija el directorio de trabajo, COPY trae archivos del proyecto, RUN ejecuta comandos durante la construcción y CMD define el arranque del contenedor.',
  diagram: {
    title: 'Del Dockerfile a la imagen',
    steps: [
      {
        label: 'Escribe el Dockerfile',
        detail: 'FROM, WORKDIR, COPY, RUN y CMD en el editor.',
      },
      {
        label: 'docker build',
        detail: 'Construyes la imagen y Docker valida cada instrucción.',
      },
      {
        label: 'Imagen lista',
        detail: 'La imagen resultante se puede ejecutar con docker run.',
      },
    ],
  },
  availableCommands: LEVEL2_AVAILABLE_COMMANDS,
  workspace: {
    projectFiles: staticSiteProject.files,
    initialDockerfile: INITIAL_DOCKERFILE,
  },
  exampleDockerfiles: undefined,
  steps: [
    {
      id: '2.2.1',
      title: 'Define la base y el directorio de trabajo',
      instruction:
        'Escribe en el editor "FROM nginx:latest" seguido de "WORKDIR /usr/share/nginx/html".',
      allowedCommands: [],
      checker: checkDockerfileFromAndWorkdir,
      successMessage:
        'El Dockerfile comienza con la base "nginx:latest" y establece el directorio de trabajo en "/usr/share/nginx/html".',
      errorHint:
        'Asegúrate de que la primera instrucción sea "FROM nginx:latest" y la segunda "WORKDIR /usr/share/nginx/html", ambas en mayúsculas.',
    },
    {
      id: '2.2.2',
      title: 'Copia los archivos del proyecto',
      instruction:
        'Añade tres instrucciones "COPY": una para "index.html", otra para "app.js" y otra para "styles.css", todas con destino ".".',
      allowedCommands: [],
      checker: checkDockerfileCopies,
      successMessage:
        'El Dockerfile copia los tres archivos del proyecto estático: "index.html", "app.js" y "styles.css".',
      errorHint:
        'Añade exactamente tres instrucciones COPY con origen "index.html", "app.js" y "styles.css" y destino ".", una por línea.',
    },
    {
      id: '2.2.3',
      title: 'Añade una instrucción RUN y el arranque CMD',
      instruction:
        'Añade una instrucción "RUN" con cualquier comando no vacío y termina con "CMD" que defina el arranque del contenedor.',
      allowedCommands: [],
      checker: checkDockerfileRunAndCmd,
      successMessage:
        'El Dockerfile tiene al menos una instrucción RUN y una instrucción CMD que define el arranque.',
      errorHint:
        'Añade una línea RUN con un comando (por ejemplo "RUN echo listo") y termina con CMD ["nginx", "-g", "daemon off;"].',
    },
    {
      id: '2.2.4',
      title: 'Construye la imagen mi-sitio:1.0',
      instruction:
        'Ejecuta "docker build -t mi-sitio:1.0 ." para construir la imagen a partir del Dockerfile del editor.',
      allowedCommands: ['build'],
      checker: checkBuiltImage('mi-sitio:1.0', [
        'FROM',
        'WORKDIR',
        'COPY',
        'RUN',
        'CMD',
      ]),
      successMessage:
        'Has construido la imagen "mi-sitio:1.0" a partir de "nginx:latest". Ocupa 187 MB y está seleccionada.',
      errorHint:
        'Ejecuta exactamente "docker build -t mi-sitio:1.0 .". El tag debe ser "mi-sitio:1.0" y el contexto ".".',
    },
    {
      id: '2.2.5',
      title: 'Ejecuta un contenedor desde la imagen construida',
      instruction:
        'Ejecuta "docker run -d --name sitio mi-sitio:1.0" para crear un contenedor activo a partir de tu imagen.',
      allowedCommands: ['run', 'ps'],
      checker: checkContainerWithCommand('sitio', 'mi-sitio:1.0'),
      successMessage:
        'Has creado el contenedor "sitio" a partir de "mi-sitio:1.0". Está en ejecución con el comando definido en CMD.',
      errorHint:
        'Ejecuta exactamente "docker run -d --name sitio mi-sitio:1.0". El nombre debe ser "sitio" y la imagen "mi-sitio:1.0".',
    },
  ],
}
