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

  // Override document.title so any script reading it (including Rybbit) always
  // sees "degoog" instead of the search query. The original setter is preserved
  // so the browser tab still updates normally.
  try {
    var _origDesc = Object.getOwnPropertyDescriptor(Document.prototype, "title");
    Object.defineProperty(Document.prototype, "title", {
      get: function () { return "degoog"; },
      set: _origDesc && _origDesc.set,
      configurable: true,
      enumerable: _origDesc ? _origDesc.enumerable : true,
    });
  } catch {}

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
