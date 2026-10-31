# Fase 2 — Passo 1: auditar e portar o núcleo numérico

## Objetivo

Criar `packages/ml-core` isomórfico e testado, reutilizando a estrutura didática das referências sem herdar silenciosamente suas limitações.

## Implementação

1. Revisar os arquivos D1 `tensor.ts`, `convolve2d.ts`, `maxPool2x2Window.ts`, `activation.ts`, `adam.ts` e `types.ts`, registrando a origem conceitual em comentários/documentação de atribuição quando código for efetivamente adaptado.
2. Implementar `Tensor` com `Float32Array`, shape/strides validados, índice com número exato de dimensões, bounds check, `zeros`, clone, reshape e checagem de valores finitos. A API deve falhar explicando shape/índice inválido.
3. Portar/adaptar `Conv2D`, `MaxPool2D`, `ReLU`, parâmetros nomeados e Adam para convenções internas consistentes. Manter forward/backward explícitos; não importar DOM, React, Node ou framework de ML.
4. Corrigir antes de reutilizar padrões da referência: D1 usa `Float64Array`, foi feito para RGB/binário e sua `Dense`/convenção de matrizes deve ser comprovada por testes numéricos, não assumida correta.
5. Acrescentar inicializador determinístico com seed (He para camadas ReLU) e utilitário de PRNG compartilhável entre treino e inicialização.

## Verificação / aceite

- Unitários de Tensor, convolução e pooling com valores conhecidos; pooling trata empates de forma determinística.
- Checagem por diferenças finitas em uma instância pequena de Conv2D e relatório de tolerância adotada.
- Adam atualiza parâmetros independentemente e falha diante de gradiente/valor não finito.

## Referências

D1 é a base mais próxima para as operações e Adam. Não copiar pesos `cat-vs-dog.json` nem importá-lo no projeto.
