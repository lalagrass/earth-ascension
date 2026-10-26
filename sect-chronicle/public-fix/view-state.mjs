// Local DOM state only. The world and its saves never see this map.
export function createViewWriter() {
  const roots = new WeakMap(), saved = new Map();
  const details = el => [...el.querySelectorAll('details')];
  const keyOf = (d, index) => d.dataset.viewKey || d.id || `details:${index}`;
  function focusKey(el, active) {
    if (!el.contains(active)) return null;
    if (active.tagName === 'SUMMARY') {
      const d = active.parentElement, index = details(el).indexOf(d);
      return { detail: keyOf(d, index) };
    }
    for (const attr of ['data-intent-command','data-cmd','data-person','data-tab','data-ui','id']) {
      const value = active.getAttribute(attr);
      if (value) return { attr, value };
    }
    return null;
  }
  return function put(key, el, html, scope = 'global') {
    const previous = roots.get(el), stateKey = `${scope}:${key}`;
    if (previous?.html === html && previous.scope === scope) return;
    const focused = focusKey(el, el.ownerDocument.activeElement);
    if (previous) saved.set(`${previous.scope}:${key}`, new Map(details(el).map((d,i) => [keyOf(d,i), d.open])));
    el.innerHTML = html;
    const state = saved.get(stateKey);
    details(el).forEach((d,i) => { const open = state?.get(keyOf(d,i)); if (open != null) d.open = open; });
    // Refreshing the same person restores the same control; switching people
    // never transfers the old person's focus or open state to the new person.
    if (focused && previous?.scope === scope) {
      const target = focused.detail != null ? details(el).find((d,i) => keyOf(d,i) === focused.detail)?.querySelector('summary')
        : [...el.querySelectorAll(`[${focused.attr}]`)].find(n => n.getAttribute(focused.attr) === focused.value);
      target?.focus({ preventScroll: true });
    }
    roots.set(el, { html, scope });
  };
}
