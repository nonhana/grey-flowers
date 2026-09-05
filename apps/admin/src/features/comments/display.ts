import { pageUrl } from '@/lib/page-url';

/** 「打开页面」外链：评论归属 path 拼到访客站根。 */
export const commentPageUrl = (path: string) => pageUrl(path);
