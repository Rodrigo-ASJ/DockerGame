import type { Lesson } from '../../core/types'
import {
  checkContainer,
  checkHistoryError,
  checkHistorySelected,
  checkImagesListed,
} from '../../core/checkers'
import { LEVEL2_AVAILABLE_COMMANDS } from '../../core/commands'

export const LEVEL2_01_IMAGES_LAYERS_LESSON_ID =
  'level2-01-images-layers'

export const level201ImagesLayersLesson: Lesson = {
  id: LEVEL2_01_IMAGES_LAYERS_LESSON_ID,
  level: 2,
  title: 'Imágenes y capas',
  objective:
    'Entender que una imagen es una plantilla de solo lectura formada por capas y que un contenedor es esa imagen en ejecución con una capa de escritura.',
  explanation:
    'Una imagen es una plantilla de solo lectura formada por capas apiladas: sistema, binarios y configuración. Un contenedor es esa imagen en ejecución con una capa de escritura por encima para sus cambios. Con "docker images" listas las imágenes disponibles y con "docker history <imagen>" ves sus capas una por una, con el tamaño de cada una.',
  diagram: {
    title: 'De la imagen al contenedor',
    steps: [
      {
        label: 'Imagen: capas de solo lectura',
        detail: 'La imagen apila capas de solo lectura, como el sistema y los binarios.',
      },
      {
        label: 'docker run',
        detail: 'Al ejecutar la imagen se crea un contenedor sobre esas capas.',
      },
      {
        label: 'Contenedor: capa de escritura',
        detail: 'El contenedor añade una capa de escritura para sus cambios.',
      },
    ],
  },
  availableCommands: LEVEL2_AVAILABLE_COMMANDS,
  workspace: undefined,
  exampleDockerfiles: undefined,
  steps: [
    {
      id: '2.1.1',
      title: 'Lista las imágenes disponibles',
      instruction:
        'Ejecuta "docker images" para ver las imágenes base con su nombre, tag y tamaño.',
      allowedCommands: ['images'],
      checker: checkImagesListed,
      successMessage:
        'Has listado las dos imágenes base: "nginx:latest" (187 MB) y "nginx:alpine" (43 MB).',
      errorHint:
        'Ejecuta exactamente "docker images". No selecciona ninguna imagen, solo las lista.',
    },
    {
      id: '2.1.2',
      title: 'Inspecte el historial de nginx:latest',
      instruction:
        'Ejecuta "docker history nginx:latest" para ver sus tres capas y selecciona la imagen.',
      allowedCommands: ['images', 'history'],
      checker: checkHistorySelected('nginx:latest'),
      successMessage:
        'Has inspeccionado "nginx:latest": tres capas de 100 MB, 70 MB y 17 MB, y la imagen está seleccionada.',
      errorHint:
        'Ejecuta exactamente "docker history nginx:latest". La imagen debe estar disponible en el catálogo.',
    },
    {
      id: '2.1.3',
      title: 'Inspecte el historial de nginx:alpine',
      instruction:
        'Ejecuta "docker history nginx:alpine" para ver sus tres capas más pequeñas y selecciona la imagen.',
      allowedCommands: ['images', 'history'],
      checker: checkHistorySelected('nginx:alpine'),
      successMessage:
        'Has inspeccionado "nginx:alpine": tres capas de 20 MB, 18 MB y 5 MB, y la imagen está seleccionada.',
      errorHint:
        'Ejecuta exactamente "docker history nginx:alpine". La imagen base slim está disponible.',
    },
    {
      id: '2.1.4',
      title: 'Intenta inspeccionar una imagen inexistente',
      instruction:
        'Ejecuta "docker history nginx:no-existe". Docker debe rechazar la petición sin alterar el estado.',
      allowedCommands: ['images', 'history'],
      checker: checkHistoryError('image-not-found'),
      successMessage:
        'Has visto que Docker rechaza inspectar una imagen inexistente y no cambia la selección.',
      errorHint:
        'Ejecuta exactamente "docker history nginx:no-existe". Debe aparecer el error de imagen no encontrada.',
    },
    {
      id: '2.1.5',
      title: 'Ejecuta un contenedor desde nginx:alpine',
      instruction:
        'Ejecuta "docker run -d --name web nginx:alpine" para crear un contenedor activo a partir de la imagen alpine.',
      allowedCommands: ['images', 'history', 'run', 'ps'],
      checker: checkContainer('web', 'nginx:alpine'),
      successMessage:
        'Has creado el contenedor "web" a partir de "nginx:alpine". Está en ejecución con el comando por defecto de la imagen base.',
      errorHint:
        'Ejecuta exactamente "docker run -d --name web nginx:alpine". El nombre debe ser "web" y la imagen "nginx:alpine".',
    },
  ],
}
