# AirDraw

Aplicação acadêmica para desenhar círculo, quadrado e triângulo na lousa com mouse/toque ou, opcionalmente, por câmera e pinça. A classificação é uma CNN TypeScript treinada do zero; não há framework de ML, API de classificação nem envio de vídeo.

> **Escopo da evidência:** o modelo publicado foi treinado e avaliado somente no corpus raster fornecido. Ele não foi validado com webcam, pessoas ou traços parciais; consulte [Limitações](docs/LIMITATIONS.md) antes de interpretar uma predição.

## Requisitos e instalação

- Node.js `>=20.11.0` (a execução registrada usou `v22.20.0`)
- pnpm `>=9.15.4` (fixado em `package.json`)
- navegador desktop atual com `localhost` ou HTTPS para a câmera

```bash
pnpm install --frozen-lockfile
pnpm dataset:generate --seed 42
pnpm dataset:inspect
pnpm ml:train --seed 42 --epochs 25 --lr 0.001 --patience 5
pnpm ml:evaluate --seed 42 --split test
pnpm ml:export --seed 42
pnpm test
pnpm build
pnpm test:e2e
pnpm dev
```

Os comandos de treino escrevem em `packages/training/artifacts/` (ignorado pelo Git); `ml:export` instala a cópia servida em `apps/web/public/models/shape-cnn.v1.json`. Execute-os nessa ordem em um checkout limpo. A reprodução registrada levou 268,67 s para treinar, portanto não é adequada para iniciar junto com a aplicação.

## Uso e privacidade

- **Mouse** é o modo inicial. Desenhe com mouse, caneta ou toque; cada pressionamento/soltura é um stroke independente. Use **Limpar lousa** ou **Desfazer** para invalidar a previsão atual.
- Para câmera, escolha **Modo: Câmera**, clique **Iniciar câmera** e conceda permissão. Junte polegar e indicador para desenhar; separe-os ou retire a mão do quadro para terminar o stroke. Uma nova pinça nunca é ligada artificialmente à anterior.
- A câmera é solicitada somente após o clique. Vídeo, frames e landmarks ficam em memória e não são enviados nem armazenados. **Salvar referência** requer confirmação e salva apenas os strokes no `localStorage`; a captura humana não entra automaticamente em treino.
- Permissão negada, câmera ausente/ocupada, contexto inseguro e falha do rastreador devem manter o modo Mouse utilizável.

O MediaPipe `@mediapipe/tasks-vision` é usado somente para landmarks de mão e gesto de pinça. Ele não reconhece formas; a probabilidade vem da CNN local. O modelo Hand Landmarker e os arquivos WASM são obtidos pelo pacote MediaPipe no navegador, sujeitos aos seus termos/licença de distribuição.

## Arquitetura

```text
webcam -> landmarks MediaPipe -> pinça -> Drawing (strokes)
mouse/toque ------------------------------> Drawing (strokes)
Drawing -> preprocessDrawing [1,32,32] -> ShapeCNN -> 3 probabilidades
```

A CNN própria usa `conv(4) -> max-pool -> conv(8) -> max-pool -> dense(32) -> logits(3)`, softmax/cross-entropy e Adam implementados no repositório. A ordem fixa é `circle=0`, `square=1`, `triangle=2`. O navegador valida o artefato e só mostra o rótulo principal quando `top >= 0,65` e `margem >= 0,15`; caso contrário mostra **Ainda não sei**.

## Reprodução e evidências

- [Dataset e auditoria](docs/DATASET.md)
- [Pré-processamento](docs/PREPROCESSING.md)
- [Treino](docs/TRAINING.md)
- [Avaliação](docs/EVALUATION.md)
- [Limitações e Definition of Done](docs/LIMITATIONS.md)

O artefato servido é [`shape-cnn.v1.json`](apps/web/public/models/shape-cnn.v1.json), SHA-256 `dd6e7873ca27b51e46c69da807cd21de83d8bd51b7d5b304e0e331947f025a9c`. Ele declara `status: trained`, seed 42 e hash do manifesto `725fb41d4681375731980809042e55708b6f789f87ae93b3c6bba0d048c0232c`.

## Roteiro manual de webcam (pendente)

Esta máquina não forneceu webcam física para executar o roteiro. Em um navegador desktop suportado, após `pnpm dev`: confirme dois canvas; desenhe dois strokes no Mouse; inicie a câmera; valide prévia espelhada, cursor e pinça; interrompa uma pinça retirando a mão; redimensione a janela; pare a câmera; e repita negando a permissão. Não há medição declarada de FPS, latência de inferência no navegador ou taxa de acerto nesse roteiro.
