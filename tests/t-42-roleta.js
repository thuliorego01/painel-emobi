// A ROLETA — o estágio que faltava, antes do painel.
//
// Este painel só conheceu, por dois meses, quem já estava andando: cliente
// entra quando chega na fase de agendar visita. O efeito é que todo número
// daqui descreve SOBREVIVENTES, e o lead que morre no iMoview por falta de
// toque não aparece em lugar nenhum. Em 07/09/2026, quatro atendimentos ativos
// do iMoview não existiam aqui — e a Thaise Lima já estava em "Agendamento",
// ou seja, já tinha cruzado a linha de entrada, e ninguém viu.
//
// O que este teste protege:
//   1. a colagem entende os dois formatos que o navegador produz;
//   2. o número do atendimento é a chave — colar de novo NUNCA duplica;
//   3. nada é gravado sem o painel mostrar antes o que entendeu;
//   4. quem já passou da linha de entrada aparece em destaque;
//   5. gravação que falha não altera nada na tela.
const { montar } = require('./ambiente');
const assert = (c, m) => { if (!c) throw new Error(m); };

const COLA_TEXTO = [
  'VENDA | APARTAMENTO | NATAL/RN | CANDELÁRIA - NATAL/RN | R$ 215.992,00 ATÉ R$ 323.988,00 | A PARTIR 3 QUARTO(S) | A PARTIR 2 VAGA(S)',
  'Atendimento 34288', 'Thaise Lima', '(84) 99417-4876', 'thaise.lima@exemplo.com',
  'Situação: Em atendimento', 'Fase atendimento: Agendamento', 'Mídia de origem: GrupoZap',
  'VENDA | APARTAMENTO | NATAL/RN | PITIMBU - NATAL/RN | R$ 296.000,00 ATÉ R$ 444.000,00 | A PARTIR 2 QUARTO(S)',
  'Atendimento 32156', 'Medeiros', '(84) 99688-7290',
  'Situação: Em atendimento', 'Fase atendimento: Seleção dos imóveis', 'Mídia de origem: GrupoZap'
].join('\n');

// O mesmo atendimento, agora no formato com link que o navegador produz ao
// copiar texto formatado. Tem que ser reconhecido como O MESMO registro.
const COLA_LINK =
  '[Venda | Apartamento | Natal/RN | Candelária - Natal/RN | R$ 215.992,00 até R$ 323.988,00 | A partir 3 quarto(s) | A partir 2 vaga(s)](https://app.imoview.com.br/Atendimento/Detalhes/34288)\n' +
  '* [Atendimento 34288](https://app.imoview.com.br/Atendimento/Detalhes/34288)\n' +
  '* Thaise Lima\n* [(84) 99417-4876](https://api.whatsapp.com/send?phone=5584994174876)\n' +
  '* Situação: Em atendimento\n* Fase atendimento: Agendamento\n* Mídia de origem: GrupoZap\n';

module.exports = {
  nome: 'Roleta do iMoview: colagem, chave estável e detector de vazamento',
  async rodar() {
    const { dom, doc } = await montar();
    const w = dom.window;
    const gravacoes = [];
    let recusar = false;
    w.fetch = (url, opt) => {
      if (String(url).indexOf('/api/dados/patch') !== -1) {
        if (recusar) return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}) });
        gravacoes.push(JSON.parse(opt.body));
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    };
    w.alert = function () {};   // o caminho de erro avisa por alert; jsdom não implementa
    const clicar = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

    const cola = doc.getElementById('roletaCola');
    const ler = doc.getElementById('roletaLerBtn');
    const salvar = doc.getElementById('roletaSalvarBtn');
    const prev = doc.getElementById('roletaPreview');
    assert(doc.getElementById('panel-roleta'), 'a aba Roleta sumiu');
    assert(cola && ler && salvar && prev, 'a caixa de colagem da roleta sumiu');

    // 1. Sem colar nada, nada pode ser gravado — e o painel tem que DIZER que
    //    está vazio, não abrir em branco (zero é resultado, não ausência).
    assert(salvar.offsetParent === null || salvar.style.display === 'none',
      'o botão de salvar aparece antes de existir colagem lida');
    assert(/ainda não colou/i.test(doc.getElementById('roletaLista').textContent),
      'com a roleta vazia o painel precisa dizer que ela está vazia');

    // 2. Colagem que não é uma roleta não grava nada.
    cola.value = 'bom dia, tudo certo?';
    clicar(ler);
    assert(gravacoes.length === 0, 'gravou a partir de uma colagem que não era a roleta');
    assert(/não reconheci/i.test(prev.textContent), 'colagem inválida precisa avisar que nada foi gravado');

    // 3. Colagem real: o painel mostra o que entendeu ANTES de gravar.
    cola.value = COLA_TEXTO;
    clicar(ler);
    assert(gravacoes.length === 0, 'gravou sem passar pela conferência');
    assert(/Thaise Lima/.test(prev.textContent) && /Medeiros/.test(prev.textContent),
      'a conferência não mostrou os atendimentos lidos');
    assert(/Candel[áa]ria/.test(prev.textContent), 'a conferência perdeu o bairro do pedido');

    clicar(salvar);
    await new Promise(r => setTimeout(r, 120));
    const D = w.eval('DATA');
    assert(D.roleta.length === 2, 'esperava 2 atendimentos na roleta, veio ' + D.roleta.length);
    assert(gravacoes.length === 1 && gravacoes[0].ops.length === 2, 'as operações de gravação não bateram');
    assert(gravacoes[0].ops.every(o => o.tipo === 'acrescentar' && o.colecao === 'roleta'),
      'atendimento novo tem que entrar por "acrescentar" na coleção roleta');

    // 4. A CHAVE É O ATENDIMENTO. Colar de novo, em outro formato, atualiza.
    cola.value = COLA_LINK;
    clicar(ler);
    clicar(salvar);
    await new Promise(r => setTimeout(r, 120));
    assert(D.roleta.length === 2,
      'colar de novo duplicou: a chave tem que ser o número do atendimento, virou ' + D.roleta.length);
    const ops2 = gravacoes[1].ops;
    assert(ops2.every(o => o.tipo === 'atualizar' && o.chave === 'atendimento'),
      'atendimento já conhecido tem que entrar por "atualizar" chaveado em atendimento');

    // 5. Quem já passou da linha de entrada aparece em destaque, na lista e no
    //    aviso da tela inicial. É a razão de a aba existir.
    const lista = doc.getElementById('roletaLista').textContent;
    assert(/j[áa] passou da linha/i.test(lista),
      'a Thaise está em "Agendamento" e não foi marcada como fora do painel');
    const alerta = doc.getElementById('roletaAlerta').textContent;
    assert(/Thaise/.test(alerta), 'o aviso da tela inicial não citou quem está vazando');

    // 6. Gravação recusada não pode alterar a tela.
    recusar = true;
    const antes = JSON.stringify(D.roleta);
    const btnFalei = doc.querySelector('[data-roleta-acao="falei"]');
    if (btnFalei) {
      clicar(btnFalei);
      await new Promise(r => setTimeout(r, 120));
      assert(JSON.stringify(D.roleta) === antes,
        'a gravação falhou e mesmo assim o dado mudou na tela');
    }
  }
};
