import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const RSS_URL = "https://wordsmith.org/awad/rss1.xml";
const FETCH_TIMEOUT_MS = 5000;
const CACHE_FILENAME = "wotd-cache.json";

let _cache = null;
let _cacheDate = null;
let _pluginDir = null;

function _todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function _stripCdata(s) {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function _stripHtml(s) {
  return s.replace(/<[^>]+>/g, " ");
}

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

async function _readFileCache() {
  if (!_pluginDir) return null;
  try {
    const raw = await readFile(join(_pluginDir, CACHE_FILENAME), "utf-8");
    const entry = JSON.parse(raw);
    if (entry?.date === _todayKey()) return entry.data;
  } catch {}
  return null;
}

async function _writeFileCache(data) {
  if (!_pluginDir) return;
  try {
    await writeFile(
      join(_pluginDir, CACHE_FILENAME),
      JSON.stringify({ date: _todayKey(), data }),
      "utf-8"
    );
  } catch {}
}

async function _getWordData() {
  const today = _todayKey();
  if (_cache && _cacheDate === today) return _cache;

  const fileData = await _readFileCache();
  if (fileData) {
    _cache = fileData;
    _cacheDate = today;
    return fileData;
  }

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
    await _writeFileCache(data);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  name: "Word of the Day",
  trigger: "wotd",
  description: "Show today's word of the day from Wordsmith.org.",

  init(ctx) {
    _pluginDir = ctx.dir;
  },

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
