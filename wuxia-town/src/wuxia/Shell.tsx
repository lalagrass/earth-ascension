// 武俠小鎮 W1：標題、副標、關於頁（App 與截圖頁共用）。
import { MAX_HUMAN_PLAYERS } from '../../convex/constants';

export function TownTitle({ skin }: { skin: boolean }) {
  if (!skin) return <>AI Town</>;
  return (
    <>
      山腳鎮<span className="wuxia-title-seal">武俠</span>
    </>
  );
}

export function TownSubtitle({ skin }: { skin: boolean }) {
  if (!skin) return <>A virtual town where AI characters live, chat and socialize.</>;
  return <span className="wuxia-subtitle">山腳下的古鎮：鎮民挑水、開店、練拳，破武館重開，有人拜師、有人切磋，外地人帶來江湖傳聞。你可以快轉看，也可以化身一位鎮民住進來。</span>;
}

export function AboutContent() {
  return (
    <div className="wuxia-about">
      <h1 className="text-center text-4xl font-bold font-display game-title">關於山腳鎮</h1>
      <p>
        拖曳地圖可以移動，滾輪或雙指可以縮放。點地圖上的人物，右邊會顯示他在哪裡（例如「在茶館附近」）和最近的談話。
      </p>
      <p>
        左上角是時辰（十二時辰＋第幾日），跟著遊戲時鐘走：1 實秒＝1 遊戲分，一天 24 實分鐘。入夜（戌時到寅時）畫面偏藍暗，黃昏偏橘，這只是畫面，不影響鎮民做什麼。
      </p>
      <p>
        按「進鎮」可以化身一位鎮民走進來，點人物「上前攀談」就能跟他說話。同時最多 {MAX_HUMAN_PLAYERS}{' '}
        位玩家；閒置太久會被請出鎮。
      </p>
      <p>
        本作基於 <a className="underline" href="https://github.com/a16z-infra/ai-town">AI Town</a>
        （a16z-infra/ai-town，MIT 授權），程式改動清單見 <code>wuxia-town/UPSTREAM.md</code>。
        地圖、人物、介面圖示都是本專案自製，來源列在 <code>public/wuxia/CREDITS.md</code>；上游的美術與音樂不在本 repo。
      </p>
    </div>
  );
}
