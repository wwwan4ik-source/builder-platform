import { getSupabaseRequiredMessage } from "@/lib/lesson-api"
import { supabase } from "@/lib/supabase"
import {
  type AssignedLessonRow,
  type StudentRow,
} from "@/types/student"

async function getFunctionError(error: unknown) {
  if (!(error instanceof Error)) {
    return new Error("Request failed")
  }

  const context = "context" in error ? error.context : null

  if (context instanceof Response) {
    try {
      const body = await context.clone().json()

      if (typeof body?.error === "string") {
        return new Error(body.error)
      }
    } catch {
      return error
    }
  }

  return error
}

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

  const invitesResult = await supabase
    .from("student_invites")
    .select("id,student_name,student_email,status,created_at")
    .eq("tutor_id", tutorId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (invitesResult.error) {
    return { data: null, error: invitesResult.error }
  }

  const studentLinks = linksResult.data ?? []
  const studentIds = studentLinks.map((link) => link.student_id)
  const pendingInvites = invitesResult.data ?? []
  const pendingInviteIds = pendingInvites.map((invite) => invite.id)

  if (studentIds.length === 0 && pendingInviteIds.length === 0) {
    return { data: [] as StudentRow[], error: null }
  }

  const usersResult = studentIds.length
    ? await supabase
        .from("users")
        .select("id,name,email")
        .in("id", studentIds)
    : { data: [], error: null }

  const assignmentsResult = studentIds.length
    ? await supabase
        .from("student_lessons")
        .select("student_id")
        .eq("assigned_by_tutor_id", tutorId)
        .in("student_id", studentIds)
    : { data: [], error: null }

  const inviteAssignmentsResult = pendingInviteIds.length
    ? await supabase
        .from("student_invite_lessons")
        .select("invite_id")
        .eq("assigned_by_tutor_id", tutorId)
        .in("invite_id", pendingInviteIds)
    : { data: [], error: null }

  if (usersResult.error) {
    return { data: null, error: usersResult.error }
  }

  if (assignmentsResult.error) {
    return { data: null, error: assignmentsResult.error }
  }

  if (inviteAssignmentsResult.error) {
    return { data: null, error: inviteAssignmentsResult.error }
  }

  const assignmentCounts = new Map<string, number>()
  for (const assignment of assignmentsResult.data ?? []) {
    assignmentCounts.set(
      assignment.student_id,
      (assignmentCounts.get(assignment.student_id) ?? 0) + 1
    )
  }

  const inviteAssignmentCounts = new Map<string, number>()
  for (const assignment of inviteAssignmentsResult.data ?? []) {
    inviteAssignmentCounts.set(
      assignment.invite_id,
      (inviteAssignmentCounts.get(assignment.invite_id) ?? 0) + 1
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
        status: "active" as const,
        created_at: link.created_at,
        assigned_lessons_count: assignmentCounts.get(student.id) ?? 0,
      },
    ]
  })

  const pendingStudents = pendingInvites.map((invite) => ({
    id: invite.id,
    invite_id: invite.id,
    name: invite.student_name || "Invited student",
    email: invite.student_email,
    status: "pending" as const,
    created_at: invite.created_at,
    assigned_lessons_count: inviteAssignmentCounts.get(invite.id) ?? 0,
  }))

  return { data: [...pendingStudents, ...students], error: null }
}

export async function createStudentInvite(
  studentEmail: string,
  studentName: string
) {
  if (!supabase) {
    return { data: null, error: new Error(getSupabaseRequiredMessage()) }
  }

  const { data, error } = await supabase.functions.invoke("create-student-invite", {
    body: {
      student_email: studentEmail,
      student_name: studentName,
      redirect_origin: window.location.origin,
    },
  })

  if (error) {
    return { data: null, error: await getFunctionError(error) }
  }

  return {
    data: (data ?? null) as {
      invite_id: string
      student_email: string
      token: string
      expires_at: string
    } | null,
    error: null,
  }
}

