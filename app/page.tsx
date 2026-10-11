"use client"

import { useChat } from "@ai-sdk/react"
import {
  DefaultChatTransport,
  isReasoningUIPart,
  isToolUIPart,
  type UIMessage,
} from "ai"
import { BotIcon, MessageCircleIcon, UserRoundIcon, XIcon } from "lucide-react"
import { useState } from "react"

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input"
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning"
import { SpeechInput } from "@/components/ai-elements/speech-input"
import { Suggestion } from "@/components/ai-elements/suggestion"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const transport = new DefaultChatTransport({
  api: process.env.NEXT_PUBLIC_MCP_CHAT_URL ?? "/api/chat",
})

const suggestions = [
  "What can you help me with?",
  "Summarize the latest updates",
  "Find relevant documentation",
]

const SpeechInputButton = () => {
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

const getText = (message: UIMessage) =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")

const renderPart = (
  message: UIMessage,
  part: UIMessage["parts"][number],
  index: number,
  isStreaming: boolean
) => {
  const key = `${message.id}-${index}`

  if (part.type === "text") {
    return (
      <MessageResponse key={key} isAnimating={isStreaming}>
        {part.text}
      </MessageResponse>
    )
  }

  if (isReasoningUIPart(part)) {
    return (
      <Reasoning defaultOpen={false} key={key} isStreaming={isStreaming}>
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    )
  }

  if (isToolUIPart(part)) {
    return (
      <Tool key={key}>
        {part.type === "dynamic-tool" ? (
          <ToolHeader
            state={part.state}
            toolName={part.toolName}
            type={part.type}
          />
        ) : (
          <ToolHeader state={part.state} type={part.type} />
        )}
        <ToolContent>
          <ToolInput input={part.input} />
          <ToolOutput errorText={part.errorText} output={part.output} />
        </ToolContent>
      </Tool>
    )
  }

  return null
}

export default function Chat() {
  const [isOpen, setIsOpen] = useState(false)
  const { messages, sendMessage, status, error, clearError, stop } = useChat({
    transport,
  })
  const isBusy = status === "submitted" || status === "streaming"
  const lastMessage = messages.at(-1)

  const handleSubmit = ({ text }: PromptInputMessage) => {
    const trimmedText = text.trim()

    if (!trimmedText || isBusy) {
      return
    }

    void sendMessage({ text: trimmedText })
  }

  const handleSuggestion = (suggestion: string) => {
    if (!isBusy) {
      void sendMessage({ text: suggestion })
    }
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
                  <ConversationEmptyState>
                    <div className="flex max-w-xl flex-col items-center gap-6 text-center">
                      <div className="space-y-2">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
                          <MessageCircleIcon className="size-6 text-muted-foreground" />
                        </div>
                        <h2 className="text-lg font-semibold">
                          How can I help?
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Ask a question to start a streamed conversation.
                        </p>
                      </div>
                      <div className="flex w-full flex-col gap-2">
                        {suggestions.map((suggestion) => (
                          <Suggestion
                            className="h-auto min-h-9 w-full justify-start text-left whitespace-normal"
                            key={suggestion}
                            onClick={handleSuggestion}
                            suggestion={suggestion}
                          />
                        ))}
                      </div>
                    </div>
                  </ConversationEmptyState>
                ) : (
                  messages.map((message) => {
                    const isLastAssistantMessage =
                      message.id === lastMessage?.id &&
                      message.role === "assistant"

                    const messageContent = (
                      <>
                        {message.parts.map((part, index) =>
                          renderPart(
                            message,
                            part,
                            index,
                            isBusy && isLastAssistantMessage
                          )
                        )}
                        {message.role === "assistant" &&
                          !getText(message) &&
                          isLastAssistantMessage &&
                          isBusy && (
                            <MessageResponse isAnimating>
                              Thinking...
                            </MessageResponse>
                          )}
                      </>
                    )

                    return (
                      <div
                        className={
                          message.role === "user"
                            ? "flex w-full flex-row-reverse items-start gap-2"
                            : "flex w-full items-start gap-2"
                        }
                        key={message.id}
                      >
                        <Avatar
                          aria-label={
                            message.role === "user"
                              ? "User message"
                              : "Assistant message"
                          }
                          size="sm"
                        >
                          <AvatarFallback
                            className={
                              message.role === "user"
                                ? "bg-secondary text-secondary-foreground"
                                : "bg-primary text-primary-foreground"
                            }
                          >
                            {message.role === "user" ? (
                              <UserRoundIcon aria-hidden="true" />
                            ) : (
                              <BotIcon aria-hidden="true" />
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <Message
                          className="max-w-full min-w-0"
                          from={message.role}
                        >
                          {message.role === "assistant" ? (
                            <Card className="w-fit max-w-full gap-0 border-border/60 py-0 shadow-sm">
                              <CardContent className="p-3">
                                {messageContent}
                              </CardContent>
                            </Card>
                          ) : (
                            <MessageContent className="max-w-full break-words">
                              {messageContent}
                            </MessageContent>
                          )}
                        </Message>
                      </div>
                    )
                  })
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
