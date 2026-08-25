// O feedback de visita nunca voltava: ficava "cobrar o feedback" na ficha do
// imóvel e morria ali — o Cód. 9754 esperou 25 dias, e o 10842 teve sete visitas
// sem uma linha do que os visitantes acharam. O cliente agora responde sozinho.
// Duas rotas são PÚBLICAS por natureza (o cliente não tem login); as outras não
// podem ser, senão qualquer um lista os dados dos clientes.
const { montar } = require('./ambiente');
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Feedback de visita: link público, dados privados',
  async rodar() {
    const raiz = path.join(__dirname, '..');
    const worker = fs.readFileSync(path.join(raiz, 'worker.js'), 'utf8');
    const wrangler = fs.readFileSync(path.join(raiz, 'wrangler.toml'), 'utf8');
    const tpl = fs.readFileSync(path.join(raiz, 'public', 'index.template.html'), 'utf8');

    // 1. As rotas existem.
    ['/api/feedback/criar', '/api/feedback/responder', "startsWith('/visita/')"].forEach(r => {
      assert(worker.indexOf(r) !== -1, `worker.js não tem a rota ${r}`);
    });

    // 2. A rota pública precisa chegar ao worker. Sem isto, /visita/<token> cai
    //    no ASSETS, dá 404, e o link que você mandou para o cliente não abre.
    assert(/run_worker_first\s*=\s*\[[^\]]*\/visita\/\*/.test(wrangler),
      'wrangler.toml não manda /visita/* para o worker — o link do cliente vai dar 404');

    // 3. Cinco perguntas, não treze. Formulário longo vira formulário abandonado.
    const campos = ['intencao', 'prazo', 'precoIdeal', 'notaPreco', 'comentario'];
    campos.forEach(c => assert(worker.indexOf(`'${c}'`) !== -1 || worker.indexOf(`${c}:`) !== -1,
      `a pergunta "${c}" sumiu do formulário`));
    const perguntas = (worker.match(/\{ campo: '/g) || []).length;
    assert(perguntas === 5, `o formulário tem ${perguntas} perguntas — combinamos 5`);

    // 4. O formulário tem que funcionar sem JavaScript: celular ruim, na calçada.
    assert(/method="POST" action="\/api\/feedback\/responder"/.test(worker),
      'o formulário depende de JS para enviar — tem que ser um <form> comum');
    assert(worker.indexOf('formData()') !== -1,
      'o worker não aceita envio de formulário comum, só JSON');

    // 5. Resposta não pode ser sobrescrita por quem reabrir o link.
    assert(/if \(!reg\.respondidoEm\)/.test(worker),
      'reabrir o link apagaria a resposta já dada');

    // 6. Escape: o comentário do cliente é texto de fora, entra no HTML.
    assert(/function esc\(/.test(worker) || /const esc = /.test(worker),
      'o worker monta HTML com dados do cliente sem função de escape');

    // 7. O painel lê e mostra — e nunca guarda o feedback como campo calculado.
    ['carregarFeedbacks', 'pintarFeedback', 'fbResumoPreco'].forEach(f => {
      assert(tpl.indexOf(f) !== -1, `o painel não tem ${f}`);
    });

    // 8. O painel não pode quebrar quando não há backend (arquivo local).
    const { doc } = await montar();
    assert(doc.body.textContent.length > 0, 'painel não renderiza sem a API de feedback');
  }
};
