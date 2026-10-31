# Fase 1 — Passo 4: rastreamento de mão e overlay

## Objetivo

Obter landmarks de uma mão pela webcam e tornar o rastreamento observável, sem ainda criar traços por pinça.

## Implementação

1. Encapsular `@mediapipe/tasks-vision` em `HandTracker`, com `runningMode: "VIDEO"`, `numHands: 1` e inicialização única do Hand Landmarker. Registrar no README a origem/licença/versão do modelo de mão.
2. Para cada frame novo, chamar `detectForVideo(video, timestampMs)` com timestamp crescente e impedir processamento duplicado do mesmo frame. Manter estado `detected`/`not-detected` fora de atualizações React em alta frequência.
3. Desenhar no canvas de câmera o indicador da ponta do indicador (landmark 8) e, opcionalmente, os 21 landmarks/conexões. Exibir status e FPS somente se medidos, nunca estimados.
4. Tratar inicialização/descarregamento falhos e encerrar o tracker junto com a câmera. Nenhum frame, landmark ou vídeo deve sair do navegador.
5. Medir a responsividade inicial no equipamento de referência. Se a detecção síncrona comprometer o desenho, documentar o gargalo para migração a Worker depois; não antecipar uma arquitetura complexa sem medição.

## Verificação / aceite

- Fixture de landmarks confirma que o overlay recebe mão presente/ausente corretamente.
- Teste manual com uma mão mostra o cursor e volta a “Mão não detectada” ao sair do quadro, mantendo os traços existentes.
- Iniciar/parar repetidamente não duplica detector nem callback.

## Dependências

Passo 3 desta fase. MediaPipe só detecta mão; nenhuma classificação de forma é delegada a ele.
