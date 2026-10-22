// PageSnap action recorder (runs in the page; installed with addInitScript).
// Reports click / fill / select / check / Enter to window.__psRecord with a
// locator descriptor, so `pack verify` can replay the flow between captures.
// Password values are never sent: they are replaced by a {{secret:...}} placeholder.
(() => {
  if (window.__psRecorderInstalled) return;
  window.__psRecorderInstalled = true;

  const send = (a) => {
    try { if (typeof window.__psRecord === 'function') window.__psRecord(a); } catch (e) { /* binding gone */ }
  };
  const TESTID_ATTRS = ['data-testid', 'data-test', 'data-test-id', 'data-cy', 'data-qa'];
  const isTool = (el) => !!(el && el.closest && el.closest('[data-snapshot-tool]'));
  const txt = (s) => (s || '').replace(/\s+/g, ' ').trim();

  const implicitRole = (el) => {
    const tag = el.tagName;
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (tag === 'BUTTON') return 'button';
    if (tag === 'A' && el.hasAttribute('href')) return 'link';
    if (tag === 'SELECT') return el.multiple || el.size > 1 ? 'listbox' : 'combobox';
    if (tag === 'TEXTAREA') return 'textbox';
    if (tag === 'INPUT') {
      if (/^(submit|button|reset|image)$/.test(type)) return 'button';
      if (type === 'checkbox') return 'checkbox';
      if (type === 'radio') return 'radio';
      if (type === 'number') return 'spinbutton';
      if (type === 'search') return 'searchbox';
      if (type === 'range') return 'slider';
      return 'textbox';
    }
    return '';
  };

  const accName = (el) => {
    const aria = el.getAttribute('aria-label');
    if (aria && aria.trim()) return txt(aria);
    const by = el.getAttribute('aria-labelledby');
    if (by) {
      const t = by.split(/\s+/).map((id) => document.getElementById(id)).filter(Boolean).map((n) => txt(n.textContent)).join(' ');
      if (t) return t;
    }
    if (el.labels && el.labels.length) return txt(Array.from(el.labels).map((l) => l.innerText || l.textContent).join(' '));
    if (el.tagName === 'INPUT' && /^(submit|button|reset)$/i.test(el.type)) return txt(el.value);
    if (el.getAttribute('placeholder')) return txt(el.getAttribute('placeholder'));
    if (/^(BUTTON|A)$/.test(el.tagName) || el.getAttribute('role')) return txt(el.innerText || el.textContent).slice(0, 80);
    return '';
  };

  const cssPath = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body && parts.length < 6) {
      if (node.id && /^[A-Za-z_][\w-]*$/.test(node.id)) { parts.unshift('#' + node.id); break; }
      const parent = node.parentElement;
      if (!parent) break;
      const idx = Array.from(parent.children).indexOf(node) + 1;
      parts.unshift(node.tagName.toLowerCase() + ':nth-child(' + idx + ')');
      node = parent;
    }
    return parts.join(' > ');
  };

  // The element the user meant: the nearest actionable ancestor of the event target.
  const ACTIONABLE = 'a,button,input,select,textarea,label,summary,[role=button],[role=link],[role=tab],[role=menuitem],[role=option],[role=checkbox],[role=radio],[role=switch],[onclick],' +
    TESTID_ATTRS.map((a) => '[' + a + ']').join(',');
  const target = (ev) => {
    const path = ev.composedPath ? ev.composedPath() : [ev.target];
    for (const n of path) {
      if (n && n.nodeType === 1 && n.matches && n.matches(ACTIONABLE)) return n;
    }
    return ev.target && ev.target.nodeType === 1 ? ev.target : null;
  };

  const describe = (el) => {
    const d = { tag: el.tagName.toLowerCase() };
    for (const a of TESTID_ATTRS) {
      const v = el.getAttribute(a);
      if (v) { d.testid = v; d.testidAttr = a; break; }
    }
    if (el.id) d.id = el.id;
    if (el.getAttribute('name')) d.name = el.getAttribute('name');
    const role = el.getAttribute('role') || implicitRole(el);
    if (role) d.role = role;
    const n = accName(el);
    if (n) d.accName = n;
    if (el.type) d.type = String(el.type).toLowerCase();
    d.css = cssPath(el);
    return d;
  };

  const secretKey = (el) => el.getAttribute('name') || el.id || 'password';
  // FNV-1a: lets the recorder tell "the real password" from "a wrong one on purpose"
  // without the value ever leaving the page.
  const fnv = (str) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16) + ':' + str.length;
  };

  document.addEventListener('click', (ev) => {
    if (!ev.isTrusted) return; // scripts calling el.click() are app behaviour, not user steps
    const el = target(ev);
    if (!el || isTool(el)) return;
    // text entry and selects are recorded by their value, not by the click that focused them
    if (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return;
    if (el.tagName === 'INPUT' && !/^(submit|button|reset|image|checkbox|radio)$/i.test(el.type || '')) return;
    send({ type: 'click', target: describe(el) });
  }, true);

  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (!el || isTool(el)) return;
    // only what the user is typing into; frameworks resetting other fields are not steps
    if (el !== document.activeElement) return;
    if (el.tagName === 'SELECT') return;
    if (el.tagName === 'INPUT' && /^(checkbox|radio|submit|button|reset|image|file)$/i.test(el.type || '')) return;
    if (!(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
    const isPw = (el.type || '').toLowerCase() === 'password';
    const value = isPw ? '{{secret:' + secretKey(el) + '}}' : (el.value != null ? String(el.value) : txt(el.textContent));
    const a = { type: 'fill', target: describe(el), value: value };
    if (isPw) a.secretHash = fnv(String(el.value || ''));
    send(a);
  }, true);

  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (!el || isTool(el) || el.tagName !== 'SELECT') return;
    const opts = Array.from(el.selectedOptions || []);
    send({
      type: 'select',
      target: describe(el),
      value: opts.map((o) => o.value),
      label: opts.map((o) => txt(o.textContent)),
      index: opts.map((o) => o.index),
    });
  }, true);

  document.addEventListener('keydown', (ev) => {
    if (!ev.isTrusted || ev.key !== 'Enter' || ev.isComposing) return;
    const el = ev.target;
    if (!el || isTool(el) || el.tagName === 'TEXTAREA') return;
    if (!(el.tagName === 'INPUT' || el.isContentEditable)) return;
    send({ type: 'press', key: 'Enter', target: describe(el) });
  }, true);
})();
