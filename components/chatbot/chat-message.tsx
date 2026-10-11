"use client"

import { isReasoningUIPart, isToolUIPart, type UIMessage } from "ai"
import { BotIcon, UserRoundIcon } from "lucide-react"

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import {
  DynamicToolForm,
  getMissingToolInput,
  type ToolInputSubmit,
} from "@/components/ui/dynamic-tool-form"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

type ChatMessageProps = {
  isStreaming: boolean
  message: UIMessage
  onToolInputSubmit: ToolInputSubmit
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
  isStreaming: boolean,
  onToolInputSubmit: ToolInputSubmit
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
    const missingInput = getMissingToolInput(part.output)

    if (missingInput) {
      return (
        <DynamicToolForm
          key={key}
          onSubmit={onToolInputSubmit}
          request={missingInput}
        />
      )
    }

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

export const ChatMessage = ({
  isStreaming,
  message,
  onToolInputSubmit,
}: ChatMessageProps) => {
  const messageContent = (
    <>
      {message.parts.map((part, index) =>
        renderPart(message, part, index, isStreaming, onToolInputSubmit)
      )}
      {message.role === "assistant" && !getText(message) && isStreaming && (
        <MessageResponse isAnimating>Thinking...</MessageResponse>
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
    >
      <Avatar
        aria-label={
          message.role === "user" ? "User message" : "Assistant message"
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
      <Message className="max-w-full min-w-0" from={message.role}>
        {message.role === "assistant" ? (
          <Card className="w-fit max-w-full gap-0 border-border/60 py-0 shadow-sm">
            <CardContent className="p-3">{messageContent}</CardContent>
          </Card>
        ) : (
          <MessageContent className="max-w-full break-words">
            {messageContent}
          </MessageContent>
        )}
      </Message>
    </div>
  )
}
