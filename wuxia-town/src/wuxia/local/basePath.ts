// 武俠小鎮 A5（#577 第 1 節）：網站不放在 /ai-town/ 時（例如 GitHub Pages 的 /<repo>/ai-town/）的素材網址轉換。
// 世界狀態與資料裡的素材網址固定是 /ai-town/...（地圖網址進 hash，不能改），所以只在畫面這一側把
// 圖片的 src、fetch 與 inline style 的 /ai-town/ 換成實際的 BASE_URL。base 是 /ai-town/ 時什麼都不做。
const BASE = import.meta.env.BASE_URL;
const FROM = '/ai-town/';

export function assetUrl(u: string): string {
  return BASE !== FROM && u.startsWith(FROM) ? BASE + u.slice(FROM.length) : u;
}

if (BASE !== FROM && typeof window !== 'undefined') {
  const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!;
  Object.defineProperty(HTMLImageElement.prototype, 'src', {
    ...desc,
    set(this: HTMLImageElement, v: string) {
      desc.set!.call(this, assetUrl(String(v)));
    },
  });
  const f = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => f(typeof input === 'string' ? assetUrl(input) : input, init)) as typeof fetch;
}
