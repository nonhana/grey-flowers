import { useState, type ComponentType } from 'react';

import { MusicFab } from './music-fab.js';
import { PlayerBar } from './player-bar.js';

interface NowPlayingSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 播放器挂载点（ConsoleShell 根部，跨路由不中断）：桌面 docked 条 / 移动悬浮入口 + 全屏面板。
 * NowPlayingSheet 首次打开才懒加载并保持挂载；composeMenuOpen 时隐藏移动入口防遮挡。
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
