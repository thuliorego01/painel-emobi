# Testes do painel

Rodam sobre `public/index.html` **já gerado** — então rode `node scripts/montar-painel.js` antes.

```bash
bash tests/verificar.sh
```

Isso monta o painel, confere a sintaxe do JS, o balanceamento das tags HTML e
roda todas as suítes. **Se qualquer etapa falhar, o script para com erro — não
publique.** (Já aconteceu de publicar com teste vermelho por rodar os comandos
soltos; o `set -e` daqui existe para impedir isso.)

Cada arquivo `t-*.js` exporta `{ nome, rodar(dom) }` ou faz suas próprias asserções.
O runner monta o DOM com jsdom, com `fetch` e `Chart` dublados, e permite
congelar a data para simular outro dia.

> Estes testes já viveram numa pasta temporária e se perderam num reinício do
> ambiente. Moram no repositório agora justamente por isso.
