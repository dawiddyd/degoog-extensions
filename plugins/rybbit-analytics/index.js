const DEFAULT_URL = "https://app.rybbit.io";

let _siteId = "";
let _rybbitUrl = DEFAULT_URL;

function _asString(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return Array.isArray(value) ? (value[0] ?? "") : String(value);
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

  async intercept(query) {
    return { query };
  },
};

export const routes = [
  {
    method: "get",
    path: "/config",
    handler() {
      return Response.json({ siteId: _siteId, rybbitUrl: _rybbitUrl });
    },
  },
];
