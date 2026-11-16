export type ServiceErrorCode =
  | "validation"
  | "not-found"
  | "already-exists"
  | "permission-denied"
  | "data-corruption"
  | "unavailable"
  | "timeout"
  | "rate-limited"
  | "external-api"
  | "internal";

type ServiceErrorOptions = {
  /** The raw error this one wraps; log it with log.withError(raw), never return it to the client. */
  cause?: unknown;
  /** Wait requested by the upstream (Retry-After), in milliseconds. */
  retryAfterMs?: number;
};

/** The error every service and data-layer function returns in the [error, data] tuple. */
export class ServiceError extends Error {
  readonly isNotFound: boolean;
  readonly isAlreadyExists: boolean;
  readonly isPermissionDenied: boolean;
  readonly retryAfterMs?: number;

  constructor(
    readonly code: ServiceErrorCode,
    message: string,
    readonly isRetryable = false,
    options: ServiceErrorOptions = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "ServiceError";
    this.isNotFound = code === "not-found";
    this.isAlreadyExists = code === "already-exists";
    this.isPermissionDenied = code === "permission-denied";
    this.retryAfterMs = options.retryAfterMs;
  }

  /** `message` reaches the user as is: write it for them. */
  static validation(message: string) {
    return new ServiceError("validation", message);
  }
  static notFound(resource: string) {
    return new ServiceError("not-found", `${resource} not found`);
  }
  static alreadyExists(resource: string) {
    return new ServiceError("already-exists", `${resource} already exists`);
  }
  static permissionDenied(resource?: string) {
    return new ServiceError("permission-denied", resource ? `No access to ${resource}` : "No access");
  }
  static dataCorruption(resource: string) {
    return new ServiceError("data-corruption", `${resource} data is invalid`);
  }
  static internal(resource: string, cause?: unknown) {
    return new ServiceError("internal", `${resource} operation failed`, false, { cause });
  }
}

/**
 * Maps a raw error from one source onto a ServiceError code. Call it in the catch of the function that
 * made the external call. Replace the code and status checks with those of the source you wrap.
 */
export function categorizeServiceError(error: unknown, resource: string): ServiceError {
  if (error instanceof ServiceError) return error;

  const cause = { cause: error };

  // Deadline from AbortSignal.timeout() or an aborted fetch
  if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new ServiceError("timeout", `${resource} request timed out`, true, cause);
  }

  // 1. Sources that expose a string `code` (DB drivers, Node system errors)
  if (error && typeof error === "object" && "code" in error) {
    const { code } = error as { code: unknown };
    if (code === "NOT_FOUND") return ServiceError.notFound(resource);
    if (code === "ALREADY_EXISTS" || code === "23505") return ServiceError.alreadyExists(resource);
    if (code === "PERMISSION_DENIED" || code === "UNAUTHENTICATED") return ServiceError.permissionDenied(resource);
    if (code === "ECONNREFUSED" || code === "UNAVAILABLE") {
      return new ServiceError("unavailable", `${resource} service unavailable`, true, cause);
    }
    if (code === "ETIMEDOUT") return new ServiceError("timeout", `${resource} request timed out`, true, cause);
  }

  // 2. Sources that expose an HTTP `status` (fetch or REST client errors)
  if (error && typeof error === "object" && "status" in error) {
    const { status } = error as { status: number };
    if (status === 400 || status === 422) return ServiceError.validation(`${resource} request is invalid`);
    if (status === 404) return ServiceError.notFound(resource);
    if (status === 409) return ServiceError.alreadyExists(resource);
    if (status === 401 || status === 403) return ServiceError.permissionDenied(resource);
    if (status === 429) return new ServiceError("rate-limited", "Too many requests", true, cause);
    if (status === 502 || status === 503) {
      return new ServiceError("unavailable", `${resource} service unavailable`, true, cause);
    }
    if (status === 504) return new ServiceError("timeout", `${resource} request timed out`, true, cause);
    if (status >= 500) return new ServiceError("external-api", `${resource} service error`, true, cause);
  }

  // 3. Anything else
  return ServiceError.internal(resource, error);
}
