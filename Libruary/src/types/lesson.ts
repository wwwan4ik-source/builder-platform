import { type Type } from "lucide-react"

export type ElementType =
  | "title"
  | "radio-field"
  | "checkbox-field"
  | "text-field"
  | "image-upload"
  | "fill-blanks"

export type RadioOption = {
  id: number
  value: string
}

export type ChoiceOption = RadioOption

export type TitleElement = {
  id: number
  type: "title"
  title: string
}

export type RadioFieldElement = {
  id: number
  type: "radio-field"
  title: string
  correctOptionId: number
  options: RadioOption[]
}

export type CheckboxFieldElement = {
  id: number
  type: "checkbox-field"
  title: string
  correctOptionIds: number[]
  options: ChoiceOption[]
}

export type TextFieldElement = {
  id: number
  type: "text-field"
  title: string
}

export type ImageUploadElement = {
  id: number
  type: "image-upload"
  title: string
  imageSrc: string | null
  imageName: string
}

export type BlankAnswerOption = {
  id: number
  value: string
}

export type BlankItem = {
  id: number
  mode: "typed" | "choice"
  marker: string
  correctAnswer: string
  correctOptionId: number
  options: BlankAnswerOption[]
}

export type FillBlanksElement = {
  id: number
  type: "fill-blanks"
  title: string
  prompt: string
  blanks: BlankItem[]
  isInsertMenuOpen: boolean
  insertMenuPlacement: "bottom" | "top"
  activeChoiceBlankId: number | null
  activeChoiceBlankPlacement: "bottom" | "top"
}

export type LessonElement =
  | TitleElement
  | RadioFieldElement
  | CheckboxFieldElement
  | TextFieldElement
  | ImageUploadElement
  | FillBlanksElement

export type SaveState = "idle" | "loading" | "saving" | "saved" | "error"
export type AppPage = "dashboard" | "lessons" | "students"
export type AuthPage = "sign-in" | "create-account"
export type LessonStatus = "draft" | "published"
export type LessonStatusFilter = "all" | LessonStatus
export type LessonMode = "edit" | "student"

export type ToastState = {
  id: number
  message: string
}

export type LessonRow = {
  id: string
  title: string
  blocks: LessonElement[]
  status: LessonStatus
}

export type SavedLessonRow = LessonRow & {
  updated_at: string
  created_at: string
}

export type LibraryItem = {
  type: ElementType
  name: string
  description: string
  icon: typeof Type
}
