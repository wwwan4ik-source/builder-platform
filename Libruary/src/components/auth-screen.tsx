import { type FormEvent, useState } from "react"
import { LogIn, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { signInTutor, signUpTutor } from "@/lib/auth-api"
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
        ? await signInTutor(nextEmail, nextPassword)
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
          <p className="eyebrow">Tutor workspace</p>
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
            {mode === "sign-in" ? <LogIn /> : <UserPlus />}
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
