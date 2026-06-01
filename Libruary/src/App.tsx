import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  Eye,
  Funnel,
  ImageUp,
  LayoutDashboard,
  ListChecks,
  Layers3,
  MoreHorizontal,
  Search,
  TextCursorInput,
  PenLine,
  Pencil,
  Plus,
  Radio,
  Rocket,
  Save,
  Type,
  Trash2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import "./App.css"

type ElementType =
  | "title"
  | "radio-field"
  | "checkbox-field"
  | "text-field"
  | "image-upload"
  | "fill-blanks"

type RadioOption = {
  id: number
  value: string
}

type ChoiceOption = RadioOption

type TitleElement = {
  id: number
  type: "title"
  title: string
}

type RadioFieldElement = {
  id: number
  type: "radio-field"
  title: string
  correctOptionId: number
  options: RadioOption[]
}

type CheckboxFieldElement = {
  id: number
  type: "checkbox-field"
  title: string
  correctOptionIds: number[]
  options: ChoiceOption[]
}

type TextFieldElement = {
  id: number
  type: "text-field"
  title: string
}

type ImageUploadElement = {
  id: number
  type: "image-upload"
  title: string
  imageSrc: string | null
  imageName: string
}

type BlankAnswerOption = {
  id: number
  value: string
}

type BlankItem = {
  id: number
  mode: "typed" | "choice"
  marker: string
  correctAnswer: string
  correctOptionId: number
  options: BlankAnswerOption[]
}

type FillBlanksElement = {
  id: number
  type: "fill-blanks"
  title: string
  prompt: string
  blanks: BlankItem[]
  isInsertMenuOpen: boolean
  insertMenuPlacement: "bottom" | "top"
  activeChoiceBlankId: number | null
  activeChoiceBlankPlacement: "bottom" | "top"
}

type LessonElement =
  | TitleElement
  | RadioFieldElement
  | CheckboxFieldElement
  | TextFieldElement
  | ImageUploadElement
  | FillBlanksElement

type SaveState = "idle" | "loading" | "saving" | "saved" | "error"
type AppPage = "dashboard" | "lessons"
type LessonStatus = "draft" | "published"
type LessonStatusFilter = "all" | LessonStatus
type LessonMode = "edit" | "student"
type ToastState = {
  id: number
  message: string
}

type LessonRow = {
  id: string
  title: string
  blocks: LessonElement[]
  status: LessonStatus
}

type SavedLessonRow = LessonRow & {
  updated_at: string
  created_at: string
}

const libraryItems: Array<{
  type: ElementType
  name: string
  description: string
  icon: typeof Type
}> = [
  {
    type: "title",
    name: "Title",
    description: "Add a lesson heading",
    icon: Type,
  },
  {
    type: "radio-field",
    name: "Single-answer question",
    description: "Create options and mark one correct answer",
    icon: Radio,
  },
  {
    type: "checkbox-field",
    name: "Multiple-select question",
    description: "Create options and mark every correct answer",
    icon: ListChecks,
  },
  {
    type: "text-field",
    name: "Write text",
    description: "Add a free-text writing task",
    icon: TextCursorInput,
  },
  {
    type: "image-upload",
    name: "Image upload",
    description: "Add a drag and drop image area",
    icon: ImageUp,
  },
  {
    type: "fill-blanks",
    name: "Fill in blanks",
    description: "Insert typed or choice blanks inside a text task",
    icon: PenLine,
  },
]

function renumberDefaultOptions(options: RadioOption[]) {
  return options.map((option, optionIndex) => ({
    ...option,
    value: /^Option \d+$/.test(option.value)
      ? `Option ${optionIndex + 1}`
      : option.value,
  }))
}

function splitPromptByBlanks(prompt: string, blanks: BlankItem[]) {
  if (blanks.length === 0) {
    return [prompt]
  }

  const markers = blanks.map((blank) => blank.marker)
  const markerPattern = new RegExp(
    `(${markers.map((marker) => marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`
  )

  return prompt.split(markerPattern)
}

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
  const boundaryRect =
    trigger.closest(".canvas-area")?.getBoundingClientRect() ??
    trigger.closest(".lesson-element")?.getBoundingClientRect()
  const boundaryBottom = Math.min(
    boundaryRect?.bottom ?? window.innerHeight,
    window.innerHeight
  )
  const menuGap = 6

  return boundaryBottom - triggerRect.bottom < menuHeight + menuGap
    ? "top"
    : "bottom"
}

