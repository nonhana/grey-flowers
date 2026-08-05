import type { ApiErrorCode } from '@grey-flowers/contracts';

import { toast } from 'sonner';

import { apiErrorMessage, type CodeMessage } from './error-message.js';

export const toastError = (
  error: unknown,
  byCode?: Partial<Record<ApiErrorCode, CodeMessage>>,
) => toast.error(apiErrorMessage(error, byCode));
