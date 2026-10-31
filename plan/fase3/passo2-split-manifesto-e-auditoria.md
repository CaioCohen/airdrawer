# Fase 3 — Passo 2: split, manifesto e auditoria contra vazamento

## Objetivo

Produzir um dataset auditável sem que prefixos ou variações da mesma figura cruzem train, validation e test.

## Implementação

1. Antes de gerar prefixos/augmentations, dividir `groupId`s por classe em 70% train, 15% validation e 15% test com seed registrada. Todos os derivados permanecem no split do grupo.
2. Escrever `manifest.jsonl` com `id`, `groupId`, split, label/id, `visibleFraction`, seed, arquivo de strokes e `preprocessVersion`. Opcionalmente cachear tensores como derivação descartável/regerável.
3. Implementar `dataset:generate --seed 42` e `dataset:inspect`; começar com 400 trajetórias por classe e cinco prefixos por grupo, dimensionando por medição posterior.
4. Auditar contagens por classe/split/fração, IDs/grupos duplicados, rótulos inválidos, tensores vazios e checksum do manifesto. Criar sumário/grade visual fora do fluxo do classificador.
5. Manter `datasets/real-test` separado, voluntário e sem versionar dados pessoais por padrão. Não o utilizar para ajustar hiperparâmetros ou limiares.

## Verificação / aceite

- Teste de integração falha se algum `groupId` aparecer em dois splits.
- Inspeção mostra distribuição balanceada e total esperado aproximado (1.200 grupos / 6.000 prefixos iniciais).
- Regerar com a seed produz o mesmo split e manifesto verificável.

## Dependências

Gerador (Passo 1), preprocessamento compartilhado e contratos de artefato da Fase 2.
