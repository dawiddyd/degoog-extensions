var _config = null;
var _lastSent = null;

function _getURLQuery() {
  return new URLSearchParams(window.location.search).get("q") || "";
}

function _track(query) {
  if (!_config || !_config.siteId || !query) return;
  var q = query.trim();
  if (!q || q === _lastSent) return;
  _lastSent = q;

  fetch(_config.rybbitUrl + "/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      site_id: _config.siteId,
      type: "custom_event",
      event_name: "search",
      properties: JSON.stringify({ query: q }),
    }),
    keepalive: true,
  }).catch(function () {});
}

function _onNav(state) {
  if (state && state.degoog && state.query) {
    _track(state.query);
  } else {
    _track(_getURLQuery());
  }
}

async function _init() {
  try {
    var res = await fetch("/api/plugin/" + __PLUGIN_ID__ + "/config");
    if (!res.ok) return;
    var data = await res.json();
    if (!data.siteId) return;
    _config = data;
  } catch {
    return;
  }

  var _origPushState = history.pushState.bind(history);
  history.pushState = function (state, title, url) {
    _origPushState(state, title, url);
    _onNav(state);
  };

  window.addEventListener("popstate", function (e) {
    _onNav(e.state);
  });

  _onNav(window.history.state);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", _init);
} else {
  void _init();
}
