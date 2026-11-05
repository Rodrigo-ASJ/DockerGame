import { describe, expect, it } from 'vitest'
import type { BaseImage } from '../core/types'
import { formatSize, getImageSizeKb } from '../core/images'
import { baseImages } from './images/base-images'
import {
  curriculum,
  getLessonById,
  getLevelForLesson,
  LESSON_ORDER,
} from './curriculum'
import { staticSiteProject } from './projects/static-site'

const EXPECTED_ORDER = [
  'level1-create-list',
  'level2-01-images-layers',
  'level2-02-first-dockerfile',
  'level2-03-build-errors',
  'level2-04-entrypoint-cache-size',
]

function findBase(reference: string): BaseImage {
  const base = baseImages.find((image) => image.reference === reference)

  if (!base) {
    throw new Error(`Base no declarada: ${reference}`)
  }

  return base
}

function nonCommentLines(text: string): string[] {
  return text.split('\n').filter((line) => {
    const trimmed = line.trimStart()

    return trimmed.length > 0 && !trimmed.startsWith('#')
  })
}

const UPPERCASE_INSTRUCTION = /^(FROM|WORKDIR|COPY|RUN|CMD|ENTRYPOINT)\b/

describe('currículo', () => {
  it('declara dos niveles con títulos', () => {
    expect(curriculum.levels).toHaveLength(2)
    expect(curriculum.levels[0]?.number).toBe(1)
    expect(curriculum.levels[0]?.title.length).toBeGreaterThan(0)
    expect(curriculum.levels[1]?.number).toBe(2)
    expect(curriculum.levels[1]?.title.length).toBeGreaterThan(0)
  })

  it('declara el orden lineal nivel 1 → 2.1 → 2.2 → 2.3 → 2.4', () => {
    expect(curriculum.lessonOrder).toEqual(EXPECTED_ORDER)
    expect(LESSON_ORDER).toEqual(EXPECTED_ORDER)
  })

  it('tiene IDs de lección únicos en el registro', () => {
    const ids = curriculum.lessons.map((lesson) => lesson.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cada lección del orden existe en el registro', () => {
    for (const lessonId of curriculum.lessonOrder) {
      expect(getLessonById(lessonId)).toBeDefined()
    }
  })

  it('cada lección pertenece a un solo nivel y el registro cubre el orden', () => {
    const appearances = new Map<string, number>()

    for (const level of curriculum.levels) {
      for (const lessonId of level.lessonIds) {
        appearances.set(lessonId, (appearances.get(lessonId) ?? 0) + 1)
      }
    }

    for (const lessonId of curriculum.lessonOrder) {
      expect(appearances.get(lessonId)).toBe(1)
    }

    expect(curriculum.lessons.length).toBe(curriculum.lessonOrder.length)
  })

  it('asigna el nivel correcto a cada lección', () => {
    expect(getLevelForLesson('level1-create-list')).toBe(1)

    for (const lessonId of EXPECTED_ORDER.slice(1)) {
      expect(getLevelForLesson(lessonId)).toBe(2)
    }

    expect(getLevelForLesson('leccion-inexistente')).toBeUndefined()
  })

  it('registra lecciones con campos obligatorios', () => {
    for (const lesson of curriculum.lessons) {
      expect(lesson.id.length).toBeGreaterThan(0)
      expect(lesson.level).toBeGreaterThan(0)
      expect(lesson.title.length).toBeGreaterThan(0)
      expect(lesson.explanation.length).toBeGreaterThan(0)
      expect(lesson.availableCommands.length).toBeGreaterThan(0)
      expect(lesson.diagram.steps.length).toBeGreaterThan(0)
    }
  })

  describe('bases', () => {
    it('tiene referencias únicas', () => {
      const references = baseImages.map((base) => base.reference)

      expect(new Set(references).size).toBe(references.length)
    })

    it('cada base declara tres capas que suman su tamaño simulado', () => {
      const latest = findBase('nginx:latest')
      const alpine = findBase('nginx:alpine')

      expect(latest.layers).toHaveLength(3)
      expect(alpine.layers).toHaveLength(3)
      expect(getImageSizeKb(latest)).toBe(187000)
      expect(getImageSizeKb(alpine)).toBe(43000)
      expect(formatSize(getImageSizeKb(latest))).toBe('187 MB')
      expect(formatSize(getImageSizeKb(alpine))).toBe('43 MB')
    })
  })

  describe('proyecto estático', () => {
    it('declara rutas únicas, contenido y sizeKb mayor que cero', () => {
      const paths = staticSiteProject.files.map((file) => file.path)

      expect(new Set(paths).size).toBe(paths.length)

      for (const file of staticSiteProject.files) {
        expect(file.path.length).toBeGreaterThan(0)
        expect(file.content.length).toBeGreaterThan(0)
        expect(file.sizeKb).toBeGreaterThan(0)
      }
    })

    it('declara index.html (2 KB), app.js (3 KB) y styles.css (1 KB)', () => {
      const byPath = new Map(
        staticSiteProject.files.map((file) => [file.path, file]),
      )

      expect(byPath.get('index.html')?.sizeKb).toBe(2)
      expect(byPath.get('app.js')?.sizeKb).toBe(3)
      expect(byPath.get('styles.css')?.sizeKb).toBe(1)
    })
  })

  describe('textos y ejemplos de Dockerfile', () => {
    it('sin textos vacíos ni marcadores en inglés', () => {
      for (const lesson of curriculum.lessons) {
        expect(lesson.title.length).toBeGreaterThan(0)
        expect(lesson.objective.length).toBeGreaterThan(0)
        expect(lesson.explanation.length).toBeGreaterThan(0)
        expect(lesson.explanation).not.toMatch(/TODO|Lorem|placeholder/i)
      }
    })

    it('los ejemplos y el initialDockerfile usan instrucciones en mayúsculas', () => {
      for (const lesson of curriculum.lessons) {
        for (const dockerfile of lesson.exampleDockerfiles ?? []) {
          for (const line of nonCommentLines(dockerfile)) {
            expect(UPPERCASE_INSTRUCTION.test(line)).toBe(true)
          }
        }

        const initialDockerfile = lesson.workspace?.initialDockerfile

        if (initialDockerfile) {
          for (const line of nonCommentLines(initialDockerfile)) {
            expect(UPPERCASE_INSTRUCTION.test(line)).toBe(true)
          }
        }
      }
    })

    it('los espacios de trabajo declaran archivos del proyecto con rutas válidas', () => {
      const projectPaths = new Set(
        staticSiteProject.files.map((file) => file.path),
      )

      for (const lesson of curriculum.lessons) {
        const files = lesson.workspace?.projectFiles ?? []

        for (const file of files) {
          expect(projectPaths.has(file.path)).toBe(true)
          expect(file.sizeKb).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('tipos exportados', () => {
    it('curriculum es un Curriculum válido', () => {
      const lesson = curriculum.lessons[0]

      expect(lesson).toBeDefined()
      if (!lesson) {
        throw new Error('El currículo no declara lecciones')
      }

      expect(lesson.id).toBe('level1-create-list')
      expect(curriculum.baseImages).toContain(baseImages[0])
    })
  })
})
