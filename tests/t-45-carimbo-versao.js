// PERDA DE GRAVAÇÃO — 10/09/2026.
//
// O canal ao vivo faz ler-alterar-gravar: lê a sobreposição inteira, aplica as
// operações e regrava. Enquanto só o Claude escrevia, duas gravações nunca se
// cruzavam. Quando o painel passou a gravar sozinho (baixa de parcela, fase do
// processo), passaram a existir dois escritores — e uma gravação inteira sumiu:
// o renome de um cliente, as fases de cinco negócios, as seis parcelas da
// Angélica e até o registro dela no histórico. Ninguém viu; o painel só
// mostrava um estado antigo como se fosse o atual.
//
// A correção é um carimbo de versão: quem grava diz em cima de QUAL versão está
// gravando. Se a base andou, o worker recusa com 409 e a tela manda recarregar.
// Perder por conflito avisado é irritante. Perder em silêncio é inaceitável.
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Gravação carimba a versão que leu — e é recusada se a base andou',
  async rodar() {
    const raiz = path.join(__dirname, '..');
    const worker = fs.readFileSync(path.join(raiz, 'worker.js'), 'utf8');
    const tpl = fs.readFileSync(path.join(raiz, 'public', 'index.template.html'), 'utf8');

    // 1. O worker compara a versão recebida com a vigente e recusa com 409.
    assert(/body\.baseadoEm/.test(worker),
      'o worker voltou a aceitar gravação sem saber de qual versão ela partiu');
    assert(/409/.test(worker), 'o worker não recusa conflito de versão com 409');
    const bloco = (worker.match(/if \(body\.baseadoEm[\s\S]{0,320}/) || [''])[0];
    assert(/base\.__gravadoEm/.test(bloco), 'a comparação não usa o carimbo da base');

    // 2. O carimbo precisa CHEGAR na tela. Ele já foi apagado na injeção uma
    //    vez — e sem ele a tela grava sem dizer de onde partiu, que é o mesmo
    //    que não ter proteção nenhuma.
    assert(!/delete copia\.__gravadoEm/.test(worker),
      'o worker voltou a apagar __gravadoEm ao injetar DATA — a tela fica sem carimbo');

    // 3. A tela devolve o carimbo em toda gravação.
    assert(/baseadoEm/.test(tpl), 'a tela não envia o carimbo de versão ao gravar');
    const grav = (tpl.match(/async function gravarNegociacao[\s\S]{0,900}/) || [''])[0];
    assert(/DATA\.__gravadoEm/.test(grav), 'a gravação não lê o carimbo de DATA');
    assert(/409/.test(grav), 'a tela não trata o conflito de versão');
    assert(/recarregue|recarregar/i.test(grav),
      'no conflito, a tela precisa mandar recarregar — não pode falhar em silêncio');

    // 4. E a mensagem tem que deixar claro que nada foi perdido, senão o medo
    //    de perder faz a pessoa parar de usar o painel para registrar.
    assert(/nada foi perdido/i.test(grav),
      'a mensagem de conflito não tranquiliza sobre o que já estava gravado');
  }
};
