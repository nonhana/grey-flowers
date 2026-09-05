import { Link } from '@tanstack/react-router';
import {
  FolderTree,
  Images,
  MessagesSquare,
  Music2,
  Tags,
  Users,
} from 'lucide-react';

import { BottomSheet } from '@/ui/overlay';

import { AccountBlock, navRowClass } from './console-rail';

export interface MoreSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 移动端「更多」侧拉面板：BottomSheet 链路由 ConsoleShell 首次打开时懒加载。 */
export const MoreSheet = ({ isOpen, onOpenChange }: MoreSheetProps) => (
  <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange} title="更多">
    <div className="grid gap-1 px-4 pt-1 pb-4">
      <Link
        className={navRowClass}
        onClick={() => onOpenChange(false)}
        to="/assets"
      >
        <Images aria-hidden />
        资产
      </Link>
      <Link
        className={navRowClass}
        onClick={() => onOpenChange(false)}
        to="/music"
      >
        <Music2 aria-hidden />
        音乐库
      </Link>
      <Link
        className={navRowClass}
        onClick={() => onOpenChange(false)}
        to="/categories"
      >
        <FolderTree aria-hidden />
        分类
      </Link>
      <Link
        className={navRowClass}
        onClick={() => onOpenChange(false)}
        to="/comments"
      >
        <MessagesSquare aria-hidden />
        评论
      </Link>
      <Link
        className={navRowClass}
        onClick={() => onOpenChange(false)}
        to="/users"
      >
        <Users aria-hidden />
        用户
      </Link>
      <Link
        className={navRowClass}
        onClick={() => onOpenChange(false)}
        to="/tags"
      >
        <Tags aria-hidden />
        标签
      </Link>
      <div className="mt-3 border-t border-rule pt-3">
        <AccountBlock layout="sheet" />
      </div>
    </div>
  </BottomSheet>
);
