import { describe, expect, it } from 'vitest'
import {
  clearProgress,
  createEmptyProgress,
  loadProgress,
  PROGRESS_SCHEMA_VERSION,
  PROGRESS_STORAGE_KEY,
  saveProgress,
  type ProgressStorage,
} from './progressStorage'

type MemoryStorage = ProgressStorage & {
  readonly values: Map<string, string>
}

function createMemoryStorage(initial: Record<string, string> = {}): MemoryStorage {
  const values = new Map(Object.entries(initial))

  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

function storageWith(rawProgress: string): MemoryStorage {
  return createMemoryStorage({ [PROGRESS_STORAGE_KEY]: rawProgress })
}

describe('loadProgress', () => {
  it('returns empty progress when nothing is stored', () => {
    expect(loadProgress(createMemoryStorage())).toEqual(createEmptyProgress())
  })

  it('reads a valid versioned payload', () => {
    const storage = storageWith(
      JSON.stringify({
        version: PROGRESS_SCHEMA_VERSION,
        completedLessonIds: ['level1-create-list'],
      }),
    )

    expect(loadProgress(storage)).toEqual({
      completedLessonIds: ['level1-create-list'],
    })
  })

  it('deduplicates stored lesson ids', () => {
    const storage = storageWith(
      JSON.stringify({
        version: PROGRESS_SCHEMA_VERSION,
        completedLessonIds: ['lesson-a', 'lesson-a', 'lesson-b'],
      }),
    )

    expect(loadProgress(storage)).toEqual({
      completedLessonIds: ['lesson-a', 'lesson-b'],
    })
  })

  it('returns empty progress for corrupt JSON', () => {
    const storage = storageWith('{esto no es json')

    expect(loadProgress(storage)).toEqual(createEmptyProgress())
  })

  it('returns empty progress for an unknown version', () => {
    const unknownVersion = storageWith(
      JSON.stringify({
        version: 99,
        completedLessonIds: ['level1-create-list'],
      }),
    )

    expect(loadProgress(unknownVersion)).toEqual(createEmptyProgress())
  })

  it('returns empty progress for a version without migration', () => {
    const oldVersion = storageWith(
      JSON.stringify({
        version: 0,
        completedLessonIds: ['level1-create-list'],
      }),
    )

    expect(loadProgress(oldVersion)).toEqual(createEmptyProgress())
  })

  it('returns empty progress when the payload is not an object', () => {
    expect(loadProgress(storageWith('[]'))).toEqual(createEmptyProgress())
    expect(loadProgress(storageWith('null'))).toEqual(createEmptyProgress())
    expect(loadProgress(storageWith('"texto"'))).toEqual(createEmptyProgress())
  })

  it('returns empty progress for invalid lesson ids', () => {
    const invalidPayloads = [
      { version: PROGRESS_SCHEMA_VERSION },
      { version: PROGRESS_SCHEMA_VERSION, completedLessonIds: 'lesson-a' },
      { version: PROGRESS_SCHEMA_VERSION, completedLessonIds: [1] },
      { version: PROGRESS_SCHEMA_VERSION, completedLessonIds: [''] },
      { version: PROGRESS_SCHEMA_VERSION, completedLessonIds: ['   '] },
    ]

    for (const payload of invalidPayloads) {
      expect(loadProgress(storageWith(JSON.stringify(payload)))).toEqual(
        createEmptyProgress(),
      )
    }
  })

  it('returns empty progress when reading from storage throws', () => {
    const storage: ProgressStorage = {
      getItem: () => {
        throw new Error('acceso denegado')
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    }

    expect(loadProgress(storage)).toEqual(createEmptyProgress())
  })

  it('returns empty progress without storage', () => {
    expect(loadProgress(null)).toEqual(createEmptyProgress())
  })
})

describe('saveProgress', () => {
  it('writes the full versioned schema', () => {
    const storage = createMemoryStorage()

    expect(
      saveProgress({ completedLessonIds: ['level1-create-list'] }, storage),
    ).toBe(true)

    expect(storage.values.get(PROGRESS_STORAGE_KEY)).toBe(
      JSON.stringify({
        version: PROGRESS_SCHEMA_VERSION,
        completedLessonIds: ['level1-create-list'],
      }),
    )
  })

  it('normalizes lesson ids before saving', () => {
    const storage = createMemoryStorage()

    saveProgress(
      { completedLessonIds: [' lesson-a ', 'lesson-a', 'lesson-b'] },
      storage,
    )

    expect(loadProgress(storage)).toEqual({
      completedLessonIds: ['lesson-a', 'lesson-b'],
    })
  })

  it('does not throw when storage rejects the write', () => {
    const storage: ProgressStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('cuota superada')
      },
      removeItem: () => undefined,
    }

    expect(saveProgress({ completedLessonIds: ['lesson-a'] }, storage)).toBe(
      false,
    )
  })

  it('returns false without storage', () => {
    expect(saveProgress({ completedLessonIds: ['lesson-a'] }, null)).toBe(false)
  })

  it('round-trips through the browser localStorage by default', () => {
    window.localStorage.clear()

    expect(saveProgress({ completedLessonIds: ['level1-create-list'] })).toBe(
      true,
    )
    expect(loadProgress()).toEqual({
      completedLessonIds: ['level1-create-list'],
    })
  })
})

describe('clearProgress', () => {
  it('removes the stored progress', () => {
    const storage = storageWith(
      JSON.stringify({
        version: PROGRESS_SCHEMA_VERSION,
        completedLessonIds: ['level1-create-list'],
      }),
    )

    expect(clearProgress(storage)).toBe(true)
    expect(storage.values.has(PROGRESS_STORAGE_KEY)).toBe(false)
    expect(loadProgress(storage)).toEqual(createEmptyProgress())
  })

  it('returns false without storage', () => {
    expect(clearProgress(null)).toBe(false)
  })
})
