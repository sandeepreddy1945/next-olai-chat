"use client"

import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { useState } from "react"

import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector"
import { Button } from "@/components/ui/button"

export const AVAILABLE_MODELS = [
  {
    description: "Fast and lightweight",
    id: "qwen2.5:1.5b",
    name: "Qwen 2.5 1.5B",
  },
  {
    description: "Reasoning-focused model",
    id: "qwen3:0.6b",
    name: "Qwen 3 0.6B",
  },
] as const

export type ModelId = (typeof AVAILABLE_MODELS)[number]["id"]

export type ModelSelectorMenuProps = {
  disabled?: boolean
  onValueChange: (value: ModelId) => void
  value: ModelId
}

export const ModelSelectorMenu = ({
  disabled,
  onValueChange,
  value,
}: ModelSelectorMenuProps) => {
  const [open, setOpen] = useState(false)
  const selectedModel = AVAILABLE_MODELS.find((model) => model.id === value)

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger
        render={
          <Button
            aria-label="Select Ollama model"
            className="max-w-40"
            disabled={disabled}
            size="sm"
            type="button"
            variant="outline"
          />
        }
      >
        <span className="truncate">{selectedModel?.name ?? value}</span>
        <ChevronDownIcon />
      </ModelSelectorTrigger>
      <ModelSelectorContent
        className="top-auto right-4 bottom-28 left-4 w-auto max-w-none translate-x-0 translate-y-0 sm:right-6 sm:left-auto sm:w-[388px] sm:max-w-[388px]"
        title="Select an Ollama model"
      >
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No Ollama models found.</ModelSelectorEmpty>
          <ModelSelectorGroup heading="Available models">
            {AVAILABLE_MODELS.map((model) => (
              <ModelSelectorItem
                key={model.id}
                onSelect={() => {
                  onValueChange(model.id)
                  setOpen(false)
                }}
                value={`${model.name} ${model.id}`}
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <ModelSelectorName>{model.name}</ModelSelectorName>
                  <span className="truncate text-xs text-muted-foreground">
                    {model.id} · {model.description}
                  </span>
                </div>
                {model.id === value && (
                  <CheckIcon className="size-4 text-primary" />
                )}
              </ModelSelectorItem>
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  )
}
