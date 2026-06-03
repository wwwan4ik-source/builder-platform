import { supabase } from "@/lib/supabase"
import { type TutorProfile } from "@/types/auth"

export function getAuthRequiredMessage() {
  return "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first"
}

export async function signInTutor(email: string, password: string) {
  if (!supabase) {
    return { data: null, error: new Error(getAuthRequiredMessage()) }
  }

  return supabase.auth.signInWithPassword({
    email,
    password,
  })
}

export async function signUpTutor(name: string, email: string, password: string) {
  if (!supabase) {
    return { data: null, error: new Error(getAuthRequiredMessage()) }
  }

  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: "tutor",
      },
    },
  })
}

export async function signOutTutor() {
  if (!supabase) {
    return { error: new Error(getAuthRequiredMessage()) }
  }

  return supabase.auth.signOut()
}

export async function getCurrentSession() {
  if (!supabase) {
    return { data: { session: null }, error: new Error(getAuthRequiredMessage()) }
  }

  return supabase.auth.getSession()
}

export function onAuthSessionChange(
  callback: (userId: string | null, email: string | null) => void
) {
  if (!supabase) {
    return () => {}
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => {
      callback(session?.user.id ?? null, session?.user.email ?? null)
    }, 0)
  })

  return () => subscription.unsubscribe()
}

export async function ensureTutorProfile(
  userId: string,
  email: string | null,
  fallbackName: string
) {
  if (!supabase) {
    return { data: null, error: new Error(getAuthRequiredMessage()) }
  }

  const name = fallbackName.trim() || email?.split("@")[0] || "Tutor"

  const existingProfile = await supabase
    .from("users")
    .select("id,email,name,role")
    .eq("id", userId)
    .maybeSingle()

  if (existingProfile.error) {
    return { data: null, error: existingProfile.error }
  }

  if (existingProfile.data) {
    if (existingProfile.data.role !== "tutor") {
      return { data: null, error: new Error("Only tutor accounts can open this app") }
    }

    const { data, error } = await supabase
      .from("users")
      .update({
        email,
      })
      .eq("id", userId)
      .select("id,email,name,role")
      .single()

    return {
      data: data as TutorProfile | null,
      error,
    }
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      id: userId,
      email,
      name,
      role: "tutor",
      must_change_password: false,
    })
    .select("id,email,name,role")
    .single()

  if (error) {
    return { data: null, error }
  }

  if (data.role !== "tutor") {
    return { data: null, error: new Error("Only tutor accounts can open this app") }
  }

  return { data: data as TutorProfile, error: null }
}
