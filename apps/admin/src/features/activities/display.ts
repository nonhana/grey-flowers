/** 动态卡片图片缩略图：1/2/3/4 张走 PhotoGrid 布局，更多列 3 列网格。 */
export const activityImageGridClass = (count: number) => {
  switch (count) {
    case 1:
      return 'grid-cols-1';
    case 2:
      return 'grid-cols-2';
    case 3:
      return 'grid-cols-3';
    case 4:
      return 'grid-cols-2';
    default:
      return 'grid-cols-3';
  }
};

/** 内容预览：折叠空白、保留换行信号，供 feed 列表 line-clamp 前使用。 */
export const activityContentPreview = (content: string) => content.trim();
