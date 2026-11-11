import Game from './components/Game.tsx';

import { ToastContainer } from 'react-toastify';
// WUXIA-PATCH(W1): 拿掉上游 a16z／Convex 標誌與圖示（上游美術不在 repo）；標題、說明改繁中，關於頁註明基於 AI Town（MIT）
import { AboutContent, TownSubtitle, TownTitle } from './wuxia/Shell.tsx';
import { skinEnabled } from './wuxia/skin.ts';
const helpImg = '/ai-town/wuxia/ui/about.svg';
// import { UserButton } from '@clerk/clerk-react';
// import { Authenticated, Unauthenticated } from 'convex/react';
// import LoginButton from './components/buttons/LoginButton.tsx';
import { useEffect, useState } from 'react';
import ReactModal from 'react-modal';
import MusicButton from './components/buttons/MusicButton.tsx';
import Button from './components/buttons/Button.tsx';
import InteractButton from './components/buttons/InteractButton.tsx';
import FreezeButton from './components/FreezeButton.tsx';
import { MAX_HUMAN_PLAYERS } from '../convex/constants.ts';

export default function Home() {
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  // WUXIA-PATCH(W1): w01-skin 開啟時套用紙底墨框樣式（src/wuxia/wuxia.css）
  const skin = skinEnabled();
  useEffect(() => {
    document.body.classList.toggle('wuxia-skin', skin);
  }, [skin]);
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-between font-body game-background">

      <ReactModal
        isOpen={helpModalOpen}
        onRequestClose={() => setHelpModalOpen(false)}
        style={modalStyles}
        contentLabel="Help modal"
        ariaHideApp={false}
      >
        <div className="font-body">
          {/* WUXIA-PATCH(W1): 說明改成繁中的「關於」頁 */}
          <AboutContent />
        </div>
      </ReactModal>
      {/*<div className="p-3 absolute top-0 right-0 z-10 text-2xl">
        <Authenticated>
          <UserButton afterSignOutUrl="/ai-town" />
        </Authenticated>

        <Unauthenticated>
          <LoginButton />
        </Unauthenticated>
      </div> */}

      <div className="w-full lg:h-screen min-h-screen relative isolate overflow-hidden lg:p-8 shadow-2xl flex flex-col justify-start">
        <h1 className="mx-auto text-4xl p-3 sm:text-8xl lg:text-9xl font-bold font-display leading-none tracking-wide game-title w-full text-left sm:text-center sm:w-auto">
          {/* WUXIA-PATCH(W1): 標題「山腳鎮」 */}
          <TownTitle skin={skin} />
        </h1>

        <div className="max-w-xs md:max-w-xl lg:max-w-none mx-auto my-4 text-center text-base sm:text-xl md:text-2xl text-white leading-tight shadow-solid">
          <TownSubtitle skin={skin} />
          {/* <Unauthenticated>
            <div className="my-1.5 sm:my-0" />
            Log in to join the town
            <br className="block sm:hidden" /> and the conversation!
          </Unauthenticated> */}
        </div>

        <Game />

        <footer className="justify-end bottom-0 left-0 w-full flex items-center mt-4 gap-3 p-6 flex-wrap pointer-events-none">
          <div className="flex gap-4 flex-grow pointer-events-none">
            <FreezeButton />
            {/* WUXIA-PATCH(W1): 上游背景音樂不在 repo，換皮時不顯示音樂鈕 */}
            {!skin && <MusicButton />}
            <InteractButton />
            <Button imgUrl={helpImg} onClick={() => setHelpModalOpen(true)}>
              關於
            </Button>
          </div>
        </footer>
        <ToastContainer position="bottom-right" autoClose={2000} closeOnClick theme="dark" />
      </div>
    </main>
  );
}

const modalStyles = {
  overlay: {
    backgroundColor: 'rgb(0, 0, 0, 75%)',
    zIndex: 12,
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    maxWidth: '50%',

    // WUXIA-PATCH(W1): 紙底墨框（上游字型不在 repo）
    border: '3px solid #2b2119',
    borderRadius: '2px',
    background: '#f7f0de',
    color: '#2b2119',
    fontFamily: '"Noto Serif TC", "Noto Serif CJK TC", serif',
  },
};
