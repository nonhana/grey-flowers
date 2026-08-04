import { useState } from 'react';

import { useAudioPlayer } from './audio-player-store.js';
import { MiniPlayer } from './mini-player.js';
import { NowPlayingSheet } from './now-playing-sheet.js';
import { PlayerBar } from './player-bar.js';

/**
 * 播放器挂载点：有曲目时渲染桌面 docked 条 / 移动 mini + 全屏「正在播放」。
 * 挂在 ConsoleShell 根部，跨路由播放不中断；无曲目时不占任何空间。
 */
export const MusicPlayer = () => {
  const player = useAudioPlayer();
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  if (player.currentTrack === null) return null;

  return (
    <>
      <PlayerBar />
      <MiniPlayer onOpen={() => setNowPlayingOpen(true)} />
      <NowPlayingSheet
        isOpen={nowPlayingOpen}
        onOpenChange={setNowPlayingOpen}
      />
    </>
  );
};
