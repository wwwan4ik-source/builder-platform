export type UserRole = "tutor" | "student"

type BaseUserProfile = {
  id: string
  email: string | null
  name: string
}

export type TutorProfile = BaseUserProfile & {
  role: "tutor"
}

export type StudentProfile = BaseUserProfile & {
  role: "student"
}

export type UserProfile = TutorProfile | StudentProfile
