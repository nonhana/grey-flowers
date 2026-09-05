import { cn } from 'cn';

import { Button } from '@/ui/button';
import { controlClass } from '@/ui/form';
import { AppDialog } from '@/ui/overlay';

export const ImageAltDialog = ({
  draft,
  onClose,
  onDraftChange,
  onExited,
  onSave,
  open,
  target,
}: {
  draft: string;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onExited?: () => void;
  onSave: () => void;
  open: boolean;
  target: { src: string; alt: string } | null;
}) => (
  <AppDialog
    isOpen={open}
    onExited={onExited}
    onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}
    size="sm"
    title="编辑图片替代文字"
  >
    {target ? (
      <div className="grid gap-4">
        <label className="grid gap-1.5">
          <span className="text-sm text-ink-dim">alt</span>
          <input
            className={cn(controlClass, 'font-sans text-base')}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onSave();
              }
            }}
            value={draft}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button onPress={onClose} tone="quiet">
            取消
          </Button>
          <Button onPress={onSave} tone="solid">
            保存
          </Button>
        </div>
      </div>
    ) : null}
  </AppDialog>
);
