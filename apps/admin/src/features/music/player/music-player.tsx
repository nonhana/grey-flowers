import { useState, type ComponentType } from 'react';

import { usePlayerStore } from '@/store/player';

import { MusicFab } from './music-fab';
import { PlayerBar } from './player-bar';
// 懒加载入口是模块级普通函数：React Compiler 不支持组件内的 import 表达式。
const loadNowPlayingSheet = () =>
  import('./now-playing-sheet').then((mod) => mod.NowPlayingSheet);

interface NowPlayingSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 播放器挂载点（ConsoleShell 根部，跨路由不中断）：桌面 docked 条 / 移动悬浮入口 + 全屏面板。
 * NowPlayingSheet 首次打开才懒加载并保持挂载；composeMenuOpen 时隐藏移动入口防遮挡。
 * 可见性纯派生：openTrackId 记录「为哪一首曲目打开」，曲目清空即收起，
 * 不需要 Effect 反写开关状态。
 */
export const MusicPlayer = ({
  composeMenuOpen,
}: {
  composeMenuOpen: boolean;
}) => {
  const [openTrackId, setOpenTrackId] = useState<number | null>(null);
  const [NowPlayingSheet, setNowPlayingSheet] =
    useState<ComponentType<NowPlayingSheetProps> | null>(null);
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id ?? null);
  const isOpen = openTrackId !== null && currentTrackId !== null;

  const openNowPlaying = () => {
    // 为当前曲目打开；无曲目时没有「为哪一首打开」的语义，面板不开。
    if (currentTrackId !== null) {
      setOpenTrackId(currentTrackId);
    }
    if (!NowPlayingSheet) {
      void loadNowPlayingSheet().then((component) =>
        setNowPlayingSheet(() => component),
      );
    }
  };

  return (
    <>
      <PlayerBar />
      <MusicFab composeMenuOpen={composeMenuOpen} onOpen={openNowPlaying} />
      {NowPlayingSheet ? (
        <NowPlayingSheet
          isOpen={isOpen}
          onOpenChange={(open) => {
            if (!open) setOpenTrackId(null);
          }}
        />
      ) : null}
    </>
  );
};
