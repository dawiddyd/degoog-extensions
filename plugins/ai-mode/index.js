let apiKey = "";
let model = "gpt-4o-mini";
let template = "";
let searchResults = [];

function esc(s) {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function render(data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? "");
}

async function fetchAIResponse(query, contextResults) {
  if (!apiKey) return null;

  const contextText = contextResults
    .slice(0, 5)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet || r.description || ""}`)
    .join("\n\n");

  const systemPrompt = `You are a helpful AI assistant integrated into a search engine. Your task is to provide comprehensive, accurate answers based on the search context provided. Always cite your sources using [1], [2], etc. Be concise but thorough. If you're uncertain about something, say so.`;

  const userPrompt = `Search query: "${query}"

Search results context:
${contextText || "No search results available."}

Please provide a comprehensive overview of this topic based on the search results. Include key facts, different perspectives if relevant, and cite your sources.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || null;
  } catch (err) {
    console.error("AI Mode error:", err);
    return null;
  }
}

function formatAIResponse(content, results) {
  if (!content) return "";
  
  // Convert newlines to HTML
  let formatted = esc(content).replace(/\n/g, "<br>");
  formatted = formatted.replace(/\[([0-9]+)\]/g, '<span class="ai-citation" data-index="$1">[$1]</span>');
  
  return formatted;
}

export const tab = {
  id: "ai-mode",
  name: "AI Mode",
  position: "tab",
  description: "AI-powered overview of search results using OpenAI.",

  settingsSchema: [
    {
      key: "apiKey",
      label: "OpenAI API Key",
      type: "password",
      required: true,
      secret: true,
      placeholder: "sk-...",
      description: "Your OpenAI API key. Get one at https://platform.openai.com/api-keys",
    },
    {
      key: "model",
      label: "Model",
      type: "select",
      options: [
        { value: "gpt-4o-mini", label: "GPT-4o Mini (Recommended)" },
        { value: "gpt-4o", label: "GPT-4o" },
        { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
      ],
      default: "gpt-4o-mini",
      description: "Select the OpenAI model to use for AI responses.",
    },
  ],

  init(ctx) {
    template = ctx.template;
  },

  configure(settings) {
    const rawKey = (settings && settings.apiKey) || "";
    apiKey = typeof rawKey === "string" ? rawKey.trim() : "";
    model = settings.model || "gpt-4o-mini";
  },

  trigger(query) {
    const q = query.trim();
    return q.length >= 2 && q.length <= 200;
  },

  async execute(query, context) {
    if (!apiKey) {
      return {
        title: "AI Mode",
        html: render({
          content: `
            <div class="ai-error">
              <div class="ai-error-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <h3 class="ai-error-title">API Key Required</h3>
              <p class="ai-error-message">Please configure your OpenAI API key in Settings to use AI Mode.</p>
              <a href="/settings" class="ai-error-link">Go to Settings</a>
            </div>
          `,
          searchQuery: esc(query),
          sources: "",
        }),
      };
    }

    // Get search results from context if available
    searchResults = context?.results || [];
    const aiResponse = await fetchAIResponse(query, searchResults);

    if (!aiResponse) {
      return {
        title: "AI Mode",
        html: render({
          content: `
            <div class="ai-error">
              <div class="ai-error-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <h3 class="ai-error-title">Unable to Generate Response</h3>
              <p class="ai-error-message">There was an error generating the AI response. Please check your API key and try again.</p>
            </div>
          `,
          searchQuery: esc(query),
          sources: "",
        }),
      };
    }

    const sourcesHtml = searchResults
      .slice(0, 5)
      .map((r, i) => `
        <a href="${esc(r.url || r.link || "#")}" target="_blank" rel="noopener" class="ai-source-link" data-index="${i + 1}">
          <span class="ai-source-number">${i + 1}</span>
          <span class="ai-source-title">${esc(r.title)}</span>
          <span class="ai-source-url">${esc((r.url || r.link || "").replace(/^https?:\/\//, "").substring(0, 50))}</span>
        </a>
      `)
      .join("");

    const formattedResponse = formatAIResponse(aiResponse, searchResults);

    return {
      title: "AI Overview",
      html: render({
        content: formattedResponse,
        searchQuery: esc(query),
        sources: sourcesHtml,
      }),
    };
  },
};

export default { tab };
