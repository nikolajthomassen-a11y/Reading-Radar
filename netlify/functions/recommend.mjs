// POST /api/recommend — builds a taste profile and personalized picks from the user's library (streamed).
function monthlyPrompt(library, exclude) {
  return `You are a brilliant, well-read bookseller. A reader's personal library is listed below (books they own and have mostly read). Infer their taste and recommend books they do NOT own.

THEIR LIBRARY:
${library.map(b => `- ${b.t}${b.a ? ' — ' + b.a : ''}`).join('\n')}
${exclude.length ? `\nDO NOT RECOMMEND (already suggested or owned):\n${exclude.map(t => '- ' + t).join('\n')}` : ''}

Return ONLY a JSON object, no other text, in exactly this shape:
{"profile":"2-3 sentences describing this reader's taste, written to the reader as 'you'","picks":[{"title":"...","author":"...","year":"2020","category":"new","desc":"one vivid sentence about the book","why":"one sentence connecting it to specific books in THEIR library","genres":["crime"]}]}

Rules:
- Exactly 8 picks: 2 with category "new" (published in the last ~2 years), 3 "backlist", 2 "award" (major prize winners: Booker, Pulitzer, Edgar, National Book Award etc. — name the prize in "year"), 1 "wildcard" (a stretch pick just outside their comfort zone).
- Only recommend real books you are confident exist, with correct authors.
- Never recommend a book that is in their library or on the do-not-recommend list.
- "why" must reference specific titles or authors they own.
- Keep every field concise. category must be one of: new, backlist, award, wildcard.`;
}

function similarPrompt(seed, library, exclude) {
  return `You are a brilliant bookseller. A reader liked the sound of "${seed.title}" by ${seed.author}. Recommend 3 more real books that are strikingly similar in feel, plot-drive and quality.

They already own these (do not recommend): ${library.map(b => b.t).join('; ')}
Also do not recommend: ${exclude.join('; ')}

Return ONLY a JSON object, no other text:
{"picks":[{"title":"...","author":"...","year":"2019","desc":"one sentence on the book and why it matches ${seed.title}"}]}
Only real books with correct authors.`;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const code = process.env.APP_PASSCODE;
  if (code && req.headers.get('x-app-code') !== code) return new Response('Unauthorized', { status: 401 });

  const { mode = 'monthly', library = [], exclude = [], seed } = await req.json();
  if (!library.length) return new Response('Empty library', { status: 400 });

  const prompt = mode === 'similar' && seed
    ? similarPrompt(seed, library, exclude)
    : monthlyPrompt(library, exclude);

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5',
      max_tokens: 3000,
      stream: true,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response('Claude API error: ' + err, { status: 502 });
  }
  return new Response(upstream.body, {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' }
  });
};

export const config = { path: '/api/recommend' };
