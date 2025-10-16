// app/api/chatkit/session/route.ts
export const runtime = "edge";

interface CreateSessionRequestBody {
  workflow?: { id?: string | null } | null;
  scope?: { user_id?: string | null } | null;
  workflowId?: string | null;
  chatkit_configuration?: { file_upload?: { enabled?: boolean } };
}

const DEFAULT_CHATKIT_BASE = "https://api.openai.com";
const SESSION_COOKIE_NAME = "chatkit_session_id";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(request: Request): Promise<Response> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return json({ error: "Missing OPENAI_API_KEY environment variable" }, 500);
  }

  const parsedBody = await safeParseJson<CreateSessionRequestBody>(request);
  const { userId, sessionCookie } = await resolveUserId(request);
  const resolvedWorkflowId =
    (parsedBody?.workflow?.id ??
      parsedBody?.workflowId ??
      process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID) || null;

  if (!resolvedWorkflowId) {
    return withCookie(json({ error: "Missing workflow id" }, 400), sessionCookie);
  }

  const apiBase = process.env.CHATKIT_API_BASE ?? DEFAULT_CHATKIT_BASE;
  const resp = await fetch(`${apiBase}/v1/chatkit/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "OpenAI-Beta": "chatkit_beta=v1",
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      workflow: { id: resolvedWorkflowId },
      user: userId,
      chatkit_configuration: {
        file_upload: {
          enabled: parsedBody?.chatkit_configuration?.file_upload?.enabled ?? false,
        },
      },
    }),
  });

  const data = await resp.json().catch(() => ({} as any));
  if (!resp.ok) {
    return withCookie(
      json({ error: (data as any)?.error ?? resp.statusText, details: data }, resp.status),
      sessionCookie
    );
  }

  return withCookie(
    json(
      {
        client_secret: (data as any)?.client_secret ?? null,
        expires_after: (data as any)?.expires_after ?? null,
      },
      200
    ),
    sessionCookie
  );
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function withCookie(res: Response, cookie: string | null): Response {
  if (!cookie) return res;
  const headers = new Headers(res.headers);
  headers.append("Set-Cookie", cookie);
  return new Response(res.body, { status: res.status, headers });
}

async function resolveUserId(request: Request): Promise<{
  userId: string;
  sessionCookie: string | null;
}> {
  const existing = getCookieValue(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (existing) return { userId: existing, sessionCookie: null };
  const generated =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return { userId: generated, sessionCookie: serializeSessionCookie(generated) };
}

function getCookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.split("=");
    if (k?.trim() === name && v.length) return v.join("=").trim();
  }
  return null;
}

function serializeSessionCookie(value: string): string {
  const attrs = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${SESSION_COOKIE_MAX_AGE}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return attrs.join("; ");
}

async function safeParseJson<T>(req: Request): Promise<T | null> {
  try {
    const t = await req.text();
    return t ? (JSON.parse(t) as T) : null;
  } catch {
    return null;
  }
}
