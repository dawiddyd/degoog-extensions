async function _init() {
  var config;
  try {
    var res = await fetch("/api/plugin/" + __PLUGIN_ID__ + "/config");
    if (!res.ok) return;
    config = await res.json();
    if (!config.siteId) return;
  } catch {
    return;
  }

  // Any JS reading document.title (including Rybbit) always sees "degoog".
  try {
    var _origDesc = Object.getOwnPropertyDescriptor(Document.prototype, "title");
    Object.defineProperty(Document.prototype, "title", {
      get: function () { return "degoog"; },
      set: _origDesc && _origDesc.set,
      configurable: true,
      enumerable: _origDesc ? _origDesc.enumerable : true,
    });
  } catch {}

  // Intercept Rybbit's tracking requests and strip query params from any URL
  // fields in the payload before they reach the Rybbit server.
  var _origFetch = window.fetch;
  window.fetch = function (resource, init) {
    var reqUrl = typeof resource === "string" ? resource : (resource && resource.url);
    if (reqUrl && reqUrl.includes("/api/track") && init && init.body) {
      try {
        var payload = JSON.parse(init.body);
        Object.keys(payload).forEach(function (key) {
          if (typeof payload[key] === "string" && payload[key].includes("?")) {
            try {
              var parsed = new URL(payload[key], window.location.origin);
              parsed.search = "";
              payload[key] = parsed.pathname;
            } catch {}
          }
        });
        init = Object.assign({}, init, { body: JSON.stringify(payload) });
      } catch {}
    }
    return _origFetch.call(this, resource, init);
  };

  var script = document.createElement("script");
  script.src = config.rybbitUrl + "/api/script.js";
  script.setAttribute("data-site-id", config.siteId);
  script.setAttribute("data-mask-patterns", JSON.stringify(["/search"]));
  script.defer = true;
  document.head.appendChild(script);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", _init);
} else {
  void _init();
}

