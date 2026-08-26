// Thúlio usa o painel numa sala com outras pessoas. Comissão, meta e
// faturamento não precisam ficar legíveis de longe o tempo todo. brl() é o
// funil por onde TODO dinheiro passa antes de virar texto — mascarar ali cobre
// a tela inteira e, mais importante, cobre também as telas que ainda não
// existem. Se alguém um dia formatar dinheiro por fora do brl(), o valor
// vazaria no modo privado sem ninguém perceber.
const { montar } = require('./ambiente');
const fs = require('fs');
const path = require('path');
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = {
  nome: 'Modo privado esconde todo valor em dinheiro',
  async rodar() {
    const raiz = path.join(__dirname, '..');
    const tpl = fs.readFileSync(path.join(raiz, 'public', 'index.template.html'), 'utf8');

    // 1. A máscara mora dentro do brl(), não espalhada pela tela.
    const corpoBrl = (tpl.match(/function brl\(v\)\s*\{[\s\S]*?\n\}/) || [''])[0];
    assert(/PRIVADO/.test(corpoBrl),
      'brl() não conhece o modo privado — a máscara está em outro lugar e vai deixar valor escapar');

    // 2. Ninguém pode formatar dinheiro por fora do brl().
    const forasteiros = (tpl.match(/style:\s*'currency'/g) || []).length;
    assert(forasteiros === 1,
      `há ${forasteiros} formatações de moeda no template — só pode existir uma, dentro do brl()`);

    // 3. O gráfico desenha o número no canvas, longe do brl(): tem que borrar.
    assert(/body\.privado canvas/.test(tpl),
      'os gráficos continuam legíveis no modo privado — falta borrar o canvas');

    // 4. O botão existe, diz o que faz e informa o estado a leitor de tela.
    assert(/id="privadoBtn"/.test(tpl), 'o botão de ocultar valores não existe');
    assert(/aria-pressed/.test(tpl), 'o botão não informa o estado (aria-pressed)');

    // 5. O atalho não pode disparar enquanto se digita numa nota de cliente.
    const bloco = (tpl.match(/function ligarModoPrivado\(\)[\s\S]*?\n\}\)\(\);/) || [''])[0];
    assert(/TEXTAREA/.test(bloco) && /INPUT/.test(bloco),
      'a tecla V viraria modo privado no meio de uma nota — falta ignorar campos de texto');

    // 6. Estado padrão: visível. Ninguém deve abrir o painel sem entender nada.
    const { doc } = await montar();
    assert(!doc.body.classList.contains('privado'),
      'o painel nasce em modo privado — o padrão tem que ser mostrar');
    // textContent do body inclui o conteúdo das tags <script> — e o literal da
    // máscara mora lá dentro. Aqui interessa só o que o olho vê.
    const visivel = doc.body.cloneNode(true);
    [...visivel.querySelectorAll('script,style')].forEach(n => n.remove());
    const txt = visivel.textContent;
    assert(/R\$\s*\d/.test(txt), 'nenhum valor visível no estado padrão');
    assert(!/R\$\s*••••/.test(txt), 'valor mascarado aparecendo fora do modo privado');
  }
};
