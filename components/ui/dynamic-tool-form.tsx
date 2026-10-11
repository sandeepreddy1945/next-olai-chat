"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { FormEvent } from "react"
import { useState } from "react"

export type ToolFieldSchema = {
  default?: unknown
  description?: string
  enum?: unknown[]
  title?: string
  type?: string
}

export type MissingToolInput = {
  __mcpMissingInput: true
  input: Record<string, unknown>
  missing: string[]
  schema: {
    properties?: Record<string, ToolFieldSchema>
    required?: string[]
  }
  toolName: string
}

export type ToolInputSubmit = (
  toolName: string,
  input: Record<string, unknown>
) => void

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const getMissingToolInput = (
  output: unknown
): MissingToolInput | undefined => {
  if (
    !isRecord(output) ||
    output.__mcpMissingInput !== true ||
    typeof output.toolName !== "string" ||
    !Array.isArray(output.missing) ||
    !isRecord(output.schema)
  ) {
    return undefined
  }

  return output as unknown as MissingToolInput
}

export type DynamicToolFormProps = {
  onSubmit: ToolInputSubmit
  request: MissingToolInput
}

export const DynamicToolForm = ({
  onSubmit,
  request,
}: DynamicToolFormProps) => {
  const fields = Object.entries(request.schema.properties ?? {})
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(
      fields.map(([name, field]) => {
        const initialValue =
          request.input[name] ??
          field.default ??
          (field.type === "boolean" ? false : "")

        return [
          name,
          typeof initialValue === "boolean"
            ? initialValue
            : String(initialValue),
        ]
      })
    )
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const input = Object.fromEntries(
      fields.map(([name, field]) => {
        const value = values[name]

        if (field.type === "boolean") {
          return [name, value === true]
        }

        if (field.type === "number" || field.type === "integer") {
          return [name, value === "" ? undefined : Number(value)]
        }

        if (field.type === "object" || field.type === "array") {
          try {
            return [name, value === "" ? value : JSON.parse(String(value))]
          } catch {
            return [name, value]
          }
        }

        return [name, value]
      })
    ) as Record<string, unknown>

    onSubmit(request.toolName, input)
  }

  return (
    <div className="w-full rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="mb-3 space-y-1">
        <h3 className="text-sm font-medium">More information needed</h3>
        <p className="text-xs text-muted-foreground">
          Complete the missing fields to continue with {request.toolName}.
        </p>
      </div>
      <form className="space-y-3" onSubmit={handleSubmit}>
        {fields.map(([name, field]) => {
          const required = (request.schema.required ?? []).includes(name)
          const label = field.title ?? name
          const value = values[name]

          return (
            <div className="space-y-1" key={name}>
              {field.type === "boolean" ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    checked={value === true}
                    className="size-4 accent-primary"
                    onChange={(event) => {
                      const checked = event.currentTarget.checked
                      setValues((current) => ({
                        ...current,
                        [name]: checked,
                      }))
                    }}
                    type="checkbox"
                  />
                  <span>{label}</span>
                </label>
              ) : field.enum && field.enum.length > 0 ? (
                <>
                  <label className="text-xs font-medium" htmlFor={name}>
                    {label}
                    {required && " *"}
                  </label>
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    id={name}
                    onChange={(event) => {
                      const nextValue = event.currentTarget.value
                      setValues((current) => ({
                        ...current,
                        [name]: nextValue,
                      }))
                    }}
                    required={required}
                    value={String(value ?? "")}
                  >
                    <option value="">Select {label.toLowerCase()}</option>
                    {field.enum.map((option) => (
                      <option key={String(option)} value={String(option)}>
                        {String(option)}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label className="text-xs font-medium" htmlFor={name}>
                    {label}
                    {required && " *"}
                  </label>
                  <Input
                    id={name}
                    onChange={(event) => {
                      const nextValue = event.currentTarget.value
                      setValues((current) => ({
                        ...current,
                        [name]: nextValue,
                      }))
                    }}
                    placeholder={
                      field.description ?? `Enter ${label.toLowerCase()}`
                    }
                    required={required}
                    type={
                      field.type === "number" || field.type === "integer"
                        ? "number"
                        : "text"
                    }
                    value={typeof value === "boolean" ? "" : (value ?? "")}
                  />
                </>
              )}
              {field.description && field.type !== "boolean" && (
                <p className="text-xs text-muted-foreground">
                  {field.description}
                </p>
              )}
            </div>
          )
        })}
        <Button size="sm" type="submit">
          Continue
        </Button>
      </form>
    </div>
  )
}
