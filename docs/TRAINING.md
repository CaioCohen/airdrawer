# Treino e artefato

## Comando reproduzível

Depois de gerar e inspecionar o manifesto, execute:

```bash
pnpm ml:train --seed 42 --epochs 25 --lr 0.001 --patience 5
pnpm ml:evaluate --seed 42 --split test
pnpm ml:export --seed 42
```

O treino inicializa uma `ShapeCNN` do zero com seed 42, embaralha o split de treino de forma determinística por época e atualiza por amostra com Adam (`lr=0,001`). Arquitetura: `[1,32,32] -> conv4 -> pool -> conv8 -> pool -> dense32 -> logits3`; classes: círculo, quadrado, triângulo. Não usa TensorFlow, PyTorch, ONNX, pesos pré-treinados nem serviço externo.

O checkpoint é escolhido exclusivamente pela menor loss de validation e aplica early stopping com paciência 5. O split test não é lido pelo comando de treino. `ml:evaluate` persiste a política inicial congelada (`top >= 0,65`, margem `>= 0,15`) após observar validation e antes de materializar test; não busca limiar no test.

## Execução registrada

| Campo | Valor medido |
| --- | --- |
| Dataset / hash | `image-corpus-manifest-v1` / `725fb41d…c0232c` |
| Épocas solicitadas / concluídas | 25 / 9 (early stopping) |
| Melhor época / loss validation | 4 / 0,00009646026144172204 |
| Duração | 268,67 s |
| Runtime | Node v22.20.0, Windows 10.0.26200 x64 |
| CPU | AMD Ryzen 5 5600GT, 12 CPUs lógicas |

Registros reproduzíveis da execução ficam em `packages/training/artifacts/checkpoints/shape-cnn-v1-seed-42/`: `run-config.json`, `history.csv` e `best-validation-loss.json`. Esses diretórios são derivados e ignorados pelo Git; o comando os recria.

`ml:export` valida o checkpoint em um processo limpo com um tensor fixo (logits e probabilidades tolerância `1e-6`), gera `packages/training/artifacts/models/shape-cnn.v1.json` e copia-o para `apps/web/public/models/shape-cnn.v1.json`. A cópia servida tem SHA-256 `dd6e7873ca27b51e46c69da807cd21de83d8bd51b7d5b304e0e331947f025a9c`.

Seeds reduzem variação do pipeline, mas ponto flutuante, Node e CPU podem alterar os resultados; a validation com quatro imagens torna a seleção de checkpoint estatisticamente fraca.

## Verificação registrada em 31/10/2026

| Comando | Resultado |
| --- | --- |
| `pnpm install --frozen-lockfile` | passou; lockfile já estava atualizado |
| `pnpm dataset:generate --seed 42` | passou; 1.546 PNGs / 26 grupos |
| `pnpm dataset:inspect` | passou; hash do manifesto conferido |
| `pnpm ml:train --seed 42 --epochs 25 --lr 0.001 --patience 5` | passou; 268,67 s, melhor época 4 |
| `pnpm ml:evaluate --seed 42 --split test` | passou; 3/3, resultado apenas descritivo |
| `pnpm ml:export --seed 42` | passou; checksum e processo limpo conferidos |
| `pnpm test` | passou; 77 testes (3 contracts, 26 ml-core, 3 dataset, 4 training, 41 web) |
| `pnpm build` | passou |
| `pnpm test:e2e` | passou; 8 cenários |

A verificação acima foi feita no checkout de trabalho existente, que já continha mudanças de outras fases; não foi criada uma cópia limpa isolada. O procedimento e o lockfile estão prontos para essa confirmação independente, mas ela permanece pendente.
