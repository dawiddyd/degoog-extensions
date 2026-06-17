var _rybbitReady = false;

var _INTERACTIVE = [
  "button",
  "a",
  '[role="button"]',
  'input[type="submit"]',
  'input[type="button"]',
  'label[for]',
  'select',
  '.results-tab',
  '.settings-nav-item',
  '.tools-option',
  '.tools-menu-item',
  '.store-btn-install',
  '.store-btn-uninstall',
  '.store-btn-update',
  '.store-btn-delete',
  '.store-btn-add',
  '.store-btn-refresh',
  '.engine-retry-link',
  '.ext-card-toggle',
  '.degoog-tab',
].join(", ");

function _track(name, props) {
  if (!_rybbitReady || !window.rybbit || typeof window.rybbit.event !== "function") return;
  window.rybbit.event(name, props || {});
}

function _setupTracking() {
  document.addEventListener("click", function (e) {
    var el = e.target instanceof Element ? e.target : null;
    if (!el) return;

    var hit = el.closest(_INTERACTIVE);
    if (!hit) return;

    var label = (
      hit.getAttribute("aria-label") ||
      hit.getAttribute("title") ||
      (hit.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60)
    ) || hit.tagName.toLowerCase();

    var props = { label: label };
    if (hit.dataset.type)   props.type   = hit.dataset.type;
    if (hit.dataset.tab)    props.tab    = hit.dataset.tab;
    if (hit.dataset.engine) props.engine = hit.dataset.engine;
    if (hit.dataset.time)   props.time   = hit.dataset.time;
    if (hit.dataset.menu)   props.menu   = hit.dataset.menu;

    _track("click", props);
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
