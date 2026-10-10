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

type McpClient = Awaited<ReturnType<typeof createMCPClient>>
type McpTools = Awaited<ReturnType<McpClient["tools"]>>
type McpResources = {
  client: McpClient
  tools: McpTools
}

let mcpResourcesPromise: Promise<McpResources> | undefined

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

const closeMcpClient = async (client: McpClient) => {
  await client.close().catch(() => undefined)
}

const initializeMcpResources = async (): Promise<McpResources> => {
  const client = await createMCPClient({
    transport: {
      type: "http",
      url: MCP_SERVER_URL,
    },
  })

  try {
    return {
      client,
      tools: await client.tools(),
    }
  } catch (error) {
    await closeMcpClient(client)
    throw error
  }
}

const getMcpResources = async () => {
  if (!mcpResourcesPromise) {
    mcpResourcesPromise = initializeMcpResources()
  }

  try {
    return await mcpResourcesPromise
  } catch (error) {
    mcpResourcesPromise = undefined
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ChatRequest
    const messages = payload.messages ?? []
    const modelMessages = await convertToModelMessages(messages)
    const { tools } = await getMcpResources()

    if (Object.keys(tools).length === 0) {
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
      providerOptions: {
        ollama: {
          think: false,
        },
      },
    })

    const stream = toUIMessageStream({
      onError: () => SUPPORT_REPLY,
      originalMessages: messages,
      sendReasoning: true,
      stream: result.stream,
      tools,
    })

    return createUIMessageStreamResponse({ stream })
  } catch {
    return createFallbackResponse(SUPPORT_REPLY)
  }
}
