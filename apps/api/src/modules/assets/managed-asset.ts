import type { Prisma, PrismaClient } from '@grey-flowers/db';

import { ApiError } from '@/http/errors';
import { concatUrl } from '@/lib/concat-url';

type Client = PrismaClient | Prisma.TransactionClient;

/**
 * 校验受管资产存在且 AVAILABLE，返回其 deliveryUrl；否则 VALIDATION_FAILED。
 * 封面/内联引用归一共用（articles/taxonomy），field 默认 assets。
 */
export const assertAvailableAssetDeliveryUrl = async (
  client: Client,
  assetPublicUrl: string,
  assetId: number,
  field = 'assets',
): Promise<string> => {
  const asset = await client.asset.findUnique({
    select: { status: true, storageKey: true },
    where: { id: assetId },
  });
  if (!asset || asset.status !== 'AVAILABLE') {
    throw new ApiError('VALIDATION_FAILED', {
      fields: { [field]: ['Selected managed asset is not available'] },
    });
  }
  return concatUrl(assetPublicUrl, asset.storageKey);
};
