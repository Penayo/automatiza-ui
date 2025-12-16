import type { ZodError } from "zod";

export type FormErrorItem = {
	code: ZodError['issues'][0]['code'];
	message: string;
	field: string | number;
}

export type FormErrorMap = {
	[key: string | number]: FormErrorItem | FormErrorMap
}

export type ApiErrorInfo = {
	severity: 'error' | 'warn' | 'info';
	summary: string;
	detail: string;
	useDialog?: boolean;
}

export const parseZodError = (zodError: ZodError): FormErrorMap => {
	const errorMap: FormErrorMap = {};

	zodError.issues.forEach(err => {
		let current: FormErrorMap = errorMap;
		for (let i = 0; i < err.path.length - 1; i++) {
			const key = err.path[i] as string;
			if (!current[key] || (typeof current[key] === 'object' && 'code' in current[key])) {
				current[key] = {};
			}
			current = current[key] as FormErrorMap;
		}
		const lastKey = err.path[err.path.length - 1] as string;
		current[lastKey] = {
			code: err.code,
			message: err.message,
			field: lastKey
		};
	})

	return errorMap;
}

export const parseApiError = (error: any): ApiErrorInfo => {
	// Check if it's an Axios error with response
	if (error?.response?.data) {
		const { severity, statusCode, error: errorSummary, message } = error.response.data;

		// Generic API error
		return {
			severity: severity || 'error',
			summary: errorSummary || 'Error',
			detail: message || 'An error occurred while processing the request.',
			useDialog: false
		};
	}

	// Network or other errors
	return {
		severity: 'error',
		summary: 'Error',
		detail: 'An unexpected error occurred. Please try again.',
		useDialog: false
	};
}