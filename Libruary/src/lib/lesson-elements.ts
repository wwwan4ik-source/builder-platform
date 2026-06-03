import {
  ImageUp,
  ListChecks,
  PenLine,
  Radio,
  TextCursorInput,
  Type,
} from "lucide-react"

import {
  type BlankItem,
  type ElementType,
  type LessonElement,
  type LibraryItem,
  type RadioOption,
  type TitleElement,
} from "@/types/lesson"

export const libraryItems: LibraryItem[] = [
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

export function renumberDefaultOptions(options: RadioOption[]) {
  return options.map((option, optionIndex) => ({
    ...option,
    value: /^Option \d+$/.test(option.value)
      ? `Option ${optionIndex + 1}`
      : option.value,
  }))
}

export function splitPromptByBlanks(prompt: string, blanks: BlankItem[]) {
  if (blanks.length === 0) {
    return [prompt]
  }

  const markers = blanks.map((blank) => blank.marker)
  const markerPattern = new RegExp(
    `(${markers.map((marker) => marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`
  )

  return prompt.split(markerPattern)
}

export function createElement(type: ElementType): LessonElement {
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

export function prepareElementsForSave(elementsToSave: LessonElement[]) {
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

export function hydrateElements(savedBlocks: unknown): LessonElement[] {
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

export function getLessonTitleFromBlocks(elementsToRead: LessonElement[]) {
  const titleBlock = elementsToRead.find(
    (element): element is TitleElement => element.type === "title"
  )

  return titleBlock?.title.trim() || "Draft"
}

