import type { Lesson } from '../../core/types'
import {
  checkBuildError,
  checkFailedImageRun,
  checkRecoveredImage,
} from '../../core/checkers'
import { LEVEL2_AVAILABLE_COMMANDS } from '../../core/commands'
import { staticSiteProject } from '../projects/static-site'

export const LEVEL2_03_BUILD_ERRORS_LESSON_ID = 'level2-03-build-errors'

const INITIAL_DOCKERFILE = 'FROM nginx:latest'

export const level203BuildErrorsLesson: Lesson = {
  id: LEVEL2_03_BUILD_ERRORS_LESSON_ID,
  level: 2,
  title: 'Errores de construcción',
  objective:
    'Reconocer y superar los seis errores obligatorios de construcción de imágenes.',
  explanation:
    'Una construcción puede fallar si falta FROM, si FROM no va primero, si una instrucción RUN falla, si falta CMD o ENTRYPOINT, si el nombre o el tag no son válidos o si el nombre y el tag ya existen. Cada error muestra la instrucción y la causa para que puedas corregir el Dockerfile y reconstruir.',
  diagram: {
    title: 'Diagnosticar errores de build',
    steps: [
      {
        label: 'Dockerfile roto',
        detail: 'Ejecutas docker build y obtienes un error.',
      },
      {
        label: 'Lee el error',
        detail: 'El mensaje indica la instrucción y la causa.',
      },
      {
        label: 'Corrige y reconstruye',
        detail: 'Arreglas el Dockerfile y construyes de nuevo.',
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
      id: '2.3.1',
      title: 'Dockerfile vacío o sin FROM',
      instruction:
        'Vacía el Dockerfile (o déjalo solo con comentarios) y ejecuta "docker build -t errores:0.0 .". Debe fallar porque FROM es obligatorio.',
      allowedCommands: ['build'],
      checker: checkBuildError('missing-from', 'errores:0.0'),
      successMessage:
        'Has provocado y reconocido el error "FROM es obligatorio" con un Dockerfile vacío o solo comentarios.',
      errorHint:
        'Ejecuta exactamente "docker build -t errores:0.0 ." con el Dockerfile vacío o solo con comentarios.',
    },
    {
      id: '2.3.2',
      title: 'FROM no es la primera instrucción',
      instruction:
        'Escribe "WORKDIR /app" antes de "FROM nginx:latest" y ejecuta "docker build -t errores:0.1 .". Debe fallar porque FROM debe ir primero.',
      allowedCommands: ['build'],
      checker: checkBuildError('from-not-first', 'errores:0.1'),
      successMessage:
        'Has reconocido el error de orden: FROM debe ser la primera instrucción del Dockerfile.',
      errorHint:
        'Asegúrate de que la primera instrucción sea "FROM nginx:latest" y ejecuta "docker build -t errores:0.1 .".',
    },
    {
      id: '2.3.3',
      title: 'Una instrucción RUN falla',
      instruction:
        'Escribe un Dockerfile con FROM, WORKDIR, COPY, CMD y una instrucción "RUN exit 1", luego ejecuta "docker build -t errores:0.2 .". Debe fallar indicando la instrucción y la causa.',
      allowedCommands: ['build'],
      checker: checkBuildError('run-failed', 'errores:0.2'),
      successMessage:
        'Has reconocido el error de RUN fallido: el mensaje muestra la instrucción y la causa del fallo.',
      errorHint:
        'Incluye una línea "RUN exit 1" y ejecuta "docker build -t errores:0.2 .".',
    },
    {
      id: '2.3.4',
      title: 'Falta CMD o ENTRYPOINT',
      instruction:
        'Sustituye "RUN exit 1" por "RUN echo ok", quita cualquier CMD o ENTRYPOINT y ejecuta "docker build -t errores:0.3 .". Debe fallar porque falta la instrucción de arranque.',
      allowedCommands: ['build'],
      checker: checkBuildError('missing-start-command', 'errores:0.3'),
      successMessage:
        'Has reconocido el error de arranque faltante: la imagen necesita CMD o ENTRYPOINT.',
      errorHint:
        'Mantén "RUN echo ok", quita CMD y ENTRYPOINT, y ejecuta "docker build -t errores:0.3 .".',
    },
    {
      id: '2.3.5',
      title: 'Nombre o tag inválido',
      instruction:
        'Restaura CMD y construye con "-t Mi-Sitio:1.0" (o "-t errores:1.0!"). Debe fallar porque el nombre o el tag no son válidos.',
      allowedCommands: ['build'],
      checker: checkBuildError('invalid-image-tag', 'Mi-Sitio:1.0'),
      successMessage:
        'Has reconocido el error de nombre o tag inválido: el repositorio debe ir en minúsculas y sin caracteres especiales.',
      errorHint:
        'Restaura CMD y ejecuta "docker build -t Mi-Sitio:1.0 ." (o "-t errores:1.0!").',
    },
    {
      id: '2.3.6',
      title: 'Nombre y tag duplicados',
      instruction:
        'Ejecuta "docker build -t nginx:latest .". Debe fallar porque esa referencia ya existe como imagen base.',
      allowedCommands: ['build'],
      checker: checkBuildError('duplicate-image-tag', 'nginx:latest'),
      successMessage:
        'Has reconocido el error de tag duplicado: ya existe una imagen con ese nombre y tag.',
      errorHint:
        'Ejecuta exactamente "docker build -t nginx:latest .".',
    },
    {
      id: '2.3.7',
      title: 'Ejecutar una imagen cuya construcción falló',
      instruction:
        'Construye "errores:0.4" con una instrucción "RUN exit 1" y luego ejecuta "docker run -d --name roto errores:0.4". No se debe crear el contenedor.',
      allowedCommands: ['build', 'run'],
      checker: checkFailedImageRun('errores:0.4', 'roto'),
      successMessage:
        'Has verificado que Docker rechaza ejecutar una imagen cuya construcción falló y no crea el contenedor.',
      errorHint:
        'Construye primero "errores:0.4" con "RUN exit 1" (fallará), luego ejecuta "docker run -d --name roto errores:0.4".',
    },
    {
      id: '2.3.8',
      title: 'Corregir y recuperar la imagen',
      instruction:
        'Corrige el Dockerfile, ejecuta "docker build -t errores:1.0 ." y luego "docker run -d --name errores errores:1.0". La imagen y el contenedor deben crearse.',
      allowedCommands: ['build', 'run'],
      checker: checkRecoveredImage('errores:1.0', 'errores'),
      successMessage:
        'Has recuperado la build: la imagen "errores:1.0" existe y el contenedor "errores" está en ejecución.',
      errorHint:
        'Corrige el Dockerfile, construye "errores:1.0" y ejecuta "docker run -d --name errores errores:1.0".',
    },
  ],
}
