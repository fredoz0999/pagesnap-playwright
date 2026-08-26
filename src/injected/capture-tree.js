/**
 * Builds a rich accessibility-oriented tree for AI / test-locator work.
 * Function body for page.evaluate((opts) => { ... }, opts).
 * Locator `by` values are framework-neutral:
 *   id | name | css | testid | role | label | placeholder | linkText | xpath
 * Options: { maxTableRows, redactPasswords, redactEmails }
 */
opts = opts || {};
const lean = !!opts.lean;
const wantHints = !!opts.includeHints;
const maxTableRows = opts.maxTableRows || (lean ? 3 : 5);
const redactPasswords = opts.redactPasswords !== false;
const redactEmails = opts.redactEmails !== false;

const INTERESTING = new Set([
  'button', 'link', 'textbox', 'searchbox', 'combobox', 'listbox', 'option',
  'checkbox', 'radio', 'switch', 'tab', 'tablist', 'tabpanel',
  'menuitem', 'menu', 'menubar', 'dialog', 'alertdialog', 'alert',
  'heading', 'img', 'table', 'row', 'cell', 'columnheader', 'rowheader',
  'list', 'listitem', 'navigation', 'main', 'banner', 'contentinfo',
  'form', 'region', 'article', 'complementary', 'toolbar', 'progressbar',
  'slider', 'spinbutton', 'tree', 'treeitem', 'grid', 'gridcell', 'generic'
]);

const esc = (s) => String(s == null ? '' : s)
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/\n/g, ' ')
  .replace(/\r/g, '');

// Collect real password field values from every frame + open shadow root
// so free-text (alerts, toast, names) can be swept too — not only input values.
// Literal split/join (no regex) so hostile secrets cannot inject patterns.
const MIN_SECRET_LEN = 4;
const collectPasswordSecrets = () => {
  const secrets = new Set();
  const visit = (root) => {
    if (!root) return;
    try {
      const stack = [root];
      while (stack.length) {
        const node = stack.pop();
        const list = node.querySelectorAll
          ? node.querySelectorAll('input[type="password"]')
          : [];
        for (const el of list) {
          const v = el && el.value != null ? String(el.value) : '';
          if (v.length >= MIN_SECRET_LEN) secrets.add(v);
        }
        if (node.querySelectorAll) {
          for (const el of node.querySelectorAll('*')) {
            if (el.shadowRoot) stack.push(el.shadowRoot);
          }
          for (const f of node.querySelectorAll('iframe, frame')) {
            try {
              if (f.contentDocument) stack.push(f.contentDocument);
            } catch (e) { /* cross-origin */ }
          }
        }
      }
    } catch (e) { /* ignore */ }
  };
  visit(document);
  return Array.from(secrets);
};
const passwordSecrets = redactPasswords ? collectPasswordSecrets() : [];

const redactText = (s) => {
  if (s == null) return '';
  let t = String(s);
  if (redactPasswords && passwordSecrets.length) {
    for (const secret of passwordSecrets) {
      if (secret.length < MIN_SECRET_LEN) continue;
      t = t.split(secret).join('***');
    }
  }
  if (redactEmails) {
    t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***');
  }
  return t;
};

/** Final gate: sweep secrets through any string (tree + hints). */
const sweepSecrets = (text) => {
  if (!text) return text;
  let t = String(text);
  if (redactPasswords && passwordSecrets.length) {
    for (const secret of passwordSecrets) {
      if (secret.length < MIN_SECRET_LEN) continue;
      t = t.split(secret).join('***');
    }
  }
  if (redactEmails) {
    t = t.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***');
  }
  return t;
};

const implicitRole = (el) => {
  const tag = el.tagName.toLowerCase();
  const type = (el.getAttribute('type') || '').toLowerCase();
  // href-less <a data-test=...> (Sauce Demo cart icon) is still a control.
  if (tag === 'a') {
    if (el.hasAttribute('href')) return 'link';
    if (el.getAttribute('data-testid') || el.getAttribute('data-test') || el.getAttribute('data-test-id') || el.getAttribute('data-cy') || el.getAttribute('data-qa')) return 'link';
  }
  if (tag === 'button') return 'button';
  if (tag === 'input') {
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'submit' || type === 'button' || type === 'reset' || type === 'image') return 'button';
    if (type === 'search') return 'searchbox';
    if (type === 'range') return 'slider';
    if (type === 'number') return 'spinbutton';
    if (type === 'hidden') return null;
    return 'textbox';
  }
  if (tag === 'textarea') return 'textbox';
  if (tag === 'select') return el.multiple ? 'listbox' : 'combobox';
  if (tag === 'option') return 'option';
  if (tag === 'progress') return 'progressbar';
  if (tag === 'meter') return 'meter';
  if (/^h[1-6]$/.test(tag)) return 'heading';
  if (tag === 'img') return 'img';
  if (tag === 'nav') return 'navigation';
  if (tag === 'main') return 'main';
  if (tag === 'header') return 'banner';
  if (tag === 'footer') return 'contentinfo';
  if (tag === 'form') return 'form';
  if (tag === 'table') return 'table';
  if (tag === 'tr') return 'row';
  if (tag === 'th') return el.scope === 'row' ? 'rowheader' : 'columnheader';
  if (tag === 'td') return 'cell';
  if (tag === 'ul' || tag === 'ol') return 'list';
  if (tag === 'li') return 'listitem';
  if (tag === 'dialog') return 'dialog';
  if (tag === 'section') {
    const sn = (el.getAttribute('aria-label') || '').trim() || el.getAttribute('aria-labelledby');
    return sn ? 'region' : null;
  }
  return null;
};

