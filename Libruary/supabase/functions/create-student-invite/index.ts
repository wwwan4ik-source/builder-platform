import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  })
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", bytes)

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function createToken() {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY")

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase function env is not configured" }, 500)
  }

  const authorization = req.headers.get("Authorization")

  if (!authorization) {
    return jsonResponse({ error: "Sign in to invite students" }, 401)
  }

  const {
    student_email,
    student_name = "",
    redirect_origin,
  } = await req.json()
  const studentEmail = String(student_email ?? "").trim().toLowerCase()
  const studentName = String(student_name ?? "").trim()

  if (!studentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
    return jsonResponse({ error: "Enter a valid student email" }, 400)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  })
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  const { data: authUser, error: authUserError } = await userClient.auth.getUser()

  if (authUserError || !authUser.user) {
    return jsonResponse({ error: "Sign in to invite students" }, 401)
  }

  const tutorId = authUser.user.id

  const { data: tutorProfile, error: tutorProfileError } = await adminClient
    .from("users")
    .select("id,role")
    .eq("id", tutorId)
    .maybeSingle()

  if (tutorProfileError) {
    return jsonResponse({ error: tutorProfileError.message }, 400)
  }

  if (tutorProfile?.role !== "tutor") {
    return jsonResponse({ error: "Only tutors can invite students" }, 403)
  }

  await adminClient
    .from("student_invites")
    .update({ status: "expired" })
    .eq("tutor_id", tutorId)
    .eq("student_email", studentEmail)
    .eq("status", "pending")
    .lte("expires_at", new Date().toISOString())

  const { data: existingInvite, error: existingInviteError } = await adminClient
    .from("student_invites")
    .select("id")
    .eq("tutor_id", tutorId)
    .eq("student_email", studentEmail)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()

  if (existingInviteError) {
    return jsonResponse({ error: existingInviteError.message }, 400)
  }

  if (existingInvite) {
    return jsonResponse({ error: "An active invite already exists for this email" }, 400)
  }

  const { data: existingUsers, error: existingUsersError } = await adminClient
    .from("users")
    .select("id,email,role")
    .eq("email", studentEmail)

  if (existingUsersError) {
    return jsonResponse({ error: existingUsersError.message }, 400)
  }

  if (existingUsers?.some((user) => user.role === "tutor")) {
    return jsonResponse({ error: "This email belongs to a tutor account" }, 400)
  }

  const existingStudentIds =
    existingUsers
      ?.filter((user) => user.role === "student")
      .map((user) => user.id) ?? []

  if (existingStudentIds.length > 0) {
    const { data: existingLink, error: existingLinkError } = await adminClient
      .from("tutor_students")
      .select("id")
      .eq("tutor_id", tutorId)
      .in("student_id", existingStudentIds)
      .maybeSingle()

    if (existingLinkError) {
      return jsonResponse({ error: existingLinkError.message }, 400)
    }

    if (existingLink) {
      return jsonResponse({ error: "This student is already added" }, 400)
    }
  }

  const token = createToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const tokenHash = await sha256Hex(token)

  const { data: invite, error: inviteError } = await adminClient
    .from("student_invites")
    .insert({
      tutor_id: tutorId,
      student_email: studentEmail,
      student_name: studentName,
      token_hash: tokenHash,
      expires_at: expiresAt,
    })
    .select("id,student_email,expires_at")
    .single()

  if (inviteError || !invite) {
    return jsonResponse({ error: inviteError?.message ?? "Invite was not created" }, 400)
  }

  const origin =
    redirect_origin ||
    req.headers.get("Origin") ||
    Deno.env.get("APP_ORIGIN") ||
    ""
  const redirectTo = `${origin}/signup/student?token=${token}`

  const { data: invitedUser, error: authError } =
    await adminClient.auth.admin.inviteUserByEmail(invite.student_email, {
      redirectTo,
      data: {
        name: studentName,
        role: "student",
      },
    })

  if (authError || !invitedUser.user) {
    await adminClient
      .from("student_invites")
      .update({ status: "revoked" })
      .eq("id", invite.id)

    return jsonResponse(
      { error: authError?.message ?? "Auth user was not created" },
      400
    )
  }

  const fallbackStudentName = studentName || invite.student_email.split("@")[0]

  const { error: profileError } = await adminClient.from("users").upsert({
    id: invitedUser.user.id,
    email: invite.student_email,
    name: fallbackStudentName,
    role: "student",
    must_change_password: true,
  })

  if (profileError) {
    return jsonResponse({ error: profileError.message }, 400)
  }

  const { error: updateInviteError } = await adminClient
    .from("student_invites")
    .update({ invited_auth_user_id: invitedUser.user.id })
    .eq("id", invite.id)

  if (updateInviteError) {
    return jsonResponse({ error: updateInviteError.message }, 400)
  }

  return jsonResponse({
    invite_id: invite.id,
    student_email: invite.student_email,
    token,
    expires_at: invite.expires_at,
  })
})
