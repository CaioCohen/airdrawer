# Fase 2 — Passo 4: ShapeCNN e backpropagation

## Objetivo

Compor o núcleo em uma CNN pequena, treinável e adequada à entrada de lousa.

## Implementação

1. Criar `ShapeCNN` para `[1,32,32]`: Conv(1→4, 3, pad 1) → ReLU → MaxPool2; Conv(4→8, 3, pad 1) → ReLU → MaxPool2; flatten 512; Dense 32 → ReLU; Dense 3 logits.
2. Implementar forward que registra caches apenas quando necessário e devolve logits/probabilidades por API explícita. O backward recebe target class/gradiente categórico e percorre todas as camadas, incluindo reshape de retorno do flatten.
3. Expor parâmetros nomeados e contagem de parâmetros; conferir aproximadamente 16.851 parâmetros na arquitetura prevista. Validar shapes em cada fronteira e parar em valores não finitos.
4. Implementar um teste de overfit de 3–12 tensores rotulados sintéticos para demonstrar que loss diminui antes de envolver o dataset completo.

## Verificação / aceite

- `forward([1,32,32])` gera exatamente três logits/probabilidades válidas.
- Gradientes de Dense/Conv verificam contra diferenças finitas em tamanhos reduzidos.
- O teste de overfit tem limiar de loss/accuracy reproduzível com seed fixa.
- Nenhum código de TensorFlow, PyTorch, Keras, ONNX Runtime ou classificador externo aparece nas dependências do core.

## Referências

A topologia reaproveita a ideia de `TinyCNN` de D1, alterada de RGB/uma saída sigmoid para cinza/três logits.
