# Fase 2 — Passo 7: gate matemático e de integração

## Objetivo

Não iniciar o treinamento completo enquanto operações, gradientes, preprocessamento e carregamento não tiverem evidência automatizada de correção.

## Checklist de aceite

- Tensor, Conv2D, MaxPool, Dense, ReLU, softmax/cross-entropy e Adam possuem testes focados e passam.
- Diferenças finitas cobrem ao menos Dense e Conv2D em casos pequenos; tolerâncias e seeds estão documentadas.
- O modelo sobreajusta conjunto mínimo controlado e não produz `NaN`/shape inválido.
- Um `Drawing` de fixture produz tensor idêntico no Node e navegador; múltiplos strokes ficam separados.
- Artefato serializado carrega e produz resultado equivalente; artefatos corrompidos são rejeitados.
- UI testa modelo pendente, modelo inválido, pouca tinta, incerteza e descarte de revisões antigas.

## Saída da fase

Uma CNN de três classes e todo o caminho de inferência existem, mas nenhum peso de produção é declarado treinado. Isso preserva a separação solicitada: a Fase 3 começa somente depois de a entrada real e a matemática estarem prontas.
