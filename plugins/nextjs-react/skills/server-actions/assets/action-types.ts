/**
 * Success state returned by server actions
 * @template T - The type of data returned on success
 */
type ActionStateSuccess<T> = {
  /** Indicates action completed successfully */
  success: true;
  /** The data returned by the action */
  data: T;
  /** Optional success message for user feedback */
  message?: string;
};

/**
 * Failure state returned by server actions
 */
type ActionStateFailed = {
  /** Indicates action failed */
  success: false;
  /** Error message describing what went wrong */
  error: string;
  /** Field-specific validation errors for forms */
  fieldErrors?: Record<string, string[]>;
};

/**
 * Response type for actions that return data
 * @template T - The type of data returned on success (defaults to unknown)
 */
export type ActionResponse<T = unknown> = Promise<ActionStateSuccess<T> | ActionStateFailed>;

/**
 * Response type for actions that redirect on success
 * Uses `never` to indicate that function doesn't return on success
 */
export type RedirectAction = Promise<never | ActionStateFailed>;

/**
 * Type guard for successful action results
 */
export function isActionSuccess<T>(result: Awaited<ActionResponse<T>>): result is ActionStateSuccess<T> {
  return result.success;
}

/**
 * Type guard for failed action results
 */
export function isActionFailed(result: Awaited<ActionResponse<unknown>>): result is ActionStateFailed {
  return !result.success;
}
