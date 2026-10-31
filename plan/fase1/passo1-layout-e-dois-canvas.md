# Fase 1 — Passo 1: layout e dois canvas independentes

## Objetivo

Entregar a casca visual do AirDraw com um canvas de webcam e uma lousa, visíveis simultaneamente e corretamente redimensionados.

## Implementação

1. Criar `WebcamCanvas`, `WhiteboardCanvas`, `Toolbar` e área de status. No desktop, posicionar câmera e lousa lado a lado; em telas estreitas, empilhá-los mantendo a ordem.
2. Usar dois elementos `<canvas>` reais e distintos. O canvas esquerdo reservará vídeo/overlays; o direito terá fundo branco e tinta escura. Não sobrepor os dois nem substituir a lousa por imagem estática.
3. Implementar um helper de resize que considere `devicePixelRatio`, preservando tamanho visual CSS e coordenadas lógicas normalizadas. Redimensionar não pode deformar ou apagar o estado `Drawing`.
4. Renderizar do estado `Drawing` para o canvas de lousa em cada alteração relevante; o renderer não deve ser a fonte de verdade. Exibir cursor/estado de rastreamento separados do traço.
5. Incluir estados visíveis para câmera desligada, iniciando, ativa, erro e mão não detectada. Ainda não pedir permissão nem executar MediaPipe neste passo.

## Verificação / aceite

- E2E confirma dois canvas identificáveis e responsividade básica.
- Testes do renderer demonstram que o mesmo `Drawing` é redesenhado após resize, sem conectar strokes diferentes.
- Inspeção manual em DPR 1 e DPR 2 confirma fundo branco, bordas e ausência de borramento grosseiro.

## Dependências

Fase 0 concluída. Este passo não depende de CNN, dataset ou câmera.
