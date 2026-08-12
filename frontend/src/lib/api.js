// Stand-in for the auth system, which isn't wired up yet.
// Swap this out once real auth/session context exists.
const DEMO_USER_ID = 'demo-user-1'

export function getCurrentUserId() {
  return DEMO_USER_ID
}

/**
 * Fetch wrapper that attaches the x-user-id auth header, parses JSON
 * responses, and throws an Error carrying the server's error payload
 * (code + message) when the response is not ok.
 */
export async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getCurrentUserId(),
      ...options.headers,
    },
  })

  if (res.status === 204) {
    return null
  }

  let body = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (!res.ok) {
    const message = body?.message || `Request failed: ${res.status}`
    const error = new Error(message)
    error.code = body?.error
    error.status = res.status
    throw error
  }

  return body
}
