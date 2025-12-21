import getConfig from "../config";

interface OpenRouterResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenRouterMessage {
  role: string;
  content: string;
}

export class OpenRouterService {
  private async callAPI(messages: OpenRouterMessage[], model: string, stream: boolean = false, temperature: number = 0.7) {
    const config = getConfig;
    const response = await fetch(`${config.openrouter.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.openrouter.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
        temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    return response;
  }

  async generateResponse(messages: OpenRouterMessage[], model?: string, temperature: number = 0.7): Promise<OpenRouterResponse> {
    const config = getConfig;
    const finalModel = model || config.openrouter.defaultModel;
    const response = await this.callAPI(messages, finalModel, false, temperature);
    const data = await response.json() as OpenRouterResponse;
    return data;
  }

  async *generateStream(messages: OpenRouterMessage[], model?: string, temperature: number = 0.7) {
    const config = getConfig;
    const finalModel = model || config.openrouter.defaultModel;
    const response = await this.callAPI(messages, finalModel, true, temperature);

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              return usage;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.usage) {
                usage = parsed.usage;
              }
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                yield delta;
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    return usage;
  }
}

export const openrouterService = new OpenRouterService();