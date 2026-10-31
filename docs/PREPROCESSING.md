# Pré-processamento

Há duas entradas que hoje não são equivalentes e essa diferença é documentada, não escondida.

## Desenho no navegador

`@airdraw/ml-core` expõe `preprocessDrawing`, versão `1.0.0`, usada pela UI e pelo carregador do modelo. Ela recebe apenas os strokes atualmente visíveis: valida coordenadas normalizadas, descarta segmentos menores que `1e-4`, encontra os limites do desenho visível, ajusta a maior dimensão em uma grade 32×32 com margem de 12,5% e rasteriza cada segmento separadamente. Rasterização usa raio 1,25 e supersampling 2×2; o resultado é `[1,32,32]`, `Float32Array`, valores `[0,1]`, com tinta `1` e fundo `0`.

Sem strokes, sem tinta ou com traços degenerados o resultado é `empty`; a UI não solicita classificação. O normalizador não lê pontos futuros e não une strokes distintos. Como os limites são calculados somente com os pontos presentes, uma previsão parcial pode mudar quando o desenho ganha novos segmentos.

## Corpus usado no treino

O treino atual recebe PNGs completos por outro pipeline (`image-corpus-v1`), descrito em [DATASET.md](DATASET.md). Ele também entrega `[1,32,32]`, tinta `1`/fundo `0`, mas sua normalização de imagem não é `preprocessDrawing`: preserva o enquadramento de rasters já preparados. Logo, a forma do tensor e a convenção de intensidade coincidem, mas a equivalência matemática entre a entrada de webcam/lousa e o corpus **não foi demonstrada**.

Esse desalinhamento, a falta de trajetórias e a ausência de testes reais impedem declarar desempenho da webcam. Uma evolução necessária é treinar e avaliar exemplos derivados diretamente de `preprocessDrawing`, incluindo prefixos, sem cruzamento de `groupId`.
