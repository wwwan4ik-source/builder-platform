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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY")

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase function env is not configured" }, 500)
  }

  const { token, password } = await req.json()

  if (!token || !password) {
    return jsonResponse({ error: "Token and password are required" }, 400)
  }

  if (String(password).length < 6) {
    return jsonResponse({ error: "Password must be at least 6 characters" }, 400)
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const tokenHash = await sha256Hex(token)

  const { data: invite, error: inviteError } = await adminClient
    .from("student_invites")
    .select("id,student_email,student_name,status,expires_at,invited_auth_user_id")
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (inviteError) {
    return jsonResponse({ error: inviteError.message }, 400)
  }

  if (!invite) {
    return jsonResponse({ error: "invite_not_found" }, 404)
  }

  if (invite.status !== "pending") {
    return jsonResponse({ error: "invite_not_pending" }, 400)
  }

  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    await adminClient
      .from("student_invites")
      .update({ status: "expired" })
      .eq("id", invite.id)

    return jsonResponse({ error: "invite_expired" }, 400)
  }

  if (!invite.invited_auth_user_id) {
    return jsonResponse({ error: "student_auth_user_not_found" }, 400)
  }

  const { error: passwordError } = await adminClient.auth.admin.updateUserById(
    invite.invited_auth_user_id,
    {
      password,
      email_confirm: true,
      user_metadata: {
        name: invite.student_name,
        role: "student",
      },
    }
  )

  if (passwordError) {
    return jsonResponse({ error: passwordError.message }, 400)
  }

  const { data: activationRows, error: activationError } =
    await adminClient.rpc("activate_student_invite", {
      p_token: token,
      p_student_id: invite.invited_auth_user_id,
    })

  if (activationError) {
    return jsonResponse({ error: activationError.message }, 400)
  }

  return jsonResponse({
    email: invite.student_email,
    student_id: invite.invited_auth_user_id,
    tutor_id: activationRows?.[0]?.tutor_id ?? null,
  })
})
