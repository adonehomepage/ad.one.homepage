export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "ACCOUNT_SUSPENDED"
  | "PROJECT_NOT_FOUND"
  | "SLUG_ALREADY_EXISTS"
  | "SLUG_RESERVED"
  | "SLUG_INVALID"
  | "SECTION_COPY_LIMIT_EXCEEDED"
  | "RECIPIENT_LIMIT_EXCEEDED"
  | "RECIPIENT_NOT_VERIFIED"
  | "CONSENT_REQUIRED"
  | "PROJECT_EXPIRED"
  | "DRAFT_CONFLICT"
  | "PUBLISH_VALIDATION_FAILED"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "LEAD_COLLECTION_DISABLED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status = 400,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorPayload(error: ApiError) {
  return {
    code: error.code,
    message: error.message,
    field: error.field,
  };
}
