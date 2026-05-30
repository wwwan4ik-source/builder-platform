import { useState } from "react"
import {
  Layers3,
  Plus,
  Radio,
  Save,
  Sparkles,
  Type,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import "./App.css"

type ElementType = "title" | "radio-field"

type RadioOption = {
  id: number
  value: string
}

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

type LessonElement = TitleElement | RadioFieldElement

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
]

function renumberDefaultOptions(options: RadioOption[]) {
  return options.map((option, optionIndex) => ({
    ...option,
    value: /^Option \d+$/.test(option.value)
      ? `Option ${optionIndex + 1}`
      : option.value,
  }))
}

function createElement(type: ElementType): LessonElement {
  const item = libraryItems.find((libraryItem) => libraryItem.type === type)
  const id = Date.now()

  if (type === "radio-field") {
    const options = [1, 2, 3].map((optionNumber) => ({
      id: id + optionNumber,
      value: `Option ${optionNumber}`,
    }))

    return {
      id,
      type,
      title: item?.name ?? "Single-answer question",
      correctOptionId: options[0].id,
      options,
    }
  }

  return {
    id,
    type,
    title: item?.name ?? "Block",
  }
}

function App() {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [elements, setElements] = useState<LessonElement[]>([])

  function addElement(type: ElementType) {
    setElements((currentElements) => [...currentElements, createElement(type)])
  }

  function updateElement(id: number, value: string) {
    setElements((currentElements) =>
      currentElements.map((element) =>
        element.id === id ? { ...element, title: value } : element
      )
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

  function setCorrectRadioOption(elementId: number, optionId: number) {
    setElements((currentElements) =>
      currentElements.map((element) =>
        element.id === elementId && element.type === "radio-field"
          ? { ...element, correctOptionId: optionId }
          : element
      )
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

  function deleteElement(id: number) {
    setElements((currentElements) =>
      currentElements.filter((element) => element.id !== id)
    )
  }

  if (!isBuilderOpen) {
    return (
      <main className="launch-screen">
        <section className="launch-panel" aria-labelledby="builder-title">
          <div className="launch-icon" aria-hidden="true">
            <Sparkles />
          </div>
          <div className="launch-copy">
            <p className="eyebrow">Lesson Builder</p>
            <h1 id="builder-title">Create and compose a lesson</h1>
            <p>
              Start with a blank lesson space, then add simple MVP blocks from
              the library.
            </p>
          </div>
          <Button size="lg" onClick={() => setIsBuilderOpen(true)}>
            <Plus />
            Create lesson
          </Button>
        </section>
      </main>
    )
  }

  return (
    <main className="builder-shell">
      <header className="builder-header">
        <div>
          <h1>Draft</h1>
        </div>
        <Button>
          <Save />
          Save
        </Button>
      </header>

      <section className="builder-layout" aria-label="Lesson editor">
        <div className="lesson-space">
          <div className="space-toolbar">
            <div>
              <h2>Canvas</h2>
            </div>
            <span>{elements.length} blocks</span>
          </div>

          <div className="canvas-area">
            {elements.length === 0 ? (
              <div className="empty-state">
                <Layers3 />
                <h3>Add your first block</h3>
                <p>Choose one must-have element from the library.</p>
              </div>
            ) : (
              elements.map((element) => {
                if (element.type === "radio-field") {
                  return (
                    <article className="lesson-element" key={element.id}>
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
                        <button
                          type="button"
                          className="delete-element"
                          onClick={() => deleteElement(element.id)}
                          aria-label="Delete radio field block"
                        >
                          <Trash2 />
                        </button>
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

                return (
                  <article className="lesson-element" key={element.id}>
                    <label>
                      <span>Title</span>
                      <div className="element-field">
                        <input
                          value={element.title}
                          onChange={(event) =>
                            updateElement(element.id, event.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="delete-element"
                          onClick={() => deleteElement(element.id)}
                          aria-label="Delete title block"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </label>
                  </article>
                )
              })
            )}
          </div>
        </div>

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
      </section>
    </main>
  )
}

export default App
