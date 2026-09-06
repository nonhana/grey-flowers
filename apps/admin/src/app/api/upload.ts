import { ApiNetworkError, abortError } from './errors';

// 原生 fetch 拿不到准确上传进度，采用原生 XHR 进行上传
export const putUpload = (
  url: string,
  body: Blob,
  contentType: string,
  onUploadProgress?: (progress: number) => void,
  signal?: AbortSignal | null,
): Promise<void> => {
  const { promise, reject, resolve } = Promise.withResolvers<void>();

  const xhr = new XMLHttpRequest();
  xhr.open('PUT', url);
  xhr.setRequestHeader('Content-Type', contentType);

  if (onUploadProgress) {
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onUploadProgress(event.loaded / event.total);
      }
    };
  }

  xhr.onerror = () => reject(new ApiNetworkError('Upload request failed'));
  xhr.onabort = () => reject(abortError());
  xhr.onload = () => {
    // 2xx 即接收完成；R2 错误响应体为 XML，统一归一为网络错误。
    if (xhr.status >= 200 && xhr.status < 300) {
      resolve();
    } else {
      reject(new ApiNetworkError(`Upload failed with status ${xhr.status}`));
    }
  };

  if (signal?.aborted) {
    reject(abortError());
    return promise;
  }
  signal?.addEventListener('abort', () => xhr.abort(), { once: true });

  xhr.send(body);
  return promise;
};
