# Fase 1 — Passo 5: pinça, mapeamento e desenho no ar

## Objetivo

Transformar landmarks em pontos da lousa com traços estáveis, separados e coerentes com a câmera espelhada.

## Implementação

1. Implementar `PinchDetector` como máquina `NO_HAND → HOVER → DRAWING`, com landmarks 4 (polegar), 8 (indicador), 0 (punho) e 9 (base do médio). Calcular `pinchRatio = distância(4,8) / max(distância(0,9), 1e-6)`.
2. Usar histerese inicial ajustável: começar em `ratio <= 0.25`, soltar em `ratio >= 0.35`; exigir 2–3 frames consistentes se o ruído justificar. Perder a mão encerra stroke de imediato, sem criar uma ponte no retorno.
3. Implementar `CoordinateMapper` para converter a posição escolhida (ponta do indicador) à lousa normalizada. Cobrir espelhamento, `object-fit`, recorte, proporções 16:9/4:3 e extrema esquerda/direita; não confiar só no espelhamento CSS.
4. Aplicar EMA leve (`alpha` inicial 0,4–0,7), rejeitar pontos inválidos/saltos excessivos e limitar interpolação ao stroke atual. Ajustar para preservar cantos de quadrados e triângulos.
5. Entregar pontos ao mesmo `StrokeController` usado por mouse. Durante hover, mover apenas o cursor; durante pinça, criar/continuar stroke; ao soltar, finalizar. Acrescentar controle de sensibilidade somente se a calibração inicial demonstrar necessidade.

## Verificação / aceite

- Unitários com sequências de landmarks cobrem histerese, perda de mão, não conexão após retorno e mapeamento espelhado.
- Testes de mapeamento cobrem centro, quatro extremos e vídeo com razão diferente do canvas.
- Teste manual em webcam permite desenhar círculo, quadrado e triângulo em strokes semanticamente corretos e limpar/desfazer continua válido.

## Dependências

Passos 2 e 4 desta fase. A CNN continua fora deste passo.
