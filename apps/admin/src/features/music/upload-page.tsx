import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { IconButton, PageBody, PageHeader } from '@/ui/index.js';

import { UploadWizard } from './upload-wizard.js';

export const MusicUploadPage = () => {
  const navigate = useNavigate();

  return (
    <PageBody width="narrow">
      <PageHeader
        leading={
          <IconButton
            label="返回音乐库"
            onPress={() => void navigate({ to: '/music' })}
          >
            <ArrowLeft aria-hidden="true" />
          </IconButton>
        }
        description="选择音频文件后自动解析元数据与内嵌封面；解析失败也能继续手动补全。"
        title="上传音乐"
      />

      <div className="mt-6">
        <UploadWizard />
      </div>
    </PageBody>
  );
};
