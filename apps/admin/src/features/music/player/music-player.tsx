import { useState } from 'react';

import { MusicFab } from './music-fab.js';
import { NowPlayingSheet } from './now-playing-sheet.js';
import { PlayerBar } from './player-bar.js';

/**
 * 播放器挂载点：有曲目时渲染桌面 docked 条 / 移动右下角悬浮入口 + 全屏「正在播放」。
 * 挂在 ConsoleShell 根部，跨路由播放不中断；无曲目时各子件自身不占空间。
 * NowPlayingSheet 常驻挂载（内容随曲目存在与否显隐），停止播放时退场动画完整走完。
 * composeMenuOpen：发布菜单展开期间隐藏移动端音乐入口，避免互相遮挡。
 */
export const MusicPlayer = ({
  composeMenuOpen,
}: {
  composeMenuOpen: boolean;
}) => {
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

  return (
    <>
      <PlayerBar />
      <MusicFab
        composeMenuOpen={composeMenuOpen}
        onOpen={() => setNowPlayingOpen(true)}
      />
      <NowPlayingSheet
        isOpen={nowPlayingOpen}
        onOpenChange={setNowPlayingOpen}
      />
    </>
  );
};
