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

// ---- Notas rápidas por cliente (caixa de entrada) ----
// Thúlio escreve uma nota no card do cliente no painel; ela fica aqui até o
// briefing das 7h incorporá-la ao histórico oficial (planilha + painel) e
// apagá-la via DELETE. É caixa de entrada, não histórico — o histórico
// definitivo vive no CRM.
const NOTAS_KEY = 'notas-clientes';

async function getNotas(env) {
  const raw = await env.LEMBRETES_KV.get(NOTAS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
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

    // Lista todas as notas pendentes (usada pelo painel e pelo briefing das 7h)
    if (url.pathname === '/api/notas' && request.method === 'GET') {
      return jsonResponse(await getNotas(env));
    }

    // Salva uma nota nova para um cliente
    if (url.pathname === '/api/notas' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch (e) { body = null; }
      const lead = body && body.lead;
      const texto = body && body.texto;
      if (!lead || typeof lead !== 'string' || !texto || typeof texto !== 'string' || !texto.trim()) {
        return jsonResponse({ error: 'lead e texto sao obrigatorios' }, 400);
      }
      const notas = await getNotas(env);
      const nota = {
        id: 'nota-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        lead: lead.slice(0, 200),
        texto: texto.trim().slice(0, 4000),
        criadaEm: new Date().toISOString()
      };
      notas.push(nota);
      await env.LEMBRETES_KV.put(NOTAS_KEY, JSON.stringify(notas));
      return jsonResponse({ ok: true, nota, total: notas.length });
    }

    // Apaga uma nota (chamado depois que o briefing incorpora a nota ao historico)
    if (url.pathname === '/api/notas' && request.method === 'DELETE') {
      let body;
      try { body = await request.json(); } catch (e) { body = null; }
      const id = body && body.id;
      if (!id || typeof id !== 'string') {
        return jsonResponse({ error: 'id invalido' }, 400);
      }
      const notas = await getNotas(env);
      const restantes = notas.filter(n => n.id !== id);
      await env.LEMBRETES_KV.put(NOTAS_KEY, JSON.stringify(restantes));
      return jsonResponse({ ok: true, total: restantes.length });
    }

    return env.ASSETS.fetch(request);
  }
};
