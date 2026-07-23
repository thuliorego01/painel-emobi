export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/lembretes/concluidos' && request.method === 'GET') {
      const list = await env.LEMBRETES_KV.list();
      const ids = list.keys.map(k => k.name);
      return new Response(JSON.stringify(ids), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/lembretes/concluir' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch (e) { body = null; }
      const id = body && body.id;
      if (!id || typeof id !== 'string') {
        return new Response(JSON.stringify({ error: 'id inválido' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      await env.LEMBRETES_KV.put(id, new Date().toISOString());
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/lembretes/concluir' && request.method === 'DELETE') {
      let body;
      try { body = await request.json(); } catch (e) { body = null; }
      const id = body && body.id;
      if (id) await env.LEMBRETES_KV.delete(id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
