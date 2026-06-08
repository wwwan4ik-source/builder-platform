import { supabase } from "@/lib/supabase"
import { type UserProfile, type UserRole } from "@/types/auth"

export function getAuthRequiredMessage() {
  return "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first"
}

export async function signIn(email: string, password: string) {
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

export async function signUpStudent(
  name: string,
  email: string,
  password: string,
  emailRedirectTo?: string
) {
  if (!supabase) {
    return { data: null, error: new Error(getAuthRequiredMessage()) }
  }

  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        name,
        role: "student",
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
  const result = await ensureUserProfile(userId, email, fallbackName, "tutor")

  if (result.error) {
    return result
  }

  if (result.data?.role !== "tutor") {
    return { data: null, error: new Error("Only tutor accounts can open this app") }
  }

  return result
}

export async function ensureUserProfile(
  userId: string,
  email: string | null,
  fallbackName: string,
  fallbackRole: UserRole = "tutor"
) {
  if (!supabase) {
    return { data: null, error: new Error(getAuthRequiredMessage()) }
  }

  const name = fallbackName.trim() || email?.split("@")[0] || "User"

  const existingProfile = await supabase
    .from("users")
    .select("id,email,name,role")
    .eq("id", userId)
    .maybeSingle()

  if (existingProfile.error) {
    return { data: null, error: existingProfile.error }
  }

  if (existingProfile.data) {
    const { data, error } = await supabase
      .from("users")
      .update({
        email,
      })
      .eq("id", userId)
      .select("id,email,name,role")
      .single()

    return {
      data: data as UserProfile | null,
      error,
    }
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      id: userId,
      email,
      name,
      role: fallbackRole,
      must_change_password: false,
    })
    .select("id,email,name,role")
    .single()

  if (error) {
    return { data: null, error }
  }

  return { data: data as UserProfile, error: null }
}
