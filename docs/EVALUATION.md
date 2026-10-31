# Avaliação

Execute `pnpm ml:evaluate --seed 42 --split test` somente depois de treinar. O resultado registrado está em `packages/training/artifacts/checkpoints/shape-cnn-v1-seed-42/evaluation/`: `metrics.json`, `confusion-matrix.json`, `calibration.json`, `dataset-summary.json`, `training-config.json` e cópia de `history.csv`.

O checkpoint `best-validation-loss.json` foi escolhido por menor loss na validation (época 4). A política de incerteza foi congelada em validation, sem otimização: probabilidade máxima >= 0,65 e margem para a segunda classe >= 0,15. Matriz: linhas reais, colunas preditas, ordem `circle`, `square`, `triangle`.

## Resultado registrado — corpus raster, test

| Métrica | Valor |
| --- | ---: |
| Exemplos | 3 |
| Aceitos / abstenções | 3 / 0 |
| Accuracy | 3/3 = 100% |
| Accuracy dos aceitos | 3/3 = 100% |
| Precision / recall / F1 por classe | 1,00 / 1,00 / 1,00 (suporte 1 por classe) |

Matriz de confusão registrada:

| Real \\ Predito | circle | square | triangle |
| --- | ---: | ---: | ---: |
| circle | 1 | 0 | 0 |
| square | 0 | 1 | 0 |
| triangle | 0 | 0 | 1 |

Esses 100% são somente uma descrição dos três rasters de test, não uma estimativa de generalização nem uma meta atingida. Validation também contém quatro exemplos (2/1/1) e não estabelece calibração. Não houve dado `real-test` consentido, teste de câmera, nem medição de tempo de inferência em navegador.

O corpus só tem `visibleFraction=1`; métricas para 25/40/60/80% e desempenho durante desenho permanecem indisponíveis, em vez de interpoladas. Veja [LIMITATIONS.md](LIMITATIONS.md).
