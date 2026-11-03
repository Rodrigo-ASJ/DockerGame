export const PROGRESS_STORAGE_KEY = 'docker-game:progress'
export const PROGRESS_SCHEMA_VERSION = 1

export type ProgressV1 = {
  version: typeof PROGRESS_SCHEMA_VERSION
  completedLessonIds: string[]
}

export type Progress = {
  completedLessonIds: string[]
}

export type ProgressStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

type UnknownRecord = Record<string, unknown>
type ProgressMigration = (value: UnknownRecord) => UnknownRecord | null

/**
 * Migraciones por versión de origen. Para publicar una versión nueva, añade
 * aquí la migración que transforma el esquema anterior en el siguiente.
 */
const PROGRESS_MIGRATIONS: Partial<Record<number, ProgressMigration>> = {}

export function createEmptyProgress(): Progress {
  return { completedLessonIds: [] }
}

function getDefaultStorage(): ProgressStorage | null {
  try {
    if (typeof window === 'undefined') {
      return null
    }

    return window.localStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readCompletedLessonIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const completedLessonIds: string[] = []

  for (const item of value) {
    if (typeof item !== 'string') {
      return null
    }

    const lessonId = item.trim()

    if (lessonId.length === 0) {
      return null
    }

    if (!completedLessonIds.includes(lessonId)) {
      completedLessonIds.push(lessonId)
    }
  }

  return completedLessonIds
}

function migrateToCurrent(value: UnknownRecord): ProgressV1 | null {
  let candidate = value
  let version: unknown = candidate.version
  let appliedMigrations = 0

  while (typeof version === 'number' && version < PROGRESS_SCHEMA_VERSION) {
    const migration = PROGRESS_MIGRATIONS[version]

    if (migration === undefined || appliedMigrations >= 10) {
      return null
    }

    const migrated = migration(candidate)

    if (migrated === null) {
      return null
    }

    candidate = migrated
    version = candidate.version
    appliedMigrations += 1
  }

  if (version !== PROGRESS_SCHEMA_VERSION) {
    return null
  }

  const completedLessonIds = readCompletedLessonIds(candidate.completedLessonIds)

  if (completedLessonIds === null) {
    return null
  }

  return {
    version: PROGRESS_SCHEMA_VERSION,
    completedLessonIds,
  }
}

/**
 * Lee el progreso persistido. Cualquier dato ausente, corrupto o de una
 * versión desconocida se traduce en un progreso vacío para no romper la app.
 */
export function loadProgress(
  storage: ProgressStorage | null = getDefaultStorage(),
): Progress {
  if (storage === null) {
    return createEmptyProgress()
  }

  try {
    const rawProgress = storage.getItem(PROGRESS_STORAGE_KEY)

    if (rawProgress === null) {
      return createEmptyProgress()
    }

    const parsed: unknown = JSON.parse(rawProgress)

    if (!isRecord(parsed)) {
      return createEmptyProgress()
    }

    const migrated = migrateToCurrent(parsed)

    if (migrated === null) {
      return createEmptyProgress()
    }

    return { completedLessonIds: migrated.completedLessonIds }
  } catch {
    return createEmptyProgress()
  }
}

/**
 * Guarda el esquema completo. Devuelve `false` si el almacenamiento no está
 * disponible o rechaza la escritura, sin lanzar excepciones.
 */
export function saveProgress(
  progress: Progress,
  storage: ProgressStorage | null = getDefaultStorage(),
): boolean {
  if (storage === null) {
    return false
  }

  const completedLessonIds = readCompletedLessonIds(progress.completedLessonIds)

  if (completedLessonIds === null) {
    return false
  }

  const payload: ProgressV1 = {
    version: PROGRESS_SCHEMA_VERSION,
    completedLessonIds,
  }

  try {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function clearProgress(
  storage: ProgressStorage | null = getDefaultStorage(),
): boolean {
  if (storage === null) {
    return false
  }

  try {
    storage.removeItem(PROGRESS_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
