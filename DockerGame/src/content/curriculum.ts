import type { Curriculum, CurriculumLevel, Lesson } from '../core/types'
import {
  LEVEL1_CREATE_LIST_LESSON_ID,
  level1CreateListLesson,
} from './lessons/level1-create-list'
import {
  LEVEL2_01_IMAGES_LAYERS_LESSON_ID,
  level201ImagesLayersLesson,
} from './lessons/level2-01-images-layers'
import {
  LEVEL2_02_FIRST_DOCKERFILE_LESSON_ID,
  level202FirstDockerfileLesson,
} from './lessons/level2-02-first-dockerfile'
import {
  LEVEL2_03_BUILD_ERRORS_LESSON_ID,
  level203BuildErrorsLesson,
} from './lessons/level2-03-build-errors'
import {
  LEVEL2_04_ENTRYPOINT_CACHE_SIZE_LESSON_ID,
  level204EntrypointCacheSizeLesson,
} from './lessons/level2-04-entrypoint-cache-size'
import { baseImages } from './images/base-images'

export const LESSON_ORDER = [
  'level1-create-list',
  'level2-01-images-layers',
  'level2-02-first-dockerfile',
  'level2-03-build-errors',
  'level2-04-entrypoint-cache-size',
] as const

export type LessonId = (typeof LESSON_ORDER)[number]

const lessonsById = {
  [level1CreateListLesson.id]: level1CreateListLesson,
  [LEVEL2_01_IMAGES_LAYERS_LESSON_ID]: level201ImagesLayersLesson,
  [LEVEL2_02_FIRST_DOCKERFILE_LESSON_ID]: level202FirstDockerfileLesson,
  [LEVEL2_03_BUILD_ERRORS_LESSON_ID]: level203BuildErrorsLesson,
  [LEVEL2_04_ENTRYPOINT_CACHE_SIZE_LESSON_ID]: level204EntrypointCacheSizeLesson,
} as Record<LessonId, Lesson>

for (const lessonId of LESSON_ORDER) {
  if (!(lessonId in lessonsById)) {
    throw new Error(`Lección no declarada en el currículo: ${lessonId}`)
  }
}

const LEVELS: readonly CurriculumLevel[] = [
  {
    number: 1,
    title: 'Fundamentos',
    subtitle: 'Contenedores y comandos básicos',
    lessonIds: [LEVEL1_CREATE_LIST_LESSON_ID],
  },
  {
    number: 2,
    title: 'Imágenes y Dockerfiles',
    subtitle: 'Construye imágenes y entiende su arranque',
    lessonIds: [
      LEVEL2_01_IMAGES_LAYERS_LESSON_ID,
      LEVEL2_02_FIRST_DOCKERFILE_LESSON_ID,
      LEVEL2_03_BUILD_ERRORS_LESSON_ID,
      LEVEL2_04_ENTRYPOINT_CACHE_SIZE_LESSON_ID,
    ],
  },
]

function lessonInOrder(lessonId: LessonId): Lesson {
  const lesson = lessonsById[lessonId]

  if (!lesson) {
    throw new Error(`Lección no declarada en el currículo: ${lessonId}`)
  }

  return lesson
}

export const curriculum: Curriculum = {
  levels: LEVELS,
  lessons: LESSON_ORDER.map(lessonInOrder),
  lessonOrder: LESSON_ORDER,
  baseImages,
}

export function getLessonById(id: string): Lesson | undefined {
  return (lessonsById as Record<string, Lesson | undefined>)[id]
}

export function getLevelForLesson(id: string): number | undefined {
  for (const level of LEVELS) {
    if (level.lessonIds.includes(id)) {
      return level.number
    }
  }

  return undefined
}
