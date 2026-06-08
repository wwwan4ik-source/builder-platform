import { type FormEvent, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  signIn,
  signUpTutor,
} from "@/lib/auth-api"
import {
  acceptStudentInviteWithPassword,
  fetchStudentInvite,
} from "@/lib/student-api"
import { type AuthPage } from "@/types/lesson"

type AuthScreenProps = {
  mode: AuthPage
  onModeChange: (mode: AuthPage) => void
  onAuthenticated: () => Promise<void>
  statusMessage?: string
}

export function AuthScreen({
  mode,
  onModeChange,
  onAuthenticated,
  statusMessage = "",
}: AuthScreenProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")

    const nextEmail = email.trim()
    const nextPassword = password
    const nextName = name.trim()

    if (!nextEmail || !nextPassword || (mode === "create-account" && !nextName)) {
      setMessage("Fill in all required fields")
      return
    }

    setIsSubmitting(true)

    const { data, error } =
      mode === "sign-in"
        ? await signIn(nextEmail, nextPassword)
        : await signUpTutor(nextName, nextEmail, nextPassword)

    if (error) {
      setIsSubmitting(false)
      setMessage(error.message)
      return
    }

    if (mode === "create-account" && !data.session) {
      setIsSubmitting(false)
      setMessage("Check your email to confirm the account, then sign in")
      return
    }

    await onAuthenticated()
    setIsSubmitting(false)
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-copy">
          <p className="eyebrow">Learning workspace</p>
          <h1 id="auth-title">
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "create-account" ? (
            <label>
              <span>Name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Tutor name"
                autoComplete="name"
              />
            </label>
          ) : null}

          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            />
          </label>

          {message || statusMessage ? (
            <p className="auth-message">{message || statusMessage}</p>
          ) : null}

          <Button className="auth-action-button" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Working"
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        <Button
          type="button"
          variant="secondary"
          className="auth-switch"
          onClick={() => {
            onModeChange(
              mode === "sign-in" ? "create-account" : "sign-in"
            )
            setMessage("")
          }}
        >
          {mode === "sign-in"
            ? "Create account"
            : "Back to sign in"}
        </Button>
      </section>
    </main>
  )
}

type StudentInviteScreenProps = {
  token: string
  onAccepted: () => Promise<void>
}

function getStudentInviteErrorMessage(error: Error) {
  const message = error.message

  if (message.includes("account_is_not_student")) {
    return "This email is already used for a tutor account. Use a student email, or create a separate student account."
  }

  if (message.includes("invite_email_mismatch")) {
    return "This invite was created for a different email. Sign in with the invited student email."
  }

  if (message.includes("invite_not_found")) {
    return "This invite link is invalid. Ask your tutor for a new invite."
  }

  if (message.includes("invite_not_pending")) {
    return "This invite was already used or is no longer active."
  }

  if (message.includes("invite_expired")) {
    return "This invite has expired. Ask your tutor for a new invite."
  }

  if (message.includes("not_authenticated")) {
    return "Sign in to accept this invite."
  }

  return message
}

export function StudentInviteScreen({ token, onAccepted }: StudentInviteScreenProps) {
  const [invite, setInvite] = useState<{
    student_name: string
    student_email: string
    status: "pending" | "accepted" | "expired" | "revoked"
    expires_at: string
  } | null>(null)
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAccepted, setIsAccepted] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadInvite() {
      setIsLoading(true)
      setMessage("")

      const { data, error } = await fetchStudentInvite(token)

      if (!isMounted) {
        return
      }

      if (error) {
        setMessage(getStudentInviteErrorMessage(error))
        setInvite(null)
        setIsLoading(false)
        return
      }

      setInvite(data)
      setIsAccepted(data?.status === "accepted")
      setIsLoading(false)
    }

    loadInvite()

    return () => {
      isMounted = false
    }
  }, [token])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")

    if (!invite) {
      setMessage("Invite could not load")
      return
    }

    if (invite.status !== "pending") {
      setMessage("This invite is no longer pending")
      return
    }

    if (!password) {
      setMessage("Enter a password")
      return
    }

    setIsSubmitting(true)

    const inviteResult = await acceptStudentInviteWithPassword(token, password)

    if (inviteResult.error) {
      setIsSubmitting(false)
      setMessage(getStudentInviteErrorMessage(inviteResult.error))
      return
    }

    const signInResult = await signIn(invite.student_email, password)

    if (signInResult.error) {
      setIsSubmitting(false)
      setMessage(signInResult.error.message)
      return
    }

    setIsAccepted(true)
    await onAccepted()
    setIsSubmitting(false)
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-labelledby="student-invite-title">
        <div className="auth-copy">
          <p className="eyebrow">Student workspace</p>
          <h1 id="student-invite-title">
            {isAccepted
              ? "Invite accepted"
              : "Create student account"}
          </h1>
        </div>

        {isLoading ? (
          <p className="auth-message">Loading invite...</p>
        ) : isAccepted ? (
          <p className="auth-message">
            Your student space is ready. You can sign in with this email and password.
          </p>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {invite ? (
              <div className="invite-summary">
                <span>{invite.student_name || "Student"}</span>
                <strong>{invite.student_email}</strong>
              </div>
            ) : null}

            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                autoComplete="new-password"
              />
            </label>

            {message ? <p className="auth-message">{message}</p> : null}

            <Button
              className="auth-action-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Working"
                : "Set password"}
            </Button>
          </form>
        )}
      </section>
    </main>
  )
}
