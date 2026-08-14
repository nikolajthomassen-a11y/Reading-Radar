// GET/POST /api/state?id=SYNCID — stores each user's library + picks in Netlify Blobs
// so the same data can be opened on any device via the sync link.
import { getStore } from '@netlify/blobs';

export default async (req) => {
  const code = process.env.APP_PASSCODE;
  if (code && req.headers.get('x-app-code') !== code) return new Response('Unauthorized', { status: 401 });

  const url = new URL(req.url);
  const id = (url.searchParams.get('id') || '').replace(/[^A-Za-z0-9_-]/g, '');
  if (!id || id.length < 6 || id.length > 40) return new Response('Bad id', { status: 400 });

  const store = getStore('libraries');
  const key = 'lib-' + id;

  if (req.method === 'GET') {
    const data = await store.get(key, { type: 'json' });
    return Response.json(data || {});
  }
  if (req.method === 'POST') {
    const body = await req.json();
    if (JSON.stringify(body).length > 300000) return new Response('Too large', { status: 413 });
    await store.setJSON(key, body);
    return Response.json({ ok: true });
  }
  return new Response('Method not allowed', { status: 405 });
};

export const config = { path: '/api/state' };
