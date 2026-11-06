# 可見招式（N48）

所有武學的 `routine` 是資料欄位；拳、掌、腿、劍、刀、棍各有明標「通用套路」的基本式。`routines.mjs` 的每式列出四個姿勢 ID，`pose-render.mjs` 只讀姿勢資料、人物外觀、朝向與模擬時間，補間並畫出同一副人物骨架。地圖交手也透過同一組姿勢和補間器顯示起手、出手、收招；截擊、進身閃、招架有各自的姿勢。渲染不呼叫亂數、不改任務、收益、招式判定或存檔。

羅漢十八手採釋德建系 22 段招名與順序，含朝山拜佛起勢、歸山拜佛收勢。2017 年[禪武醫研究院圖文](https://www.sohu.com/a/207559342_768497)和 2010 年[獨立招序記錄](https://alphabethankakueisuj.livedoor.blog/archives/1642688.html)均列出這套順序。1926 年[《先天羅漢拳十八手圖勢》](https://via-hygeia.art/xiantian-luohan-quan-illustrated-postures-of-the-eighteen-hands-a-critical-edition-and-study-in-republican-era-martial-arts-modernity/)是另一套 18 式，無法拿它的圖冒充德建系 22 段；其版權頁亦寫有保留版權。現代圖文的插圖授權未證實。本專案不收錄、不描摹兩者插圖；22 段的關鍵架子全部自行擺出。第八輪只建立 `luohan18` 套路資料，現行武學尚未有羅漢拳資料列，故正常弟子目前練的是各類通用套路；第十輪 N40 引入拳譜時才把 `routine: 'luohan18'` 接到新武學，沿用 `LUOHAN_EIGHTEEN_HANDS`，不把現有基礎拳冒稱羅漢拳。

每式 2 秒加新手最多 0.5 秒停頓，目標是在 30 秒早課中能辨出多式變化，又看得出高手的接式比較順。每式前段停頓占新手 18%，隨既有武學熟練值縮短；新手每五式有一次短暫擺錯架子再改。這些秒數和頻率只供畫面取樣，沒有寫入模擬。骨架以腳底為錨點，高約 57 畫面單位，沿用原人物圖在地圖上的約 55 單位高度；兵器用同一握點畫出。

正常第十日角色的頭上「（通用套路）」標記實拍見 `artifacts/round8/n48-label-generic.png`。套路連線核對見 `n48-routine-reachability.json`：目前 115 門武學分屬六種通用類別，沒有一門冒稱羅漢拳；`luohan18` 預覽可走遍 22 個不同式名。N40 引入拳譜時才有正常角色會練這 22 段。
