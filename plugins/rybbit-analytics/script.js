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

  // Any JS reading document.title (including Rybbit) will always see "degoog",
  // while direct writes still update the <title> element so the browser tab is unaffected.
  var _titleEl = document.querySelector("title");
  var _origTextContent = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
  Object.defineProperty(document, "title", {
    get: function () { return "degoog"; },
    set: function (val) {
      if (_titleEl && _origTextContent && _origTextContent.set) {
        _origTextContent.set.call(_titleEl, val);
      }
    },
    configurable: true,
  });

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
