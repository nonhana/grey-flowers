/** 访客站根地址（与 API mailer 的 SITE_URL 同源，便于「在访客页打开」外链）。 */
const SITE_URL = 'https://caelum.moe';

/** 「打开页面」外链：页面/评论归属 path 拼到访客站根。 */
export const pageUrl = (path: string) => `${SITE_URL}${path}`;
