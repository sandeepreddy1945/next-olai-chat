import { createMCPClient } from "@ai-sdk/mcp"
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type StopCondition,
  type UIMessage,
} from "ai"
import { createOllama } from "ollama-ai-provider-v2"

const MCP_SERVER_URL = process.env.MCP_SERVER_URL ?? "http://localhost:8000/mcp"
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:1.5b"
const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/api"
const SUPPORT_REPLY =
  "I’m sorry, but I couldn’t find a tool for that request. Please contact support for assistance."

const ollama = createOllama({ baseURL: OLLAMA_BASE_URL })

const AVAILABLE_MODELS = new Set(["qwen2.5:1.5b", "qwen3:0.6b"])

type ToolFieldSchema = {
  default?: unknown
  description?: string
  enum?: unknown[]
  title?: string
  type?: string
}

type ToolInputSchema = {
  properties?: Record<string, ToolFieldSchema>
  required?: string[]
}

type ToolSchemas = Record<string, ToolInputSchema>

type ToolCallRequest = {
  arguments: Record<string, unknown>
  name: string
}

type ChatRequest = {
  messages?: UIMessage[]
  model?: string
  toolCall?: ToolCallRequest
}

type McpClient = Awaited<ReturnType<typeof createMCPClient>>
type McpTools = Awaited<ReturnType<McpClient["tools"]>>
type McpResources = {
  client: McpClient
  toolSchemas: ToolSchemas
  tools: McpTools
}
type ToolExecutor = (input: unknown, options: unknown) => unknown

type MissingToolInput = {
  __mcpMissingInput: true
  input: Record<string, unknown>
  missing: string[]
  schema: ToolInputSchema
  toolName: string
}

let mcpResourcesPromise: Promise<McpResources> | undefined

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const getJsonSchema = async (schema: unknown): Promise<ToolInputSchema> => {
  if (isRecord(schema) && "jsonSchema" in schema) {
    return (await schema.jsonSchema) as ToolInputSchema
  }

  return (schema ?? {}) as ToolInputSchema
}

const getMissingInputFields = (
  schema: ToolInputSchema,
  input: unknown
): string[] => {
  const inputRecord = isRecord(input) ? input : {}

  return (schema.required ?? []).filter(
    (field) =>
      inputRecord[field] === undefined ||
      inputRecord[field] === null ||
      inputRecord[field] === ""
  )
}

const isMissingToolInput = (value: unknown): value is MissingToolInput =>
  isRecord(value) && value.__mcpMissingInput === true

const createGuardedTools = (
  tools: McpTools,
  toolSchemas: ToolSchemas
): McpTools =>
  Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => {
      const execute = (tool as unknown as { execute?: ToolExecutor }).execute

      if (!execute) {
        return [name, tool]
      }

      return [
        name,
        {
          ...tool,
          execute: async (input: unknown, options: unknown) => {
            const schema = toolSchemas[name] ?? {}
            const missing = getMissingInputFields(schema, input)

            if (missing.length > 0) {
              return {
                __mcpMissingInput: true,
                input: isRecord(input) ? input : {},
                missing,
                schema,
                toolName: name,
              } satisfies MissingToolInput
            }

            return execute(input, options)
          },
        },
      ]
    })
  ) as McpTools

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

const getToolResultText = (result: unknown) => {
  if (isRecord(result) && Array.isArray(result.content)) {
    const text = result.content
      .filter(
        (part): part is { text: string; type: "text" } =>
          isRecord(part) &&
          part.type === "text" &&
          typeof part.text === "string"
      )
      .map((part) => part.text)
      .join("\n")

    if (text) {
      return text
    }
  }

  return JSON.stringify(result)
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
    const rawTools = await client.tools()
    const toolSchemas = Object.fromEntries(
      await Promise.all(
        Object.entries(rawTools).map(async ([name, tool]) => [
          name,
          await getJsonSchema(
            (tool as unknown as { inputSchema?: unknown }).inputSchema
          ),
        ])
      )
    ) as ToolSchemas

    return {
      client,
      toolSchemas,
      tools: createGuardedTools(rawTools, toolSchemas),
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

const stopOnMissingToolInput: StopCondition<McpTools> = ({ steps }) =>
  steps
    .at(-1)
    ?.toolResults.some((result) => isMissingToolInput(result.output)) ?? false

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ChatRequest
    const messages = payload.messages ?? []
    const model =
      payload.model && AVAILABLE_MODELS.has(payload.model)
        ? payload.model
        : OLLAMA_MODEL
    const { client, toolSchemas, tools } = await getMcpResources()

    if (Object.keys(tools).length === 0) {
      return createFallbackResponse(SUPPORT_REPLY)
    }

    if (payload.toolCall) {
      const schema = toolSchemas[payload.toolCall.name]
      const missing = schema
        ? getMissingInputFields(schema, payload.toolCall.arguments)
        : [payload.toolCall.name]

      if (!schema || missing.length > 0) {
        return createFallbackResponse(SUPPORT_REPLY)
      }

      const result = await client.callTool({
        arguments: payload.toolCall.arguments,
        name: payload.toolCall.name,
      })

      return createFallbackResponse(getToolResultText(result))
    }

    const modelMessages = await convertToModelMessages(messages)
    const result = streamText({
      model: ollama(model),
      system: `You are a helpful assistant that can only answer requests by using the available MCP tools.

When an available MCP tool can fulfill the user's request, you MUST call the appropriate tool before answering. Never invent tools or arguments, and make arguments match the tool schema.

If a tool requires information that is missing from the user's request, call the tool with the information you have. The interface will collect the missing required fields before the tool is executed.

If none of the available MCP tools can fulfill the request, reply exactly with:
${SUPPORT_REPLY}`,
      messages: modelMessages,
      stopWhen: [stepCountIs(5), stopOnMissingToolInput],
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
