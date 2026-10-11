"use client"

import { ConversationEmptyState } from "@/components/ai-elements/conversation"
import { Suggestion } from "@/components/ai-elements/suggestion"
import { MessageCircleIcon } from "lucide-react"

export const CHAT_SUGGESTIONS = [
  "What can you help me with?",
  "Summarize the latest updates",
  "Find relevant documentation",
]

export const ChatEmptyState = ({
  onSuggestion,
}: {
  onSuggestion: (suggestion: string) => void
}) => (
  <ConversationEmptyState>
    <div className="flex max-w-xl flex-col items-center gap-6 text-center">
      <div className="space-y-2">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
          <MessageCircleIcon className="size-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">How can I help?</h2>
        <p className="text-sm text-muted-foreground">
          Ask a question to start a streamed conversation.
        </p>
      </div>
      <div className="flex w-full flex-col gap-2">
        {CHAT_SUGGESTIONS.map((suggestion) => (
          <Suggestion
            className="h-auto min-h-9 w-full justify-start text-left whitespace-normal"
            key={suggestion}
            onClick={onSuggestion}
            suggestion={suggestion}
          />
        ))}
      </div>
    </div>
  </ConversationEmptyState>
)
