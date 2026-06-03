import { type LessonStatus } from "./lesson"

export type StudentRow = {
  id: string
  name: string
  email: string | null
  created_at: string
  assigned_lessons_count: number
}

export type AssignedLessonRow = {
  id: string
  lesson_id: string
  status: "assigned" | "in_progress" | "completed"
  progress: number
  created_at: string
  lessons: {
    title: string
    status: LessonStatus
  } | null
}

