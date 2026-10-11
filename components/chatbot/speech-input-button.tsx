"use client"

import { SpeechInput } from "@/components/ai-elements/speech-input"
import { usePromptInputController } from "@/components/ai-elements/prompt-input"

export const SpeechInputButton = () => {
  const { textInput } = usePromptInputController()

  const handleTranscriptionChange = (transcription: string) => {
    const text = transcription.trim()

    if (!text) {
      return
    }

    const separator = textInput.value && !/\s$/.test(textInput.value) ? " " : ""
    textInput.setInput(`${textInput.value}${separator}${text}`)
  }

  return (
    <SpeechInput
      aria-label="Use voice input"
      onTranscriptionChange={handleTranscriptionChange}
      size="icon-sm"
      title="Use voice input"
      variant="ghost"
    />
  )
}
