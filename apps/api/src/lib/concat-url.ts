export const concatUrl = (originUrl: string, ...paths: string[]) =>
  `${originUrl.replace(/\/+$/, '')}/${paths.join('/')}`;
