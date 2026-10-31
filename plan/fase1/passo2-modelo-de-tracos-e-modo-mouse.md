# Fase 1 — Passo 2: modelo de traços e modo mouse/touch

## Objetivo

Fazer a lousa funcionar antes da webcam, usando o mesmo controlador que receberá landmarks posteriormente.

## Implementação

1. Implementar `StrokeController` sobre `Drawing`: iniciar stroke, anexar ponto, encerrar stroke, desfazer e limpar. Gerar IDs estáveis e incrementar `revision` a cada mutação de tinta.
2. Converter eventos mouse/pointer/touch em coordenadas normalizadas relativas à área útil da lousa. Capturar o pointer durante o desenho e encerrar stroke em `pointerup`, cancelamento ou perda de captura.
3. Rejeitar `NaN`, pontos fora do intervalo e saltos incompatíveis; opcionalmente interpolar apenas pequenos intervalos dentro do mesmo stroke. Não interpolar após soltar ou cancelar.
4. Renderizar segmentos com largura constante e cursor de hover. Garantir que limpar zera tela, `Drawing` e qualquer estado dependente; desfazer remove o último stroke integralmente.
5. Acrescentar toolbar com Limpar, Desfazer e alternância explícita Mouse/Camera. Mouse é o modo de desenvolvimento/acessibilidade e continuará usando o pipeline da predição na Fase 2.

## Verificação / aceite

- Testes unitários cobrem início/fim, strokes separados, cancelamento, undo, clear e incremento de `revision`.
- Um teste de integração cria dois strokes afastados e comprova que a linha entre eles não é desenhada.
- Manualmente, mouse e toque desenham sem depender de webcam.

## Dependências

Passo 1 desta fase e contratos da Fase 0.
