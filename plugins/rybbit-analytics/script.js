var _rybbitLoaded = false;

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
  script.onload = function () {
    _rybbitLoaded = true;
  };
  document.head.appendChild(script);

  var _origPushState = history.pushState.bind(history);
  history.pushState = function (state, title, url) {
    _origPushState(state, title, url);
    if (_rybbitLoaded && window.rybbit) {
      window.rybbit.trackPageview();
    }
  };

  window.addEventListener("popstate", function () {
    if (_rybbitLoaded && window.rybbit) {
      window.rybbit.trackPageview();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", _init);
} else {
  void _init();
}
