export interface ComponentExplanation {
  type: "function" | "struct" | "event";
  name: string;
  explanation: string;
}

interface CacheEntry {
  timestamp: number;
  explanations: ComponentExplanation[];
}

interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(code: string): string {
  // Create a simple hash of the code to use as the cache key
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    const char = code.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString();
}

function getFromCache(code: string): ComponentExplanation[] | null {
  try {
    const cacheKey = getCacheKey(code);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();

    // Check if cache has expired
    if (now - entry.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return entry.explanations;
  } catch (error) {
    console.warn("Failed to read from cache:", error);
    return null;
  }
}

function saveToCache(code: string, explanations: ComponentExplanation[]): void {
  try {
    const cacheKey = getCacheKey(code);
    const entry: CacheEntry = {
      timestamp: Date.now(),
      explanations,
    };
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.warn("Failed to save to cache:", error);
  }
}

export async function getContractExplanations(
  code: string,
): Promise<ComponentExplanation[]> {
  // Try to get from cache first
  const cached = getFromCache(code);
  if (cached) {
    console.log("Using cached explanations:", cached);
    return cached;
  }

  // If not in cache, fetch from AI
  try {
    console.log("Fetching new explanations from AI");
    const response = await fetch("/api/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are an expert in Move smart contracts. Your task is to analyze Move code and provide detailed explanations of each component. Return your analysis in the exact JSON format requested.",
          },
          {
            role: "user",
            content: `Analyze this Move smart contract and explain each component by type (functions, structs, events):

\`\`\`move
${code}
\`\`\`

Group and explain the components by their types. For each component provide:

1. For Structs:
   - Purpose and data model
   - Fields and their purposes
   - Any abilities (key, store, drop, etc.)
   - Usage patterns and constraints

2. For Events:
   - Purpose and when it's emitted
   - Fields and what they track
   - Important considerations for indexers/clients

3. For Functions:
   - Purpose and functionality
   - Parameters and their purposes
   - Return values
   - Security considerations
   - Usage examples or constraints

Format your response as a JSON array of objects with this structure:
[{
  "type": "function" | "struct" | "event",
  "name": "name of the component",
  "explanation": "markdown formatted explanation"
}]

Make the explanations clear and comprehensive, using markdown for formatting.
Include code examples or parameter details where relevant.`,
          },
        ],
        model: "gpt-4",
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI request failed:", response.status, errorText);
      throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
    }

    const result = (await response.json()) as OpenAIResponse;
    console.log("Raw OpenAI response:", result);

    if (!result.choices?.[0]?.message?.content) {
      console.error("Unexpected OpenAI response format:", result);
      throw new Error("Invalid response format from OpenAI");
    }

    try {
      const content = result.choices[0].message.content;
      console.log("Parsing content:", content);
      const explanations = JSON.parse(content);
      if (!Array.isArray(explanations)) {
        throw new Error("Explanations must be an array");
      }

      // Validate each explanation object
      explanations.forEach((exp, index) => {
        if (!exp.type || !exp.name || !exp.explanation) {
          console.error("Invalid explanation object at index", index, exp);
          throw new Error(`Invalid explanation object at index ${index}`);
        }
        if (!["function", "struct", "event"].includes(exp.type)) {
          console.error("Invalid type in explanation object", exp);
          throw new Error(`Invalid type "${exp.type}" in explanation object`);
        }
      });

      console.log("Parsed explanations:", explanations);

      // Save to cache before returning
      saveToCache(code, explanations);

      return explanations;
    } catch (parseError) {
      console.error(
        "Failed to parse OpenAI response:",
        result.choices[0].message.content,
      );
      console.error("Parse error:", parseError);
      throw new Error("Invalid JSON in OpenAI response");
    }
  } catch (error) {
    console.error("Failed to get contract explanations:", error);
    throw error;
  }
}
