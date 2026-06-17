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

  var script = document.createElement("script");
  script.src = config.rybbitUrl + "/api/script.js";
  script.setAttribute("data-site-id", config.siteId);
  script.defer = true;
  document.head.appendChild(script);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", _init);
} else {
  void _init();
}
