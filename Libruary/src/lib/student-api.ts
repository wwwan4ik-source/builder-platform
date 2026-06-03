import { getSupabaseRequiredMessage } from "@/lib/lesson-api"
import { supabase } from "@/lib/supabase"
import {
  type AssignedLessonRow,
  type StudentRow,
} from "@/types/student"

export async function fetchStudents(tutorId: string) {
  if (!supabase) {
    return { data: null, error: new Error(getSupabaseRequiredMessage()) }
  }

  const linksResult = await supabase
    .from("tutor_students")
    .select("student_id,created_at")
    .eq("tutor_id", tutorId)
    .order("created_at", { ascending: false })

  if (linksResult.error) {
    return { data: null, error: linksResult.error }
  }

  const studentLinks = linksResult.data ?? []
  const studentIds = studentLinks.map((link) => link.student_id)

  if (studentIds.length === 0) {
    return { data: [] as StudentRow[], error: null }
  }

  const [usersResult, assignmentsResult] = await Promise.all([
    supabase
      .from("users")
      .select("id,name,email")
      .in("id", studentIds),
    supabase
      .from("student_lessons")
      .select("student_id")
      .eq("assigned_by_tutor_id", tutorId)
      .in("student_id", studentIds),
  ])

  if (usersResult.error) {
    return { data: null, error: usersResult.error }
  }

  if (assignmentsResult.error) {
    return { data: null, error: assignmentsResult.error }
  }

  const assignmentCounts = new Map<string, number>()
  for (const assignment of assignmentsResult.data ?? []) {
    assignmentCounts.set(
      assignment.student_id,
      (assignmentCounts.get(assignment.student_id) ?? 0) + 1
    )
  }

  const usersById = new Map(
    (usersResult.data ?? []).map((student) => [student.id, student])
  )

  const students = studentLinks.flatMap((link) => {
    const student = usersById.get(link.student_id)

    if (!student) {
      return []
    }

    return [
      {
        id: student.id,
        name: student.name || "Unnamed student",
        email: student.email,
        created_at: link.created_at,
        assigned_lessons_count: assignmentCounts.get(student.id) ?? 0,
      },
    ]
  })

  return { data: students, error: null }
}

export async function createStudentRecord(studentName: string, tutorId: string) {
  if (!supabase) {
    return { error: new Error(getSupabaseRequiredMessage()) }
  }

  const studentId = crypto.randomUUID()

  const userResult = await supabase.from("users").insert({
    id: studentId,
    name: studentName,
    role: "student",
    must_change_password: false,
  })

  if (userResult.error) {
    return { error: userResult.error }
  }

  const linkResult = await supabase.from("tutor_students").insert({
    tutor_id: tutorId,
    student_id: studentId,
  })

  return { error: linkResult.error }
}

export async function fetchStudentAssignments(studentId: string, tutorId: string) {
  if (!supabase) {
    return { data: null, error: new Error(getSupabaseRequiredMessage()) }
  }

  const { data, error } = await supabase
    .from("student_lessons")
    .select("id,lesson_id,status,progress,created_at,lessons(title,status)")
    .eq("student_id", studentId)
    .eq("assigned_by_tutor_id", tutorId)
    .order("created_at", { ascending: false })
    .returns<AssignedLessonRow[]>()

  return { data, error }
}

export async function assignLessonRecord(
  studentId: string,
  lessonId: string,
  tutorId: string
) {
  if (!supabase) {
    return { error: new Error(getSupabaseRequiredMessage()) }
  }

  const { error } = await supabase.from("student_lessons").insert({
    student_id: studentId,
    lesson_id: lessonId,
    assigned_by_tutor_id: tutorId,
    status: "assigned",
    progress: 0,
  })

  return { error }
}
