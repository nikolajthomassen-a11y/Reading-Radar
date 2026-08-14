// POST /api/scan — reads a bookshelf photo with Claude and returns the books as JSON (streamed).
const PROMPT = `Look carefully at this photo of a bookshelf. Identify every book whose spine or cover is readable.

Return ONLY a JSON object, no other text, in exactly this shape:
{"books":[{"title":"...","author":"...","confidence":"high"}]}

Rules:
- One entry per distinct book. Use the full title and the author's full name where readable.
- If you can read a title but must guess or infer the author from your knowledge, that is fine — set confidence "high" if you are sure it's a real, correctly matched book, "low" if unsure.
- If a spine is partially readable and you cannot confidently identify the actual book, still include your best guess with confidence "low".
- Skip objects that are not books. Do not invent books that are not in the photo.`;

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const code = process.env.APP_PASSCODE;
  if (code && req.headers.get('x-app-code') !== code) return new Response('Unauthorized', { status: 401 });

  const { image, media_type = 'image/jpeg' } = await req.json();
  if (!image) return new Response('Missing image', { status: 400 });

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5',
      max_tokens: 4000,
      stream: true,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type, data: image } },
          { type: 'text', text: PROMPT }
        ]
      }]
    })
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response('Claude API error: ' + err, { status: 502 });
  }
  // Pipe Claude's SSE stream straight through to the browser.
  return new Response(upstream.body, {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' }
  });
};

export const config = { path: '/api/scan' };
