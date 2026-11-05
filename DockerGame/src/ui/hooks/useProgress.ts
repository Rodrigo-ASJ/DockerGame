import { useCallback, useState } from 'react'
import {
  loadProgress,
  saveProgress,
  type Progress,
} from '../storage/progressStorage'

/**
 * Única propietaria del progreso y de su guardado en localStorage.
 *
 * Carga una vez al montar, guarda con `saveProgress` y nunca duplica los IDs
 * de lección completada. Ningún otro hook llama al almacenamiento.
 */
export function useProgress(): {
  readonly progress: Progress
  readonly isCompleted: (lessonId: string) => boolean
  readonly completeLesson: (lessonId: string) => void
} {
  const [progress, setProgress] = useState<Progress>(() => loadProgress())

  const isCompleted = useCallback(
    (lessonId: string) => progress.completedLessonIds.includes(lessonId),
    [progress.completedLessonIds],
  )

  const completeLesson = useCallback(
    (lessonId: string) => {
      const alreadyCompleted = progress.completedLessonIds.includes(lessonId)

      const completedLessonIds = alreadyCompleted
        ? progress.completedLessonIds
        : [...progress.completedLessonIds, lessonId]

      const nextProgress = { completedLessonIds }

      saveProgress(nextProgress)
      setProgress(nextProgress)
    },
    [progress.completedLessonIds],
  )

  return { progress, isCompleted, completeLesson }
}
