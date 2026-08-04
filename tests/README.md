# Testes do painel

Rodam sobre `public/index.html` **já gerado** — então rode `node scripts/montar-painel.js` antes.

```bash
node scripts/montar-painel.js && node tests/rodar.js
```

Cada arquivo `t-*.js` exporta `{ nome, rodar(dom) }` ou faz suas próprias asserções.
O runner monta o DOM com jsdom, com `fetch` e `Chart` dublados, e permite
congelar a data para simular outro dia.

> Estes testes já viveram numa pasta temporária e se perderam num reinício do
> ambiente. Moram no repositório agora justamente por isso.