function createElement(type: ElementType): LessonElement {
  const item = libraryItems.find((libraryItem) => libraryItem.type === type)
  const id = Date.now()

  if (type === "radio-field" || type === "checkbox-field") {
    const options = [1, 2, 3].map((optionNumber) => ({
      id: id + optionNumber,
      value: `Option ${optionNumber}`,
    }))

    if (type === "checkbox-field") {
      return {
        id,
        type,
        title: item?.name ?? "Multiple-select question",
        correctOptionIds: [options[0].id],
        options,
      }
    }

    return {
      id,
      type,
      title: item?.name ?? "Single-answer question",
      correctOptionId: options[0].id,
      options,
    }
  }

  if (type === "fill-blanks") {
    return {
      id,
      type,
      title: item?.name ?? "Fill in blanks",
      prompt: "",
      blanks: [],
      isInsertMenuOpen: false,
      insertMenuPlacement: "bottom",
      activeChoiceBlankId: null,
      activeChoiceBlankPlacement: "bottom",
    }
  }

  if (type === "image-upload") {
    return {
      id,
      type,
      title: item?.name ?? "Image upload",
      imageSrc: null,
      imageName: "",
    }
  }

  return {
    id,
    type,
    title: item?.name ?? "Block",
  }
}

function prepareElementsForSave(elementsToSave: LessonElement[]) {
  return elementsToSave.map((element) => {
    if (element.type !== "fill-blanks") {
      return element
    }

    return {
      ...element,
      isInsertMenuOpen: false,
      insertMenuPlacement: "bottom",
      activeChoiceBlankId: null,
      activeChoiceBlankPlacement: "bottom",
    }
  })
}

function hydrateElements(savedBlocks: unknown): LessonElement[] {
  if (!Array.isArray(savedBlocks)) {
    return []
  }

  return savedBlocks.map((block) => {
    const element = block as LessonElement

    if (element.type !== "fill-blanks") {
      return element
    }

    return {
      ...element,
      isInsertMenuOpen: false,
      insertMenuPlacement: "bottom",
      activeChoiceBlankId: null,
      activeChoiceBlankPlacement: "bottom",
    }
  })
}

function getLessonTitleFromBlocks(elementsToRead: LessonElement[]) {
  const titleBlock = elementsToRead.find(
    (element): element is TitleElement => element.type === "title"
  )

  return titleBlock?.title.trim() || "Draft"
}

function formatSavedDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
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
  const [viewMode, setViewMode] = useState<AppPage>("dashboard")
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
  const [lessonToDelete, setLessonToDelete] = useState<SavedLessonRow | null>(
    null
  )
  const [openLessonActionsId, setOpenLessonActionsId] = useState<string | null>(
    null
  )
  const [toast, setToast] = useState<ToastState | null>(null)
  const [lastAddedElementId, setLastAddedElementId] = useState<number | null>(
    null
  )

  function showToast(message: string) {
    setToast({
      id: Date.now(),
      message,
    })
  }

  async function loadLessons() {
    if (!supabase) {
      setLessonsState("error")
      setLessonsMessage("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first")
      return
    }

    setLessonsState("loading")
    setLessonsMessage("Loading lessons...")

    const { data, error } = await supabase
      .from("lessons")
      .select("id,title,status,blocks,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .returns<SavedLessonRow[]>()

    if (error) {
      setLessonsState("error")
      setLessonsMessage(error.message)
      return
    }

    setLessons(data ?? [])
    setLessonsState("idle")
    setLessonsMessage(data?.length ? "" : "No saved lessons yet")
  }

  useEffect(() => {
    if (!supabase) {
      return
    }

    let isMounted = true

    async function loadLatestDraft() {
      setSaveState("loading")
      setSaveMessage("Loading latest draft...")

      const { data, error } = await supabase!
        .from("lessons")
        .select("id,title,status,blocks")
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle<LessonRow>()

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
  }, [])

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
    const menuHeight = blank ? 16 + blank.options.length * 54 + 44 : 220
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
    if (!supabase) {
      setSaveState("error")
      setSaveMessage("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first")
      return
    }

    const lessonPayload = {
      title: getLessonTitleFromBlocks(elements),
      status: nextStatus,
      blocks: prepareElementsForSave(elements),
    }

    setSaveState("saving")
    setSaveMessage("Saving...")

    const isNewLesson = lessonId === null

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

    if (error) {
      setSaveState("error")
      setSaveMessage(error.message)
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
    setViewMode("lessons")
  }

  function saveLesson() {
    persistLesson("draft")
  }

  function publishLesson() {
    persistLesson("published")
  }

  async function deleteLesson(lesson: SavedLessonRow) {
    if (!supabase) {
      setLessonsState("error")
      setLessonsMessage("Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY first")
      return
    }

    setLessonsState("loading")
    setLessonsMessage("Deleting lesson...")

    const { error } = await supabase.from("lessons").delete().eq("id", lesson.id)

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
  const isEditMode = lessonMode === "edit"
  const builderPageTitle =
    lessonId === null
      ? "Create lesson"
      : isEditMode
        ? "Edit lesson"
        : "Preview lesson"

  function renderAppShell(content: ReactNode) {
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
            <span className="user-initials" aria-label="User initials">
              AO
            </span>
          </div>
        </header>

        <div className="app-body">
          <aside className="app-sidebar" aria-label="Main navigation">
            <nav className="sidebar-nav">
              <button
                type="button"
                className={viewMode === "dashboard" ? "active" : ""}
                onClick={() => setViewMode("dashboard")}
              >
                <LayoutDashboard />
                Dashboard
              </button>
              <button
                type="button"
                className={viewMode === "lessons" ? "active" : ""}
                onClick={() => {
                  setViewMode("lessons")
                  loadLessons()
                }}
              >
                <BookOpen />
                Lessons
              </button>
            </nav>
          </aside>

          <section className="app-content">
            {content}
          </section>
        </div>
      </main>
    )
  }

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
          <strong>{lessons.length}</strong>
        </article>
        <article>
          <span>Drafts</span>
          <strong>{draftLessons.length}</strong>
        </article>
        <article>
          <span>Published</span>
          <strong>{publishedLessons.length}</strong>
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
                  setViewMode("lessons")
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
          <span>{filteredLessons.length}</span>
          {lessonsMessage ? (
            <p
              className={`save-status ${
                lessonsState === "error" ? "save-status-error" : ""
              }`}
            >
              {lessonsMessage}
            </p>
          ) : null}
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
            {lessons.length === 0 && lessonsState !== "loading" ? (
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
                        <span className="lesson-status">{lesson.status}</span>
                      </td>
                      <td>{lesson.blocks.length}</td>
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

  const builderModal = isBuilderOpen ? (
    <div className="builder-modal" role="dialog" aria-modal="true">
      <main className={`builder-shell builder-mode-${lessonMode}`}>
      <header className="builder-header">
        <div>
          <h1 className="builder-page-title">{builderPageTitle}</h1>
          {saveState === "error" && saveMessage ? (
            <p className="save-status save-status-error">{saveMessage}</p>
          ) : null}
        </div>
        <div className="header-actions">
          <Button
            variant="outline"
            onClick={closeBuilder}
            title="Close builder"
          >
            <X />
            Close
          </Button>
          {lessonStatus === "draft" ? (
            <>
              {isEditMode ? (
                <Button onClick={saveLesson} disabled={saveState === "saving"}>
                  <Save />
                  {saveState === "saving" ? "Saving" : "Save draft"}
                </Button>
              ) : null}
              <Button onClick={publishLesson} disabled={saveState === "saving"}>
                <Rocket />
                {saveState === "saving" ? "Publishing" : "Publish"}
              </Button>
            </>
          ) : null}
        </div>
      </header>

      <section className="builder-layout" aria-label="Lesson editor">
        <div className="lesson-space">
          <div className="space-toolbar">
            <div>
              <h2>{isEditMode ? "Canvas" : "Lesson view"}</h2>
            </div>
            <span>{elements.length} blocks</span>
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
      {renderAppShell(viewMode === "dashboard" ? dashboardPage : savedLessonsPage)}
      {builderModal}
      {deleteConfirmModal}
      {toast ? (
        <div className="toast" role="status" aria-live="polite">
          {toast.message}
        </div>
      ) : null}
    </>
  )
}

export default App
