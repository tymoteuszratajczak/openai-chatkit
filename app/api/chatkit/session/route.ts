export const runtime = "edge";
…
export async function POST(request: Request): Promise<Response> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  …
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
      chatkit_configuration: { file_upload: { enabled: … } },
    }),
  });
  …
}
