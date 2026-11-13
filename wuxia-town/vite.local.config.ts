// 武俠小鎮 A1（#564 第 1 項）：npm run build:local → dist-local/，純靜態網站（引擎在 Web Worker，不連後端、不打 LLM）。
// 畫面與資料裡的素材網址都是 /ai-town/...（狀態裡的地圖網址進 hash，不能改），所以網站放在 dist-local/ai-town/，
// dist-local/index.html 轉到 ./ai-town/。任何靜態主機（npx serve dist-local、nginx、GitHub Pages 的使用者網域根目錄）都能放。
// public/assets（上游美術，不在 repo）即使本機有也不會打包：publicDir 只用 public/wuxia。
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { cpSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';

const OUT = resolve(__dirname, 'dist-local');

export default defineConfig({
  base: '/ai-town/',
  root: resolve(__dirname, 'src/wuxia/local'),
  plugins: [
    react(),
    {
      name: 'wuxia-local-public',
      closeBundle() {
        // 只複製自製素材 public/wuxia（含 CREDITS.md）
        const src = resolve(__dirname, 'public/wuxia');
        if (existsSync(src)) cpSync(src, resolve(OUT, 'ai-town/wuxia'), { recursive: true });
        writeFileSync(
          resolve(OUT, 'index.html'),
          '<!doctype html><meta charset="utf-8"><title>山腳鎮</title><meta http-equiv="refresh" content="0; url=./ai-town/"><a href="./ai-town/">山腳鎮</a>\n',
        );
      },
    },
  ],
  publicDir: false,
  worker: { format: 'es' },
  build: {
    outDir: resolve(OUT, 'ai-town'),
    emptyOutDir: true,
    assetsDir: 'app',
    chunkSizeWarningLimit: 4000,
  },
});
void mkdirSync;
