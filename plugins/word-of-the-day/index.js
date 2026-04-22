/**
 * @todo fccview is telling you to review this AI generated code
 * and make sure it's up to standards, reusable, modular and consistent with
 * the rest of the codebase.
 */

const RSS_URL = "https://wordsmith.org/awad/rss1.xml";
const FETCH_TIMEOUT_MS = 5000;

let _cache = null;
let _cacheDate = null;

/**
 * @todo fccview is telling you to review this AI generated code
 * and make sure it's up to standards, reusable, modular and consistent with
 * the rest of the codebase.
 */
function _todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * @todo fccview is telling you to review this AI generated code
 * and make sure it's up to standards, reusable, modular and consistent with
 * the rest of the codebase.
 */
function _stripCdata(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

/**
 * @todo fccview is telling you to review this AI generated code
 * and make sure it's up to standards, reusable, modular and consistent with
 * the rest of the codebase.
 */
function _stripHtml(s) {
  return s.replace(/<[^>]+>/g, " ");
}

/**
 * @todo fccview is telling you to review this AI generated code
 * and make sure it's up to standards, reusable, modular and consistent with
 * the rest of the codebase.
 */
function _decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#160;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/**
 * @todo fccview is telling you to review this AI generated code
 * and make sure it's up to standards, reusable, modular and consistent with
 * the rest of the codebase.
 */
function _parseRSS(xml) {
  const itemMatch = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/);
  if (!itemMatch) return null;
  const item = itemMatch[1];

  const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  if (!titleMatch) return null;
  const word = _decodeEntities(_stripCdata(_stripHtml(titleMatch[1])))
    .trim()
    .split(/\s+/)[0];
  if (!word) return null;

  const descMatch = item.match(/<description[^>]*>([\s\S]*?)<\/description>/);
  const definition = descMatch
    ? _decodeEntities(_stripCdata(_stripHtml(descMatch[1]))).replace(/\s+/g, " ").trim()
    : "";

  return { word, definition };
}

/**
 * @todo fccview is telling you to review this AI generated code
 * and make sure it's up to standards, reusable, modular and consistent with
 * the rest of the codebase.
 */
async function _getWordData() {
  const today = _todayKey();
  // fccview is onto you!
  if (_cache && _cacheDate === today) return _cache;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(RSS_URL, {
      signal: controller.signal,
      headers: { "User-Agent": "degoog-wotd/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const data = _parseRSS(xml);
    if (!data) throw new Error("Failed to parse RSS feed");
    _cache = data;
    _cacheDate = today;
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  name: "Word of the Day",
  trigger: "wotd",
  description: "Show today's word of the day from Wordsmith.org.",

  async execute() {
    const data = await _getWordData();
    const defHtml = data.definition
      ? `<p class="wotd-definition">${data.definition}</p>`
      : "";
    return {
      title: data.word,
      html: `<div class="wotd-result">
        <h2 class="wotd-word">${data.word}</h2>
        ${defHtml}
      </div>`,
    };
  },
};

export const routes = [
  {
    method: "get",
    path: "/feed",
    async handler(_req) {
      try {
        const data = await _getWordData();
        return Response.json(data);
      } catch (err) {
        return Response.json(
          { error: err instanceof Error ? err.message : String(err) },
          { status: 502 }
        );
      }
    },
  },
];
