const DEFAULT_URL = "https://app.rybbit.io";
const TIMEOUT_MS = 5000;

let _siteId = "";
let _rybbitUrl = DEFAULT_URL;

function _asString(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return Array.isArray(value) ? (value[0] ?? "") : String(value);
}

function _buildTrackUrl(base) {
  return `${base.replace(/\/+$/, "") || DEFAULT_URL}/api/track`;
}

function _sendEvent(trackUrl, siteId, query, fetchFn) {
  const payload = JSON.stringify({
    site_id: siteId,
    type: "custom_event",
    event_name: "search",
    properties: JSON.stringify({ query }),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  fetchFn(trackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    signal: controller.signal,
  })
    .then((res) => {
      if (!res.ok) {
        console.error(`[rybbit-analytics] tracking request failed: HTTP ${res.status} from ${trackUrl}`);
      }
    })
    .catch((err) => {
      console.error(`[rybbit-analytics] tracking request error:`, err?.message ?? err);
    })
    .finally(() => clearTimeout(timer));
}

export const interceptor = {
  name: "Rybbit Analytics",
  description: "Track search events using Rybbit analytics. Supports self-hosted instances.",

  settingsSchema: [
    {
      key: "siteId",
      label: "Site ID",
      type: "text",
      required: true,
      placeholder: "your-site-id",
      description: "Your Rybbit site tracking token / ID.",
    },
    {
      key: "rybbitUrl",
      label: "Rybbit URL",
      type: "url",
      required: false,
      placeholder: DEFAULT_URL,
      description:
        "Base URL of your Rybbit instance. Leave blank to use the hosted service.",
      default: DEFAULT_URL,
    },
  ],

  configure(settings) {
    _siteId = _asString(settings.siteId);
    _rybbitUrl = _asString(settings.rybbitUrl).replace(/\/+$/, "") || DEFAULT_URL;
  },

  async intercept(query, context) {
    if (_siteId) {
      const fetchFn = context?.fetch ?? globalThis.fetch;
      _sendEvent(_buildTrackUrl(_rybbitUrl), _siteId, query, fetchFn);
    }
    return { query };
  },
};
