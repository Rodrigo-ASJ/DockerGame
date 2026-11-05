export type LessonStatus = 'locked' | 'available' | 'completed'

export type DeriveLessonStatusesInput = {
  readonly order: readonly string[]
  readonly completedLessonIds: readonly string[]
}

/**
 * Deriva el estado de cada lección de un orden a partir del progreso.
 *
 * Pura: recibe el orden como parámetro y no importa `content/`.
 *
 * - `completed`: su ID está en el progreso.
 * - `available`: no está completada y todas las lecciones anteriores del orden
 *   sí lo están.
 * - `locked`: el resto.
 *
 * Los IDs de `completedLessonIds` que no están en el orden se ignoran.
 */
export function deriveLessonStatuses(
  input: DeriveLessonStatusesInput,
): Readonly<Record<string, LessonStatus>> {
  const { order, completedLessonIds } = input
  const completed = new Set(completedLessonIds)
  const statuses: Record<string, LessonStatus> = {}

  let allPreviousCompleted = true

  for (const lessonId of order) {
    if (completed.has(lessonId)) {
      statuses[lessonId] = 'completed'
    } else if (allPreviousCompleted) {
      statuses[lessonId] = 'available'
      allPreviousCompleted = false
    } else {
      statuses[lessonId] = 'locked'
    }
  }

  return statuses
}

/**
 * Devuelve la primera lección del orden que no está completada.
 * Lanza si el orden está vacío o si todas sus lecciones están completadas.
 */
export function firstAvailableLessonId(
  order: readonly string[],
  completedLessonIds: readonly string[],
): string {
  const statuses = deriveLessonStatuses({ order, completedLessonIds })

  for (const lessonId of order) {
    if (statuses[lessonId] === 'available') {
      return lessonId
    }
  }

  throw new Error(
    'No hay ninguna lección disponible en el orden proporcionado',
  )
}

/**
 * Devuelve true si todas las lecciones indicadas están completadas.
 */
export function isLevelCompleted(
  lessonIds: readonly string[],
  completedLessonIds: readonly string[],
): boolean {
  const completed = new Set(completedLessonIds)

  return lessonIds.every((lessonId) => completed.has(lessonId))
}
