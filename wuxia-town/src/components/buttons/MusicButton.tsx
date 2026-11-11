import { useCallback, useEffect, useState } from 'react';
// WUXIA-PATCH(W1): 上游 assets/volume.svg 不在 repo，改用自製圖示
const volumeImg = '/ai-town/wuxia/ui/music.svg';
import { sound } from '@pixi/sound';
import Button from './Button';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export default function MusicButton() {
  const musicUrl = useQuery(api.music.getBackgroundMusic);
  const [isPlaying, setPlaying] = useState(false);

  useEffect(() => {
    if (musicUrl) {
      sound.add('background', musicUrl).loop = true;
    }
  }, [musicUrl]);

  const flipSwitch = async () => {
    if (isPlaying) {
      sound.stop('background');
    } else {
      await sound.play('background');
    }
    setPlaying(!isPlaying);
  };

  const handleKeyPress = useCallback(
    (event: { key: string }) => {
      if (event.key === 'm' || event.key === 'M') {
        void flipSwitch();
      }
    },
    [flipSwitch],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <>
      <Button
        onClick={() => void flipSwitch()}
        className="hidden lg:block"
        // WUXIA-PATCH(W1): 介面繁中
        title="播放音樂（按 m 開關）"
        imgUrl={volumeImg}
      >
        {isPlaying ? '靜音' : '音樂'}
      </Button>
    </>
  );
}
