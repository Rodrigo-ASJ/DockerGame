import { STEP_IDS, stepCheckers } from '../../core/checkers'
import type { Lesson } from '../../core/types'

export const LEVEL1_CREATE_LIST_LESSON_ID = 'level1-create-list'

export const level1CreateListLesson: Lesson = {
  id: LEVEL1_CREATE_LIST_LESSON_ID,
  level: 1,
  title: 'Crear y listar contenedores',
  objective:
    'Crear un contenedor a partir de la imagen nginx y comprobar su estado con Docker.',
  explanation:
    'Un contenedor es un proceso aislado que empaqueta una aplicación y sus dependencias. Con "docker run" creas y arrancas un contenedor; con "docker ps" compruebas qué contenedores están activos en este momento.',
  availableCommands: ['ps', 'run'],
  diagram: {
    title: 'Del comando al contenedor',
    steps: [
      {
        label: 'docker run -d --name web nginx',
        detail:
          'Creas un contenedor llamado "web" a partir de la imagen "nginx" y lo ejecutas en segundo plano.',
      },
      {
        label: 'Contenedor en marcha',
        detail:
          'Docker le asigna un identificador y lo deja activo para que puedas usarlo.',
      },
      {
        label: 'docker ps',
        detail:
          'Listas los contenedores activos con su identificador, nombre, imagen y estado.',
      },
    ],
  },
  steps: [
    {
      id: STEP_IDS.emptyList,
      title: 'Observa una lista vacía',
      instruction:
        'Ejecuta "docker ps" para comprobar que todavía no hay contenedores activos.',
      allowedCommands: ['ps'],
      checker: stepCheckers[STEP_IDS.emptyList],
      successMessage:
        'Correcto: no hay contenedores activos y Docker te lo indica con un mensaje claro.',
      errorHint:
        'Ejecuta exactamente "docker ps". En este primer paso todavía no puedes crear contenedores.',
    },
    {
      id: STEP_IDS.createContainer,
      title: 'Crea el contenedor web',
      instruction:
        'Ejecuta "docker run -d --name web nginx" para crear un contenedor llamado "web" a partir de la imagen "nginx".',
      allowedCommands: ['ps', 'run'],
      checker: stepCheckers[STEP_IDS.createContainer],
      successMessage:
        'Has creado el contenedor "web" y Docker le ha asignado un identificador.',
      errorHint:
        'Revisa el comando: debe ser "docker run -d --name web nginx". La imagen disponible en esta lección es "nginx".',
    },
    {
      id: STEP_IDS.listContainer,
      title: 'Lista el contenedor web',
      instruction:
        'Ejecuta "docker ps" para ver el contenedor "web" en estado activo.',
      allowedCommands: ['ps', 'run'],
      checker: stepCheckers[STEP_IDS.listContainer],
      successMessage:
        'Ahora la lista muestra el contenedor "web" con su imagen y su estado.',
      errorHint:
        'Ejecuta "docker ps" después de haber creado el contenedor "web".',
    },
    {
      id: STEP_IDS.duplicateName,
      title: 'Provoca un nombre duplicado',
      instruction:
        'Vuelve a ejecutar "docker run -d --name web nginx". Docker debe rechazar el nombre porque ya está en uso.',
      allowedCommands: ['ps', 'run'],
      checker: stepCheckers[STEP_IDS.duplicateName],
      successMessage:
        'Has comprobado que Docker no permite dos contenedores con el mismo nombre.',
      errorHint:
        'Repite exactamente "docker run -d --name web nginx" para obtener el error de nombre duplicado.',
    },
    {
      id: STEP_IDS.missingImage,
      title: 'Prueba una imagen inexistente',
      instruction:
        'Ejecuta "docker run -d --name web2 nginx:inexistente" para ver qué ocurre cuando la imagen no está disponible.',
      allowedCommands: ['ps', 'run'],
      checker: stepCheckers[STEP_IDS.missingImage],
      successMessage:
        'Has visto que Docker rechaza la creación cuando no encuentra la imagen indicada.',
      errorHint:
        'Usa "nginx:inexistente" como imagen en el comando. El contenedor debe llamarse "web2".',
    },
    {
      id: STEP_IDS.correctAndList,
      title: 'Corrige y lista los contenedores',
      instruction:
        'Crea "web2" con la imagen correcta usando "docker run -d --name web2 nginx" y ejecuta "docker ps" para ver los dos contenedores activos.',
      allowedCommands: ['ps', 'run'],
      checker: stepCheckers[STEP_IDS.correctAndList],
      successMessage:
        'Lección completada: has creado y listado dos contenedores y has aprendido a interpretar dos errores comunes.',
      errorHint:
        'Primero crea "web2" con la imagen "nginx" y después ejecuta "docker ps". Deben aparecer "web" y "web2".',
    },
  ],
}