// Accname-ish visible text: skip aria-hidden nodes (required "*" is often hidden).
const visibleNameText = (el) => {
  if (!el) return '';
  let out = '';
  const walk = (n) => {
    if (!n) return;
    if (n.nodeType === 3) { out += n.textContent || ''; return; }
    if (n.nodeType !== 1) return;
    try {
      if (n.hidden || (n.getAttribute && n.getAttribute('aria-hidden') === 'true')) return;
    } catch (e) { /* ignore */ }
    const kids = n.childNodes;
    for (let i = 0; i < kids.length; i++) walk(kids[i]);
  };
  walk(el);
  return out.replace(/\s+/g, ' ').trim();
};

// Playwright getByRole name is the computed accessible name, not raw label innerText.
const cleanAccName = (s) => {
  let t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  t = t.replace(/^\*\s+/, '');
  t = t.replace(/\s*\*+\s*$/g, '');
  t = t.replace(/\s*\((?:required|optional)\)\s*$/i, '');
  t = t.replace(/\s+[•·]\s*$/g, '');
  return t.replace(/\s+/g, ' ').trim();
};

const accessibleName = (el) => {
  const aria = el.getAttribute('aria-label');
  if (aria && aria.trim()) return redactText(cleanAccName(aria));

  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy.split(/\s+/)
      .map(id => el.ownerDocument.getElementById(id))
      .filter(Boolean)
      .map(n => visibleNameText(n) || (n.textContent || '').trim())
      .filter(Boolean)
      .join(' ');
    if (text) return redactText(cleanAccName(text));
  }

  if (el.tagName === 'IMG') {
    const alt = el.getAttribute('alt');
    if (alt != null) return redactText(alt.trim());
  }

  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
    if (el.labels && el.labels.length) {
      const lt = Array.from(el.labels).map(l => visibleNameText(l) || (l.innerText || '').trim()).filter(Boolean).join(' ');
      if (lt) return redactText(cleanAccName(lt));
    }
    const ph = el.getAttribute('placeholder');
    if (ph && ph.trim()) return redactText(ph.trim());
    const name = el.getAttribute('name');
    if (name && name.trim()) return name.trim();
    const id = el.getAttribute('id');
    if (id && id.trim()) return id.trim();
  }

  if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button') {
    const t = visibleNameText(el) || (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    if (t) return redactText(cleanAccName(t).slice(0, 120));
  }

  // Native <option> and ARIA options (custom listboxes) - text content is the name
  if (
    el.tagName === 'OPTION' ||
    el.getAttribute('role') === 'option' ||
    el.getAttribute('role') === 'menuitem' ||
    el.getAttribute('role') === 'treeitem' ||
    el.getAttribute('role') === 'tab'
  ) {
    const t = visibleNameText(el) || (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    if (t) return redactText(cleanAccName(t).slice(0, 120));
  }

  if (/^H[1-6]$/.test(el.tagName)) {
    return redactText(cleanAccName((el.innerText || '').replace(/\s+/g, ' ').trim()).slice(0, 120));
  }

  const title = el.getAttribute('title');
  if (title && title.trim()) return redactText(cleanAccName(title));
  return '';
};

const isVisible = (el) => {
  try {
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
    const style = (el.ownerDocument.defaultView || window).getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0 || style.position === 'fixed';
  } catch (e) {
    return true;
  }
};

const cssEscape = (s) => {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(s);
  return String(s).replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
};

const BS = String.fromCharCode(92);
const attrSel = (attr, value) =>
  '[' + attr + '="' + String(value).split('"').join(BS + '"') + '"]';

// Shadow-hosted elements are unique within their root, not the document.
const scopeOf = (el) => {
  try {
    const root = el.getRootNode ? el.getRootNode() : null;
    if (root && typeof root.querySelectorAll === 'function' && root !== el.ownerDocument) {
      return root;
    }
  } catch (e) { /* ignore */ }
  return el.ownerDocument;
};

