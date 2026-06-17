var _rybbitReady = false;

function _track(name, props) {
  if (!_rybbitReady || !window.rybbit || typeof window.rybbit.event !== "function") return;
  window.rybbit.event(name, props || {});
}

function _setupTracking() {
  document.addEventListener("click", function (e) {
    var el = e.target instanceof Element ? e.target : null;
    if (!el) return;

    var tab = el.closest(".results-tab");
    if (tab && tab.dataset.type) {
      _track("tab_switch", { tab: tab.dataset.type });
      return;
    }

    var retry = el.closest(".engine-retry-link");
    if (retry && retry.dataset.engine) {
      _track("engine_retry", { engine: retry.dataset.engine });
      return;
    }

    var settingsNav = el.closest(".settings-nav-item");
    if (settingsNav && settingsNav.dataset.tab) {
      _track("settings_tab", { tab: settingsNav.dataset.tab });
      return;
    }

    var timeOpt = el.closest(".tools-option");
    if (timeOpt && timeOpt.dataset.time) {
      _track("time_filter", { filter: timeOpt.dataset.time });
      return;
    }

    if (el.closest(".store-btn-install")) {
      _track("store_install", {});
      return;
    }

    if (el.closest(".store-btn-uninstall")) {
      _track("store_uninstall", {});
      return;
    }

    if (el.closest(".store-btn-update")) {
      _track("store_update", {});
      return;
    }
  }, true);
}

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

  // Intercept Rybbit's tracking requests and strip the querystring field.
  var _origFetch = window.fetch;
  window.fetch = function (resource, init) {
    var reqUrl = typeof resource === "string" ? resource : (resource && resource.url);
    if (reqUrl && reqUrl.includes("/api/track") && init && init.body) {
      try {
        var payload = JSON.parse(init.body);
        payload.querystring = "";
        init = Object.assign({}, init, { body: JSON.stringify(payload) });
      } catch {}
    }
    return _origFetch.call(this, resource, init);
  };

  _setupTracking();

  var script = document.createElement("script");
  script.src = config.rybbitUrl + "/api/script.js";
  script.setAttribute("data-site-id", config.siteId);
  script.setAttribute("data-mask-patterns", JSON.stringify(["/search"]));
  script.onload = function () { _rybbitReady = true; };
  script.defer = true;
  document.head.appendChild(script);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", _init);
} else {
  void _init();
}
