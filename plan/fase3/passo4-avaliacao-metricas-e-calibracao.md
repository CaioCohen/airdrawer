# Fase 3 — Passo 4: avaliação, métricas e calibração de incerteza

## Objetivo

Avaliar uma única vez o conjunto test isolado, demonstrar desempenho em desenhos parciais e escolher a política de incerteza sem esconder ambiguidades.

## Implementação

1. Implementar `ml:evaluate --split test` com accuracy total e por classe, precision, recall, F1, matriz de confusão 3×3 e contagens de exemplos. A ordem das classes deve constar no arquivo.
2. Calcular as mesmas métricas por fração 25/40/60/80/100. Reportar separadamente accuracy de predições aceitas e taxa de abstenção; prefixos curtos podem ser intrinsecamente ambíguos.
3. Usar somente validation para escolher limites de decisão, começando em top probability 0,65 e margem 0,15. Congelar configuração antes de abrir test.
4. Medir mediana/p95 de inferência no navegador em hardware e condições documentados. Registrar, sem prometer, o objetivo de p95 inferior a 50 ms e latência de atualização de 100–250 ms.
5. Se existirem referências humanas consentidas, gerar relatório independente de `real-test`, com proveniência e tamanho do conjunto; nunca mesclá-las às métricas sintéticas sem distinção.

## Verificação / aceite

- São gerados `metrics.json`, `confusion-matrix.json`, `history.csv`, `dataset-summary.json` e `training-config.json` com valores reais.
- Métricas de test só são calculadas após checkpoint/configuração estar escolhida por validation.
- A análise registra falhas/domain gap em vez de substituir a CNN por regras geométricas.
