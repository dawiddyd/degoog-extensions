const _FEED_URL = "/api/plugin/word-of-the-day/feed";
const _LOGO_CLASSES = [
  "logo-d", "logo-e", "logo-g1",
  "logo-o1", "logo-o2", "logo-g2",
];

function _buildLogo(word, definition) {
  var wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;align-items:center";

  var h1 = document.createElement("h1");
  h1.className = "logo";
  word.split("").forEach(function (char, i) {
    var span = document.createElement("span");
    
    span.className = _LOGO_CLASSES[i % _LOGO_CLASSES.length];
    span.textContent = char;
    h1.appendChild(span);
  });
  wrap.appendChild(h1);

  if (definition) {
    var hint = document.createElement("p");
    hint.style.cssText = [
      "color:var(--text-secondary)",
      "font-size:0.8rem",
      "margin:0.35rem 0 0 0",
      "text-align:center",
      "letter-spacing:normal",
      "font-weight:normal",
      "font-family:inherit",
      "max-width:480px",
    ].join(";");
    hint.textContent = definition;
    wrap.appendChild(hint);
  }

  return wrap;
}

var _CACHE_KEY = "wotd-cache";

function _todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function _readCache() {
  try {
    var raw = localStorage.getItem(_CACHE_KEY);
    if (!raw) return null;
    var entry = JSON.parse(raw);
    
    if (entry && entry.date === _todayKey()) return entry.data;
  } catch {}
  return null;
}

function _writeCache(data) {
  try {
    localStorage.setItem(_CACHE_KEY, JSON.stringify({ date: _todayKey(), data: data }));
  } catch {}
}

async function _applyWotd(container) {
  try {
    var data = _readCache();
    if (!data) {
      var res = await fetch(_FEED_URL);
      if (!res.ok) return;
      data = await res.json();
      if (!data || !data.word) return;
      _writeCache(data);
    }
    container.innerHTML = "";
    container.appendChild(_buildLogo(data.word, data.definition));
  } catch {
    // leave the existing degoog logo unchanged on any failure
  }
}

function _tryMount() {
  var container = document.getElementById("home-logo");
  if (container && container.querySelector(".logo")) {
    _applyWotd(container);
    return true;
  }
  return false;
}

function _init() {
  if (_tryMount()) return;

  var observer = new MutationObserver(function () {
    if (_tryMount()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", _init);
} else {
  _init();
}