export async function fetchStudentInvite(token: string) {
  if (!supabase) {
    return { data: null, error: new Error(getSupabaseRequiredMessage()) }
  }

  const { data, error } = await supabase.rpc("get_student_invite", {
    p_token: token,
  })

  return {
    data: (data?.[0] ?? null) as {
      invite_id: string
      student_name: string
      student_email: string
      status: "pending" | "accepted" | "expired" | "revoked"
      expires_at: string
    } | null,
    error,
  }
}

export async function acceptStudentInviteWithPassword(
  token: string,
  password: string
) {
  if (!supabase) {
    return { data: null, error: new Error(getSupabaseRequiredMessage()) }
  }

  const { data, error } = await supabase.functions.invoke("accept-student-invite", {
    body: {
      token,
      password,
    },
  })

  if (error) {
    return { data: null, error: await getFunctionError(error) }
  }

  return {
    data: (data ?? null) as {
      email: string
      student_id: string
      tutor_id: string | null
    } | null,
    error: null,
  }
}

export async function regenerateStudentInviteLink(inviteId: string) {
  if (!supabase) {
    return { data: null, error: new Error(getSupabaseRequiredMessage()) }
  }

  const { data, error } = await supabase.rpc("regenerate_student_invite_link", {
    p_invite_id: inviteId,
  })

  return {
    data: (data?.[0] ?? null) as {
      invite_id: string
      student_email: string
      token: string
      expires_at: string
    } | null,
    error,
  }
}

export async function deleteStudentRecord(student: StudentRow) {
  if (!supabase) {
    return { error: new Error(getSupabaseRequiredMessage()) }
  }

  const { error } = await supabase.rpc("remove_student_from_tutor", {
    p_student_id: student.status === "active" ? student.id : null,
    p_invite_id:
      student.status === "pending" ? student.invite_id ?? student.id : null,
  })

  return { error }
}

export async function acceptStudentInvite(token: string, studentName: string) {
  if (!supabase) {
    return { data: null, error: new Error(getSupabaseRequiredMessage()) }
  }

  const { data, error } = await supabase.rpc("accept_student_invite", {
    p_token: token,
    p_student_name: studentName,
  })

  return { data: data?.[0] ?? null, error }
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

export async function fetchStudentInviteAssignments(
  inviteId: string,
  tutorId: string
) {
  if (!supabase) {
    return { data: null, error: new Error(getSupabaseRequiredMessage()) }
  }

  const { data, error } = await supabase
    .from("student_invite_lessons")
    .select("id,lesson_id,created_at,lessons(title,status)")
    .eq("invite_id", inviteId)
    .eq("assigned_by_tutor_id", tutorId)
    .order("created_at", { ascending: false })

  if (error) {
    return { data: null, error }
  }

  return {
    data: (data ?? []).map((assignment) => ({
      id: assignment.id,
      lesson_id: assignment.lesson_id,
      created_at: assignment.created_at,
      lessons: Array.isArray(assignment.lessons)
        ? (assignment.lessons[0] ?? null)
        : assignment.lessons,
      status: "assigned" as const,
      progress: 0,
    })),
    error: null,
  }
}

export async function assignLessonRecord(
  student: StudentRow,
  lessonId: string,
  tutorId: string
) {
  if (!supabase) {
    return { error: new Error(getSupabaseRequiredMessage()) }
  }

  if (student.status === "pending" && student.invite_id) {
    const { error } = await supabase.rpc("assign_student_invite_lesson", {
      p_invite_id: student.invite_id,
      p_lesson_id: lessonId,
    })

    return { error }
  }

  const { error } = await supabase.from("student_lessons").insert({
    student_id: student.id,
    lesson_id: lessonId,
    assigned_by_tutor_id: tutorId,
    status: "assigned",
    progress: 0,
  })

  return { error }
}
