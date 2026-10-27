# PUBLIC-RELEASE-01 — #375

實際作者 Codex Cloud `/root/presentation366_author`（非grass），host `dddd1088786f`，新隔離 checkout `/workspace/public-release375-author`，branch `codex/375-public-kit-release`，base origin/dev `00f4dbe26be5765a9622957b7c6a636ab5039f96`。本包是新批准的中央公版產品，不重開已完成 #346/#356/#365。

## 交付與可看入口

首個整包 **public-kit@1.0.0 候選**；只有本新PR／接受SHA與CI收據才能封存發布，舊00f4dbe不是已發布1.0.0。詳細[發布清單／API／版本政策／CHANGELOG／流程](../public-kit/README.md)與[精確檔案／hash清單](../public-kit/releases/1.0.0.json)合併保存，避免多個空殼文件。

玩家正式入口不變。中央試點是既有 `scene-shared/harness/?core=gpt&releaseSha=FULL_NEW_CANDIDATE_SHA`：明標開發證據，同一真固定GPT core；runtime/optional scene從薄入口載入，顯示caller receipt。選可見人物、開原公開卡片、定位已知設施；paused完整world前後相同。這不是三原作者最新分支升級，也不是第二正式玩家入口。

發布資料分DOM/data runtime閉包、optional Pixi8.14.0＋MIT license、明選素材pack、adapter/host參考及development-only固定cores/check/evidence。未搬demo/core，不npm/根依賴CI/權限/main/GitHub global release。素材resolver仍按原identity映射，權利不因發布補足。

## 00f4dbe → 1.0.0 遷移

先把舊00f4dbe checkout／receipt保存。拿新接受SHA對應的release清單，逐檔按相對路徑取runtime，依需要加optionalScene與**一個**素材pack；先驗hash再接線。`release.mjs receipt FULL_NEW_SHA gpt ADAPTER_ID FULL_NATIVE_CORE_SHA`對該Git object取bytes產生小receipt；不要只改版號字串、跟dev/latest或全局替換三方pin。

舊接線（仍可在legacy pin續用）：

```js
import {renderCard} from '../character-card/render.mjs';
import {navigationView} from '../navigation-view/contract.mjs';
import {createSceneRenderer} from '../scene-shared/renderer.mjs';
```

新接線（相同公開view與host命令，不改core）：

```js
import {renderCard, Navigation, Assets, createCamera,
  createConsumerReceipt, withObservation, localNavigationInput,
  positionForOwner} from '../public-kit/index.mjs';
import {createSceneRenderer} from '../public-kit/scene.mjs'; // only if Pixi scene needed
import {pin} from '../assets/shared/pins/gpt.mjs'; // this consumer chooses its own immutable pack
const publicCard = nativeAdapter.card(actorId); // disclosure and inverse-derived masking happen HERE
root.innerHTML = renderCard(withObservation(publicCard, {
  branch: nativeBranch, sha: fullCoreSha, writer: actualWriter, mode: nativeMode, tick: nativeTick,
}));
const at = positionForOwner({owner: currentProvenOwner,
  scenePosition: publicWorker.scenePosition,
  lifePosition: publicWorker.lifePos, routePosition: nativeRouteProjection});
// Missing selected owner's position => null, not a fallback to another authority.
const input = localNavigationInput({definition: nativeRegionBounds,
  snapshot: nativePublicSnapshot, camera: nativeWorldCamera,
  viewport: pixelViewport, origin: actualNativeRegionOrigin});
const navigation = Navigation.navigationView(input);
```

以上native變數由各host提供，不是公版自建世界／取得未公開資料的API。原點0的GPT試點可直接用既有local SceneSnapshot；Grok HOME若非零，world camera和feet/facilities要一起減真origin，不能只填width/height。該helper限navigation，清空events/art，完整場景切區需原host自己處理。世界不因此換座標或傳送。

舊renderCard／value／可用性／命令ID與原focus策略不必重寫。optional observation不要求三方新增保存歷史；initial沒有可信每人開局記錄就unknown/unsupported。field只遮罩raw value，source本身必須先是public-safe。無公式不等hidden；不能顯示直接反推秘密的精確來源／理由／衍生值。原motion的strike是native recovery內視覺定格，無phase不硬補；portrait底部不是body collision foot。

### 三方能力與成本（不改正在開發的包）