// What a locator really finds, so nothing unverified is written down.
const resolveLocator = (el, cand) => {
  const scope = scopeOf(el);
  const doc = el.ownerDocument;
  try {
    if (cand.by === 'xpath') {
      const res = doc.evaluate(cand.value, doc, null, 7, null);
      const out = [];
      for (let i = 0; i < res.snapshotLength; i++) {
        const n = res.snapshotItem(i);
        if (n && n.nodeType === 1) out.push(n);
      }
      return out;
    }
    if (cand.by === 'linkText') {
      return Array.from(scope.querySelectorAll('a')).filter(a =>
        (a.innerText || a.textContent || '').replace(/\s+/g, ' ').trim() === cand.value);
    }
    if (cand.by === 'testid') {
      const attrs = cand.attr
        ? [cand.attr]
        : ['data-testid', 'data-test', 'data-test-id', 'data-cy', 'data-qa'];
      const out = [];
      const seenEl = new Set();
      for (const attr of attrs) {
        for (const n of scope.querySelectorAll(attrSel(attr, cand.value))) {
          if (!seenEl.has(n)) { seenEl.add(n); out.push(n); }
        }
      }
      return out;
    }
    if (cand.by === 'role') {
      const wantRole = cand.value;
      const wantName = cand.name != null ? String(cand.name) : '';
      return Array.from(scope.querySelectorAll('*')).filter(n => {
        if (!n || n.nodeType !== 1) return false;
        const r = n.getAttribute('role') || implicitRole(n);
        if (r !== wantRole) return false;
        if (!wantName) return true;
        return accessibleName(n) === wantName;
      });
    }
    if (cand.by === 'label') {
      const want = String(cand.value);
      const out = [];
      const seenEl = new Set();
      const add = (n) => { if (n && !seenEl.has(n)) { seenEl.add(n); out.push(n); } };
      try {
        for (const lab of scope.querySelectorAll('label')) {
          const t = cleanAccName(visibleNameText(lab) || (lab.innerText || '').replace(/\s+/g, ' ').trim());
          if (t !== want) continue;
          if (lab.control) add(lab.control);
          else {
            const forId = lab.getAttribute('for');
            if (forId) add((lab.ownerDocument || doc).getElementById(forId));
          }
        }
      } catch (e) { /* ignore */ }
      for (const n of scope.querySelectorAll(attrSel('aria-label', want))) add(n);
      return out;
    }
    if (cand.by === 'placeholder') {
      return Array.from(scope.querySelectorAll(attrSel('placeholder', cand.value)));
    }
    let sel = null;
    if (cand.by === 'id') sel = attrSel('id', cand.value);
    else if (cand.by === 'name') sel = attrSel('name', cand.value);
    else if (cand.by === 'css') sel = cand.value;
    if (!sel) return null;
    return Array.from(scope.querySelectorAll(sel));
  } catch (e) {
    return [];
  }
};

const isUniqueLocator = (el, cand) => {
  const found = resolveLocator(el, cand);
  return !!found && found.length === 1 && found[0] === el;
};

// Plain-CSS path from the nearest unique id: last resort so an element
// with identical siblings still has one locator that works.
const structuralPath = (el) => {
  const scope = scopeOf(el);
  const parts = [];
  let node = el;
  while (node && node.nodeType === 1 && parts.length < 8) {
    const id = node.getAttribute('id');
    if (id && !/^[0-9]/.test(id) && scope.querySelectorAll(attrSel('id', id)).length === 1) {
      parts.unshift('#' + cssEscape(id));
      return parts.join(' > ');
    }
    const parent = node.parentElement;
    let idx = 1;
    for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) idx++;
    parts.unshift(node.tagName.toLowerCase() + ':nth-child(' + idx + ')');
    if (!parent) break;
    node = parent;
  }
  return parts.length ? parts.join(' > ') : null;
};

// LocatorLabs-style reliability scores mapped to PageSnap `by` values.
// Unique locators keep the table score; non-unique (`matches`) are capped at 40.
const SCORE = {
  testid: 98,
  role: 95,
  label: 90,
  id: 90,
  name: 88,
  placeholder: 85,
  linkText: 75,
  css: 60,
  xpath: 40
};
const locatorScore = (by, matches) => {
  const base = Object.prototype.hasOwnProperty.call(SCORE, by) ? SCORE[by] : 40;
  if (matches != null) return Math.min(base, 40);
  return base;
};
const stampScore = (loc) => {
  loc.score = locatorScore(loc.by, loc.matches);
  return loc;
};

