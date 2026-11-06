# N50 舊外門fixture來源修正（2026-11-07 台北）

最新ebd3817 CI 42274195069的v085十項失敗中，最先例外是`JSON.parse(JSON.stringify(undefined))`：`mkOuter`硬找`cousin`，但#464「要做」第3點明確要求新局拿掉固定堂弟/林師姐，兩位同行從出身產生，舊存檔兩人保留。真新局現在是`sim.createState → originPeople → mkDisciple + originRelation`，不是任意缺人。

僅把同一個舊fixture的克隆來源改為新局真有的`originRelation`同行，新增assert來源存在；外門id與uid皆改成新fixture id，避免克隆相同uid。**沒有改世界角色、角色數/免雜務/日課/貢獻/考核/資源非負/帳本/冪等任何斷言**。沒有把正式入門來源換成測試假老師，沒有改教材/領悟/事件/招募率。舊存檔行為不變。

本地只跑`bash solo-sect/test/run.sh smoke`，預期19/19；v085完整長跑仍交山門紀CI。此修正只排除來源undefined，**不能在CI未跑前宣稱原十項全部已過**，新白身的考核/工作/資源若仍有真問題需接著修。其餘study coverage、木樁場、心情、N34/N36/N35/N38/N50自然門檻仍未因此解決。
