(function installActionListen() {
  var w = window;
  if (w.__pagesnapActInit) return;
  w.__pagesnapActInit = true;
  w.__pagesnapActions = w.__pagesnapActions || [];
  var lastNav = location.href;
  var lastKind = "";
  var lastAt = 0;
  var fillTimer = null;
  var pendingFill = null;
  var opts = w.__pagesnapListenOpts || {};
  var redactPw = opts.redactPasswords !== false;
  var redactEm = opts.redactEmails !== false;
  function fromTool(el) {
    try {
      if (!el || !el.closest) return false;
      if (el.getAttribute && el.getAttribute("data-snapshot-tool")) return true;
      return !!el.closest("[data-snapshot-tool]");
    } catch (e) { return false; }
  }
  function emit(rec) {
    if (!rec) return;
    lastKind = rec.kind;
    lastAt = Date.now();
    if (typeof w.__pagesnapBridgeAction === "function") {
      try { w.__pagesnapBridgeAction(rec); return; } catch (e) {}
    }
    w.__pagesnapActions.push(rec);
  }
  function flushFill() {
    if (fillTimer) { clearTimeout(fillTimer); fillTimer = null; }
    if (pendingFill) { emit(pendingFill); pendingFill = null; }
  }
  function scopeOf(el) {
    try {
      var root = el.getRootNode && el.getRootNode();
      if (root && root.querySelectorAll && root !== el.ownerDocument) return root;
    } catch (e) {}
    return el.ownerDocument;
  }
  function isUnique(el, by, value, name) {
    var scope = scopeOf(el);
    var found = [];
    try {
      if (by === "id") found = scope.querySelectorAll("[id=\"" + value + "\"]");
      else if (by === "name") found = scope.querySelectorAll("[name=\"" + value + "\"]");
      else if (by === "testid") {
        var attrs = ["data-testid","data-test","data-test-id","data-cy","data-qa"];
        for (var i = 0; i < attrs.length; i++) {
          found = scope.querySelectorAll("[" + attrs[i] + "=\"" + value + "\"]");
          if (found.length) break;
        }
      } else if (by === "placeholder") found = scope.querySelectorAll("[placeholder=\"" + value + "\"]");
      else if (by === "css") found = scope.querySelectorAll(value);
      else if (by === "label") {
        var labs = scope.querySelectorAll("label");
        for (var j = 0; j < labs.length; j++) {
          var t = (labs[j].innerText || "").replace(/\s+/g, " ").trim();
          if (t === value && labs[j].control) found.push(labs[j].control);
        }
      } else if (by === "role") {
        return true;
      } else if (by === "linkText") {
        var as = scope.querySelectorAll("a");
        for (var k = 0; k < as.length; k++) {
          var nt = (as[k].innerText || "").replace(/\s+/g, " ").trim();
          if (nt === value) found.push(as[k]);
        }
      }
    } catch (e) { return false; }
    if (by === "role") return true;
    return found.length === 1 && found[0] === el;
  }
  function implicitRole(el) {
    var tag = el.tagName && el.tagName.toLowerCase();
    var type = (el.getAttribute && (el.getAttribute("type") || "") || "").toLowerCase();
    if (tag === "a" && el.hasAttribute("href")) return "link";
    if (tag === "button") return "button";
    if (tag === "input") {
      if (type === "checkbox") return "checkbox";
      if (type === "radio") return "radio";
      if (type === "submit" || type === "button" || type === "reset") return "button";
      return "textbox";
    }
    if (tag === "select") return "combobox";
    if (tag === "textarea") return "textbox";
    return el.getAttribute && el.getAttribute("role");
  }
  function accessibleName(el) {
    var aria = el.getAttribute && el.getAttribute("aria-label");
    if (aria && aria.trim()) return aria.trim();
    if (el.labels && el.labels.length) {
      var lt = Array.from(el.labels).map(function(l){ return (l.innerText || "").replace(/\s+/g," ").trim(); }).filter(Boolean).join(" ");
      if (lt) return lt;
    }
    var txt = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    if (txt && txt.length < 80) return txt;
    return "";
  }
  function pick(el) {
    if (!el || el.nodeType !== 1) return {};
    var testId = el.getAttribute("data-testid") || el.getAttribute("data-test") || el.getAttribute("data-test-id") || el.getAttribute("data-cy") || el.getAttribute("data-qa");
    if (testId && isUnique(el, "testid", testId)) return { by: "testid", value: testId };
    var id = el.getAttribute("id");
    if (id && !/^[0-9]/.test(id) && isUnique(el, "id", id)) return { by: "id", value: id };
    var name = el.getAttribute("name");
    if (name && isUnique(el, "name", name)) return { by: "name", value: name };
    var role = el.getAttribute("role") || implicitRole(el);
    var aname = accessibleName(el);
    if (role && aname && aname.length < 60) return { by: "role", value: role, name: aname };
    if (el.labels && el.labels.length) {
      var lt = Array.from(el.labels).map(function(l){ return (l.innerText || "").replace(/\s+/g," ").trim(); }).filter(Boolean).join(" ");
      if (lt && isUnique(el, "label", lt)) return { by: "label", value: lt };
    }
    var ph = el.getAttribute && el.getAttribute("placeholder");
    if (ph && ph.trim() && isUnique(el, "placeholder", ph.trim())) return { by: "placeholder", value: ph.trim() };
    if (el.tagName === "A") {
      var linkName = accessibleName(el);
      if (linkName) return { by: "linkText", value: linkName };
    }
    if (id) return { by: "css", value: "#" + id, stability: "low" };
    return {};
  }
  function redactText(s, isPw) {
    if (isPw && redactPw) return "***";
    var t = s == null ? "" : String(s);
    if (t.length > 80) t = t.slice(0, 80) + "...[truncated]";
    if (redactEm) t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "***@***.***");
    return t;
  }
  function locRec(el, extra) {
    var loc = pick(el);
    var rec = extra || {};
    rec.by = loc.by;
    rec.value = loc.value;
    if (loc.name) rec.name = loc.name;
    return rec;
  }
  function scheduleFill(el) {
    var isPw = ((el.getAttribute("type") || "").toLowerCase() === "password");
    pendingFill = locRec(el, { kind: "fill", text: redactText(el.value, isPw), password: isPw });
    if (fillTimer) clearTimeout(fillTimer);
    fillTimer = setTimeout(function() { flushFill(); }, 400);
  }
  document.addEventListener("click", function(e) {
    if (fromTool(e.target)) return;
    flushFill();
    var el = e.target;
    try { if (el && el.closest) el = el.closest("button, a, input, select, textarea, [role=button], [role=tab], [role=menuitem], [role=checkbox], [role=switch]") || el; } catch (err) {}
    if (!el || el.nodeType !== 1) return;
    var tag = el.tagName;
    var type = (el.getAttribute("type") || "").toLowerCase();
    if (tag === "INPUT" && (type === "checkbox" || type === "radio")) return;
    if (tag === "SELECT" || tag === "TEXTAREA") return;
    if (tag === "INPUT" && type !== "submit" && type !== "button" && type !== "reset" && type !== "image") return;
    emit(locRec(el, { kind: "click" }));
  }, true);
  document.addEventListener("change", function(e) {
    if (fromTool(e.target)) return;
    var el = e.target;
    if (!el || el.nodeType !== 1) return;
    var tag = el.tagName;
    var type = (el.getAttribute("type") || "").toLowerCase();
    if (tag === "SELECT") {
      flushFill();
      var opt = el.options && el.options[el.selectedIndex];
      var text = opt ? (opt.text || opt.value || "") : (el.value || "");
      emit(locRec(el, { kind: "select", text: redactText(text, false) }));
      return;
    }
    if (tag === "INPUT" && (type === "checkbox" || type === "radio")) {
      flushFill();
      emit(locRec(el, { kind: el.checked ? "check" : "uncheck" }));
      return;
    }
  }, true);
  document.addEventListener("input", function(e) {
    if (fromTool(e.target)) return;
    var el = e.target;
    if (!el || el.nodeType !== 1) return;
    var tag = el.tagName;
    var type = (el.getAttribute("type") || "").toLowerCase();
    if (tag === "TEXTAREA" || (tag === "INPUT" && type !== "checkbox" && type !== "radio" && type !== "submit" && type !== "button" && type !== "reset")) {
      scheduleFill(el);
    }
  }, true);
  document.addEventListener("submit", function(e) {
    if (fromTool(e.target)) return;
    flushFill();
    if (lastKind === "click" && Date.now() - lastAt < 200) return;
    var el = e.submitter || e.target;
    emit(locRec(el, { kind: "submit" }));
  }, true);
  function emitNav() {
    var url = location.href;
    if (url === lastNav) return;
    lastNav = url;
    flushFill();
    emit({ kind: "nav", url: url });
  }
  try {
    var _push = history.pushState;
    history.pushState = function() {
      var ret = _push.apply(this, arguments);
      emitNav();
      return ret;
    };
    var _rep = history.replaceState;
    history.replaceState = function() {
      var ret = _rep.apply(this, arguments);
      emitNav();
      return ret;
    };
  } catch (e) {}
  window.addEventListener("popstate", emitNav);
  window.addEventListener("hashchange", emitNav);
})();
