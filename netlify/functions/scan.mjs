// POST /api/scan — reads a bookshelf photo with Claude and returns the books as JSON (streamed).
const PROMPT = `Read the books in this photo of a bookshelf.

Return ONLY a JSON object, no other text, in exactly this shape:
{"books":[{"title":"...","author":"...","confidence":"high"}]}

TRANSCRIBE — DO NOT TRANSLATE OR SUBSTITUTE
- Write the title exactly as printed on the spine, in its original language. Never translate a Danish title into English, and never replace a Danish edition's title with the English original.
- Scandinavian letters are not optional: æ ø å Æ Ø Å ä ö Ä Ö. Never write ae/oe/aa or plain a/o instead. "Suveræne" is not "Suverane"; "Grøndahl" is not "Grondahl"; "på" is not "pa".
- Respect Danish spelling: definite endings -en/-et/-ene, the word "og" (not "and"), and compound nouns written as a single word (kogebog, bagebog, hverdagsmad).
- If a word is genuinely unreadable, transcribe what you can actually see and set confidence "low". Do NOT replace it with a similar-looking book you happen to know.

READING SPINES
- Spine text usually runs vertically — read it rotated. Danish spines are commonly read bottom-to-top.
- The largest text is normally the title. A personal name in smaller type, usually at the top, is normally the author. Keep the author out of the title field.
- The word at the very foot of the spine is usually the publisher (Gyldendal, Politikens Forlag / "P", Lindhardt og Ringhof, Rosinante, Klim, Modtryk, Gutkind, People'sPress, Turbine, Høst & Søn, Atelier, FDB, Møntergården, Aschehoug, Borgen). Never treat a publisher as the author or as part of the title.
- Multiple authors are joined by "og" or "&" — include all of them, and keep "m.fl." if it is printed.
- A subtitle in smaller type is part of the title only if it reads as one phrase with it.

COVERAGE
- Work left to right and list EVERY book: thin ones, ones partly hidden behind others, and ones cut off at the edge of the photo.
- One entry per physical book. Two near-identical titles side by side are usually a book and its sequel — list both, do not merge them.
- confidence "high" only when you can actually read the title on the spine. Otherwise "low".
- Skip anything that is not a book. Never invent a book that is not in the photo.`;

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const code = process.env.APP_PASSCODE;
  if (code && req.headers.get('x-app-code') !== code) return new Response('Unauthorized', { status: 401 });

  const { image, media_type = 'image/jpeg' } = await req.json();
  if (!image) return new Response('Missing image', { status: 400 });

  // Spine OCR is the one step that genuinely needs a stronger model — Haiku
  // mis-transcribes Danish titles even on a clean, well-lit photo. Recommendations
  // still run on CLAUDE_MODEL (Haiku) via recommend.mjs, so cost barely moves.
  // If the account can't reach the first model, fall back rather than fail the scan.
  const candidates = [...new Set([
    process.env.SCAN_MODEL,
    'claude-sonnet-5',
    'claude-sonnet-4-5',
    'claude-haiku-4-5'
  ].filter(Boolean))];

  const call = (model) => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
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

  let upstream, lastErr = '';
  for (const model of candidates) {
    upstream = await call(model);
    if (upstream.ok) break;
    lastErr = await upstream.text();
    // Only a missing/unavailable model is worth retrying on — not a bad key or a bad image.
    if (!/not_found|model/i.test(lastErr) || upstream.status >= 500) break;
  }

  if (!upstream || !upstream.ok) {
    return new Response('Claude API error: ' + lastErr, { status: 502 });
  }
  // Pipe Claude's SSE stream straight through to the browser.
  return new Response(upstream.body, {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' }
  });
};

export const config = { path: '/api/scan' };
