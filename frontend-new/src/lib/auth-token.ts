// Decouples the HTTP layer from the auth store to avoid circular imports.
// The auth store writes the token here; axios reads it on every request.

let accessToken: string | null = null
let onUnauthorized: (() => void) | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

export function registerUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

export function handleUnauthorized(): void {
  onUnauthorized?.()
}
