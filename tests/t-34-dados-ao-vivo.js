// Toda mudança de dado exigia upload manual no GitHub — só numa semana isso
// custou 4 dias de dados parados. Agora existe uma sobreposição no KV que o
// painel serve na hora, e o briefing dobra dentro do data.json toda manhã.
// O git segue dono da verdade; o KV é o caminho curto, que se desfaz diariamente.
// Este teste guarda o que torna isso SEGURO: sem porteiro, é o caminho mais
// rápido para apagar uma venda sem ninguém ver — como aconteceu em 12/08/2026.
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Dados ao vivo: grava sem upload, mas com porteiro',
  async rodar() {
    const raiz = path.join(__dirname, '..');
    const worker = fs.readFileSync(path.join(raiz, 'worker.js'), 'utf8');
    const montar = fs.readFileSync(path.join(raiz, 'scripts', 'montar-painel.js'), 'utf8');

    // 1. As rotas existem.
    ['/api/dados/patch', '/api/dados/reverter', "url.pathname === '/api/dados'"].forEach(r => {
      assert(worker.indexOf(r) !== -1, `worker.js não tem ${r}`);
    });

    // 2. O marcador é o MESMO da build. Se a build mudar o texto e o worker não,
    //    a injeção falha em silêncio e a tela mostra dados velhos achando que
    //    são novos — o pior tipo de erro que existe aqui.
    const mBuild = (montar.match(/const MARKER = '([^']+)'/) || [])[1];
    const mWorker = (worker.match(/const MARCADOR = '([^']+)'/) || [])[1];
    assert(mBuild && mWorker, 'não achei o marcador em um dos dois arquivos');
    assert(mBuild === mWorker,
      `marcador diferente entre build e worker:\n  build:  ${mBuild}\n  worker: ${mWorker}`);

    // 3. Escapa </script — dado de cliente entra nesse JSON.
    assert(/<\\\/script/.test(worker), 'o worker não escapa </script ao injetar os dados');

    // 4. PORTEIRO: coleção não pode encolher de repente.
    assert(/ENCOLHIMENTO_MAX/.test(worker), 'não há limite de encolhimento — uma venda pode sumir sem aviso');
    ['leads', 'imoveis', 'listaNegociacoes', 'logAtividades'].forEach(c => {
      assert(new RegExp("'" + c + "'").test(worker), `${c} não está protegida contra encolhimento`);
    });

    // 5. PORTEIRO: valida ANTES de gravar, não depois.
    const rota = (worker.match(/api\/dados\/patch'[\s\S]*?return jsonResponse\(\{\s*ok: true/) || [''])[0];
    assert(/validarDados/.test(rota), 'a rota grava sem validar');
    const posValidar = rota.indexOf('validarDados');
    const posGravar = rota.indexOf('LEMBRETES_KV.put(DADOS_KEY');
    assert(posValidar !== -1 && posGravar !== -1 && posValidar < posGravar,
      'a validação acontece depois da gravação — inútil');

    // 6. Sempre dá para voltar.
    assert(/DADOS_ANTERIOR_KEY/.test(worker), 'não guarda a versão anterior — não há rollback');

    // 7. Campo interno não pode vazar para dentro do DATA da página.
    assert(/delete copia\.__gravadoEm/.test(worker),
      '__gravadoEm vai parar dentro do DATA e vira campo fantasma no CRM');

    // 8. A página montada na hora não pode ser cacheada, senão a mudança
    //    "instantânea" chega quando a borda resolver expirar.
    const inj = (worker.match(/MARCADOR[\s\S]{0,600}/) || [''])[0];
    assert(/no-store/.test(worker.slice(worker.indexOf('texto.replace(MARCADOR'))),
      'a página com sobreposição pode ser cacheada e mostrar dado velho');
  }
};
