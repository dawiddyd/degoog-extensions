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

function markdownToHtml(markdown) {
  if (!markdown) return "";
  
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<em><strong>$1</strong></em>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/___(.*?)___/g, '<em><strong>$1</strong></em>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  html = html.replace(/```([\s\S]*?)```/g, function(match, code) {
    return '<pre><code>' + code.trim() + '</code></pre>';
  });
  
  html = html.replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(\u003cli>.*\u003c\/li>\n?)+/g, '<ul>$1</ul>');
  
  html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(\u003cli>.*\u003c\/li>\n?)+/gs, function(match) {
    if (match.includes('<ul>')) return match;
    return '<ol>' + match + '</ol>';
  });
  
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  
  html = html.replace(/\[([0-9]+)\]/g, '<span class="ai-citation" data-index="$1">[$1]</span>');
  
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

async function fetchAIResponse(query, contextResults) {
  if (!apiKey) return null;

  const contextText = contextResults
    .slice(0, 5)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet || r.description || ""}`)
    .join("\n\n");

  const systemPrompt = `You are a helpful AI assistant integrated into a search engine. Your task is to provide comprehensive, accurate answers based on the search context provided. Always cite your sources using [1], [2], etc. Use markdown formatting (bold, lists, code blocks) where appropriate. Be concise but thorough. If you're uncertain about something, say so.`;

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
    console.error("AI Chat error:", err);
    return null;
  }
}

export const slot = {
  id: "ai-chat",
  name: "AI Chat",
  position: "above-results",
  description: "AI-powered chat interface for search results using OpenAI.",

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
      type: "text",
      placeholder: "gpt-4o-mini",
      description: "Select the OpenAI model to use for AI responses (gpt-4o-mini, gpt-4o, gpt-3.5-turbo).",
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
        title: "AI Chat",
        html: render({
          content: markdownToHtml("Hello! I'm your AI assistant. Please configure your OpenAI API key in Settings to start chatting."),
          searchQuery: esc(query),
          apiKey: "",
          model: model,
          sources: "",
          sourcesDisplay: "display: none;",
        }),
      };
    }

    searchResults = context?.results || [];
    const aiResponse = await fetchAIResponse(query, searchResults);

    if (!aiResponse) {
      return {
        title: "AI Chat",
        html: render({
          content: markdownToHtml("Sorry, I couldn't generate a response. Please check your API key and try again."),
          searchQuery: esc(query),
          apiKey: apiKey ? "__SET__" : "",
          model: model,
          sources: "",
          sourcesDisplay: "display: none;",
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

    const formattedResponse = markdownToHtml(aiResponse);
    const hasSources = sourcesHtml.length > 0;

    return {
      title: "AI Chat",
      html: render({
        content: formattedResponse,
        searchQuery: esc(query),
        apiKey: "__SET__",
        model: model,
        sources: sourcesHtml,
        sourcesDisplay: hasSources ? "" : "display: none;",
      }),
    };
  },
};

export default { slot };
