import { createMCPClient } from "@ai-sdk/mcp"
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai"
import { createOllama } from "ollama-ai-provider-v2"

const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? "http://localhost:8000/mcp"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3:0.6b"
const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/api"
const SUPPORT_REPLY =
  "I’m sorry, but I couldn’t find a tool for that request. Please contact support for assistance."

const ollama = createOllama({ baseURL: OLLAMA_BASE_URL })

type ChatRequest = {
  messages?: UIMessage[]
}

const createFallbackResponse = (text: string) => {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const textId = generateId()

      writer.write({ type: "text-start", id: textId })
      writer.write({ type: "text-delta", id: textId, delta: text })
      writer.write({ type: "text-end", id: textId })
    },
  })

  return createUIMessageStreamResponse({ stream })
}

const closeMcpClient = async (
  client: Awaited<ReturnType<typeof createMCPClient>>
) => {
  await client.close().catch(() => undefined)
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ChatRequest
    const messages = payload.messages ?? []
    const modelMessages = await convertToModelMessages(messages)
    const mcpClient = await createMCPClient({
      transport: {
        type: "http",
        url: MCP_SERVER_URL,
      },
    })

    try {
      const tools = await mcpClient.tools()

      if (Object.keys(tools).length === 0) {
        await closeMcpClient(mcpClient)
        return createFallbackResponse(SUPPORT_REPLY)
      }

      const result = streamText({
        model: ollama(OLLAMA_MODEL),
        system: `You are a helpful assistant that can only answer requests by using the available MCP tools.

When an available MCP tool can fulfill the user's request, you MUST call the appropriate tool before answering. Never invent tools or arguments, and make arguments match the tool schema.

If none of the available MCP tools can fulfill the request, reply exactly with:
${SUPPORT_REPLY}`,
        messages: modelMessages,
        stopWhen: stepCountIs(5),
        toolChoice: "auto",
        tools,
        onFinish: async () => {
          await closeMcpClient(mcpClient)
        },
      })

      const stream = toUIMessageStream({
        onError: () => SUPPORT_REPLY,
        originalMessages: messages,
        stream: result.stream,
        tools,
      })

      return createUIMessageStreamResponse({ stream })
    } catch {
      await closeMcpClient(mcpClient)
      return createFallbackResponse(SUPPORT_REPLY)
    }
  } catch {
    return createFallbackResponse(SUPPORT_REPLY)
  }
}
