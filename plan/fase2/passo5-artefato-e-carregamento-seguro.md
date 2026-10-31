# Fase 2 — Passo 5: artefato de modelo e carregamento seguro

## Objetivo

Definir o formato que ligará treinamento e navegador, evitando incompatibilidade silenciosa de pesos, classes ou preprocessamento.

## Implementação

1. Criar tipos/validador de `shape-cnn.v1.json` com `schemaVersion`, `modelVersion`, arquitetura, `classNames`, `preprocessingVersion`, metadados de treino e parâmetros por nome.
2. Implementar serialização isomórfica do modelo e funções Node separadas para ler/escrever arquivo. O `ml-core` só converte objeto JSON; `packages/training` usa `fs`.
3. Durante load, validar versão, ordem imutável de classes, arquitetura suportada, existência de todos os parâmetros, comprimento exato e finitude de cada valor antes de instanciar/usar o modelo.
4. Definir smoke-test com tensor conhecido e tolerância numérica. Falha deve bloquear inferência e retornar erro de UI acionável, sem tentar adivinhar com pesos parciais.
5. Produzir somente fixture de teste ou artefato explicitamente marcado não treinado nesta fase; o artefato de produção será produzido na Fase 3.

## Verificação / aceite

- Round-trip serialização preserva logits/probabilidades para tensor fixo dentro da tolerância declarada.
- Testes rejeitam schema, classe, comprimento, número não finito e parâmetro ausente/corrompido.
- A build web carrega o objeto por `fetch`/JSON sem dependência de `fs`.

## Dependências

ShapeCNN concluída. A execução em produção ainda aguarda pesos treinados.
