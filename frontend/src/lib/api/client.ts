export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "http://localhost:8000";

export async function apiPost<TResponse>(
  path: string,
  body: unknown,
  init?: RequestInit,
): Promise<TResponse> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }

  return (await res.json()) as TResponse;
}

async function _json<TResponse>(res: Response): Promise<TResponse> {
  if (!res.ok) {
    // Prefer FastAPI's { detail } message when present.
    let detail = "";
    try {
      const data = (await res.clone().json()) as { detail?: string };
      detail = data?.detail ?? "";
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(detail || `API ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as TResponse;
}

/** GET helper. Pass `token` to send an Authorization: Bearer header. */
export async function apiGet<TResponse>(
  path: string,
  token?: string,
  init?: RequestInit,
): Promise<TResponse> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  return _json<TResponse>(res);
}

/** JSON request with an arbitrary method (POST/DELETE/…) + optional Bearer token. */
export async function apiRequest<TResponse>(
  path: string,
  method: string,
  body?: unknown,
  token?: string,
  init?: RequestInit,
): Promise<TResponse> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...init,
  });
  return _json<TResponse>(res);
}

