import { Disc3 } from 'lucide-react';

import { usePlayerStore } from '@/store/player.js';

/**
 * 移动端右下角音乐管理入口：圆形悬浮按钮，悬于发布 FAB 正上方。
 * 有曲目时出现、清空后消失；点击展开全屏「正在播放」。
 * 发布菜单展开期间让位隐藏——菜单子按钮的堆叠区正好覆盖本按钮位置。
 */
export const MusicFab = ({
  composeMenuOpen,
  onOpen,
}: {
  composeMenuOpen: boolean;
  onOpen: () => void;
}) => {
  const track = usePlayerStore((s) => s.currentTrack);

  if (track === null || composeMenuOpen) return null;

  return (
    <button
      aria-label={`打开正在播放：${track.title}`}
      className="
        fixed right-[max(1rem,env(safe-area-inset-right))]
        bottom-[calc(5rem+60px+env(safe-area-inset-bottom))] z-50 grid size-12
        cursor-pointer place-items-center rounded-full border border-rule
        bg-case-raised/90 text-ink-strong shadow-float backdrop-blur-sm
        transition-colors duration-150
        hover:bg-accent-wash hover:text-accent-text
        md:hidden
      "
      onClick={onOpen}
      type="button"
    >
      <Disc3 aria-hidden="true" className="size-5" />
    </button>
  );
};
