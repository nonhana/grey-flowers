import { useState, type ComponentType } from 'react';

import { MusicFab } from './music-fab.js';
import { PlayerBar } from './player-bar.js';

interface NowPlayingSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 播放器挂载点：有曲目时渲染桌面 docked 条 / 移动右下角悬浮入口 + 全屏「正在播放」。
 * 挂在 ConsoleShell 根部，跨路由播放不中断；无曲目时各子件自身不占空间。
 * NowPlayingSheet 首次打开才懒加载（交接 P2，BottomSheet/motion 只进懒模块）；
 * 加载后保持挂载（内容随曲目存在与否显隐），停止播放时退场动画完整走完。
 * MusicFab 有曲目才出现，跨路由常驻的只有 PlayerBar。
 * composeMenuOpen：发布菜单展开期间隐藏移动端音乐入口，避免互相遮挡。
 */
export const MusicPlayer = ({
  composeMenuOpen,
}: {
  composeMenuOpen: boolean;
}) => {
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [NowPlayingSheet, setNowPlayingSheet] =
    useState<ComponentType<NowPlayingSheetProps> | null>(null);
  const openNowPlaying = () => {
    setNowPlayingOpen(true);
    if (!NowPlayingSheet) {
      void import('./now-playing-sheet.js').then((mod) =>
        setNowPlayingSheet(() => mod.NowPlayingSheet),
      );
    }
  };

  return (
    <>
      <PlayerBar />
      <MusicFab composeMenuOpen={composeMenuOpen} onOpen={openNowPlaying} />
      {NowPlayingSheet ? (
        <NowPlayingSheet
          isOpen={nowPlayingOpen}
          onOpenChange={setNowPlayingOpen}
        />
      ) : null}
    </>
  );
};
