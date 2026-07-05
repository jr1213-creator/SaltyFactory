import { describe, expect, it, vi } from "vitest";
import { DisabledModelRuntimeProvider, HttpModelRuntimeProvider } from "@saltyfactory/ai-free";

const textInput = {
  prompt: "Draft listing copy.",
  taskType: "draft_product_listing",
  riskLevel: "low" as const,
  inputSensitivity: "internal" as const,
  modelKey: "qwen3:8b",
  timeoutMs: 1000
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Ollama model runtime", () => {
  it("sends POST /api/chat with model, messages, tools, and stream false", async () => {
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/api/tags")) return jsonResponse({ models: [] });
      expect(url).toBe("http://127.0.0.1:11434/api/chat");
      const body = JSON.parse(String(init?.body));
      expect(init?.method).toBe("POST");
      expect(body.model).toBe("qwen3:8b");
      expect(body.stream).toBe(false);
      expect(body.think).toBe(false);
      expect(body.messages[0]).toMatchObject({ role: "user", content: "Draft listing copy." });
      expect(body.tools[0].function.name).toBe("get_product_draft_summary");
      return jsonResponse({ model: "qwen3:8b", message: { role: "assistant", content: "Done." }, prompt_eval_count: 10, eval_count: 4 });
    }) as unknown as typeof fetch;
    const provider = new HttpModelRuntimeProvider("ollama", "http://127.0.0.1:11434", fetcher);
    const result = await provider.generateText({
      ...textInput,
      tools: [{ type: "function", function: { name: "get_product_draft_summary", description: "Read draft.", parameters: { type: "object" } } }]
    });
    expect(result.ok).toBe(true);
    expect(result.text).toBe("Done.");
    expect(result.providerUsed).toBe("ollama");
    expect(result.modelUsed).toBe("qwen3:8b");
    expect(result.usage?.totalTokens).toBe(14);
  });

  it("parses tool calls from Ollama responses", async () => {
    const fetcher = vi.fn(async (url: string) => String(url).endsWith("/api/tags")
      ? jsonResponse({ models: [] })
      : jsonResponse({
        model: "qwen3:8b",
        message: {
          role: "assistant",
          content: "",
          tool_calls: [{ id: "call_1", function: { name: "get_product_draft_summary", arguments: { productDraftId: "draft_1" } } }]
        }
      })) as unknown as typeof fetch;
    const result = await new HttpModelRuntimeProvider("ollama", "http://127.0.0.1:11434", fetcher).generateText(textInput);
    expect(result.ok).toBe(true);
    expect(result.toolCalls?.[0]).toMatchObject({ id: "call_1", name: "get_product_draft_summary", arguments: { productDraftId: "draft_1" } });
  });

  it("fails safely when tool call arguments are malformed JSON", async () => {
    const fetcher = vi.fn(async (url: string) => String(url).endsWith("/api/tags")
      ? jsonResponse({ models: [] })
      : jsonResponse({
        model: "qwen3:8b",
        message: {
          role: "assistant",
          content: "",
          tool_calls: [{ function: { name: "get_product_draft_summary", arguments: "{not-json" } }]
        }
      })) as unknown as typeof fetch;
    const result = await new HttpModelRuntimeProvider("ollama", "http://127.0.0.1:11434", fetcher).generateText(textInput);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("ollama_tool_call_parse_failed");
  });

  it("returns ollama_http_error for non-2xx generation responses", async () => {
    const fetcher = vi.fn(async (url: string) => String(url).endsWith("/api/tags") ? jsonResponse({ models: [] }) : jsonResponse({ error: "nope" }, 500)) as unknown as typeof fetch;
    const result = await new HttpModelRuntimeProvider("ollama", "http://127.0.0.1:11434", fetcher).generateText(textInput);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("ollama_http_error");
    expect(result.error?.retryable).toBe(true);
  });

  it("returns ollama_invalid_response for malformed payloads", async () => {
    const fetcher = vi.fn(async (url: string) => String(url).endsWith("/api/tags") ? jsonResponse({ models: [] }) : jsonResponse({ nope: true })) as unknown as typeof fetch;
    const result = await new HttpModelRuntimeProvider("ollama", "http://127.0.0.1:11434", fetcher).generateText(textInput);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("ollama_invalid_response");
  });

  it("returns ollama_unavailable for network failures", async () => {
    const fetcher = vi.fn(async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch;
    const result = await new HttpModelRuntimeProvider("ollama", "http://127.0.0.1:11434", fetcher).generateText(textInput);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe("ollama_unavailable");
    expect(JSON.stringify(result)).not.toMatch(/token|secret|authorization/i);
  });

  it("keeps disabled runtime fail-closed", async () => {
    const result = await new DisabledModelRuntimeProvider("disabled").generateText(textInput);
    expect(result.ok).toBe(false);
    expect(result.providerUsed).toBe("disabled");
    expect(result.error?.code).toBe("disabled");
  });
});
