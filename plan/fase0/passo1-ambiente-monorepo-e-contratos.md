# Fase 0 — Passo 1: preparar ambiente, monorepo e contratos

## Objetivo

Criar uma base reproduzível para web, núcleo isomórfico de ML, geração de dados e CLI de treino, sem iniciar ainda o treinamento ou implementar a classificação.

## Implementação

1. Inicializar `pnpm` workspace com `apps/web`, `packages/ml-core`, `packages/dataset`, `packages/training` e uma área comum para os tipos de desenho (`packages/contracts` ou `ml-core/src/drawing`). Fixar versões no `package.json` e `pnpm-lock.yaml`; não usar `latest`.
2. Criar React + TypeScript + Vite em `apps/web`; adicionar Vitest para unidades/integração e Playwright para E2E. Configurar aliases/exports de modo que o navegador não importe `node:fs`, `node:path` ou módulos exclusivos do Node.
3. Adicionar `@mediapipe/tasks-vision` somente ao pacote web e declarar a origem, licença, versão e tamanho do artefato do Hand Landmarker a ser usado. Nenhuma biblioteca de ML é permitida.
4. Definir os contratos compartilhados: `ShapeLabel`, `Point2D`, `Stroke`, `Drawing`, `PreprocessResult`, constantes de classe e uma função para validar pontos finitos no intervalo `[0,1]`. `Drawing.revision` aumenta em toda alteração visual.
5. Configurar scripts reais: `dev`, `build`, `test`, `test:e2e`, `dataset:generate`, `dataset:inspect`, `ml:train`, `ml:evaluate` e `ml:export`. Os últimos podem falhar explicitamente como “ainda não implementado” até as fases correspondentes, mas sua interface deve estar definida.
6. Criar `.gitignore` para `node_modules`, outputs transitórios, capturas reais e checkpoints intermediários; manter no repositório somente código, metadados/artefatos deliberadamente escolhidos e documentação.
7. Escrever o esqueleto de `README.md` e `docs/ARCHITECTURE.md`, explicitando a separação: webcam → landmarks → gesto → `Drawing` → preprocessamento → CNN, e esclarecendo o uso limitado do MediaPipe.

## Verificação / aceite

- `pnpm install`, `pnpm build`, `pnpm test` e a inicialização do Vite funcionam em checkout limpo.
- Um teste de contratos prova os IDs fixos e que revisão/pontos inválidos são rejeitados.
- A build web não contém importação de API exclusiva de Node.
- O frontend exibe uma tela inicial sem solicitar webcam automaticamente.

## Referências

Usar a estrutura de CLI do repositório D1 apenas como inspiração; adotar workspace e testes, ausentes nas referências. A especificação obriga React/Vite, TypeScript, pnpm e execução de treino em Node.
