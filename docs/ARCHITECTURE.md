# Arquitetura

O AirDraw mantém responsabilidades separadas:

```text
webcam → landmarks (MediaPipe) → gesto de pinça → Drawing → preprocessamento → CNN → probabilidades
```

`apps/web` contém somente UI e integrações do navegador. `packages/contracts` é a fonte única para tipos de desenho e a ordem fixa das classes. `packages/ml-core` será isomórfico (browser e Node), sem APIs de arquivo. `packages/dataset` e `packages/training` são CLIs Node e concentram I/O.

O rastreamento atual usa o MediaPipe Hand Landmarker exclusivamente para os 21 landmarks da mão, nunca para classificar formas. Frames e landmarks são processados de forma efêmera e local no navegador; não são enviados nem gravados. Pinça, traços por mão e classificação ainda são etapas separadas.

## Dependência externa prevista

- `@mediapipe/tasks-vision` 0.10.18 — Google AI Edge/MediaPipe Tasks Vision, Apache-2.0.
- Hand Landmarker `float16/1` (`hand_landmarker.task`) — origem: [modelo oficial hospedado pelo MediaPipe](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task); licença Apache-2.0; aproximadamente 7,8 MB. O navegador o busca dessa origem somente quando o usuário inicia a câmera; o artefato não é distribuído pelo repositório. Antes de fixá-lo localmente, registrar checksum e tamanho em bytes.
