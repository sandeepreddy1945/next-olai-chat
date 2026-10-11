"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { MessageCircleIcon, XIcon } from "lucide-react"
import { useState } from "react"

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { Button } from "@/components/ui/button"
import { ChatEmptyState } from "@/components/chatbot/chat-empty-state"
import { ChatMessage } from "@/components/chatbot/chat-message"
import {
  ModelSelectorMenu,
  type ModelId,
} from "@/components/chatbot/model-selector-menu"
import { SpeechInputButton } from "@/components/chatbot/speech-input-button"

const transport = new DefaultChatTransport({
  api: process.env.NEXT_PUBLIC_MCP_CHAT_URL ?? "/api/chat",
})

export default function Chat() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ModelId>("qwen2.5:1.5b")
  const { messages, sendMessage, status, error, clearError, stop } = useChat({
    transport,
  })
  const isBusy = status === "submitted" || status === "streaming"
  const lastMessage = messages.at(-1)

  const sendText = (text: string) => {
    const trimmedText = text.trim()

    if (!trimmedText || isBusy) {
      return
    }

    void sendMessage({ text: trimmedText }, { body: { model: selectedModel } })
  }

  const handleToolInputSubmit = (
    toolName: string,
    input: Record<string, unknown>
  ) => {
    if (isBusy) {
      return
    }

    void sendMessage(
      { text: `Provided additional information for ${toolName}.` },
      {
        body: {
          model: selectedModel,
          toolCall: { arguments: input, name: toolName },
        },
      }
    )
  }

  const handleSubmit = ({ text }: PromptInputMessage) => {
    sendText(text)
  }

  const handleSuggestion = (suggestion: string) => {
    sendText(suggestion)
  }

  return (
    <main className="min-h-svh bg-background">
      {isOpen && (
        <section
          aria-labelledby="mcp-assistant-title"
          aria-modal="false"
          className="fixed right-4 bottom-24 z-40 flex h-[min(700px,calc(100svh-8rem))] w-[calc(100vw-2rem)] max-w-[420px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:right-6 sm:w-[420px]"
          id="mcp-chat-panel"
          role="dialog"
        >
          <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <MessageCircleIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-semibold" id="mcp-assistant-title">
                  MCP Assistant
                </h1>
                <p className="truncate text-xs text-muted-foreground">
                  Ask questions and get streamed answers.
                </p>
              </div>
            </div>
            <Button
              aria-label="Close MCP assistant"
              onClick={() => setIsOpen(false)}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <XIcon />
            </Button>
          </header>

          <div className="mx-auto flex min-h-0 w-full flex-1 flex-col px-3">
            <Conversation className="min-h-0 flex-1">
              <ConversationContent className="mx-auto w-full max-w-3xl">
                {messages.length === 0 ? (
                  <ChatEmptyState onSuggestion={handleSuggestion} />
                ) : (
                  messages.map((message: UIMessage) => (
                    <ChatMessage
                      isStreaming={
                        isBusy &&
                        message.id === lastMessage?.id &&
                        message.role === "assistant"
                      }
                      key={message.id}
                      message={message}
                      onToolInputSubmit={handleToolInputSubmit}
                    />
                  ))
                )}
              </ConversationContent>
              <ConversationScrollButton />
            </Conversation>

            <div className="mx-auto w-full max-w-3xl space-y-3 pt-2 pb-3">
              {error && (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  <span>{error.message || "Something went wrong."}</span>
                  <Button
                    onClick={clearError}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              <PromptInputProvider>
                <PromptInput onSubmit={handleSubmit}>
                  <PromptInputBody>
                    <PromptInputTextarea placeholder="Ask your MCP assistant..." />
                  </PromptInputBody>
                  <PromptInputFooter>
                    <p className="text-xs text-muted-foreground">
                      Enter to send · Shift+Enter for a new line
                    </p>
                    <div className="flex items-center gap-1">
                      <ModelSelectorMenu
                        disabled={isBusy}
                        onValueChange={setSelectedModel}
                        value={selectedModel}
                      />
                      <SpeechInputButton />
                      <PromptInputSubmit
                        onStop={isBusy ? () => void stop() : undefined}
                        status={status}
                      />
                    </div>
                  </PromptInputFooter>
                </PromptInput>
              </PromptInputProvider>
            </div>
          </div>
        </section>
      )}

      <Button
        aria-controls="mcp-chat-panel"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close MCP assistant" : "Open MCP assistant"}
        className="fixed right-4 bottom-4 z-50 size-14 rounded-full shadow-lg sm:right-6 sm:bottom-6"
        onClick={() => setIsOpen((open) => !open)}
        size="icon-lg"
        type="button"
      >
        {isOpen ? <XIcon /> : <MessageCircleIcon />}
      </Button>
    </main>
  )
}
