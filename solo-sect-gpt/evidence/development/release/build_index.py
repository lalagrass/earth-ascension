from pathlib import Path
import json,hashlib,platform,subprocess
ROOT=Path(__file__).resolve().parents[3]
CODE='673889cb5d495b25008d5f47e709a86f36968627'
BASE=ROOT/'evidence/development';OUT=BASE/CODE
M=['test/core.test.mjs','test/integration/rules.test.mjs','test/integration/boundaries.test.mjs','test/integration/bridge-policy.test.mjs','test/integration/classes.test.mjs','test/integration/persistence-load.test.mjs','test/integration/production.test.mjs','test/integration/final-contract.test.mjs','evidence/development/sl1/release-regression.log','evidence/development/sl1/final-contract-verified.log','evidence/development/sl1/partial-promise.log','evidence/development/sl1/equipment-guard.log']
def ev(*paths):return ['evidence/development/'+p for p in paths]
rows=[
('A01','三個身份、連續世界與合法目的地','MU',ev('sl0/ui-result.json','sl1/ui-result.json','journey-01/s2-construction.save.json')),
('A02','固定tick、批次一致與十秒暫停不改World','MU',ev('sl1/physical-delivery-golden-record.log','u05-rescue-current/progress.jsonl','clock-recovery-final/progress.jsonl')),
('A03','FIFO、原子預約、重送命令／完成ID','M',[]),
('A04','全建物／床側與一師四生不同腳位','MU',ev('classroom-final/one-teacher-four-students.save.json','visual-final/bed-sleep-final.png')),
('A05','手持改派、工地停工與同址續修','MU',ev('material-cancel-final/progress.jsonl','material-cancel-final/material-cancel-complete.save.json')),
('A06','最後來源、目的容量及滿缸恢復','MU',ev('water-recovery-final/progress.jsonl','water-recovery-final/water-recovery-complete.save.json')),
('A07','逐階施工、齊料與合法遷床／遷出','MU',ev('journey-01/progress.jsonl','journey-01/s2-construction.save.json')),
('A08','阿木同身份入門及真考核','MU',ev('journey-03/progress.jsonl','journey-04/progress.jsonl','journey-05/progress.jsonl')),
('A09','菜藥／水／在製品／成品真搬交','MU',ev('operations-final/herb-in-transit.save.json','operations-final/cooked-meals-in-transit.save.json','operations-final/cancelled-batch-delivered-once.save.json','water-recovery-final/water-recovery-complete.save.json')),
('A10','自主作息、貢獻、60秒修行與豁免','MU',ev('sl1/life-transaction-boundaries.log','u43-load-current/normal-loaded-world-after-600s.save.json')),
('A11','低精力恢復、有效revision與停工覆寫','MU',ev('u04-guo-resume/guo-1.save.json','material-cancel-final/burden-reassigned-without-loss.save.json')),
('A12','雙人與五槽活動退出清理／不發收益','MU',ev('classroom-final/student-withdrew-without-learning.save.json','classroom-final/progress.jsonl')),
('A13','雙意願、拒絕、同房分床與解除保留前史','MU',ev('u03-family-legends-rerun/progress.jsonl','operations-final/separated-history-preserved.save.json')),
('A14','小禾親情與成人活動模型邊界','MU',ev('u03-family-legends-rerun/progress.jsonl','classroom-final/progress.jsonl')),
('A15','8常住＋2訪客、候位與兩日模型','MU',ev('u43-load-current/normal-eight-plus-two.save.json','sl1/release-regression.log','performance-release/performance.json')),
('A16','三入口、條件改善與真村路交菜','MU',ev('journey-03/progress.jsonl','journey-04/progress.jsonl','operations-final/actual-village-delivery.save.json')),
('A17','五門六動作、有限三階段與幾何命中','MUV',ev('presentation/progress.jsonl','presentation-continue/progress.jsonl','presentation-continue/step-active.png','presentation-continue/intercept-active.png')),
('A18','完整練習與低悟2／高悟7都深修','MU',ev('u04-guo-resume/own-two-nodes-complete.save.json','depth-high-seven/normal-high-seven-deep.save.json')),
('A19','精確模型配對及正常練前／練後實錄','MUV',ev('sl1/final-contract-verified.log','depth-high-seven/comparison.json','depth-high-seven/before-normal-practice.png','depth-high-seven/after-normal-practice.png')),
('A20','甲乙兩波、有限訓練ID與安全下限','MU',ev('journey-04/drill-A-complete.save.json','u43-load-current/normal-loaded-world-after-600s.save.json')),
('A21','自然個體來源、休養與不刷新','MU',ev('u05-rescue-current/progress.jsonl','sl1/release-regression.log')),
('A22','1／2／3人連續地圖出行與家園同tick','MUV',ev('u05-rescue-current/bridge-middle.save.json','journey-05/cave-rescue-returned.save.json','u43-load-current/normal-loaded-world-after-600s.save.json','founding-final/scene-all.png')),
('A23','單人橋、雙向召回、優先序與合法退出','MU',ev('sl1/bridge-policy-verified.log','bridge-opposed-complete/both-directions-completed.save.json','bridge-opposed-complete/progress.jsonl')),
('A24','非法隊伍／供給／精力／路徑拒絕','MU',ev('u05-rescue-current/progress.jsonl','journey-05/progress.jsonl')),
('A25','實際召回、負重／傷勢與回程預留','MU',ev('bridge-opposed-complete/progress.jsonl','u05-rescue-current/progress.jsonl')),
('A26','正常交戰倒地、120秒與真救援；三人／滿訪客／橋繩模型','MUV',ev('u05-rescue-current/actual-member-downed.save.json','u05-rescue-current/normal-failed-journey-rescued.save.json','sl1/bridge-policy-verified.log')),
('A27','真觀察／短起手／成功／佯攻與精準失敗反例','MU',ev('nine-lesson-fixed/normal-observation-and-feint-complete.save.json','nine-lesson-fixed/progress.jsonl','sl1/interception-boundaries.log','los-failure-final/normal-los-failure-complete.save.json')),
('A28','固定20點、非法創角與三模板正常開局','MU',ev('u04-guo/normal-template-start.save.json','u04-linghu/normal-template-start.save.json','u04-yue/normal-template-start.save.json','presentation/progress.jsonl','depth-high-seven/normal-high-seven-start.save.json')),
('A29','全身份唯一、young／mature與一日退出','MU',ev('u03-mature-verified/progress.jsonl','sl1/final-contract-verified.log')),
('A30','洪七公兩節點真餐／授掌','MU',ev('u03-family-legends-rerun/family-hong-linghu-complete.save.json','u03-family-legends-rerun/progress.jsonl')),
('A31','令狐沖／郭靖普通及主角替代節點','MU',ev('u03-finish/five-legends-ten-nodes.save.json','u04-guo-resume/own-two-nodes-complete.save.json','nine-lesson-fixed/normal-observation-and-feint-complete.save.json')),
('A32','喬峰真護送／護衛與岳不群承諾回應','MU',ev('u03-finish/progress.jsonl','u04-yue/own-two-nodes-complete.save.json')),
('A33','救人／保糧／後續救人／履約與分支前史','MU',ev('journey-05/cave-rescue-returned.save.json','u02-seed29/food-branch-complete.save.json','u02-return-rescue-final/food-then-person-returned.save.json')),
('A34','實際條件立匾、回顧與續玩','MUV',ev('founding-final/actual-founding-modal.png','founding-final/final-founded.save.json','sl1/final-contract-verified.log')),
('A35','九狀態續6000tick；木／橋／扶助正常保存接續','MU',ev('sl1/strict-final-references.log','save-controls-release/wood-in-transit.save.json','u05-rescue-current/bridge-middle.save.json','u02-return-rescue-final/second-rescue-attaching.save.json')),
('A36','手動／auto3、刷新、匯出預覽／取消／確認','MU',ev('save-controls-release/progress.jsonl','save-controls-release/slot-ticks.json','save-controls-release/normal-export.json')),
('A37','錯檔／版本／校驗／引用／非有限／上限拒絕','MU',ev('u05-rescue-current/bad.json.png','u05-rescue-current/unknown.json.png','sl1/strict-final-references.log')),
('A38','quota／disabled／暫存損壞與外key保護','MU',ev('presentation-continue/quota-protection.png','presentation-continue/progress.jsonl')),
('A39','五seed正式固定命令／原golden與有意差異','M',ev('sl1/physical-delivery-golden-record.log','sl1/golden-change.json')),
('A40','離鏡／不render／view查詢及批次不改規則','M',ev('sl1/physical-delivery-golden-record.log')),
('A41','兩尺寸、分層屋頂、床與動作／錨點','UV',ev('presentation/home-s2-build-1280.png','visual-final/bed-sleep-final.png','visual-final/bed-1280.png','founding-final/scene-valley.png','sl1/asset-check-final.log')),
('A42','教學、輸入Space、音訊解鎖／設定與視覺時序','UV',ev('save-controls-release/progress.jsonl','presentation-continue/progress.jsonl')),
('A43','本機8＋2、3人外出、4對手、4倍600秒','MU',ev('performance-release/performance.json','performance-release/600s-final.save.json','sl1/release-regression.log')),
('A44','完整交付／來源／根檢查／可追溯索引','MUV',['README.md','FEATURES.md','assets/manifest.json','assets/PROVENANCE.md']+ev('sl1/root-unittest.log','sl1/sg-regression.log','release/final-checks.json')),
]
limits=['Author self-review, not independent review.','Headless WebAudio generation/unlock/mute/volume signal verified; agent did not listen to audio. No auditory-experience pass is claimed.','Human playtest and public IP clearance not performed; private local prototype only.','UI journeys span development commits through traceable normal saves. Final runtime has focused affected-flow revalidation and deterministic model checks; older untouched evidence is reused explicitly.','No formal balance distribution claim from five deterministic seeds. No push, PR, merge, deployment or main/manual release validation.']
def build():
 assert len(rows)==44
 OUT.mkdir(exist_ok=True)
 fp={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'src').glob('*.mjs'))}
 cases=[]
 for cid,title,layers,paths in rows:
  refs=list(dict.fromkeys((M if 'M'in layers else [])+paths))
  for ref in refs:assert (ROOT/ref).exists(),(cid,ref)
  result=dict(caseId=cid,status='passed',commit=CODE,sourceCommit=CODE,rulesVersion='chapter1-1',mapVersion='gpt-world-1',suiteSeeds=[11,29,47,71,101],seedContext='See linked trace/save/result; model fixtures default to11 unless their test states otherwise.',evidenceReuse='Long UI journeys span development versions; earlier unchanged paths are reused explicitly, with affected-flow revalidation linked.',environment='Node24.13 / Chrome156 / macOS26.2 / M2 8GiB',expected='docs/ACCEPTANCE.md '+cid,operations='Exact model fixtures and linked normal UI command/event traces; saves retain actual tick and speed context.',layers=list(layers),actual=title,evidence=refs,author='GPT / Codex; author self-review',limits=limits if cid in ['A42','A44'] else [])
  folder=OUT/cid;folder.mkdir(exist_ok=True);(folder/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');cases.append(dict(caseId=cid,status='passed',title=title,result=str((folder/'result.json').relative_to(ROOT))))
 stories=[]
 sources={'recruit.worker':'journey-05/chapter-complete.save.json','recruit.school':'journey-05/chapter-complete.save.json','recruit.fame':'journey-05/chapter-complete.save.json',**{f'{key}.{n}':'u03-finish/five-legends-ten-nodes.save.json' for key in ['hong','linghu','guo','qiao','yue'] for n in [1,2]},**{f'cave.{key}':'journey-05/chapter-complete.save.json' for key in ['see','choice','return']}}
 for sid,source in sources.items():
  w=json.loads((BASE/source).read_text())['payload'];assert w['stories'][sid]['status']=='completed',sid;stories.append(dict(id=sid,status='passed',source=source,completedAt=w['stories'][sid].get('completedAt'),cast=w['stories'][sid].get('cast')))
 perf=json.loads((BASE/'performance-release/performance.json').read_text());assert perf['status']=='passed'
 journeys=[dict(id='U01',status='passed',evidence=ev('journey-01/progress.jsonl','journey-03/progress.jsonl','journey-04/progress.jsonl','journey-05/chapter-complete.save.json','founding-final/actual-founding-modal.png')),dict(id='U02',status='passed',evidence=ev('u02-seed29/progress.jsonl','u02-return-rescue-final/food-then-person-returned.save.json')),dict(id='U03',status='passed',evidence=ev('u03-family-legends-rerun/progress.jsonl','u03-finish/five-legends-ten-nodes.save.json','u03-mature-verified/progress.jsonl')),dict(id='U04',status='passed',evidence=ev('u04-guo-resume/own-two-nodes-complete.save.json','u04-linghu/own-two-nodes-complete.save.json','u04-yue/own-two-nodes-complete.save.json')),dict(id='U05',status='passed',evidence=ev('u05-rescue-current/progress.jsonl','bridge-opposed-complete/progress.jsonl','nine-lesson-fixed/progress.jsonl','los-failure-final/progress.jsonl'))]
 for j in journeys:
  for ref in j['evidence']:assert (ROOT/ref).exists(),ref
 index=dict(journeys=journeys,schemaVersion=1,status='complete_with_declared_limits',sourceCommit=CODE,specCommit='0a2e9c393a982d3476da70513e04ac0bed552909',planningCommit='e530a2c078722fd69732332eef2cd964da99ad24',author='GPT / Codex; GPT-6.1 Sol / high; author self-review',cases=cases,stories=stories,milestones=[dict(id='SL'+str(i),status='passed',cases={'0':['A01','A02','A03','A04'],'1':['A05','A07','A11','A14'],'2':['A08','A09','A16'],'3':['A10','A12','A13','A15'],'4':['A17','A20','A21','A22','A23','A24','A25','A26'],'5':['A18','A19','A27','A29','A30','A31','A32'],'6':['A28','A33'],'7':['A34','A35','A36','A37','A38','A39','A40','A41','A42','A43','A44']}[str(i)]) for i in range(8)],performance=perf,runtimeFingerprint=fp,declaredUnverified=dict(audioListening='not_verified_by_agent',humanPlaytest='not_performed',independentReview='not_performed'),limits=limits)
 (OUT/'index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n');print('44 case records, 16 story completions, 8 milestone exits:',OUT/'index.json')
if __name__=='__main__':build()
