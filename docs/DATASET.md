# Dataset e auditoria

## Fonte, versão e split

O corpus de treino é `scripts/images/`, cuja fonte de verdade é `scripts/images/manifest.csv`. A execução registrada com `pnpm dataset:generate --seed 42` produziu o manifesto derivado `datasets/generated/image-corpus-v1/manifest.jsonl`, versão `image-corpus-manifest-v1`, SHA-256 `725fb41d4681375731980809042e55708b6f789f87ae93b3c6bba0d048c0232c`.

Há 1.546 PNGs e 26 grupos (`groupId = label:source`). O split já fornecido é preservado; o comando não redivide, move ou altera imagens. Assim, derivados de uma mesma fonte não atravessam split:

| Split | circle | square | triangle | Total |
| --- | ---: | ---: | ---: | ---: |
| train | 567 | 486 | 486 | 1.539 |
| validation | 2 | 1 | 1 | 4 |
| test | 1 | 1 | 1 | 3 |

`pnpm dataset:inspect` valida SHA-256 do manifesto, proveniência, IDs e caminhos duplicados, isolamento de `groupId`, rótulos, todos os PNGs e tensores `[1,32,32]`. Há um checksum de PNG idêntico entre caminhos distintos, registrado no `audit.json`; nenhum ativo fornecido foi removido.

## Conversão de imagens

O loader aceita apenas PNG 8-bit não entrelaçado. Ele compõe alfa sobre branco, inverte quando a mediana de borda é escura, obtém luminância, aplica limiar de tinta `220/255` e redução determinística por média de área para 32×32. A saída é `Float32Array` canal-primeiro, com fundo `0` e tinta `1`, versão `image-corpus-v1`.

Não existem trajetórias, strokes ou prefixos temporais nos ativos: cada amostra tem `visibleFraction: 1` e `strokesFile: null`. Portanto o comando chamado `dataset:generate` materializa e audita um manifesto, não gera trajetórias procedurais. Isso é uma limitação material, não uma fração estimada.

## Dados humanos e atribuições

`datasets/real-test/` é ignorado pelo Git e deve receber somente desenhos exportados/importados conscientemente, com consentimento. Não há dado humano consentido neste checkout e nenhum entra em treino, validation ou test.

As referências locais foram consultadas como material de estudo: D1 (`../coders-university-pos-ia-m5-d1/.../src/image-loader.ts`) para estrutura de loader/dataset, D2 (`../coders-university-pos-ia-m5-d2/.../src/cel.ts`) para cross-entropy multiclasse estável e D3 (`../coders-university-pos-ia-m5-d3/explanations/`) para explicações de CNN. Código, imagens, dataset e pesos dessas referências não foram copiados nem usados; em especial, não há pesos gato/cachorro.