// Narrow a locator that matched several elements (radio groups above all).
const repairLocator = (el, cand) => {
  const nameAttr = el.getAttribute('name');
  const valueAttr = el.getAttribute('value');
  if (nameAttr && valueAttr != null && valueAttr !== '') {
    const narrowed = stampScore({
      by: 'css',
      value: el.tagName.toLowerCase() + attrSel('name', nameAttr) + attrSel('value', valueAttr),
      stability: cand.stability
    });
    if (isUniqueLocator(el, narrowed)) return narrowed;
  }
  const path = structuralPath(el);
  if (path) {
    const structural = stampScore({ by: 'css', value: path, stability: 'low' });
    if (isUniqueLocator(el, structural)) return structural;
  }
  return null;
};

// Roles that need locators for test generation. Structural
// roles (heading, list, banner, …) stay in the tree without locator
// blocks — that alone removes most multi-locator bloat on chrome-heavy pages.
const ACTIONABLE = new Set([
  'button', 'link', 'textbox', 'searchbox', 'combobox', 'listbox', 'option',
  'checkbox', 'radio', 'switch', 'tab', 'menuitem', 'slider', 'spinbutton',
  'form', 'generic'
]);

// Token-lean multi-locator: keep the classic by/value/stability/score shape,
// but emit at most two verified unique strategies (lean: 1) after ranking by
// score, and skip redundant twins (id vs #id, name vs tag[name=…]).
const MAX_LOCATORS = lean ? 1 : 2;

