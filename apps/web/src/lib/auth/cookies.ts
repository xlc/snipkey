const SESSION_COOKIE_NAME = "session";

export function getSessionCookie(): string | undefined {
	const cookies = document.cookie.split(";");
	for (const cookie of cookies) {
		const [name, value] = cookie.trim().split("=");
		if (name === SESSION_COOKIE_NAME) {
			return value;
		}
	}
	return undefined;
}

export function setSessionCookie(value: string): void {
	document.cookie = `${SESSION_COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/`;
}

export function clearSessionCookie(): void {
	document.cookie = `${SESSION_COOKIE_NAME}=; Max-Age=-1; HttpOnly; Secure; SameSite=Lax; Path=/`;
}
