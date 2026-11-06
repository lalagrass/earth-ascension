# N50 共用learn來源修正checkpoint

2026-11-07 台北時間。不是整輪通過；N36兩路、N35/N38自然護欄、N50名俠數仍未過。

## 確定的旁路及修正
舊`sim.mjs doTask`在單人learn倒數結束，只因pendingArt存在就learnArt並寫「師父傳授」，沒有任何師父/教材。`bonds.learnManual`也是按鈕立即入門；`startTeachArt`尚未到外功場便入門。三者現在由同一lessonSource/lessonValid/completeLesson處理（bonds.mjs），資格不是教材：
- 未知正式武學要有真庫存秘笈，或canTeachArt許可的真師父（沿用N12既有火候/師徒/好感/代價/門派限制，不另造老師能力常數）。
- 秘笈按鈕只預約真書uid/排研讀；人走到場、花durOf(learn)真秒數才消耗該本並入門。同一本不能被兩人預約/研讀；改派取消預約，任務中斷不吞書。舊無source的單人learn任務不會授藝。
- 真師父走既有teachStep兩人站位/actor互斥、到場才累積introSeconds；沒來/倒下/忙著交手不算。入門需要同一durOf(learn)，預約答應不立即入門。師父仍按N12實際半日session留下來指點，不把新的身體guidance當成舊正式learn已真實。
- 時長沿現有hall.learnDur與library縮時（初始8秒），接觸距離沿現有N13的60px、健康界線沿舊canTeachArt；沒有新平衡常數或機率。
- 完成記lesson真來源、參與者、seconds/required事件。UI不再把只有資格說成已有師父。舊檔已學會的武學不抹除；新孩子不繼承父母的教材預約。
- 舊pass仍是原有雙人20秒共同任務，不是這次發現的單人learn旁路。江湖殘頁、周伯通/高人等既有具名來源未刪，N51事件/僥倖/出現率未改。

## 指令、門檻、真輸出
`bash solo-sect/test/run.sh smoke`：19/19、fail0；只延伸原N50唯一小測試，不加第2測試。無來源pending經真10秒仍未知；書按鈕不立即授藝，真8秒讀完才消耗；師父答應不立即授藝，真兩人共同8秒才入門。stdout的`N50 source proof`可直接複驗，保存r9-n50-lesson-proof.json：書事件t19.75/seconds8/required8/manual-1，師徒事件t22.75/seconds8/required8/hero→origin-1。這是明標單元fixture，不是自然招募或30日護欄證明。

N12/v100既有測試相應改為「預約不入門、真到場耗時才入門」，沒有新增測試數；未在本地另跑它們或full suite，交CI。

## 真自然30日診斷（不是N55輪替）
```
node solo-sect/tools/white-body.mjs --seed 17 --types ISTJ --days 30 --events out/source.events.jsonl > out/source.json
```
只用公開白身人格與換日botDaily（建宿舍/可招才招），不指派戰鬥、不補HP/資源/n/f。新工具欄lessonEvents/exposure/finalEyes與--events全量JSONL可追每個事件；不開--check的單人格診斷不能冒充三人格/12seed護欄。

真輸出：35,300 practice、121 tactic、99 escape、56 work、127 choice，**exchange=0、lesson=0**。主角finalEyes={}、真拿手招null、N35首悟null、單獨趕豬null，名俠0，只d8過「躲豬能力」；自然日數門檻仍未過。不能用無實戰曝光的這一局推論任何會主動練拳/守山的玩家都不成長，也不能為它直接改世界常數。

原始r9-n50-source-natural17.events.jsonl.gz（6,867,492 bytes解壓）/摘要r9-n50-source-summary17.json；解壓SHA256 `8f573b583a9aa779ce30da7453893883462f43cf4b8035980fb58094471459d4`。同seed重跑可複驗。不因露出FAIL就隱藏事件。

另揭露既有N7自悟是**不同來源旁路候選**：pending資格仍可讓comprehend從全表「自悟」正式功法，原始context逐條保留；本次關閉單人「師父傳授」不代表此路也已修。下一個獨立修正須讓觀摩/回想確有真示範來源，保留正當觀摩/原創土招機制；不藉刪具名江湖事件遮掉正式武學。
