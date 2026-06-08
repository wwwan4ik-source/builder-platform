import { type ReactNode, useState } from "react"
import { Bell, BookOpen, LayoutDashboard, LogOut, Users } from "lucide-react"

import { type AppPage } from "@/types/lesson"
import { type TutorProfile } from "@/types/auth"

type AppShellProps = {
  viewMode: AppPage
  onNavigate: (page: AppPage) => void
  onLoadLessons: () => void
  onLoadStudents: () => void
  tutorProfile: TutorProfile
  onSignOut: () => void
  children: ReactNode
}

export function AppShell({
  viewMode,
  onNavigate,
  onLoadLessons,
  onLoadStudents,
  tutorProfile,
  onSignOut,
  children,
}: AppShellProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const initials = tutorProfile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "TU"

  return (
    <main className="app-shell">
      <header className="app-header">
        <strong>Lesson builder</strong>
        <div className="app-header-actions">
          <button
            type="button"
            className="notification-button"
            aria-label="Notifications"
          >
            <Bell />
          </button>
          <div className="user-menu">
            <button
              type="button"
              className="user-initials"
              onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
              aria-label="Open user menu"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
            >
              {initials}
            </button>

            {isUserMenuOpen ? (
              <div className="user-popover" role="menu">
                <div className="user-popover-profile">
                  <span className="user-popover-avatar" aria-hidden="true">
                    {initials}
                  </span>
                  <div className="user-summary">
                    <strong>{tutorProfile.name}</strong>
                    <span>{tutorProfile.email}</span>
                    <small>{tutorProfile.role}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="user-popover-action"
                  role="menuitem"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    onSignOut()
                  }}
                >
                  <LogOut />
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar" aria-label="Main navigation">
          <nav className="sidebar-nav">
            <a
              href="#/dashboard"
              className={viewMode === "dashboard" ? "active" : ""}
              onClick={(event) => {
                event.preventDefault()
                onNavigate("dashboard")
              }}
            >
              <LayoutDashboard />
              Dashboard
            </a>
            <a
              href="#/lessons"
              className={viewMode === "lessons" ? "active" : ""}
              onClick={(event) => {
                event.preventDefault()
                onNavigate("lessons")
                onLoadLessons()
              }}
            >
              <BookOpen />
              Lessons
            </a>
            <a
              href="#/students"
              className={viewMode === "students" ? "active" : ""}
              onClick={(event) => {
                event.preventDefault()
                onNavigate("students")
                onLoadStudents()
              }}
            >
              <Users />
              Students
            </a>
          </nav>
        </aside>

        <section className="app-content">{children}</section>
      </div>
    </main>
  )
}
