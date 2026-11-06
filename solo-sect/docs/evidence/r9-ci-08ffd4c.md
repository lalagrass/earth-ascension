# 已推08ffd4c的真CI：不是全綠，也不只golden

https://github.com/lalagrass/earth-ascension/actions/runs/42264044113

head08ffd4c9a833f9e4e3d7692c8895b535d5b68f30，台北時間2026-11-07 01:42開始。5個其他job成功；山門紀Quick失敗，629 tests /551 pass /78 fail，後續獨立golden步未完成。不能用舊N54綠燈或本地smoke代替。

失敗包含N14前搖/架勢/看破、N15/N28近戰、N16/N27截擊、N31b、golden quick/舊檔、現行版本遷移、新出身替換舊固定角色後的狩獵/角色卡/門派/名俠fixture、資源不變式等。例：N14還期待空架勢後立即回一半（N37已改真回正）、化境前搖不同（N33手熟與下限改了起點解讀）、N50招募不能再只設名聲床位便當成功。**不能直接把78個全部稱預期fixture差異**：需逐一判斷真規則缺陷或與新規格不符的舊fixture，保留有效不變式；不得刪測試/降門檻湊全綠。

本輪改了出生/招募/教學/所有交手/存檔資料，這些失敗涉及所改共同通路，目前沒有證據是『沒改到地方的CI/基建壞掉』，不援用停止條件3，不停工。CI完整failed log已存box /workspace/specs/t200u-live/r9-ci-08ffd4c-failed.log、failed-names.txt供後續逐項定位。新2b7da38後未冒稱此舊head結果代表新head，後續push新CI仍須核實。3.4/MIGRATIONS/golden尚未收尾。

## 逐項排單（不是78項已修）
[78筆索引](r9-ci-08ffd4c-triage.tsv)：{'combat': 14, 'golden': 11, 'save': 1, 'world-social': 26, 'admission-origin': 23, 'enemy-data': 1, 'ledger': 2}。每筆都有類別與未定結論；不把「可能是fixture」當作已證明。單調性、近戰位、資源非負/帳本對帳、load冪等仍是有效不變式；只有不符新issue的舊前提才可更新。

已從完整CI實際diff核對：
- #79 load在origin-1/2補away:false、best:0、insight:{}等，表示新角色初始化缺欄，**不是應刪的冪等測試**；待N33來源修復。
- #375只有`food - wuxia:xiaResolve`未登記；#376另有`food + sim:finishTrial`。前者是N50飯局真扣ACTIVITIES.eat.use.food，走resAdd/原每日帳本；後者只是原trialStep的2食物獎勵抽出finishTrial，未改數量。這次只在WHITE登記兩個確切來源並註明理由，未放寬非負、期初+Σ異動=期末、ledgerΣ=實際異動。仍交CI驗，不宣稱兩個長測已過。
- #318唯一數值diff為80 vs28，須查狗的共同追及尺度與原資料表前提，不未讀issue就把80直接改回28或反向改斷言。

f9d1c77的新run42266926080也已completed/failure，其他5job成功；不是本次5106f72的CI。下一輪push後另核實head。

### N33 已修#79來源缺欄（仍交CI判定）
`mkDisciple`共同建構器現在一律建立best:0/insight:{}/away:false，讓兩個新出身同行與後續一般招收者在出生就符合save.ensure的既有基準，不在load才增欄。只補空戰史/在場狀態，不灌能力/成長。原N33唯一小測試延伸檢查全體初始欄位，smoke仍19/19；未改rules-upgrade.test的深比較、沒有把load冪等測試刪掉，未本地跑整套或另開長probe。
