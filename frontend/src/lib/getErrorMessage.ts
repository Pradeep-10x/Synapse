import { AxiosError } from 'axios';

interface ApiErrorBody {
  message?: string;
}

/**
 * Extracts a human-readable message from an unknown error (Axios error,
 * native Error, or anything else). Lets call sites use `catch (error)` with
 * `error: unknown` instead of `any`.
 */
export const getErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    return body?.message || error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};
