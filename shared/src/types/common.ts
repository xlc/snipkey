export type Result<T, E = Error> =
	| {
			ok: true;
			data: T;
	  }
	| {
			ok: false;
			error: E;
	  };

export function ok<T>(data: T): Result<T> {
	return { ok: true, data };
}

export function err<E>(error: E): Result<never, E> {
	return { ok: false, error };
}

export type ErrorCode =
	| "AUTH_REQUIRED"
	| "NOT_FOUND"
	| "VALIDATION_ERROR"
	| "INTERNAL"
	| "UNAUTHORIZED";

export interface ApiError {
	code: ErrorCode;
	message: string;
	details?: unknown;
}
