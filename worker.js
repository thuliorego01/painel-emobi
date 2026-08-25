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


// ---- Feedback de visita (o cliente responde sozinho) ----
// Mesma ideia das notas: KV é CAIXA DE ENTRADA, não histórico. O briefing das
// 7h incorpora ao data.json e apaga daqui. Duas rotas são PÚBLICAS por
// natureza — o cliente não tem login: GET /visita/<token> e
// POST /api/feedback/responder. As outras ficam atrás do Cloudflare Access.
const FEEDBACK_KEY = 'feedback-visitas';

async function getFeedbacks(env) {
  const raw = await env.LEMBRETES_KV.get(FEEDBACK_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

const esc = (v) => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Cinco perguntas, não treze. Quem acabou de sair de uma visita responde no
// celular, em pé, na calçada — formulário longo vira formulário abandonado.
const PERGUNTAS = [
  { campo: 'intencao', rotulo: 'Você pretende comprar este imóvel?', tipo: 'radio',
    opcoes: ['Sim, quero comprar', 'Talvez, estou avaliando', 'Não tenho interesse'] },
  { campo: 'prazo', rotulo: 'Se comprar, para quando?', tipo: 'radio',
    opcoes: ['Imediato (até 30 dias)', 'Curto prazo (1 a 3 meses)', 'Médio prazo (3 a 6 meses)', 'Longo prazo (mais de 6 meses)', 'Ainda não defini'] },
  { campo: 'precoIdeal', rotulo: 'Por qual valor você compraria? (opcional)', tipo: 'moeda' },
  { campo: 'notaPreco', rotulo: 'De 1 a 10, o preço pedido está justo?', tipo: 'nota' },
  { campo: 'comentario', rotulo: 'O que você gostou e o que não gostou?', tipo: 'texto' }
];

function paginaFormulario(reg) {
  const respondido = !!reg.respondidoEm;
  const campos = PERGUNTAS.map(q => {
    if (q.tipo === 'radio') {
      return `<fieldset><legend>${esc(q.rotulo)}</legend>` +
        q.opcoes.map((o, i) => `<label class="op"><input type="radio" name="${q.campo}" value="${esc(o)}" ${i === 0 ? 'required' : ''}><span>${esc(o)}</span></label>`).join('') +
        `</fieldset>`;
    }
    if (q.tipo === 'moeda') {
      return `<fieldset><legend>${esc(q.rotulo)}</legend><input type="text" name="${q.campo}" inputmode="numeric" placeholder="R$ 000.000"></fieldset>`;
    }
    if (q.tipo === 'nota') {
      return `<fieldset><legend>${esc(q.rotulo)}</legend><div class="notas">` +
        Array.from({ length: 10 }, (_, i) => `<label class="nota"><input type="radio" name="${q.campo}" value="${i + 1}"><span>${i + 1}</span></label>`).join('') +
        `</div><div class="notas-leg"><i>1 = muito caro</i><i>10 = justo</i></div></fieldset>`;
    }
    return `<fieldset><legend>${esc(q.rotulo)}</legend><textarea name="${q.campo}" rows="4" placeholder="Pode ser bem direto — é isso que me ajuda a achar o imóvel certo para você."></textarea></fieldset>`;
  }).join('');

  return `<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Como foi sua visita?</title>
<style>
  :root { --brand:#8C6D1F; --txt:#20261E; --fraco:#6B7166; --linha:#E4E7DF; --fundo:#FCFCFA; }
  * { box-sizing:border-box; }
  body { margin:0; padding:22px 16px 56px; font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; color:var(--txt); background:var(--fundo); }
  .wrap { max-width:520px; margin:0 auto; }
  h1 { font-size:21px; margin:0 0 6px; }
  .sub { color:var(--fraco); font-size:13px; margin:0 0 22px; }
  .imovel { background:#fff; border:1px solid var(--linha); border-radius:14px; padding:13px 15px; margin-bottom:22px; }
  .imovel b { display:block; font-size:15px; }
  .imovel i { color:var(--fraco); font-size:12px; font-style:normal; }
  fieldset { border:1px solid var(--linha); border-radius:14px; padding:14px 15px; margin:0 0 14px; background:#fff; }
  legend { font-weight:600; font-size:14px; padding:0 6px; }
  .op { display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid var(--linha); cursor:pointer; }
  .op:last-child { border-bottom:0; }
  input[type=text], textarea { width:100%; font:inherit; padding:10px 12px; border:1px solid var(--linha); border-radius:9px; background:var(--fundo); }
  textarea { resize:vertical; }
  .notas { display:grid; grid-template-columns:repeat(10,1fr); gap:5px; }
  .nota input { position:absolute; opacity:0; }
  .nota span { display:block; text-align:center; padding:9px 0; border:1px solid var(--linha); border-radius:8px; font-size:13px; cursor:pointer; }
  .nota input:checked + span { background:var(--brand); color:#fff; border-color:var(--brand); }
  .notas-leg { display:flex; justify-content:space-between; margin-top:7px; color:var(--fraco); font-size:11px; }
  button { width:100%; padding:15px; font:600 16px inherit; color:#fff; background:var(--brand); border:0; border-radius:12px; cursor:pointer; margin-top:6px; }
  .ok { text-align:center; padding:44px 20px; }
  .ok .tick { font-size:42px; }
  .rodape { text-align:center; color:var(--fraco); font-size:12px; margin-top:26px; }
</style></head><body><div class="wrap">
${respondido ? `<div class="ok"><div class="tick">✅</div><h1>Resposta recebida</h1><p class="sub">Obrigado! Já está comigo. Qualquer novidade sobre este imóvel eu te aviso.</p></div>`
: `<h1>Como foi sua visita${reg.cliente ? ', ' + esc(String(reg.cliente).split(' ')[0]) : ''}?</h1>
<p class="sub">São 5 perguntas rápidas. Sua resposta sincera me ajuda a não te mostrar imóvel errado.</p>
<div class="imovel"><b>${esc(reg.imovelNome || ('Imóvel ' + (reg.imovelCodigo || '')))}</b>${reg.data ? `<i>Visita em ${esc(reg.data)}</i>` : ''}</div>
<form method="POST" action="/api/feedback/responder">
<input type="hidden" name="token" value="${esc(reg.token)}">
${campos}
<button type="submit">Enviar resposta</button>
</form>`}
<p class="rodape">Thúlio Rêgo · Emobi Imobiliária · CRECI/RN 6959</p>
</div></body></html>`;
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


    // ---- Feedback de visita ----

    // Cria o link de uma visita. Fica ATRÁS do Access: só Thúlio cria.
    if (url.pathname === '/api/feedback/criar' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch (e) { body = null; }
      if (!body || !body.imovelCodigo) return jsonResponse({ error: 'imovelCodigo obrigatorio' }, 400);
      const lista = await getFeedbacks(env);
      const reg = {
        id: 'fb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        token: Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10),
        imovelCodigo: String(body.imovelCodigo).slice(0, 40),
        imovelNome: String(body.imovelNome || '').slice(0, 300),
        cliente: String(body.cliente || '').slice(0, 200),
        leadId: body.leadId == null ? null : body.leadId,
        data: String(body.data || '').slice(0, 40),
        criadoEm: new Date().toISOString(),
        respondidoEm: null,
        respostas: null
      };
      lista.push(reg);
      await env.LEMBRETES_KV.put(FEEDBACK_KEY, JSON.stringify(lista));
      return jsonResponse({ ok: true, reg, link: url.origin + '/visita/' + reg.token });
    }

    // Lista (painel e briefing das 7h).
    if (url.pathname === '/api/feedback' && request.method === 'GET') {
      return jsonResponse(await getFeedbacks(env));
    }

    // Apaga depois que o briefing incorporou ao histórico.
    if (url.pathname === '/api/feedback' && request.method === 'DELETE') {
      let body;
      try { body = await request.json(); } catch (e) { body = null; }
      const id = body && body.id;
      if (!id || typeof id !== 'string') return jsonResponse({ error: 'id invalido' }, 400);
      const lista = await getFeedbacks(env);
      const restantes = lista.filter(f => f.id !== id);
      await env.LEMBRETES_KV.put(FEEDBACK_KEY, JSON.stringify(restantes));
      return jsonResponse({ ok: true, total: restantes.length });
    }

    // PÚBLICA — o cliente abre no celular, sem login.
    if (url.pathname.startsWith('/visita/')) {
      const token = url.pathname.slice('/visita/'.length).replace(/[^a-z0-9]/gi, '');
      const lista = await getFeedbacks(env);
      const reg = lista.find(f => f.token === token);
      if (!reg) return new Response('Link não encontrado ou expirado.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      return new Response(paginaFormulario(reg), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    // PÚBLICA — recebe a resposta do cliente. Aceita form comum: o formulário
    // precisa funcionar sem JavaScript, em celular ruim e internet ruim.
    if (url.pathname === '/api/feedback/responder' && request.method === 'POST') {
      let dados = {};
      const tipo = request.headers.get('content-type') || '';
      try {
        if (tipo.includes('application/json')) {
          dados = await request.json();
        } else {
          const fd = await request.formData();
          fd.forEach((v, k) => { dados[k] = String(v); });
        }
      } catch (e) { dados = {}; }
      const token = String(dados.token || '').replace(/[^a-z0-9]/gi, '');
      const lista = await getFeedbacks(env);
      const reg = lista.find(f => f.token === token);
      if (!reg) return new Response('Link não encontrado.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      if (!reg.respondidoEm) {
        reg.respondidoEm = new Date().toISOString();
        reg.respostas = {
          intencao: String(dados.intencao || '').slice(0, 120),
          prazo: String(dados.prazo || '').slice(0, 120),
          precoIdeal: String(dados.precoIdeal || '').slice(0, 40),
          notaPreco: String(dados.notaPreco || '').slice(0, 4),
          comentario: String(dados.comentario || '').slice(0, 3000)
        };
        await env.LEMBRETES_KV.put(FEEDBACK_KEY, JSON.stringify(lista));
      }
      if (tipo.includes('application/json')) return jsonResponse({ ok: true });
      return new Response(paginaFormulario(reg), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    return env.ASSETS.fetch(request);

  }
};
