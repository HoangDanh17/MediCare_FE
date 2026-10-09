export type ApiProblem = {
  status: number;
  title?: string;
  detail?: string;
  code?: string;
  traceId?: string;
};

export type ValidationErrors = Record<string, string[]>;

const ERROR_CODE_RE = /^[A-Za-z]+\.[A-Z]/;

const GENERIC_BIND_MESSAGE = "Dữ liệu gửi lên không hợp lệ.";

export function isErrorCode(key: string): boolean {
  return ERROR_CODE_RE.test(key);
}

export function isFrameworkKey(key: string): boolean {
  return key === "" || key === "request" || key.startsWith("$");
}

export function normalizeFieldKey(key: string): string {
  return key
    .split(".")
    .map((segment) => (segment ? segment[0].toLowerCase() + segment.slice(1) : segment))
    .join(".");
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors: Record<string, string>;
  readonly generalErrors: string[];

  constructor(
    status: number,
    message: string,
    options: { code?: string; fieldErrors?: Record<string, string>; generalErrors?: string[] } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors ?? {};
    this.generalErrors = options.generalErrors ?? [];
  }
}

export function parseValidationErrors(
  errors: ValidationErrors | undefined,
): { fieldErrors: Record<string, string>; generalErrors: string[] } {
  const fieldErrors: Record<string, string> = {};
  const generalErrors: string[] = [];

  for (const [rawKey, messages] of Object.entries(errors ?? {})) {
    const message = messages?.[0];
    if (!message) continue;
    if (isFrameworkKey(rawKey)) {
      generalErrors.push(GENERIC_BIND_MESSAGE);
    } else if (isErrorCode(rawKey)) {
      generalErrors.push(message);
    } else {
      fieldErrors[normalizeFieldKey(rawKey)] = message;
    }
  }

  return { fieldErrors, generalErrors: [...new Set(generalErrors)] };
}

export async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const problem = (body ?? {}) as Partial<ApiProblem> & { errors?: ValidationErrors };

  if (response.status === 400 && problem.errors) {
    const { fieldErrors, generalErrors } = parseValidationErrors(problem.errors);
    const codeKey = Object.keys(problem.errors).find((key) => isErrorCode(key) && !isFrameworkKey(key));
    const message = generalErrors[0] ?? fieldErrors[Object.keys(fieldErrors)[0]] ?? "Yêu cầu không hợp lệ.";
    return new ApiError(400, message, {
      code: codeKey,
      fieldErrors,
      generalErrors,
    });
  }

  if ((response.status === 404 || response.status === 409 || response.status >= 500) && problem.code) {
    return new ApiError(response.status, problem.detail ?? problem.title ?? "Đã xảy ra lỗi.", {
      code: problem.code,
    });
  }

  if (response.status === 401) {
    return new ApiError(401, "Phiên đăng nhập đã hết hạn.");
  }

  if (response.status === 403) {
    return new ApiError(403, "Bạn không có quyền thực hiện thao tác này.");
  }

  return new ApiError(response.status, problem.detail ?? problem.title ?? "Đã xảy ra lỗi.", {
    code: problem.code,
  });
}

export function messageFor(error: unknown, fallback = "Đã xảy ra lỗi."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