const buildLocators = (el) => {
  const locators = [];
  let hasId = false;
  let hasName = false;
  let hasTestId = false;
  const push = (by, value, stability, extra) => {
    if (value == null || String(value).trim() === '') return;
    locators.push(stampScore(Object.assign({ by: by, value: String(value), stability: stability }, extra || {})));
  };

  const testId = el.getAttribute('data-testid') || el.getAttribute('data-test')
    || el.getAttribute('data-test-id') || el.getAttribute('data-cy')
    || el.getAttribute('data-qa');
  if (testId) {
    const attr = el.hasAttribute('data-testid') ? 'data-testid'
      : el.hasAttribute('data-test') ? 'data-test'
      : el.hasAttribute('data-test-id') ? 'data-test-id'
      : el.hasAttribute('data-cy') ? 'data-cy' : 'data-qa';
    push('testid', testId, 'high', { attr: attr });
    hasTestId = true;
  }

  const id = el.getAttribute('id');
  if (id && !/^[0-9]/.test(id) && id.length < 80) {
    push('id', id, 'high');
    hasId = true;
  }

  const name = el.getAttribute('name');
  if (name) {
    push('name', name, 'high');
    hasName = true;
    if (!hasId && !hasTestId) {
      push('css', el.tagName.toLowerCase() + '[name="' + name.replace(/"/g, '\\"') + '"]', 'medium');
    }
  }

  if (el.labels && el.labels.length) {
    const lt = Array.from(el.labels).map(l => cleanAccName(visibleNameText(l) || (l.innerText || '').replace(/\s+/g, ' ').trim())).filter(Boolean).join(' ');
    if (lt && lt.length < 80) {
      push('label', lt, 'medium');
    }
  }

  // Always collect semantic candidates even when a testid/id exists, so a
  // non-unique testid still has a unique role/label/placeholder fallback.
  const ph = el.getAttribute && el.getAttribute('placeholder');
  if (ph && ph.trim()) {
    push('placeholder', ph.trim(), 'medium');
  }

  const roleForPw = el.getAttribute('role') || implicitRole(el);
  const anameForPw = accessibleName(el);
  // generic is not a locator strategy (testid-only nodes). Never emit by: role, value: generic.
  if (roleForPw && anameForPw && anameForPw.length < 60 && ACTIONABLE.has(roleForPw) && roleForPw !== 'generic') {
    push('role', roleForPw, 'medium', { name: anameForPw });
  }

  const aria = el.getAttribute('aria-label');
  if (aria && aria.trim()) {
    push('css', '[aria-label="' + aria.trim().replace(/"/g, '\\"') + '"]', 'medium');
  }

  const type = (el.getAttribute('type') || '').toLowerCase();
  if (el.tagName === 'INPUT' && type === 'submit' && el.value) {
    push('css', 'input[type="submit"][value="' + String(el.value).replace(/"/g, '\\"') + '"]', 'medium');
  }

  if (el.tagName === 'A') {
    let href = el.getAttribute('href');
    if (href && !href.startsWith('javascript:')) {
      href = href.replace(/;jsessionid=[^?#]*/i, '');
      if (href.length < 120) {
        const bare = href.split('?')[0].split('#')[0];
        if (bare) push('css', 'a[href*="' + bare.replace(/"/g, '\\"') + '"]', 'medium');
      }
    }
    const linkName = accessibleName(el);
    if (linkName && linkName.length < 60) {
      push('linkText', linkName, 'medium');
    }
  }

  const hasBetter = locators.some(function(l) { return l.stability === 'high' || l.by === 'role' || l.by === 'label' || l.by === 'placeholder' || l.by === 'linkText'; });
  if (!hasBetter && !hasId && !hasName && !hasTestId) {
    if (el.tagName === 'BUTTON' || (el.tagName === 'INPUT' && /^(submit|button|reset)$/i.test(type))) {
      const btnName = accessibleName(el) || (el.value || '');
      if (btnName && btnName.length < 60 && !locators.some(l => l.by === 'role')) {
        push('xpath',
          '//button[normalize-space()="' + btnName.replace(/"/g, '') + '"] | //input[@type="'
            + (type || 'button') + '" and @value="' + btnName.replace(/"/g, '') + '"]',
          'medium');
      }
    }
    const role = el.getAttribute('role') || implicitRole(el);
    const aname = accessibleName(el);
    if (role && aname && aname.length < 60 && locators.length === 0) {
      push('xpath',
        '//*[@role="' + role + '" or self::' + el.tagName.toLowerCase() + '][contains(normalize-space(.), "'
          + aname.replace(/"/g, '') + '")]',
        'low');
    }
  }

  const seen = new Set();
  const candidates = locators.filter(l => {
    const k = l.by + '|' + l.value + '|' + (l.name || '');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Do not early-break on the first unique locator: a later unique role/label
  // may outrank a non-unique (matches-capped) testid after score sort.
  const verified = [];
  const ambiguous = [];
  for (const cand of candidates) {
    const found = resolveLocator(el, cand);
    if (!found) continue;
    if (found.length === 1 && found[0] === el) {
      verified.push(cand);
      continue;
    }
    if (found.length > 1 && found.indexOf(el) >= 0) {
      const narrowed = repairLocator(el, cand);
      if (narrowed && !verified.some(v => v.by === narrowed.by && v.value === narrowed.value)) {
        verified.push(narrowed);
      } else if (!lean && ambiguous.length < 1) {
        const amb = { by: cand.by, value: cand.value, stability: cand.stability, matches: found.length };
        if (cand.name) amb.name = cand.name;
        if (cand.attr) amb.attr = cand.attr;
        ambiguous.push(stampScore(amb));
      }
    }
  }

  if (!verified.length) {
    const path = structuralPath(el);
    if (path) {
      const structural = stampScore({ by: 'css', value: path, stability: 'low' });
      if (isUniqueLocator(el, structural)) verified.push(structural);
    }
  }

  const cleaned = verified.filter(l => {
    if (l.by === 'css' && l.value.charAt(0) === '#' && verified.some(v => v.by === 'id' && ('#' + cssEscape(v.value)) === l.value)) {
      return false;
    }
    if (l.by === 'css' && /\[name=/.test(l.value) && verified.some(v => v.by === 'name')) {
      return false;
    }
    return true;
  });

  const rank = (st) => (st === 'high' ? 0 : st === 'medium' ? 1 : 2);
  const byRank = (by) => ({ testid: 0, role: 1, label: 2, id: 3, name: 4, placeholder: 5, linkText: 6, css: 7, xpath: 8 }[by] ?? 9);
  cleaned.sort((a, b) => (b.score - a.score) || rank(a.stability) - rank(b.stability) || byRank(a.by) - byRank(b.by));

  const picked = [];
  const bySeen = new Set();
  for (const l of cleaned) {
    if (picked.length >= MAX_LOCATORS) break;
    if (bySeen.has(l.by) && picked.length > 0) continue;
    picked.push(l);
    bySeen.add(l.by);
  }

  if (!picked.length && ambiguous.length) {
    return ambiguous.slice(0, 1);
  }
  return picked;
};

const readValue = (el) => {
  const tag = el.tagName;
  const type = (el.getAttribute('type') || '').toLowerCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    if (redactPasswords && type === 'password') return '***';
    let v = el.value != null ? String(el.value) : '';
    if (v.length > 80) v = v.slice(0, 80) + '…[truncated]';
    return redactText(v);
  }
  return null;
};

const lines = [];
const hints = [];

const BANNER_SELECTOR = '.error, .errors, .alert-error, .validation-error, .has-error';
const collapsedText = (el) => (el.innerText || '').replace(/\s+/g, ' ').trim();
const capAlertText = (t) => t.length > 300 ? t.slice(0, 300) + '…' : t;

const CONTAINER_ROLES = new Set(['region','form','dialog','alertdialog','navigation',
  'article','complementary','banner','contentinfo','main','tabpanel']);
const nameCounts = new Map();      // 'role|name' -> total across capture
const containersByKey = new Map(); // 'role|name' -> [containerName per node, DOM order]
const seenCounts = new Map();      // pass 2: 'role|name' -> emitted so far
const containerNameOf = (el) => {
  let node = el;
  while (node) {
    let parent = node.parentElement;
    if (!parent && node.getRootNode) {
      const root = node.getRootNode();
      parent = root && root.host ? root.host : null;
    }
    node = parent;
    if (!node || node.nodeType !== 1) return '';
    const r = node.getAttribute('role') || implicitRole(node);
    if (r && CONTAINER_ROLES.has(r)) {
      const n = accessibleName(node);
      if (n) return n;
    }
  }
  return '';
};

const emitNode = (el, depth, prefix, inAlert, countOnly) => {
  if (!el || el.nodeType !== 1) return;
  if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'PATH'].includes(el.tagName)) return;
  // Never include injected toolbar / toast / note UI
  if (el.hasAttribute && el.hasAttribute('data-snapshot-tool')) return;
  if (el.closest && el.closest('[data-snapshot-tool]')) return;

  let role = el.getAttribute('role') || implicitRole(el);
  // Role-less error banners become real alert nodes at their DOM position
  if (!role && !inAlert && el.matches && el.matches(BANNER_SELECTOR) && isVisible(el)) {
    if (collapsedText(el)) { role = 'alert'; }
  }
  // Keep visible testid nodes even with no ARIA role (cart badge, inventory-list, title).
  if (!role) {
    const tid = el.getAttribute('data-testid') || el.getAttribute('data-test')
      || el.getAttribute('data-test-id') || el.getAttribute('data-cy')
      || el.getAttribute('data-qa');
    if (tid) role = 'generic';
  }
  const interesting = role && INTERESTING.has(role) && isVisible(el);
  let skipWrapper = false;

  if (interesting) {
    let name = accessibleName(el);
    // role=alert text is the alert; without this the text is invisible in-tree
    if (role === 'alert' && !name) {
      name = capAlertText(redactText(collapsedText(el)));
    }
    if (role === 'generic' && !name) {
      let own = '';
      for (const n of el.childNodes) {
        if (n.nodeType === 3) own += n.textContent || '';
      }
      own = own.replace(/\s+/g, ' ').trim();
      if (own && own.length < 60) name = redactText(own);
    }

    skipWrapper = lean && !name && !ACTIONABLE.has(role) && (role === 'main' || role === 'region' || role === 'article' || role === 'navigation' || role === 'banner' || role === 'contentinfo' || role === 'complementary' || role === 'form');
    if (skipWrapper) {
      // omit empty structural wrappers; children still walked
    } else if (countOnly) {
    if (name) {
      const key = role + '|' + name;
      nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
      const arr = containersByKey.get(key) || [];
      arr.push(containerNameOf(el));
      containersByKey.set(key, arr);
    }
    } else {
    let line = '  '.repeat(depth) + '- ' + role;
    if (name) line += ' "' + esc(name) + '"';

    let dupExtra = null, hintLabel = name || role;
    if (name) {
      const key = role + '|' + name;
      const total = nameCounts.get(key) || 0;
      if (total > 1) {
        const k = seenCounts.get(key) || 0;
        seenCounts.set(key, k + 1);
        const arr = containersByKey.get(key) || [];
        const myC = arr[k] || '';
        const unique = myC && arr.filter(c => c === myC).length === 1;
        if (unique) {
          dupExtra = 'in="' + esc(myC) + '"';
          hintLabel = myC + ' > ' + hintLabel;
        } else {
          dupExtra = 'dup ' + (k + 1) + '/' + total;
          hintLabel = hintLabel + ' (' + (k + 1) + '/' + total + ')';
        }
      }
    }

    const extras = [];
    if (role === 'heading') {
      const level = el.getAttribute('aria-level') || (el.tagName.match(/^H(\d)$/) || [])[1];
      if (level) extras.push('level=' + level);
    }
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') extras.push('disabled');
    if (el.readOnly || el.getAttribute('aria-readonly') === 'true') extras.push('readonly');
    if (el.required || el.getAttribute('aria-required') === 'true') extras.push('required');
    if (el.checked || el.getAttribute('aria-checked') === 'true') extras.push('checked');
    if (el.selected || el.getAttribute('aria-selected') === 'true') extras.push('selected');
    if (el.getAttribute('aria-expanded') === 'true') extras.push('expanded');
    if (el.getAttribute('aria-expanded') === 'false') extras.push('collapsed');
    if (el.getAttribute('aria-invalid') === 'true') extras.push('invalid');
    if (el.getAttribute('aria-busy') === 'true') extras.push('busy');
    if (el.getAttribute('aria-current')) extras.push('current');
    if (prefix) extras.push(prefix);
    if (dupExtra) extras.push(dupExtra);
    if (extras.length) line += ' [' + extras.join(', ') + ']';

    const roleForLoc = role;
    const locators = ACTIONABLE.has(roleForLoc) ? buildLocators(el) : [];
    const value = readValue(el);
    // Native <select> options exist in DOM even when the list is closed
    const isNativeSelect = el.tagName === 'SELECT';
    const nativeOptions = isNativeSelect ? Array.from(el.options || []) : [];
    const hasDetails = locators.length > 0 || value != null
      || el.getAttribute('aria-errormessage') || el.validationMessage
      || nativeOptions.length > 0
      || el.getAttribute('aria-expanded') != null
      || (el.getAttribute('aria-invalid') === 'true' && el.getAttribute('aria-describedby'));

    if (hasDetails) {
      line += ':';
      lines.push(line);
      const ind = '  '.repeat(depth + 1);
      if (value != null) lines.push(ind + 'value: "' + esc(value) + '"');
      if (el.getAttribute('aria-expanded') === 'true') {
        lines.push(ind + 'dropdown: open');
      } else if (el.getAttribute('aria-expanded') === 'false') {
        lines.push(ind + 'dropdown: closed');
      }
      try {
        if (el.validationMessage) {
          lines.push(ind + 'validationMessage: "' + esc(redactText(el.validationMessage)) + '"');
        }
      } catch (e) { /* ignore */ }
      const errId = el.getAttribute('aria-errormessage');
      if (errId) {
        const errEl = el.ownerDocument.getElementById(errId);
        if (errEl) {
          const et = (errEl.innerText || '').replace(/\s+/g, ' ').trim();
          if (et) lines.push(ind + 'error: "' + esc(redactText(et)) + '"');
        }
      }
      if (el.getAttribute('aria-invalid') === 'true' && !el.getAttribute('aria-errormessage')) {
        const dids = (el.getAttribute('aria-describedby') || '').trim().split(/\s+/).filter(Boolean);
        for (const did of dids) {
          const dEl = el.ownerDocument.getElementById(did);
          const dt = dEl ? (dEl.innerText || '').replace(/\s+/g, ' ').trim() : '';
          if (dt) { lines.push(ind + 'error: "' + esc(redactText(dt)) + '"'); break; }
        }
      }
      if (locators.length) {
        lines.push(ind + 'locators:');
        for (const l of locators) {
          lines.push(ind + '  - {by: ' + l.by + ', value: "' + esc(l.value) + '"'
            + (l.name ? ', name: "' + esc(l.name) + '"' : '')
            + (l.by === 'testid' && l.attr && l.attr !== 'data-testid' ? ', attr: ' + l.attr : '')
            + ', stability: ' + l.stability
            + ', score: ' + (l.score != null ? l.score : locatorScore(l.by, l.matches))
            + (l.matches != null ? ', matches: ' + l.matches : '') + '}');
        }
        // Structured hint (framework dialect applied in Node, not here)
        const best = locators.filter(l => l.matches == null)[0];
        if (wantHints && best) {
          const rec = { label: hintLabel, by: best.by, value: best.value };
          if (best.name) rec.name = best.name;
          if (prefix) rec.prefix = prefix;
          hints.push(rec);
        }
      }
      // Inline native <select> options so one snapshot is enough for closed lists
      if (nativeOptions.length) {
        lines.push(ind + 'options:  # native <select> - available without opening UI');
        for (const opt of nativeOptions) {
          const flags = [];
          if (opt.disabled) flags.push('disabled');
          if (opt.selected) flags.push('selected');
          const suffix = flags.length ? ' [' + flags.join(', ') + ']' : '';
          lines.push(ind + '  - option "' + esc(redactText((opt.text || '').trim())) + '"' + suffix);
        }
      }
    } else {
      lines.push(line);
    }
    }
  }

  // children: light DOM + open shadow root
  const kids = [];
  if (el.shadowRoot) {
    for (const c of el.shadowRoot.children) kids.push(c);
  }
  for (const c of el.children) kids.push(c);
  const nextDepth = (interesting && !skipWrapper) ? depth + 1 : depth;
  if (nextDepth > 30) {
    if (!countOnly && kids.length) {
      lines.push('  '.repeat(31) + '- … (subtree truncated at depth 30)');
    }
  } else {
    for (const child of kids) {
      emitNode(child, nextDepth, prefix, inAlert || role === 'alert', countOnly);
    }
  }
};

const walkDocument = (doc, depth, prefix, countOnly) => {
  if (!doc || !doc.body) return;
  emitNode(doc.body, depth, prefix, false, countOnly);
};

// same-origin iframes (recursive: outer → nested inner, any depth)
// Parent document only lists direct-document iframes; nested frames live
// inside the outer frame's contentDocument, so we recurse per frame doc.
const walkFrames = (rootDoc, depth, pathPrefix, countOnly) => {
  if (!rootDoc) return;
  let frames;
  try {
    frames = Array.from(rootDoc.querySelectorAll('iframe, frame'));
  } catch (e) {
    return;
  }
  frames.forEach((frame, i) => {
    const fname = frame.getAttribute('name') || frame.getAttribute('id') || ('frame-' + i);
    const framePath = pathPrefix ? (pathPrefix + '/' + fname) : fname;
    const ind = '  '.repeat(Math.max(0, depth));
    try {
      const doc = frame.contentDocument;
      if (!doc) {
        if (!countOnly) lines.push(ind + '- iframe "' + esc(fname) + '" [cross-origin or empty]');
        return;
      }
      if (!countOnly) lines.push(ind + '- iframe "' + esc(fname) + '":');
      walkDocument(doc, depth + 1, 'in-iframe=' + framePath, countOnly);
      // Nested iframes inside this frame document
      walkFrames(doc, depth + 1, framePath, countOnly);
    } catch (e) {
      if (!countOnly) lines.push(ind + '- iframe "' + esc(fname) + '" [cross-origin]');
    }
  });
};

walkDocument(document, 0, null, true);
walkFrames(document, 0, null, true);
walkDocument(document, 0, null, false);
walkFrames(document, 0, null, false);

// <select> full options
const allSelects = [];
const collectSelects = (doc) => {
  if (!doc) return;
  try {
    doc.querySelectorAll('select').forEach(s => allSelects.push(s));
    doc.querySelectorAll('iframe, frame').forEach(f => {
      try { if (f.contentDocument) collectSelects(f.contentDocument); } catch (e) {}
    });
  } catch (e) {}
};
collectSelects(document);
if (allSelects.length) {
  lines.push('');
  lines.push('# --- All <select> options ---');
  for (const sel of allSelects) {
    const label = sel.id || sel.name || accessibleName(sel) || 'unnamed';
    lines.push('# <select> "' + esc(label) + '":');
    for (const opt of Array.from(sel.options)) {
      const flags = [];
      if (opt.disabled) flags.push('disabled');
      if (opt.selected) flags.push('selected');
      const suffix = flags.length ? ' (' + flags.join(', ') + ')' : '';
      lines.push('#   - ' + redactText((opt.text || '').trim()) + suffix);
    }
  }
}

// tables: headers + first N data rows
const tables = Array.from(document.querySelectorAll('table')).filter(isVisible);
if (tables.length) {
  lines.push('');
  lines.push('# --- Tables (headers + first rows) ---');
  tables.forEach((table, ti) => {
    const caption = table.querySelector('caption');
    const tname = (caption && caption.innerText.trim()) || table.getAttribute('aria-label')
      || table.id || ('table-' + ti);
    lines.push('# table "' + esc(redactText(tname)) + '":');
    const headers = Array.from(table.querySelectorAll('thead th, tr th')).map(th =>
      (th.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (headers.length) {
      lines.push('#   headers: ' + headers.map(h => redactText(h)).join(' | '));
    }
    const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
    const rows = bodyRows.length ? bodyRows : Array.from(table.querySelectorAll('tr')).filter(tr => !tr.querySelector('th'));
    rows.slice(0, maxTableRows).forEach((tr, ri) => {
      const cells = Array.from(tr.querySelectorAll('td, th')).map(c =>
        redactText((c.innerText || '').replace(/\s+/g, ' ').trim()));
      lines.push('#   row ' + (ri + 1) + ': ' + cells.join(' | '));
    });
    if (rows.length > maxTableRows) {
      lines.push('#   … ' + (rows.length - maxTableRows) + ' more rows (truncated)');
    }
  });
}

// Final secret sweep on full tree + hints (catches free-text leaks in
// alerts, toasts, names — field values already mask type=password)
const treeOut = sweepSecrets(lines.join('\n'));
// Fewer hints: one per actionable, already high-stability first; cap list.
const hintsOut = hints.slice(0, 24).map(h => {
  if (h && typeof h === 'object') {
    const rec = {
      label: sweepSecrets(h.label),
      by: h.by,
      value: sweepSecrets(h.value)
    };
    if (h.name) rec.name = sweepSecrets(h.name);
    if (h.prefix) rec.prefix = h.prefix;
    return rec;
  }
  return { label: '', by: 'css', value: sweepSecrets(String(h)) };
});
const truncated = hints.length > 24 ? (hints.length - 24) : 0;

return {
  tree: treeOut,
  hints: hintsOut,
  hintsTruncated: truncated
};
