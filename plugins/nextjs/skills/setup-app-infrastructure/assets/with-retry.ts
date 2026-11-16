import { createLogger } from "~/lib/logger";
import type { ServiceError } from "~/lib/service-error";

const log = createLogger({ module: "retry" });

type Result<T> = [ServiceError, null] | [null, T];

type RetryOptions = {
  /** Total attempts, first call included. */
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
};

const DEFAULTS: RetryOptions = { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 10_000, jitter: true };

/**
 * Re-runs a tuple-returning call while it fails with an error flagged isRetryable.
 * Wrap only reads and writes that carry an idempotency key generated outside `fn`.
 */
export async function withRetry<T>(
  fn: () => Promise<Result<T>>,
  context: { operation: string } & Record<string, unknown>,
  options: Partial<RetryOptions> = {}
): Promise<Result<T>> {
  const { maxAttempts, baseDelayMs, maxDelayMs, jitter } = { ...DEFAULTS, ...options };

  for (let attempt = 1; ; attempt++) {
    const [error, data] = await fn();
    if (!error) return [null, data];
    if (!error.isRetryable || attempt >= maxAttempts) return [error, null];

    const backoff = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
    const wait = error.retryAfterMs !== undefined ? Math.min(error.retryAfterMs, maxDelayMs) : backoff;
    const delayMs = Math.round(jitter ? wait * (0.5 + Math.random() * 0.5) : wait);

    log.withMetadata({ ...context, attempt, maxAttempts, delayMs, errorCode: error.code }).warn("Retrying");
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
