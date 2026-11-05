import { describe, expect, it } from 'vitest'
import {
  deriveLessonStatuses,
  firstAvailableLessonId,
  isLevelCompleted,
} from './progression'

const ORDER = [
  'level1-create-list',
  'level2-01-images-layers',
  'level2-02-first-dockerfile',
  'level2-03-build-errors',
  'level2-04-entrypoint-cache-size',
] as const

describe('deriveLessonStatuses', () => {
  it('devuelve un mapa vacío cuando el orden está vacío', () => {
    expect(
      deriveLessonStatuses({ order: [], completedLessonIds: [] }),
    ).toEqual({})
  })

  it('deja la primera lección disponible y el resto bloqueada sin progreso', () => {
    const statuses = deriveLessonStatuses({
      order: ORDER,
      completedLessonIds: [],
    })

    expect(statuses['level1-create-list']).toBe('available')
    for (const lessonId of ORDER.slice(1)) {
      expect(statuses[lessonId]).toBe('locked')
    }
  })

  it('completar una lección desbloquea la siguiente', () => {
    const statuses = deriveLessonStatuses({
      order: ORDER,
      completedLessonIds: ['level1-create-list'],
    })

    expect(statuses['level1-create-list']).toBe('completed')
    expect(statuses['level2-01-images-layers']).toBe('available')
    expect(statuses['level2-02-first-dockerfile']).toBe('locked')
  })

  it('avanza el desbloqueo lección a lección', () => {
    const afterFirst = deriveLessonStatuses({
      order: ORDER,
      completedLessonIds: ['level1-create-list', 'level2-01-images-layers'],
    })
    expect(afterFirst['level2-01-images-layers']).toBe('completed')
    expect(afterFirst['level2-02-first-dockerfile']).toBe('available')
    expect(afterFirst['level2-03-build-errors']).toBe('locked')

    const afterAll = deriveLessonStatuses({
      order: ORDER,
      completedLessonIds: [...ORDER],
    })
    for (const lessonId of ORDER) {
      expect(afterAll[lessonId]).toBe('completed')
    }
  })

  it('ignora IDs de completado que no están en el orden', () => {
    const statuses = deriveLessonStatuses({
      order: ORDER,
      completedLessonIds: ['leccion-inexistente'],
    })

    expect(statuses['level1-create-list']).toBe('available')
    expect(statuses['level2-01-images-layers']).toBe('locked')
  })

  it('marca como completada una lección aunque sus predecesoras no lo estén', () => {
    const statuses = deriveLessonStatuses({
      order: ORDER,
      completedLessonIds: ['level2-03-build-errors'],
    })

    expect(statuses['level1-create-list']).toBe('available')
    expect(statuses['level2-01-images-layers']).toBe('locked')
    expect(statuses['level2-02-first-dockerfile']).toBe('locked')
    expect(statuses['level2-03-build-errors']).toBe('completed')
    expect(statuses['level2-04-entrypoint-cache-size']).toBe('locked')
  })
})

describe('firstAvailableLessonId', () => {
  it('devuelve la primera lección sin progreso', () => {
    expect(firstAvailableLessonId(ORDER, [])).toBe('level1-create-list')
  })

  it('devuelve la siguiente lección tras completar la primera', () => {
    expect(firstAvailableLessonId(ORDER, ['level1-create-list'])).toBe(
      'level2-01-images-layers',
    )
  })

  it('devuelve la última lección cuando solo queda esa', () => {
    expect(
      firstAvailableLessonId(ORDER, ORDER.slice(0, -1)),
    ).toBe('level2-04-entrypoint-cache-size')
  })

  it('lanza error con el orden vacío', () => {
    expect(() => firstAvailableLessonId([], [])).toThrow()
  })

  it('lanza error cuando no hay ninguna lección disponible', () => {
    expect(() => firstAvailableLessonId(ORDER, [...ORDER])).toThrow()
  })
})

describe('isLevelCompleted', () => {
  const LEVEL_1_IDS = ['level1-create-list']
  const LEVEL_2_IDS = ORDER.slice(1)

  it('devuelve false sin progreso', () => {
    expect(isLevelCompleted(LEVEL_1_IDS, [])).toBe(false)
    expect(isLevelCompleted(LEVEL_2_IDS, [])).toBe(false)
  })

  it('devuelve true cuando todas las lecciones del nivel están completadas', () => {
    expect(isLevelCompleted(LEVEL_1_IDS, ['level1-create-list'])).toBe(true)
    expect(isLevelCompleted(LEVEL_2_IDS, [...ORDER.slice(1)])).toBe(true)
  })

  it('devuelve false cuando falta alguna lección del nivel', () => {
    expect(
      isLevelCompleted(LEVEL_2_IDS, [
        'level1-create-list',
        'level2-01-images-layers',
        'level2-02-first-dockerfile',
        'level2-03-build-errors',
      ]),
    ).toBe(false)
  })

  it('ignora IDs desconocidos en el progreso', () => {
    expect(
      isLevelCompleted(LEVEL_1_IDS, ['level1-create-list', 'inexistente']),
    ).toBe(true)
  })

  it('devuelve true para un nivel sin lecciones', () => {
    expect(isLevelCompleted([], [])).toBe(true)
  })
})
