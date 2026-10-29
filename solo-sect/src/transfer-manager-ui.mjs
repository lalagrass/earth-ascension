import { transferSlots, exportTransferBackup, importTransferBackup } from './homestead-transfer.mjs';
export function downloadBytes(bytes, filename = 'homestead-backup.json') {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function mountTransferManager(root, store = null) {
  if (!store) { try { store = localStorage; } catch { root.textContent = '瀏覽器禁止本機存檔；無法讀取轉接槽。'; return () => {}; } }
  const title = document.createElement('h3'); title.textContent = '荒居轉接存檔（兩個獨立槽）';
  const list = document.createElement('div'), msg = document.createElement('p'), input = document.createElement('input');
  input.type = 'file'; input.accept = '.json,application/json'; input.setAttribute('aria-label', '匯入荒居轉接備份');
  const note = document.createElement('p'); note.textContent = '匯出的是已存檔內容；下載後請保留 JSON。匯入只用空槽。';
  const label = document.createElement('label'); label.textContent = '匯入轉接備份 '; label.append(input); root.append(title, note, list, label, msg);
  const refresh = () => {
    list.replaceChildren();
    try { for (const x of transferSlots(store)) {
      const row = document.createElement('p'); row.textContent = `槽 ${x.slot}：${x.name} `;
      if (x.valid) {
        const link = document.createElement('a'); link.href = `index.html?homestead=${x.slot}`; link.textContent = '進入'; row.append(link);
        const exp = document.createElement('button'); exp.textContent = `匯出槽 ${x.slot}`;
        exp.onclick = () => { try { const r = exportTransferBackup(store.getItem(x.key)); if (!r.ok) { msg.textContent = r.error; return; } downloadBytes(r.bytes, `homestead-slot-${x.slot}.json`); msg.textContent = '已準備備份下載；請確認下載檔存在，並以匯入驗證。'; } catch { msg.textContent = '無法準備備份；請保留現有存檔。'; } };
        row.append(exp);
      }
      list.append(row);
    } } catch { msg.textContent = '無法讀取本機轉接槽。'; }
  };
  input.onchange = async () => {
    const file = input.files[0]; if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('too large');
      const r = importTransferBackup(store, await file.text()); msg.textContent = r.ok ? `已回讀驗證，備份載入槽 ${r.slot}。` : r.error;
      if (r.recovery) { const recover = document.createElement('button'); recover.textContent = '下載回復位元'; recover.onclick = () => { const b = exportTransferBackup(r.recovery); if (b.ok) downloadBytes(b.bytes); }; msg.append(recover); }
    } catch { msg.textContent = '匯入失敗；請保留原備份與存檔。'; }
    input.value = ''; window.dispatchEvent(new Event('transfer-saves-changed')); refresh();
  };
  window.addEventListener('transfer-saves-changed', refresh);
  refresh(); return refresh;
}
