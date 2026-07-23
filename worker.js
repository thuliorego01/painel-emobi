const KEY = 'lembretes-concluidos';

async function getConcluidos(env) {
  const raw = await env.LEMBRETES_KV.get(KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/lembretes/concluidos' && request.method === 'GET') {
      const ids = await getConcluidos(env);
      return new Response(JSON.stringify(ids), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    if (url.pathname === '/api/lembretes/concluir' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch (e) { body = null; }
      const id = body && body.id;
      if (!id || typeof id !== 'string') {
        return new Response(JSON.stringify({ error: 'id inválido' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
      }
      const ids = await getConcluidos(env);
      if (!ids.includes(id)) ids.push(id);
      await env.LEMBRETES_KV.put(KEY, JSON.stringify(ids));
      return new Response(JSON.stringify({ ok: true, total: ids.length }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    if (url.pathname === '/api/lembretes/concluir' && request.method === 'DELETE') {
      let body;
      try { body = await request.json(); } catch (e) { body = null; }
      const id = body && body.id;
      const ids = await getConcluidos(env);
      const filtered = id ? ids.filter(x => x !== id) : ids;
      await env.LEMBRETES_KV.put(KEY, JSON.stringify(filtered));
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
