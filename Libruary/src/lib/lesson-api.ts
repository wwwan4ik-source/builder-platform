import { supabase } from "@/lib/supabase"
import {
  hydrateElements,
  prepareElementsForSave,
} from "@/lib/lesson-elements"
import {
  type LessonElement,
  type LessonRow,
  type LessonStatus,
  type SavedLessonRow,
} from "@/types/lesson"

export function getSupabaseRequiredMessage() {
  return "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first"
}

export async function fetchLessons(tutorId: string) {
  if (!supabase) {
    return { data: null, error: new Error(getSupabaseRequiredMessage()) }
  }

  const { data, error } = await supabase
    .from("lessons")
    .select("id,title,status,blocks,created_at,updated_at")
    .eq("tutor_id", tutorId)
    .order("updated_at", { ascending: false })
    .returns<SavedLessonRow[]>()

  return { data, error }
}

export async function fetchLatestDraft(tutorId: string) {
  if (!supabase) {
    return { data: null, error: new Error(getSupabaseRequiredMessage()) }
  }

  const { data, error } = await supabase
    .from("lessons")
    .select("id,title,status,blocks")
    .eq("tutor_id", tutorId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<LessonRow>()

  return {
    data: data
      ? {
          ...data,
          blocks: hydrateElements(data.blocks),
        }
      : null,
    error,
  }
}

type PersistLessonInput = {
  lessonId: string | null
  tutorId: string
  title: string
  status: LessonStatus
  elements: LessonElement[]
}

export async function persistLessonRecord({
  lessonId,
  tutorId,
  title,
  status,
  elements,
}: PersistLessonInput) {
  if (!supabase) {
    return { data: null, error: new Error(getSupabaseRequiredMessage()) }
  }

  const lessonPayload = {
    title,
    status,
    blocks: prepareElementsForSave(elements),
    tutor_id: tutorId,
  }

  const { data, error } = lessonId
    ? await supabase
        .from("lessons")
        .update(lessonPayload)
        .eq("id", lessonId)
        .select("id,title,status,blocks")
        .single<LessonRow>()
    : await supabase
        .from("lessons")
        .insert(lessonPayload)
        .select("id,title,status,blocks")
        .single<LessonRow>()

  return {
    data: data
      ? {
          ...data,
          blocks: hydrateElements(data.blocks),
        }
      : null,
    error,
  }
}

export async function deleteLessonRecord(lessonId: string, tutorId: string) {
  if (!supabase) {
    return { error: new Error(getSupabaseRequiredMessage()) }
  }

  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", lessonId)
    .eq("tutor_id", tutorId)

  return { error }
}
