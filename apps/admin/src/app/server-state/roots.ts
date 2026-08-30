/**
 * 全部 query 家族 root 的单点定义：各域模块统一从这里取 root，
 * 跨域失效一律引用常量，server-state 内禁止再写字面量 key。
 */
export const articlesRoot = ['admin', 'articles'] as const;
export const taxonomyRoot = ['admin', 'taxonomy'] as const;
export const overviewRoot = ['admin', 'overview'] as const;
export const usersRoot = ['admin', 'users'] as const;
export const commentsRoot = ['admin', 'comments'] as const;
export const musicRoot = ['admin', 'music'] as const;
export const assetsRoot = ['admin', 'assets'] as const;
export const activitiesRoot = ['admin', 'activities'] as const;
