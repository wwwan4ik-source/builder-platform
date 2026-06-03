import { type KeyboardEvent, useEffect, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Eye,
  Funnel,
  ImageUp,
  Layers3,
  Mail,
  MoreHorizontal,
  Users,
  Search,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { AuthScreen } from "@/components/auth-screen"
import { Toast } from "@/components/toast"
import { Button } from "@/components/ui/button"
import {
  ensureTutorProfile,
  getCurrentSession,
  onAuthSessionChange,
  signOutTutor,
} from "@/lib/auth-api"
import {
  deleteLessonRecord,
  fetchLatestDraft,
  fetchLessons,
  persistLessonRecord,
} from "@/lib/lesson-api"
import {
  createElement,
  getLessonTitleFromBlocks,
  hydrateElements,
  libraryItems,
  renumberDefaultOptions,
  splitPromptByBlanks,
} from "@/lib/lesson-elements"
import {
  assignLessonRecord,
  createStudentRecord,
  fetchStudentAssignments,
  fetchStudents,
} from "@/lib/student-api"
import { formatCount, formatSavedDate, getStatusBadgeClass } from "@/lib/format"
import {
  type AppPage,
  type AuthPage,
  type BlankItem,
  type ElementType,
  type FillBlanksElement,
  type LessonElement,
  type LessonMode,
  type LessonStatus,
  type LessonStatusFilter,
  type SaveState,
  type SavedLessonRow,
  type ToastState,
} from "@/types/lesson"
import { type TutorProfile } from "@/types/auth"
import {
  type AssignedLessonRow,
  type StudentRow,
} from "@/types/student"
import "./App.css"

function getEditableTextOffset(node: HTMLElement) {
  const selection = window.getSelection()

  if (!selection || selection.rangeCount === 0) {
    return node.textContent?.length ?? 0
  }

  const range = selection.getRangeAt(0)
  const preCaretRange = range.cloneRange()
  preCaretRange.selectNodeContents(node)
  preCaretRange.setEnd(range.endContainer, range.endOffset)

  return preCaretRange.toString().length
}

function getFloatingMenuPlacement(trigger: HTMLElement | undefined, menuHeight: number) {
  if (!trigger) {
    return "bottom"
  }

  const triggerRect = trigger.getBoundingClientRect()
  const boundaryRect = trigger.closest(".builder-modal")?.getBoundingClientRect()
  const boundaryBottom = Math.min(
    boundaryRect?.bottom ?? window.innerHeight,
    window.innerHeight
  )
  const menuGap = 6
  const spaceBelow = boundaryBottom - triggerRect.bottom

  if (spaceBelow < menuHeight + menuGap) {
    return "top"
  }

  return "bottom"
}

function getPageFromHash(): AppPage {
  const hashPage = window.location.hash.replace(/^#\/?/, "")

  if (hashPage === "lessons" || hashPage === "students") {
    return hashPage
  }

  return "dashboard"
}

function getAuthPageFromHash(): AuthPage {
  const hashPage = window.location.hash.replace(/^#\/?/, "")

  if (hashPage === "create-account") {
    return "create-account"
  }

  return "sign-in"
}

function getHashForPage(page: AppPage) {
  return `#/${page}`
}

function getHashForAuthPage(page: AuthPage) {
  return `#/${page}`
}

function App() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const fillBlankCursorRef = useRef<{
    elementId: number
    partIndex: number
    selectionStart: number
  } | null>(null)
  const pendingFillBlankFocusRef = useRef<{
    elementId: number
    partIndex: number
  } | null>(null)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [viewMode, setViewMode] = useState<AppPage>(() => getPageFromHash())
  const [authViewMode, setAuthViewMode] = useState<AuthPage>(() =>
    getAuthPageFromHash()
  )
  const [lessonStatus, setLessonStatus] = useState<LessonStatus>("draft")
  const [lessonMode, setLessonMode] = useState<LessonMode>("edit")
  const [elements, setElements] = useState<LessonElement[]>([])
  const [lessonId, setLessonId] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [saveMessage, setSaveMessage] = useState("")
  const [lessons, setLessons] = useState<SavedLessonRow[]>([])
  const [lessonsState, setLessonsState] = useState<SaveState>("idle")
  const [lessonsMessage, setLessonsMessage] = useState("")
  const [lessonSearchQuery, setLessonSearchQuery] = useState("")
  const [lessonStatusFilter, setLessonStatusFilter] =
    useState<LessonStatusFilter>("all")
  const [students, setStudents] = useState<StudentRow[]>([])
  const [studentsState, setStudentsState] = useState<SaveState>("idle")
  const [studentsMessage, setStudentsMessage] = useState("")
  const [studentSearchQuery, setStudentSearchQuery] = useState("")
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
  const [newStudentName, setNewStudentName] = useState("")
  const [studentModalError, setStudentModalError] = useState("")
  const [studentToAssign, setStudentToAssign] = useState<StudentRow | null>(
    null
  )
  const [studentToView, setStudentToView] = useState<StudentRow | null>(null)
  const [studentDetailLessons, setStudentDetailLessons] = useState<
    AssignedLessonRow[]
  >([])
  const [studentDetailState, setStudentDetailState] =
    useState<SaveState>("idle")
  const [studentDetailMessage, setStudentDetailMessage] = useState("")
  const [selectedAssignmentLessonId, setSelectedAssignmentLessonId] =
    useState("")
  const [assignmentModalError, setAssignmentModalError] = useState("")
  const [lessonToDelete, setLessonToDelete] = useState<SavedLessonRow | null>(
    null
  )
  const [openLessonActionsId, setOpenLessonActionsId] = useState<string | null>(
    null
  )
  const [openStudentActionsId, setOpenStudentActionsId] = useState<
    string | null
  >(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [lastAddedElementId, setLastAddedElementId] = useState<number | null>(
    null
  )
  const [authState, setAuthState] = useState<SaveState>("loading")
  const [authMessage, setAuthMessage] = useState("Checking session...")
  const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null)

  const currentTutorId = tutorProfile?.id ?? null

  function showToast(message: string) {
    setToast({
      id: Date.now(),
      message,
    })
  }

  function navigateToPage(page: AppPage) {
    const nextHash = getHashForPage(page)

    if (window.location.hash === nextHash) {
      setViewMode(page)
      return
    }

    window.location.hash = nextHash
  }

  function navigateToAuthPage(page: AuthPage) {
    const nextHash = getHashForAuthPage(page)

    if (window.location.hash === nextHash) {
      setAuthViewMode(page)
      return
    }

    window.location.hash = nextHash
  }

  async function bootstrapTutorProfile(
    userId: string | null,
    email: string | null,
    fallbackName = ""
  ) {
    if (!userId) {
      setTutorProfile(null)
      setAuthState("idle")
      setAuthMessage("")
      return
    }

    setAuthState("loading")
    setAuthMessage("Loading tutor profile...")

    const { data, error } = await ensureTutorProfile(userId, email, fallbackName)

    if (error) {
      setTutorProfile(null)
      setAuthState("error")
      setAuthMessage(error.message)
      return
    }

    setTutorProfile(data)
    setAuthState("idle")
    setAuthMessage("")

    const hashPage = window.location.hash.replace(/^#\/?/, "")
    if (hashPage === "sign-in" || hashPage === "create-account" || !hashPage) {
      navigateToPage("dashboard")
    }
  }

  async function refreshAuthenticatedTutor() {
    const { data, error } = await getCurrentSession()

    if (error) {
      setAuthState("error")
      setAuthMessage(error.message)
      return
    }

    await bootstrapTutorProfile(
      data.session?.user.id ?? null,
      data.session?.user.email ?? null,
      data.session?.user.user_metadata?.name ?? ""
    )
  }

  async function handleSignOut() {
    const { error } = await signOutTutor()

    if (error) {
      showToast(error.message)
      return
    }

    setTutorProfile(null)
    setLessons([])
    setStudents([])
    setElements([])
    setLessonId(null)
    setIsBuilderOpen(false)
    navigateToAuthPage("sign-in")
  }

  async function loadLessons() {
    if (!currentTutorId) {
      setLessons([])
      setLessonsState("idle")
      setLessonsMessage("Sign in to load lessons")
      return
    }

    setLessonsState("loading")
    setLessonsMessage("Loading lessons...")

    const { data, error } = await fetchLessons(currentTutorId)

    if (error) {
      setLessonsState("error")
      setLessonsMessage(error.message)
      return
    }

    setLessons(data ?? [])
    setLessonsState("idle")
    setLessonsMessage("")
  }

  async function loadStudents() {
    if (!currentTutorId) {
      setStudents([])
      setStudentsState("idle")
      setStudentsMessage("Sign in to load students")
      return
    }

    setStudentsState("loading")
    setStudentsMessage("Loading students...")

    const { data, error } = await fetchStudents(currentTutorId)

    if (error) {
      setStudentsState("error")
      setStudentsMessage(error.message)
      return
    }

    const nextStudents = data ?? []
    setStudents(nextStudents)
    setStudentsState("idle")
    setStudentsMessage("")
  }

  async function createStudent() {
    if (!currentTutorId) {
      setStudentModalError("Sign in to create students")
      return
    }

    const studentName = newStudentName.trim()

    if (!studentName) {
      setStudentModalError("Student name is required")
      return
    }

    setStudentsState("saving")
    setStudentsMessage("Creating student...")

    const { error } = await createStudentRecord(studentName, currentTutorId)

    if (error) {
      setStudentsState("idle")
      setStudentModalError(error.message)
      return
    }

    setIsAddStudentOpen(false)
    setNewStudentName("")
    setStudentModalError("")
    setStudentsState("saved")
    setStudentsMessage("")
    showToast("Student added")
    await loadStudents()
  }

  async function openAssignLesson(student: StudentRow) {
    setOpenStudentActionsId(null)
    setStudentToAssign(student)
    setSelectedAssignmentLessonId("")
    setAssignmentModalError("")
    setStudentsMessage("")

    if (lessons.length === 0 && lessonsState !== "loading") {
      await loadLessons()
    }
  }

  async function openStudentDetails(student: StudentRow) {
    if (!currentTutorId) {
      setStudentDetailState("error")
      setStudentDetailMessage("Sign in to view student details")
      return
    }

    setOpenStudentActionsId(null)
    setStudentToView(student)
    setStudentDetailLessons([])
    setStudentDetailMessage("Loading assigned lessons...")

    setStudentDetailState("loading")

    const { data, error } = await fetchStudentAssignments(student.id, currentTutorId)

    if (error) {
      setStudentDetailState("error")
      setStudentDetailMessage(error.message)
      return
    }

    setStudentDetailLessons(data ?? [])
    setStudentDetailState("idle")
    setStudentDetailMessage(data?.length ? "" : "No lessons assigned yet")
  }

  async function assignLessonToStudent() {
    if (!studentToAssign || !currentTutorId) {
      return
    }

    if (!selectedAssignmentLessonId) {
      setAssignmentModalError("Choose a lesson to assign")
      return
    }

    setStudentsState("saving")
    setStudentsMessage("Assigning lesson...")

    const { error } = await assignLessonRecord(
      studentToAssign.id,
      selectedAssignmentLessonId,
      currentTutorId
    )

    if (error) {
      setStudentsState("idle")
      const errorCode = "code" in error ? error.code : ""
      setAssignmentModalError(
        errorCode === "23505"
          ? "This lesson is already assigned to this student"
          : error.message
      )
      return
    }

    setStudentToAssign(null)
    setSelectedAssignmentLessonId("")
    setAssignmentModalError("")
    setStudentsState("saved")
    setStudentsMessage("")
    showToast("Lesson assigned")
    await loadStudents()
    if (studentToView?.id === studentToAssign.id) {
      await openStudentDetails(studentToAssign)
    }
  }

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, "", getHashForAuthPage(authViewMode))
    }

    function handleHashChange() {
      const hashPage = window.location.hash.replace(/^#\/?/, "")

      if (hashPage === "sign-in" || hashPage === "create-account") {
        setAuthViewMode(getAuthPageFromHash())
        return
      }

      setViewMode(getPageFromHash())
    }

    window.addEventListener("hashchange", handleHashChange)

    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  useEffect(() => {
    refreshAuthenticatedTutor()

    return onAuthSessionChange((userId, email) => {
      bootstrapTutorProfile(userId, email)
    })
  }, [])

  useEffect(() => {
    if (!currentTutorId) {
      return
    }

    if (viewMode === "lessons") {
      loadLessons()
    }

    if (viewMode === "students") {
      loadStudents()
    }
  }, [currentTutorId, viewMode])

  useEffect(() => {
    if (!currentTutorId) {
      return
    }

    const tutorId = currentTutorId
    let isMounted = true

    async function loadLatestDraft() {
      setSaveState("loading")
      setSaveMessage("Loading latest draft...")

      const { data, error } = await fetchLatestDraft(tutorId)

      if (!isMounted) {
        return
      }

      if (error) {
        setSaveState("error")
        setSaveMessage(error.message)
        return
      }

      if (data) {
        setLessonId(data.id)
        setLessonStatus(data.status)
        setElements(hydrateElements(data.blocks))
        setSaveMessage("Latest draft loaded")
      } else {
        setSaveMessage("Ready to create a draft")
      }

      setSaveState("idle")
    }

    loadLatestDraft()
    loadLessons()

    return () => {
      isMounted = false
    }
  }, [currentTutorId])

  useEffect(() => {
    if (lastAddedElementId === null) {
      return
    }

    const elementNode = canvasRef.current?.querySelector(
      `[data-lesson-element-id="${lastAddedElementId}"]`
    )

    elementNode?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    })
  }, [lastAddedElementId, elements.length])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToast((currentToast) =>
        currentToast?.id === toast.id ? null : currentToast
      )
    }, 3200)

    return () => window.clearTimeout(timeoutId)
  }, [toast])

  useEffect(() => {
    const pendingFocus = pendingFillBlankFocusRef.current

    if (!pendingFocus) {
      return
    }

    const textPart = document.querySelector<HTMLElement>(
      `[data-fill-blank-prompt-id="${pendingFocus.elementId}"][data-fill-blank-part-index="${pendingFocus.partIndex}"]`
    )

    if (!textPart) {
      return
    }

    textPart.focus()

    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(textPart)
    range.collapse(false)
    selection?.removeAllRanges()
    selection?.addRange(range)
    pendingFillBlankFocusRef.current = null
  }, [elements])

  function addElement(type: ElementType) {
    const element = createElement(type)

    setElements((currentElements) => [...currentElements, element])
    setLastAddedElementId(element.id)
  }

  function updateElement(id: number, value: string) {
    setElements((currentElements) =>
      currentElements.map((element) =>
        element.id === id ? { ...element, title: value } : element
      )
    )
  }

  function updateFillBlankPrompt(elementId: number, value: string) {
    setElements((currentElements) =>
      currentElements.map((element) =>
        element.id === elementId && element.type === "fill-blanks"
          ? { ...element, prompt: value }
          : element
      )
    )
  }

  function updateFillBlankTextPart(
    elementId: number,
    partIndex: number,
    value: string
  ) {
    setElements((currentElements) =>
      currentElements.map((element) => {
        if (element.id !== elementId || element.type !== "fill-blanks") {
          return element
        }

        const parts = splitPromptByBlanks(element.prompt, element.blanks)
        parts[partIndex] = value

        return {
          ...element,
          prompt: parts.join(""),
        }
      })
    )
  }

  function updateFillBlankEditablePart(
    elementId: number,
    partIndex: number,
    value: string
  ) {
    updateFillBlankTextPart(elementId, partIndex, value)
    fillBlankCursorRef.current = {
      elementId,
      partIndex,
      selectionStart: value.length,
    }
  }

  function readFillBlankPromptFromDom(elementId: number, fallback: string) {
    const editor = document.querySelector<HTMLElement>(
      `[data-fill-blank-editor-id="${elementId}"]`
    )

    if (!editor) {
      return fallback
    }

    const nodes = Array.from(
      editor.querySelectorAll<HTMLElement>("[data-fill-blank-node]")
    )

    if (nodes.length === 0) {
      const textarea = editor.querySelector<HTMLTextAreaElement>(
        "[data-fill-blank-prompt-id]"
      )

      return textarea?.value ?? fallback
    }

    return nodes
      .map((node) =>
        node.dataset.blankMarker ??
        (node instanceof HTMLTextAreaElement ? node.value : node.textContent) ??
        ""
      )
      .join("")
  }

  function rememberFillBlankCursor(
    elementId: number,
    partIndex: number,
    selectionStart: number
  ) {
    fillBlankCursorRef.current = {
      elementId,
      partIndex,
      selectionStart,
    }
  }

  function toggleBlankInsertMenu(elementId: number, trigger?: HTMLElement) {
    const placement = getFloatingMenuPlacement(trigger, 94)

    setElements((currentElements) =>
      currentElements.map((element) =>
        element.id === elementId && element.type === "fill-blanks"
          ? {
              ...element,
              isInsertMenuOpen: !element.isInsertMenuOpen,
              insertMenuPlacement: placement,
            }
          : element
      )
    )
  }

  function addBlank(elementId: number, mode: BlankItem["mode"]) {
    setElements((currentElements) =>
      currentElements.map((element) => {
        if (element.id !== elementId || element.type !== "fill-blanks") {
          return element
        }

        const currentPrompt = readFillBlankPromptFromDom(
          elementId,
          element.prompt
        )
        const blankNumber = element.blanks.length + 1
        const blankId = Date.now()
        const marker = `[blank ${blankNumber}]`
        const firstOptionId = blankId + 1
        const savedCursor =
          fillBlankCursorRef.current?.elementId === elementId
            ? fillBlankCursorRef.current
            : null
        const promptInput = document.querySelector<HTMLTextAreaElement>(
          `[data-fill-blank-prompt-id="${elementId}"]:focus`
        )
        const partIndex = Number(
          promptInput?.dataset.fillBlankPartIndex ?? savedCursor?.partIndex ?? -1
        )
        const editablePart = document.querySelector<HTMLElement>(
          `[data-fill-blank-prompt-id="${elementId}"][data-fill-blank-part-index="${partIndex}"]:focus`
        )
        const parts = splitPromptByBlanks(currentPrompt, element.blanks)
        const insertAt =
          partIndex >= 0
            ? parts
                .slice(0, partIndex)
                .reduce((length, part) => length + part.length, 0) +
              (promptInput?.selectionStart ??
                (editablePart ? getEditableTextOffset(editablePart) : undefined) ??
                savedCursor?.selectionStart ??
                0)
            : currentPrompt.length
        const nextPrompt = `${currentPrompt.slice(0, insertAt)}${marker}${currentPrompt.slice(insertAt)}`
        const nextPartIndex = partIndex >= 0 ? partIndex + 2 : parts.length + 1

        pendingFillBlankFocusRef.current = {
          elementId,
          partIndex: nextPartIndex,
        }

        return {
          ...element,
          prompt: nextPrompt,
          isInsertMenuOpen: false,
          activeChoiceBlankId: mode === "choice" ? blankId : element.activeChoiceBlankId,
          activeChoiceBlankPlacement: "bottom",
          insertMenuPlacement: "bottom",
          blanks: [
            ...element.blanks,
            {
              id: blankId,
              mode,
              marker,
              correctAnswer: "",
              correctOptionId: firstOptionId,
              options: [
                { id: firstOptionId, value: "Answer 1" },
                { id: blankId + 2, value: "Answer 2" },
              ],
            },
          ],
        }
      })
    )
  }

  function deleteBlank(elementId: number, blankId: number) {
    setElements((currentElements) =>
      currentElements.map((element) => {
        if (element.id !== elementId || element.type !== "fill-blanks") {
          return element
        }

        const blank = element.blanks.find((blankItem) => blankItem.id === blankId)

        if (!blank) {
          return element
        }

        return {
          ...element,
          prompt: readFillBlankPromptFromDom(elementId, element.prompt).replace(
            blank.marker,
            ""
          ),
          activeChoiceBlankId:
            element.activeChoiceBlankId === blankId
              ? null
              : element.activeChoiceBlankId,
          activeChoiceBlankPlacement: "bottom",
          blanks: element.blanks.filter((blankItem) => blankItem.id !== blankId),
        }
      })
    )
  }

  function clearFillBlankContent(elementId: number) {
    setElements((currentElements) =>
      currentElements.map((element) =>
        element.id === elementId && element.type === "fill-blanks"
          ? {
              ...element,
              prompt: "",
              blanks: [],
              activeChoiceBlankId: null,
              activeChoiceBlankPlacement: "bottom",
              isInsertMenuOpen: false,
              insertMenuPlacement: "bottom",
            }
          : element
      )
    )
  }

  function handleFillBlankEditorKeyDown(
    elementId: number,
    event: KeyboardEvent<HTMLDivElement>
  ) {
    if (event.key !== "Backspace" && event.key !== "Delete") {
      return
    }

    const selection = window.getSelection()

    if (!selection || selection.isCollapsed) {
      return
    }

    const editorText = event.currentTarget.textContent?.trim() ?? ""
    const selectedText = selection.toString().trim()

    if (editorText.length > 0 && selectedText === editorText) {
      event.preventDefault()
      clearFillBlankContent(elementId)
    }
  }

  function updateTypedBlankAnswer(
    elementId: number,
    blankId: number,
    value: string
  ) {
    setElements((currentElements) =>
      currentElements.map((element) => {
        if (element.id !== elementId || element.type !== "fill-blanks") {
          return element
        }

        return {
          ...element,
          blanks: element.blanks.map((blank) =>
            blank.id === blankId ? { ...blank, correctAnswer: value } : blank
          ),
        }
      })
    )
  }

  function toggleBlankChoiceMenu(
    elementId: number,
    blankId: number,
    trigger?: HTMLElement
  ) {
    const currentElement = elements.find(
      (element): element is FillBlanksElement =>
        element.id === elementId && element.type === "fill-blanks"
    )
    const blank = currentElement?.blanks.find(
      (blankItem) => blankItem.id === blankId
    )
    const menuHeight = blank ? 16 + blank.options.length * 72 + 52 : 300
    const placement = getFloatingMenuPlacement(trigger, menuHeight)

    setElements((currentElements) =>
      currentElements.map((element) =>
        element.id === elementId && element.type === "fill-blanks"
          ? {
              ...element,
              activeChoiceBlankId:
                element.activeChoiceBlankId === blankId ? null : blankId,
              activeChoiceBlankPlacement: placement,
            }
          : element
      )
    )
  }

  function updateBlankChoiceOption(
    elementId: number,
    blankId: number,
    optionId: number,
    value: string
  ) {
    setElements((currentElements) =>
      currentElements.map((element) => {
        if (element.id !== elementId || element.type !== "fill-blanks") {
          return element
        }

        return {
          ...element,
          blanks: element.blanks.map((blank) =>
            blank.id === blankId
              ? {
                  ...blank,
                  options: blank.options.map((option) =>
                    option.id === optionId ? { ...option, value } : option
                  ),
                }
              : blank
          ),
        }
      })
    )
  }

  function setCorrectBlankChoice(
    elementId: number,
    blankId: number,
    optionId: number
  ) {
    setElements((currentElements) =>
      currentElements.map((element) => {
        if (element.id !== elementId || element.type !== "fill-blanks") {
          return element
        }

        return {
          ...element,
          blanks: element.blanks.map((blank) =>
            blank.id === blankId ? { ...blank, correctOptionId: optionId } : blank
          ),
        }
      })
    )
  }

  function addBlankChoiceOption(elementId: number, blankId: number) {
    setElements((currentElements) =>
      currentElements.map((element) => {
        if (element.id !== elementId || element.type !== "fill-blanks") {
          return element
        }

        return {
          ...element,
          blanks: element.blanks.map((blank) =>
            blank.id === blankId
              ? {
                  ...blank,
                  options: [
                    ...blank.options,
                    {
                      id: Date.now(),
                      value: `Answer ${blank.options.length + 1}`,
                    },
                  ],
                }
              : blank
          ),
        }
      })
    )
  }

  function updateRadioOption(
    elementId: number,
    optionId: number,
    value: string
  ) {
    setElements((currentElements) =>
      currentElements.map((element) => {
        if (element.id !== elementId || element.type !== "radio-field") {
          return element
        }

        return {
          ...element,
          options: element.options.map((option) =>
            option.id === optionId ? { ...option, value } : option
          ),
        }
      })
    )
  }

  function updateCheckboxOption(
    elementId: number,
    optionId: number,
    value: string
  ) {
    setElements((currentElements) =>
      currentElements.map((element) => {
        if (element.id !== elementId || element.type !== "checkbox-field") {
          return element
        }

        return {
          ...element,
          options: element.options.map((option) =>
            option.id === optionId ? { ...option, value } : option
          ),
        }
      })
    )
  }

  function setCorrectRadioOption(elementId: number, optionId: number) {
    setElements((currentElements) =>
      currentElements.map((element) =>
        element.id === elementId && element.type === "radio-field"
          ? { ...element, correctOptionId: optionId }
          : element
      )
    )
  }

  function toggleCorrectCheckboxOption(elementId: number, optionId: number) {
    setElements((currentElements) =>
      currentElements.map((element) => {
        if (element.id !== elementId || element.type !== "checkbox-field") {
          return element
        }

        const isCorrect = element.correctOptionIds.includes(optionId)

        return {
          ...element,
          correctOptionIds: isCorrect
            ? element.correctOptionIds.filter((id) => id !== optionId)
            : [...element.correctOptionIds, optionId],
        }
      })
    )
  }

  function addRadioOption(elementId: number) {
    setElements((currentElements) =>
      currentElements.map((element) => {
        if (element.id !== elementId || element.type !== "radio-field") {
          return element
        }

        const optionNumber = element.options.length + 1

        return {
          ...element,
          options: [
            ...element.options,
            {
              id: Date.now(),
              value: `Option ${optionNumber}`,
            },
          ],
        }
      })
    )
  }

  function addCheckboxOption(elementId: number) {
    setElements((currentElements) =>
      currentElements.map((element) => {
        if (element.id !== elementId || element.type !== "checkbox-field") {
          return element
        }

        const optionNumber = element.options.length + 1

        return {
          ...element,
          options: [
            ...element.options,
            {
              id: Date.now(),
              value: `Option ${optionNumber}`,
            },
          ],
        }
      })
    )
  }

  function deleteRadioOption(elementId: number, optionId: number) {
    setElements((currentElements) =>
      currentElements.map((element) => {
        if (
          element.id !== elementId ||
          element.type !== "radio-field" ||
          element.options.length <= 2
        ) {
          return element
        }

        const options = renumberDefaultOptions(
          element.options.filter((option) => option.id !== optionId)
        )
        const correctOptionId =
          element.correctOptionId === optionId
            ? options[0].id
            : element.correctOptionId

        return {
          ...element,
          correctOptionId,
          options,
        }
      })
    )
  }

  function deleteCheckboxOption(elementId: number, optionId: number) {
    setElements((currentElements) =>
      currentElements.map((element) => {
        if (
          element.id !== elementId ||
          element.type !== "checkbox-field" ||
          element.options.length <= 2
        ) {
          return element
        }

        const options = renumberDefaultOptions(
          element.options.filter((option) => option.id !== optionId)
        )
        const correctOptionIds = element.correctOptionIds.filter(
          (id) => id !== optionId
        )

        return {
          ...element,
          correctOptionIds,
          options,
        }
      })
    )
  }

  function updateImageUpload(
    elementId: number,
    imageSrc: string,
    imageName: string
  ) {
    setElements((currentElements) =>
      currentElements.map((element) =>
        element.id === elementId && element.type === "image-upload"
          ? { ...element, imageSrc, imageName }
          : element
      )
    )
  }

  function handleImageFile(elementId: number, file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) {
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateImageUpload(elementId, reader.result, file.name)
      }
    }

    reader.readAsDataURL(file)
  }

  function deleteElement(id: number) {
    setElements((currentElements) =>
      currentElements.filter((element) => element.id !== id)
    )
  }

  function moveElement(id: number, direction: "up" | "down") {
    setElements((currentElements) => {
      const currentIndex = currentElements.findIndex((element) => element.id === id)
      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1

      if (
        currentIndex === -1 ||
        nextIndex < 0 ||
        nextIndex >= currentElements.length
      ) {
        return currentElements
      }

      const nextElements = [...currentElements]
      const currentElement = nextElements[currentIndex]
      nextElements[currentIndex] = nextElements[nextIndex]
      nextElements[nextIndex] = currentElement

      return nextElements
    })
  }

  function renderElementActions(
    element: LessonElement,
    elementIndex: number,
    deleteLabel: string
  ) {
    return (
      <div className="element-actions">
        <button
          type="button"
          className="move-element"
          onClick={() => moveElement(element.id, "up")}
          disabled={elementIndex === 0}
          aria-label="Move block up"
          title="Move block up"
        >
          <ArrowUp />
        </button>
        <button
          type="button"
          className="move-element"
          onClick={() => moveElement(element.id, "down")}
          disabled={elementIndex === elements.length - 1}
          aria-label="Move block down"
          title="Move block down"
        >
          <ArrowDown />
        </button>
        <button
          type="button"
          className="delete-element"
          onClick={() => deleteElement(element.id)}
          aria-label={deleteLabel}
          title={deleteLabel}
        >
          <Trash2 />
        </button>
      </div>
    )
  }

  function openSavedLesson(lesson: SavedLessonRow, mode?: LessonMode) {
    setLessonId(lesson.id)
    setLessonStatus(lesson.status)
    setLessonMode(mode ?? (lesson.status === "published" ? "student" : "edit"))
    setElements(hydrateElements(lesson.blocks))
    setSaveState("idle")
    setSaveMessage("Lesson loaded")
    setOpenLessonActionsId(null)
    setIsBuilderOpen(true)
  }

  function createNewLesson() {
    setLessonId(null)
    setLessonStatus("draft")
    setLessonMode("edit")
    setElements([])
    setSaveState("idle")
    setSaveMessage("Ready to create a draft")
    setOpenLessonActionsId(null)
    setIsBuilderOpen(true)
  }

  function closeBuilder() {
    setIsBuilderOpen(false)
  }

  async function persistLesson(nextStatus: LessonStatus) {
    if (!currentTutorId) {
      setSaveState("error")
      setSaveMessage("Sign in to save lessons")
      return
    }

    const lessonTitle = getLessonTitleFromBlocks(elements)
    const lessonPayload = {
      title: getLessonTitleFromBlocks(elements),
      status: nextStatus,
      elements,
    }

    setSaveState("saving")
    setSaveMessage("Saving...")

    const isNewLesson = lessonId === null

    const { data, error } = await persistLessonRecord({
      lessonId,
      tutorId: currentTutorId,
      title: lessonTitle,
      status: lessonPayload.status,
      elements: lessonPayload.elements,
    })

    if (error) {
      setSaveState("error")
      setSaveMessage(error.message)
      return
    }

    if (!data) {
      setSaveState("error")
      setSaveMessage("Lesson was not saved")
      return
    }

    setLessonId(data.id)
    setLessonStatus(data.status)
    setElements(hydrateElements(data.blocks))
    setSaveState("saved")
    setSaveMessage(nextStatus === "published" ? "Published" : "Saved to Supabase")
    showToast(
      nextStatus === "published"
        ? "Lesson published"
        : isNewLesson
          ? "Lesson created"
          : "Lesson updated"
    )
    loadLessons()
    setIsBuilderOpen(false)
    navigateToPage("lessons")
  }

  function saveLesson() {
    persistLesson("draft")
  }

  function publishLesson() {
    persistLesson("published")
  }

  async function deleteLesson(lesson: SavedLessonRow) {
    if (!currentTutorId) {
      setLessonsState("error")
      setLessonsMessage("Sign in to delete lessons")
      return
    }

    setLessonsState("loading")
    setLessonsMessage("Deleting lesson...")

    const { error } = await deleteLessonRecord(lesson.id, currentTutorId)

    if (error) {
      setLessonsState("error")
      setLessonsMessage(error.message)
      return
    }

    if (lessonId === lesson.id) {
      closeBuilder()
      setLessonId(null)
    }

    setLessons((currentLessons) =>
      currentLessons.filter((currentLesson) => currentLesson.id !== lesson.id)
    )
    setLessonsState("idle")
    setLessonsMessage("")
    setLessonToDelete(null)
    showToast("Lesson deleted")
  }

  const draftLessons = lessons.filter((lesson) => lesson.status === "draft")
  const publishedLessons = lessons.filter(
    (lesson) => lesson.status === "published"
  )
  const normalizedLessonSearchQuery = lessonSearchQuery.trim().toLowerCase()
  const filteredLessons = lessons.filter((lesson) => {
    const lessonName = lesson.title || "Draft"
    const matchesSearch =
      normalizedLessonSearchQuery.length === 0 ||
      lessonName.toLowerCase().includes(normalizedLessonSearchQuery)
    const matchesStatus =
      lessonStatusFilter === "all" || lesson.status === lessonStatusFilter

    return matchesSearch && matchesStatus
  })
  const normalizedStudentSearchQuery = studentSearchQuery.trim().toLowerCase()
  const filteredStudents = students.filter((student) => {
    const studentEmail = student.email ?? ""

    return (
      normalizedStudentSearchQuery.length === 0 ||
      student.name.toLowerCase().includes(normalizedStudentSearchQuery) ||
      studentEmail.toLowerCase().includes(normalizedStudentSearchQuery)
    )
  })
  const isEditMode = lessonMode === "edit"
  const builderPageTitle =
    lessonId === null
      ? "Create lesson"
      : isEditMode
        ? "Edit lesson"
        : "Preview lesson"

  const dashboardPage = (
    <section className="dashboard-page" aria-labelledby="dashboard-title">
      <header className="dashboard-header">
        <div>
          <h1 id="dashboard-title">Create and manage lessons</h1>
        </div>
        <Button onClick={createNewLesson}>
          <Plus />
          New lesson
        </Button>
      </header>

      <div className="dashboard-stats" aria-label="Lesson stats">
        <article>
          <span>Total lessons</span>
          <strong>{formatCount(lessons.length, "lesson")}</strong>
        </article>
        <article>
          <span>Drafts</span>
          <strong>{formatCount(draftLessons.length, "draft")}</strong>
        </article>
        <article>
          <span>Published</span>
          <strong>
            {formatCount(publishedLessons.length, "published lesson")}
          </strong>
        </article>
      </div>

      <div className="dashboard-panel">
        {lessons.length === 0 ? (
          <div className="empty-state">
            <Layers3 />
            <h3>No saved lessons yet</h3>
            <p>Create your first lesson and save it to see it here.</p>
          </div>
        ) : (
          <div className="dashboard-recent">
            <div>
              <h2>Recent lessons</h2>
              <Button
                variant="outline"
                onClick={() => {
                  navigateToPage("lessons")
                  loadLessons()
                }}
              >
                <BookOpen />
                View all
              </Button>
            </div>
            <ul>
              {lessons.slice(0, 5).map((lesson) => (
                <li key={lesson.id}>
                  <span>
                    <strong>{lesson.title || "Draft"}</strong>
                    <small>{formatSavedDate(lesson.updated_at)}</small>
                  </span>
                  <button type="button" onClick={() => openSavedLesson(lesson)}>
                    {lesson.status === "published" ? "View" : "Edit"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )

  const savedLessonsPage = (
    <section className="lessons-page" aria-label="Saved lessons">
      <header className="subheader lessons-subheader">
        <div className="subheader-title">
          <h1>Lessons</h1>
          <span>{formatCount(filteredLessons.length, "lesson")}</span>
        </div>
        <div className="subheader-actions" aria-label="Lesson actions">
          <label className="lessons-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search lessons by name</span>
            <input
              type="search"
              value={lessonSearchQuery}
              onChange={(event) => setLessonSearchQuery(event.target.value)}
              placeholder="Search by lesson name"
            />
          </label>
          <label className="lessons-status-filter">
            <Funnel aria-hidden="true" />
            <span className="sr-only">Filter lessons by status</span>
            <select
              value={lessonStatusFilter}
              onChange={(event) =>
                setLessonStatusFilter(event.target.value as LessonStatusFilter)
              }
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
          <Button onClick={createNewLesson}>
            <Plus />
            New lesson
          </Button>
        </div>
      </header>

      <div className="lessons-table-wrap">
            {lessonsState === "error" && lessonsMessage ? (
              <div className="empty-state">
                <BookOpen />
                <h3>Lessons could not load</h3>
                <p>{lessonsMessage}</p>
              </div>
            ) : lessons.length === 0 && lessonsState !== "loading" ? (
              <div className="empty-state">
                <BookOpen />
                <h3>No saved lessons yet</h3>
                <p>Create and save a draft to see it here.</p>
              </div>
            ) : filteredLessons.length === 0 && lessonsState !== "loading" ? (
              <div className="empty-state">
                <Search />
                <h3>No matching lessons</h3>
                <p>Adjust the search or status filter to see more lessons.</p>
              </div>
            ) : (
              <table className="lessons-table">
                <thead>
                  <tr>
                    <th>Lesson</th>
                    <th>Status</th>
                    <th>Blocks</th>
                    <th>Updated</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>
                        <strong>{lesson.title || "Draft"}</strong>
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(lesson.status)}>
                          {lesson.status}
                        </span>
                      </td>
                      <td>{formatCount(lesson.blocks.length, "block")}</td>
                      <td>{formatSavedDate(lesson.updated_at)}</td>
                      <td>
                        <div className="lesson-actions">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() =>
                              setOpenLessonActionsId((currentId) =>
                                currentId === lesson.id ? null : lesson.id
                              )
                            }
                            aria-expanded={openLessonActionsId === lesson.id}
                            aria-haspopup="menu"
                            aria-label={`Actions for ${lesson.title || "lesson"}`}
                            title={`Actions for ${lesson.title || "lesson"}`}
                          >
                            <MoreHorizontal />
                          </Button>
                          {openLessonActionsId === lesson.id ? (
                            <div className="lesson-actions-menu" role="menu">
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => openSavedLesson(lesson, "student")}
                              >
                                <Eye />
                                View
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => openSavedLesson(lesson, "edit")}
                                disabled={lesson.status === "published"}
                              >
                                <Pencil />
                                Edit
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                className="danger"
                                onClick={() => {
                                  setOpenLessonActionsId(null)
                                  setLessonToDelete(lesson)
                                }}
                              >
                                <Trash2 />
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
  )

  const studentsPage = (
    <section className="lessons-page" aria-label="Students">
      <header className="subheader lessons-subheader">
        <div className="subheader-title">
          <h1>Students</h1>
          <span>{formatCount(filteredStudents.length, "student")}</span>
        </div>
        <div className="subheader-actions" aria-label="Student actions">
          <label className="lessons-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search students by name or email</span>
            <input
              type="search"
              value={studentSearchQuery}
              onChange={(event) => setStudentSearchQuery(event.target.value)}
              placeholder="Search by student name"
            />
          </label>
          <Button onClick={() => setIsAddStudentOpen(true)}>
            <Plus />
            Add student
          </Button>
        </div>
      </header>

      <div className="lessons-table-wrap">
        {studentsState === "error" && studentsMessage ? (
          <div className="empty-state">
            <Users />
            <h3>Students could not load</h3>
            <p>{studentsMessage}</p>
          </div>
        ) : students.length === 0 && studentsState !== "loading" ? (
          <div className="empty-state">
            <Users />
            <h3>No students yet</h3>
            <p>Add a student to assign lessons and track progress.</p>
          </div>
        ) : filteredStudents.length === 0 && studentsState !== "loading" ? (
          <div className="empty-state">
            <Search />
            <h3>No matching students</h3>
            <p>Adjust the search to see more students.</p>
          </div>
        ) : (
          <table className="lessons-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Assigned lessons</th>
                <th>Added</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <strong>{student.name}</strong>
                  </td>
                  <td>{student.email ?? "No email yet"}</td>
                  <td>
                    {formatCount(
                      student.assigned_lessons_count,
                      "assigned lesson"
                    )}
                  </td>
                  <td>{formatSavedDate(student.created_at)}</td>
                  <td>
                    <div className="lesson-actions">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() =>
                          setOpenStudentActionsId((currentId) =>
                            currentId === student.id ? null : student.id
                          )
                        }
                        aria-expanded={openStudentActionsId === student.id}
                        aria-haspopup="menu"
                        aria-label={`Actions for ${student.name}`}
                        title={`Actions for ${student.name}`}
                      >
                        <MoreHorizontal />
                      </Button>
                      {openStudentActionsId === student.id ? (
                        <div className="lesson-actions-menu" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => openStudentDetails(student)}
                          >
                            <Eye />
                            View details
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => openAssignLesson(student)}
                          >
                            <BookOpen />
                            Assign lesson
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )

  const builderModal = isBuilderOpen ? (
    <div className="builder-modal" role="dialog" aria-modal="true">
      <main className={`builder-shell builder-mode-${lessonMode}`}>
      <header className="builder-header full-page-header">
        <div className="full-page-title">
          <h1 className="builder-page-title">{builderPageTitle}</h1>
          {saveState === "error" && saveMessage ? (
            <p className="save-status save-status-error">{saveMessage}</p>
          ) : null}
        </div>
        <div className="header-actions">
          {lessonStatus === "draft" ? (
            <>
              {isEditMode ? (
                <Button
                  variant="outline"
                  onClick={saveLesson}
                  disabled={saveState === "saving"}
                >
                  {saveState === "saving" ? "Saving" : "Save draft"}
                </Button>
              ) : null}
              <Button onClick={publishLesson} disabled={saveState === "saving"}>
                {saveState === "saving" ? "Publishing" : "Publish"}
              </Button>
            </>
          ) : null}
          <Button
            className="full-page-close"
            variant="ghost"
            onClick={closeBuilder}
            aria-label="Close builder"
            title="Close builder"
          >
            Close
          </Button>
        </div>
      </header>

      <section className="builder-layout" aria-label="Lesson editor">
        <div className="lesson-space">
          <div className="space-toolbar">
            <div>
              <h2>{isEditMode ? "Canvas" : "Lesson view"}</h2>
            </div>
            <span className="ui-badge">{formatCount(elements.length, "block")}</span>
          </div>

          <div className="canvas-area" ref={canvasRef}>
            {elements.length === 0 ? (
              <div className="empty-state">
                <Layers3 />
                <h3>Add your first block</h3>
                <p>Choose an element from the library.</p>
              </div>
            ) : (
              elements.map((element, elementIndex) => {
                if (element.type === "radio-field") {
                  return (
                    <article
                      className="lesson-element"
                      data-lesson-element-id={element.id}
                      key={element.id}
                    >
                      <div className="element-header">
                        <label>
                          <span>Question</span>
                          <input
                            value={element.title}
                            onChange={(event) =>
                              updateElement(element.id, event.target.value)
                            }
                          />
                        </label>
                        {renderElementActions(
                          element,
                          elementIndex,
                          "Delete radio field block"
                        )}
                      </div>

                      <fieldset className="radio-options">
                        <legend>Answers</legend>
                        {element.options.map((option, optionIndex) => (
                          <label className="radio-option" key={option.id}>
                            <span className="radio-answer">
                              <input
                                type="radio"
                                name={`correct-answer-${element.id}`}
                                checked={option.id === element.correctOptionId}
                                onChange={() =>
                                  setCorrectRadioOption(element.id, option.id)
                                }
                              />
                              <span className="radio-control" aria-hidden="true" />
                            </span>
                            <span className="radio-answer-field">
                              <input
                                value={option.value}
                                aria-label={`Answer ${optionIndex + 1}`}
                                onChange={(event) =>
                                  updateRadioOption(
                                    element.id,
                                    option.id,
                                    event.target.value
                                  )
                                }
                              />
                              <button
                                type="button"
                                className="delete-option"
                                onClick={() =>
                                  deleteRadioOption(element.id, option.id)
                                }
                                disabled={element.options.length <= 2}
                                aria-label={`Delete answer ${optionIndex + 1}`}
                                title={`Delete answer ${optionIndex + 1}`}
                              >
                                <Trash2 />
                              </button>
                            </span>
                          </label>
                        ))}
                      </fieldset>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="add-option"
                        onClick={() => addRadioOption(element.id)}
                      >
                        <Plus />
                        Add answer
                      </Button>
                    </article>
                  )
                }

                if (element.type === "checkbox-field") {
                  return (
                    <article
                      className="lesson-element"
                      data-lesson-element-id={element.id}
                      key={element.id}
                    >
                      <div className="element-header">
                        <label>
                          <span>Question</span>
                          <input
                            value={element.title}
                            onChange={(event) =>
                              updateElement(element.id, event.target.value)
                            }
                          />
                        </label>
                        {renderElementActions(
                          element,
                          elementIndex,
                          "Delete checkbox field block"
                        )}
                      </div>

                      <fieldset className="choice-options">
                        <legend>Answers</legend>
                        {element.options.map((option, optionIndex) => (
                          <label className="choice-option" key={option.id}>
                            <span className="choice-answer">
                              <input
                                type="checkbox"
                                checked={element.correctOptionIds.includes(
                                  option.id
                                )}
                                onChange={() =>
                                  toggleCorrectCheckboxOption(
                                    element.id,
                                    option.id
                                  )
                                }
                              />
                              <span
                                className="checkbox-control"
                                aria-hidden="true"
                              >
                                <Check />
                              </span>
                            </span>
                            <span className="choice-answer-field">
                              <input
                                value={option.value}
                                aria-label={`Answer ${optionIndex + 1}`}
                                onChange={(event) =>
                                  updateCheckboxOption(
                                    element.id,
                                    option.id,
                                    event.target.value
                                  )
                                }
                              />
                              <button
                                type="button"
                                className="delete-option"
                                onClick={() =>
                                  deleteCheckboxOption(element.id, option.id)
                                }
                                disabled={element.options.length <= 2}
                                aria-label={`Delete answer ${optionIndex + 1}`}
                                title={`Delete answer ${optionIndex + 1}`}
                              >
                                <Trash2 />
                              </button>
                            </span>
                          </label>
                        ))}
                      </fieldset>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="add-option"
                        onClick={() => addCheckboxOption(element.id)}
                      >
                        <Plus />
                        Add answer
                      </Button>
                    </article>
                  )
                }

                if (element.type === "text-field") {
                  return (
                    <article
                      className="lesson-element"
                      data-lesson-element-id={element.id}
                      key={element.id}
                    >
                      <div className="element-header">
                        <label>
                          <span>Task</span>
                          <input
                            value={element.title}
                            onChange={(event) =>
                              updateElement(element.id, event.target.value)
                            }
                          />
                        </label>
                        {renderElementActions(
                          element,
                          elementIndex,
                          "Delete write text block"
                        )}
                      </div>

                      <label className="text-answer-field">
                        <span>Answer</span>
                        <textarea placeholder="Write your answer here" />
                      </label>
                    </article>
                  )
                }

                if (element.type === "image-upload") {
                  return (
                    <article
                      className="lesson-element"
                      data-lesson-element-id={element.id}
                      key={element.id}
                    >
                      <div className="element-header">
                        <label>
                          <span>Task</span>
                          <input
                            value={element.title}
                            onChange={(event) =>
                              updateElement(element.id, event.target.value)
                            }
                          />
                        </label>
                        {renderElementActions(
                          element,
                          elementIndex,
                          "Delete image upload block"
                        )}
                      </div>

                      <label
                        className="image-dropzone"
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault()
                          handleImageFile(element.id, event.dataTransfer.files[0])
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) =>
                            handleImageFile(element.id, event.target.files?.[0])
                          }
                        />
                        {element.imageSrc ? (
                          <img src={element.imageSrc} alt={element.imageName} />
                        ) : (
                          <span className="image-dropzone-empty">
                            <ImageUp />
                            <strong>Drop image here</strong>
                            <small>or click to upload</small>
                          </span>
                        )}
                      </label>
                    </article>
                  )
                }

                if (element.type === "fill-blanks") {
                  return (
                    <article
                      className="lesson-element"
                      data-lesson-element-id={element.id}
                      key={element.id}
                    >
                      <div className="element-header">
                        <label>
                          <span>Task</span>
                          <input
                            value={element.title}
                            onChange={(event) =>
                              updateElement(element.id, event.target.value)
                            }
                          />
                        </label>
                        {renderElementActions(
                          element,
                          elementIndex,
                          "Delete fill in blanks block"
                        )}
                      </div>

                      <div className="blank-composer">
                        <div className="blank-text-field">
                          <span>Text</span>
                          <div
                            className="blank-text-area"
                            data-fill-blank-editor-id={element.id}
                            onKeyDown={(event) =>
                              handleFillBlankEditorKeyDown(element.id, event)
                            }
                          >
                            {element.blanks.length === 0 ? (
                              <textarea
                                data-fill-blank-prompt-id={element.id}
                                data-fill-blank-part-index={0}
                                data-fill-blank-node
                                placeholder="Write text, then add a blank"
                                value={element.prompt}
                                onClick={(event) =>
                                  rememberFillBlankCursor(
                                    element.id,
                                    0,
                                    event.currentTarget.selectionStart
                                  )
                                }
                                onKeyUp={(event) =>
                                  rememberFillBlankCursor(
                                    element.id,
                                    0,
                                    event.currentTarget.selectionStart
                                  )
                                }
                                onSelect={(event) =>
                                  rememberFillBlankCursor(
                                    element.id,
                                    0,
                                    event.currentTarget.selectionStart
                                  )
                                }
                                onChange={(event) =>
                                  updateFillBlankPrompt(
                                    element.id,
                                    event.target.value
                                  )
                                }
                              />
                            ) : (
                              splitPromptByBlanks(
                                element.prompt,
                                element.blanks
                              ).map((part, partIndex) => {
                                const blank = element.blanks.find(
                                  (blankItem) => blankItem.marker === part
                                )

                                if (!blank) {
                                  return (
                                    <span
                                      className="blank-text-part"
                                      contentEditable
                                      suppressContentEditableWarning
                                      data-fill-blank-prompt-id={element.id}
                                      data-fill-blank-part-index={partIndex}
                                      data-fill-blank-node
                                      key={`text-${partIndex}`}
                                      role="textbox"
                                      tabIndex={0}
                                      onClick={(event) =>
                                        rememberFillBlankCursor(
                                          element.id,
                                          partIndex,
                                          getEditableTextOffset(
                                            event.currentTarget
                                          )
                                        )
                                      }
                                      onKeyUp={(event) =>
                                        rememberFillBlankCursor(
                                          element.id,
                                          partIndex,
                                          getEditableTextOffset(
                                            event.currentTarget
                                          )
                                        )
                                      }
                                      onBlur={(event) =>
                                        updateFillBlankEditablePart(
                                          element.id,
                                          partIndex,
                                          event.currentTarget.textContent ?? ""
                                        )
                                      }
                                    >
                                      {part}
                                    </span>
                                  )
                                }

                                if (blank.mode === "typed") {
                                  return (
                                    <span
                                      className="inline-blank-control"
                                      key={blank.id}
                                    >
                                      <input
                                        className="inline-blank-input"
                                        data-fill-blank-node
                                        data-blank-marker={blank.marker}
                                        value={blank.correctAnswer}
                                        placeholder="Answer"
                                        aria-label={`Correct answer for ${blank.marker}`}
                                        onKeyDown={(event) => {
                                          if (
                                            (event.key === "Backspace" ||
                                              event.key === "Delete") &&
                                            event.currentTarget.value.length === 0
                                          ) {
                                            event.preventDefault()
                                            deleteBlank(element.id, blank.id)
                                          }
                                        }}
                                        onChange={(event) =>
                                          updateTypedBlankAnswer(
                                            element.id,
                                            blank.id,
                                            event.target.value
                                          )
                                        }
                                      />
                                      <button
                                        type="button"
                                        className="inline-blank-delete"
                                        onClick={() =>
                                          deleteBlank(element.id, blank.id)
                                        }
                                        aria-label={`Delete ${blank.marker}`}
                                        title={`Delete ${blank.marker}`}
                                      >
                                        <Trash2 />
                                      </button>
                                    </span>
                                  )
                                }

                                return (
                                  <span
                                    className="inline-blank-control"
                                    key={blank.id}
                                  >
                                    <span className="inline-blank-select">
                                      <button
                                        type="button"
                                        className="blank-dropdown-trigger compact"
                                        data-fill-blank-node
                                        data-blank-marker={blank.marker}
                                        onKeyDown={(event) => {
                                          if (
                                            event.key === "Backspace" ||
                                            event.key === "Delete"
                                          ) {
                                            event.preventDefault()
                                            deleteBlank(element.id, blank.id)
                                          }
                                        }}
                                        onClick={(event) =>
                                          toggleBlankChoiceMenu(
                                            element.id,
                                            blank.id,
                                            event.currentTarget
                                          )
                                        }
                                      >
                                        <span>
                                          {blank.options.find(
                                            (option) =>
                                              option.id === blank.correctOptionId
                                          )?.value ?? "Choose answer"}
                                        </span>
                                        <ChevronDown />
                                      </button>

                                    {element.activeChoiceBlankId === blank.id ? (
                                      <div
                                        className={`blank-dropdown-menu ${
                                          element.activeChoiceBlankPlacement ===
                                          "top"
                                            ? "open-up"
                                            : ""
                                        }`}
                                      >
                                        {blank.options.map(
                                          (option, optionIndex) => (
                                            <label
                                              className="radio-option compact"
                                              key={option.id}
                                            >
                                              <span className="radio-answer">
                                                <input
                                                  type="radio"
                                                  name={`blank-answer-${blank.id}`}
                                                  checked={
                                                    option.id ===
                                                    blank.correctOptionId
                                                  }
                                                  onChange={() =>
                                                    setCorrectBlankChoice(
                                                      element.id,
                                                      blank.id,
                                                      option.id
                                                    )
                                                  }
                                                />
                                                <span
                                                  className="radio-control"
                                                  aria-hidden="true"
                                                />
                                              </span>
                                              <span className="radio-answer-field single">
                                                <input
                                                  value={option.value}
                                                  aria-label={`Blank answer ${
                                                    optionIndex + 1
                                                  }`}
                                                  onChange={(event) =>
                                                    updateBlankChoiceOption(
                                                      element.id,
                                                      blank.id,
                                                      option.id,
                                                      event.target.value
                                                    )
                                                  }
                                                />
                                              </span>
                                            </label>
                                          )
                                        )}

                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="add-option"
                                          onClick={() =>
                                            addBlankChoiceOption(
                                              element.id,
                                              blank.id
                                            )
                                          }
                                        >
                                          <Plus />
                                          Add answer
                                        </Button>
                                      </div>
                                    ) : null}
                                    </span>
                                    <button
                                      type="button"
                                      className="inline-blank-delete"
                                      onClick={() =>
                                        deleteBlank(element.id, blank.id)
                                      }
                                      aria-label={`Delete ${blank.marker}`}
                                      title={`Delete ${blank.marker}`}
                                    >
                                      <Trash2 />
                                    </button>
                                  </span>
                                )
                              })
                            )}
                          </div>
                        </div>

                        <div className="blank-action">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={(event) =>
                              toggleBlankInsertMenu(
                                element.id,
                                event.currentTarget
                              )
                            }
                            aria-label="Add blank"
                            title="Add blank"
                          >
                            <Plus />
                          </Button>

                          {element.isInsertMenuOpen ? (
                            <div
                              className={`blank-insert-menu ${
                                element.insertMenuPlacement === "top"
                                  ? "open-up"
                                  : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => addBlank(element.id, "typed")}
                              >
                                Write answer
                              </button>
                              <button
                                type="button"
                                onClick={() => addBlank(element.id, "choice")}
                              >
                                Choose answer
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  )
                }

                return (
                  <article
                    className="lesson-element"
                    data-lesson-element-id={element.id}
                    key={element.id}
                  >
                    <div className="element-header">
                      <label>
                        <span>Title</span>
                        <input
                          value={element.title}
                          onChange={(event) =>
                            updateElement(element.id, event.target.value)
                          }
                        />
                      </label>
                      {renderElementActions(
                        element,
                        elementIndex,
                        "Delete title block"
                      )}
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </div>

        {isEditMode ? (
          <aside className="element-library" aria-labelledby="library-title">
          <div className="library-header">
            <h2 id="library-title">Library</h2>
          </div>

          {libraryItems.map((item) => {
            const Icon = item.icon

            return (
              <button
                type="button"
                className="library-item"
                key={item.type}
                onClick={() => addElement(item.type)}
              >
                <span className="library-item-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.description}</small>
                </span>
                <Plus aria-hidden="true" />
              </button>
            )
          })}
          </aside>
        ) : null}
      </section>
    </main>
    </div>
  ) : null

  const addStudentModal = isAddStudentOpen ? (
    <div className="confirm-modal-backdrop" role="presentation">
      <section
        className="confirm-modal add-student-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-student-title"
      >
        <div className="confirm-modal-copy">
          <h2 id="add-student-title">Add student</h2>
          <label className="modal-field">
            <span>Name</span>
            <input
              type="text"
              value={newStudentName}
              onChange={(event) => {
                setNewStudentName(event.target.value)
                setStudentModalError("")
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  createStudent()
                }
              }}
              placeholder="Student name"
              autoFocus
            />
          </label>
          {studentModalError ? (
            <p className="confirm-modal-error">{studentModalError}</p>
          ) : null}
        </div>
        <div className="confirm-modal-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsAddStudentOpen(false)
              setNewStudentName("")
              setStudentModalError("")
              setStudentsMessage("")
              setStudentsState("idle")
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={createStudent}
            disabled={studentsState === "saving"}
          >
            Create
          </Button>
        </div>
      </section>
    </div>
  ) : null

  const assignLessonModal = studentToAssign ? (
    <div className="confirm-modal-backdrop" role="presentation">
      <section
        className="confirm-modal add-student-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-lesson-title"
      >
        <div className="confirm-modal-copy">
          <h2 id="assign-lesson-title">Assign lesson</h2>
          <label className="modal-field">
            <span>Student</span>
            <input type="text" value={studentToAssign.name} readOnly />
          </label>
          <label className="modal-field">
            <span>Lesson</span>
            <select
              value={selectedAssignmentLessonId}
              onChange={(event) => {
                setSelectedAssignmentLessonId(event.target.value)
                setAssignmentModalError("")
              }}
              disabled={lessons.length === 0}
            >
              <option value="">Choose lesson</option>
              {lessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {lesson.title || "Draft"}
                </option>
              ))}
            </select>
            {assignmentModalError ? (
              <p className="confirm-modal-error">{assignmentModalError}</p>
            ) : null}
          </label>
          {lessons.length === 0 ? (
            <p>Create a lesson before assigning work to students.</p>
          ) : null}
        </div>
        <div className="confirm-modal-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setStudentToAssign(null)
              setSelectedAssignmentLessonId("")
              setAssignmentModalError("")
              setStudentsMessage("")
              setStudentsState("idle")
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={assignLessonToStudent}
            disabled={studentsState === "saving" || lessons.length === 0}
          >
            Assign
          </Button>
        </div>
      </section>
    </div>
  ) : null

  const studentDetailsModal = studentToView ? (
    <div className="student-details-modal" role="dialog" aria-modal="true">
      <section className="student-details-shell" aria-labelledby="student-details-title">
        <header className="student-details-header full-page-header">
          <div className="full-page-title">
            <h1 id="student-details-title">{studentToView.name}</h1>
          </div>
          <Button
            className="full-page-close"
            type="button"
            variant="ghost"
            onClick={() => {
              setStudentToView(null)
              setStudentDetailLessons([])
              setStudentDetailMessage("")
              setStudentDetailState("idle")
            }}
            aria-label="Close student details"
            title="Close student details"
          >
            Close
          </Button>
        </header>

        <div className="student-details-content">
          <aside className="student-profile-panel" aria-label="Student profile">
            <div className="library-header">
              <h2>Student</h2>
            </div>
            <div className="library-item student-profile-card">
              <span className="library-item-icon student-avatar" aria-hidden="true">
                {studentToView.name.slice(0, 1).toUpperCase()}
              </span>
              <span>
                <strong>{studentToView.name}</strong>
                <small>{studentToView.email ?? "No email yet"}</small>
              </span>
              <span aria-hidden="true" />
            </div>
            <dl className="student-detail-list">
              <div className="library-item student-detail-item">
                <dt>
                  <span className="library-item-icon" aria-hidden="true">
                    <BookOpen />
                  </span>
                  <span>
                    <strong>Assigned lessons</strong>
                    <small>{formatCount(studentToView.assigned_lessons_count, "lesson")}</small>
                  </span>
                </dt>
                <dd className="sr-only">
                  {formatCount(studentToView.assigned_lessons_count, "lesson")}
                </dd>
              </div>
              <div className="library-item student-detail-item">
                <dt>
                  <span className="library-item-icon" aria-hidden="true">
                    <CalendarDays />
                  </span>
                  <span>
                    <strong>Added</strong>
                    <small>{formatSavedDate(studentToView.created_at)}</small>
                  </span>
                </dt>
                <dd className="sr-only">{formatSavedDate(studentToView.created_at)}</dd>
              </div>
              <div className="library-item student-detail-item">
                <dt>
                  <span className="library-item-icon" aria-hidden="true">
                    <Mail />
                  </span>
                  <span>
                    <strong>Student ID</strong>
                    <small>{studentToView.id}</small>
                  </span>
                </dt>
                <dd className="sr-only">{studentToView.id}</dd>
              </div>
            </dl>
          </aside>

          <main className="assigned-lessons-panel">
            <div className="assigned-lessons-header">
              <h3>Assigned lessons</h3>
              <span>{formatCount(studentDetailLessons.length, "lesson")}</span>
              {studentDetailState === "error" && studentDetailMessage ? (
                <p className="save-status save-status-error">
                  {studentDetailMessage}
                </p>
              ) : null}
            </div>

            {studentDetailState === "loading" ? (
              <div className="assigned-lessons-empty">
                <BookOpen />
                <p>Loading assigned lessons...</p>
              </div>
            ) : studentDetailLessons.length === 0 ? (
              <div className="assigned-lessons-empty">
                <BookOpen />
                <p>{studentDetailMessage || "No lessons assigned yet"}</p>
              </div>
            ) : (
              <div className="assigned-lessons-list">
                {studentDetailLessons.map((assignment) => (
                  <article key={assignment.id} className="assigned-lesson-card">
                    <div className="assigned-lesson-main">
                      <BookOpen aria-hidden="true" />
                      <div>
                        <h4>{assignment.lessons?.title || "Untitled lesson"}</h4>
                        <div className="assigned-lesson-meta">
                          <span
                            className={getStatusBadgeClass(
                              assignment.lessons?.status ?? "draft"
                            )}
                          >
                            {assignment.lessons?.status ?? "draft"}
                          </span>
                          <span className={getStatusBadgeClass(assignment.status)}>
                            {assignment.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="assigned-lesson-progress">
                      <span>{assignment.progress}%</span>
                      <div
                        className="progress-track"
                        aria-label={`${assignment.progress}% progress`}
                      >
                        <span style={{ width: `${assignment.progress}%` }} />
                      </div>
                    </div>
                    <div className="assigned-lesson-date">
                      <CalendarDays aria-hidden="true" />
                      <span>{formatSavedDate(assignment.created_at)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </main>
        </div>
      </section>
    </div>
  ) : null

  const deleteConfirmModal = lessonToDelete ? (
    <div className="confirm-modal-backdrop" role="presentation">
      <section
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-lesson-title"
      >
        <div className="confirm-modal-copy">
          <h2 id="delete-lesson-title">Delete lesson</h2>
          <p>
            Are you sure you want to delete this lesson? It will be deleted
            forever.
          </p>
          {lessonsState === "error" && lessonsMessage ? (
            <p className="confirm-modal-error">{lessonsMessage}</p>
          ) : null}
        </div>
        <div className="confirm-modal-actions">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLessonToDelete(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => deleteLesson(lessonToDelete)}
            disabled={lessonsState === "loading"}
          >
            Delete
          </Button>
        </div>
      </section>
    </div>
  ) : null

  return (
    <>
      {authState === "loading" && !tutorProfile ? (
        <main className="auth-screen">
          <section className="auth-panel">
            <div className="launch-icon" aria-hidden="true">
              <BookOpen />
            </div>
            <p className="auth-message">{authMessage || "Loading..."}</p>
          </section>
        </main>
      ) : tutorProfile ? (
        <AppShell
          viewMode={viewMode}
          onNavigate={navigateToPage}
          onLoadLessons={loadLessons}
          onLoadStudents={loadStudents}
          tutorProfile={tutorProfile}
          onSignOut={handleSignOut}
        >
          {viewMode === "dashboard"
            ? dashboardPage
            : viewMode === "students"
              ? studentsPage
              : savedLessonsPage}
        </AppShell>
      ) : (
        <AuthScreen
          mode={authViewMode}
          onModeChange={navigateToAuthPage}
          onAuthenticated={refreshAuthenticatedTutor}
          statusMessage={authState === "error" ? authMessage : ""}
        />
      )}
      {builderModal}
      {addStudentModal}
      {assignLessonModal}
      {studentDetailsModal}
      {deleteConfirmModal}
      {toast ? <Toast message={toast.message} /> : null}
    </>
  )
}

export default App
