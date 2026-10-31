# Fase 2 — Passo 3: pré-processamento compartilhado de traços

## Objetivo

Converter o mesmo `Drawing` da Fase 1 em tensor monocromático `[1,32,32]` de modo determinístico e independente de Canvas/Node.

## Implementação

1. Criar `normalize`, `rasterize` e `preprocessDrawing` no `ml-core`, recebendo apenas pontos visíveis até o momento. Retornar `empty` para ausência/extensão insuficiente de tinta e `ready` com `Float32Array` de 1024 posições, `inkFraction` e dimensões.
2. Calcular bounding box dos pontos atuais, acrescer margem 10–15%, aplicar escala uniforme e centralizar. Nunca usar bounding box da forma completa ao processar prefixo parcial.
3. Rasterizar segmentos por distância ao segmento com espessura fixa, preservando fronteiras de strokes. Adotar supersampling 2× somente se a medição de custo for aceitável; não usar antialiasing variável do navegador.
4. Validar saída sem `NaN` e dentro de `[0,1]`. Fixar versão do algoritmo de preprocessamento e expô-la para dataset e artefato.
5. Criar uma pequena ferramenta/fixture que renderize a matriz para inspeção humana sem se tornar fonte de verdade do treino.

## Verificação / aceite

- Testes para desenho vazio, ponto degenerado, múltiplos strokes, limites, deslocamento/escala e determinismo byte a byte.
- Um mesmo fixture de `Drawing` produz exatamente o mesmo tensor no runtime do navegador e no Node.
- Teste regressivo prova que dois strokes separados não ganham segmento artificial durante rasterização.

## Dependências

Contrato da Fase 1 e núcleo `Tensor` da Fase 2. Este passo é pré-requisito para dataset e para a inferência do navegador.
