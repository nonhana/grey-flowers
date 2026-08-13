import { parseMarkdown } from '@nuxtjs/mdc/runtime';

export interface InlineAssetRef {
  assetId: number;
  url: string;
}

/**
 * 用与主站同一解析器（@nuxtjs/mdc）解析正文，收集携带 asset-id 的 image 节点。
 * 外部图 / 代码块示例 / 无 asset-id 的图不建立关系。
 */
const collectImageRefs = (node: unknown, refs: InlineAssetRef[]) => {
  if (!node || typeof node !== 'object') return;

  const record = node as Record<string, unknown>;

  if (record.tag === 'img') {
    const props = record.props as Record<string, unknown> | undefined;
    if (props && typeof props.src === 'string') {
      const assetId = Number(props['asset-id']);
      if (Number.isInteger(assetId) && assetId > 0) {
        refs.push({ assetId, url: props.src });
      }
    }
  }

  const children = record.children;
  if (Array.isArray(children)) {
    for (const child of children) collectImageRefs(child, refs);
  }
};

export const extractInlineAssetRefs = async (
  content: string,
): Promise<InlineAssetRef[]> => {
  if (!content.trim()) return [];

  const parsed = await parseMarkdown(content);
  const refs: InlineAssetRef[] = [];
  collectImageRefs(parsed.body, refs);
  return refs;
};