| 消費者 | 目前固定來源與可保留項 | 未來自選升級的薄工作 |
|---|---|---|
| #372 GPT | **仍00f4dbe**，原卡片/遮罩/導覽/core保留，不等#375 | 可切薄import與receipt；維持原visibleEntity/反推遮罩／Q尺度及原phase；本中央只試固定6cbd3e6，不稱52979ec或原最新分支已採用 |
| #373 Gemini | **仍00f4dbe**，原Worker/Persona/四設施包scope與DoD不變 | 本人核writer/同步時點與autopilot→manual/reset位置持有，可信每人initialLevel/speedsInitial；缺值不借Persona；可選observation/owner helper，不只改SHA刪guard |
| #374 Grok | **仍00f4dbe**，門派內原素材／角色／HOME包保持 | 本人提供真region origin/bounds/camera；用同轉換投影，不把舊node推測當新HOME；原無phase/路線就缺項，away清暫態 |

三方互不等、不改作者branch/box/未提交成果，升級另開自己的小包。中央release接受不自動更新三方。完整圖庫、公式統一、新人格效果、保存升版與手機仍原議程，後兩項最後。

## 直接驗證與收據

- 依賴閉包/hash：`node sect-chronicle/public-kit/tools/release.mjs verify`；runtime閉包不能含sources/check/evidence/pins/Pixi；optionalScene精確列本地Pixi與license。缺檔/未宣告私有import/hash改動有反例。
- 語義反例：`node --test sect-chronicle/public-kit/checks/release.test.mjs`，涵蓋legacy/floating pin拒絕、四版號隔離、真0與可信初值缺項、owner不借stale位置、非零region camera/feet/anchor、facility/resource hidden tooltip/source。
- 一段Cloud桌面：`node sect-chronicle/public-kit/checks/desktop-check.mjs FULL_CANDIDATE_SHA`，最多自有一page/context/browser/server:8838順次正式受影響設施面板→中央原GPT release試點，finally清理並還原viewport。不做全角色/武學/倍率/長seed/手機/保存矩陣；未變#342～#371證據直接復用。
- 首個implementation commit可供真harness pin，之後只加證據/docs並比對runtime/manifest hash不變；最終PR-head及接受SHA的完整receipt在PR/#375外部回填，避免自指SHA與發布內容原地改寫。作者只交candidate；grass非作者review/#67正常鎖head dev/postCI後才接受。

現session無Serena工具，checkout/可讀agent目錄無該初始手冊，已在claim報缺口；實際使用Cloud rg/git/GitHub及既有Playwright/Chromium，不假稱模型/工具已設。其他原作者與Mac不動。

## 同PR補修短prompt

> 只補#375原PR：先核有效claim/head/base、草稿/接受狀態、closure內容及grass新差異。保留v1呼叫與舊00f4dbe三方pin；breaking列next major/preview，不默改v1。runtime不攜core/fixtures，receipt鎖新來源SHA＋release manifest hash＋明選assetpin＋adapter/core，不將舊baseline宣稱1.0.0。僅驗受影響反例/必要CI，既有真固定GPT隔離試點與finally清理；不進原作者branch/box、根/CI/依賴/保存/手機。交grass集中非作者review，不自審合或占#67票；本新單包收尾後休息，不啟後包/巡檢。


### 作者實際驗證收據（待非作者review）

實作候選來源 `0972c2dc8f79f7def38024a0a2f58e2aeb52734d` 已供上述真試點pin。發布JSON實檔SHA256 `5bd159aca9fbc81695ca239c9217a81ce24b00819eee0c2f9fd48f091c3ea992`；內容摘要 `5d9e5b6e56e7f3b45e2a94b2cb80489ea9323e79f91222f5756e0540b152fd46`。DOM/data30檔、optionalScene5檔＋license；確切清單在manifest，不含固定core/測試。

局部5/5、必要Python53/53、現行game快驗450/450、m2/app語法與diff通過。之後僅加工具對adapter參考hash的校驗/負例並重跑局部5/5，runtime/manifest從候選來源至最終head內容不變；不重跑無關矩陣。Cloud Chromium154桌面9checks／0pageerrors，一次通過；[真試點圖](../public-kit/evidence/fixed-gpt-release-pilot.jpg)、[desktop實際receipt／清理](../public-kit/evidence/desktop-results.json)、[摘要](../public-kit/evidence/test-summary.json)。正式設施/資源讀取、中央真core選人/讀卡/定位前後完整world相同；初值缺項、原生2400×1800／route unsupported保持。

所有自有page/context/browser/server已關，自有viewport還原；事後無8838或本包browser-check殘留。最終PR-head receipt及當前CI在PR/#375回填，接受SHA/postCI由grass完成；不將候選source稱為已發布。Mac/他人服務未動，未開後包或巡檢。
