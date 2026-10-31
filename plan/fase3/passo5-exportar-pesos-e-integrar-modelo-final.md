# Fase 3 — Passo 5: exportar pesos e integrar o modelo final

## Objetivo

Transformar o melhor checkpoint em artefato verificável para o navegador e completar a demonstração ponta a ponta.

## Implementação

1. Implementar `ml:export` para escrever `shape-cnn.v1.json` com schema, arquitetura, classes, versão de preprocessamento, seed/hash/época e todos os parâmetros finitos. Calcular checksum SHA-256.
2. Validar o artefato em processo limpo: recarregar por nome/tamanho, rodar smoke-test e comparar logits/probabilidades com o CLI. Só então copiar/gerar a versão servida em `apps/web/public/models/`.
3. Remover a fixture não treinada da rota de produção e configurar a aplicação para carregar o artefato real uma vez. Em falha de fetch/validação, exibir “Erro ao carregar modelo” e manter a lousa utilizável.
4. Rodar fluxo de integração `Drawing` → preprocessamento → Worker/modelo → painel para mouse e webcam. Confirmar que clear/undo invalidam predições pendentes e que três probabilidades atualizam durante desenho.
5. Não substituir o modelo no navegador por heurística de forma. O botão/estado de “Ainda não sei” deve refletir a política calibrada, não uma quarta classe.

## Verificação / aceite

- CLI e browser retornam probabilidades equivalentes para os mesmos fixtures.
- E2E cobre artefato presente, ausente e corrompido, além de desenho parcial e limpeza.
- O artefato versionado contém pesos reais, não arrays vazios nem pesos de gato/cachorro.
