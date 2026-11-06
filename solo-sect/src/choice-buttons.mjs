// N52：既有選項資料仍是 <option>，呈現時換成可見的並排按鈕／卡片。
// 保留 id、data-* 與 change 事件語義，讓存檔及遊戲指令只接一條路徑。
let installed = false;
function buttons(host, options, selected) {
  if (host.id === 'st-mbti') options = options.filter((opt) => opt.value);
  const many = options.length > 6;
  const row = document.createElement('div'); row.className = many ? 'choice-grid' : 'choice-row';
  for (const opt of options) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'choice-option' + (opt.value === selected ? ' on' : '');
    b.dataset.value = opt.value; b.textContent = opt.textContent; b.disabled = opt.disabled;
    if (opt.title) b.title = opt.title;
    row.append(b);
  }
  if (many) {
    const d = document.createElement('details'); d.className = 'choice-more';
    if (host.id === 'st-mbti') d.open = true;
    const sum = document.createElement('summary'); sum.textContent = options.find((x) => x.value === selected)?.textContent || '選擇…';
    d.append(sum, row); host.replaceChildren(d);
  } else host.replaceChildren(row);
}
export function mountChoiceButtons(root = document) {
  for (const select of root.querySelectorAll('select')) {
    const host = document.createElement('span'); host.className = 'choice-set';
    host.id = select.id; host.title = select.title;
    for (const [key, val] of Object.entries(select.dataset)) host.dataset[key] = val;
    host.value = select.value; host.onchange = select.onchange;
    buttons(host, [...select.options], select.value);
    select.replaceWith(host);
  }
  // 自動存檔清單可在同一容器重填 <option>；原 onchange 繼續有效。
  for (const host of root.querySelectorAll('.choice-set')) {
    const options = [...host.children].filter((x) => x.tagName === 'OPTION');
    if (options.length) { host.value = ''; buttons(host, options, ''); }
  }
  if (installed) return; installed = true;
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.choice-option'); if (!b) return;
    const host = b.closest('.choice-set'); if (!host) return;
    host.value = b.dataset.value;
    for (const peer of host.querySelectorAll('.choice-option')) peer.classList.toggle('on', peer === b);
    const summary = host.querySelector('summary'); if (summary) { summary.textContent = b.textContent; summary.parentElement.open = false; }
    host.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
