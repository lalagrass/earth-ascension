// 武俠小鎮 A1：單機版的主執行緒會 import 上游的 World／Player 類別，那些檔案同時定義了 Convex 函式（mutation、action）。
// 單機版從不呼叫 Convex，convex 套件的「Convex functions should not be imported in the browser」是誤判；
// 用 convex 提供的開關關掉（必須在其他 import 之前執行，所以獨立成第一個 import 的模組）。
(window as any).__convexAllowFunctionsInBrowser = true;
export {};
