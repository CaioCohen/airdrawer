# SPEC — AirDraw: reconhecimento de formas desenhadas com a mão

> **Status:** especificação técnica para implementação  
> **Versão:** 1.0  
> **Idioma:** português (Brasil)  
> **Natureza:** projeto acadêmico de Machine Learning from scratch + aplicação web interativa

## 1. Visão geral

Desenvolver uma aplicação web em que a pessoa desenha no ar, diante de uma webcam, unindo o polegar e o indicador em um gesto de pinça. A interface apresenta **dois elementos `<canvas>` lado a lado**: à esquerda, a imagem da webcam com a posição da mão e os indicadores de rastreamento; à direita, uma lousa branca que recebe os traços. Enquanto o desenho é produzido, uma rede neural treinada **do zero** classifica a figura como **círculo, quadrado ou triângulo**, atualizando as probabilidades durante a construção do desenho, não apenas após sua conclusão.

**Princípio arquitetural:** separar o rastreamento da mão (visão computacional pronta) da classificação da figura (modelo proprietário, implementado sem framework de Machine Learning).

### 1.1 Resultado esperado

1. A aplicação solicita autorização de acesso à webcam e apresenta a imagem em tempo real.
2. A aplicação reconhece uma mão e identifica a distância entre as pontas do polegar e do indicador.
3. Quando há pinça, movimentar a mão desenha linhas contínuas na lousa. Soltar a pinça interrompe o traço sem apagar a figura.
4. A cada atualização relevante, o desenho parcial é convertido para a representação esperada pela rede neural.
5. O modelo retorna três probabilidades e um possível palpite, com estado de incerteza quando faltam evidências.
6. O sistema apresenta treino reproduzível, pesos exportados, métricas, dataset sintético e documentação das limitações.

### 1.2 Definição de *from scratch*

**Deve ser implementado no código do projeto:** representação dos tensores, forward, backward, convolução, pooling, camada densa, ReLU, softmax, cross-entropy, inicialização de parâmetros, otimizador, loop de treino, inferência e serialização dos pesos.

**Pode ser utilizado:** TypeScript, React, Vite, bibliotecas de interface, operações nativas do navegador, ferramentas de teste, bibliotecas de leitura de arquivos e **MediaPipe Hand Landmarker exclusivamente para detecção de mão e landmarks**.

**Não pode ser utilizado no núcleo do classificador:** TensorFlow, TensorFlow.js, PyTorch, Keras, ONNX Runtime, Transformers, modelos pré-treinados de classificação de imagens, serviços externos de reconhecimento, nem classificação geométrica determinística disfarçada de rede neural.

A utilização de um modelo pré-treinado **para rastrear mãos** deve ser declarada com transparência no README. A afirmação “modelo treinado do zero” aplica-se **somente ao classificador das três formas**.

## 2. Escopo

### 2.1 Obrigatório (MVP)

- Dois `<canvas>` visíveis: webcam à esquerda e lousa branca à direita.
- Inicialização, encerramento e mensagens de erro da câmera.
- Rastreamento de uma mão com landmarks.
- Pinça para iniciar/continuar traço; liberação para encerrá-lo.
- Cursor visual mesmo sem pinça.
- Botão **Limpar lousa**.
- Classificação contínua de círculo, quadrado e triângulo, exibindo as três probabilidades.
- Estado de predição **“Ainda não sei”** quando não houver informação suficiente; nenhuma quarta classe deve ser treinada no MVP.
- CNN desenvolvida e treinada do zero em TypeScript.
- Dataset gerado localmente, dividido em train/validation/test sem vazamento.
- Artefato exportado do modelo e carregamento no navegador.
- Métricas, testes automatizados, README e documentação do pipeline.

### 2.2 Desejável

- Modo de desenho por mouse/touch para desenvolvimento e acessibilidade.
- Ajuste de sensibilidade da pinça.
- Espelhamento da imagem e da interação, configurável.
- Limpeza/desfazer por controles de UI.
- Indicadores de FPS, tempo de inferência e status do rastreador.
- Exportação da lousa como PNG e de traços como JSON.
- Captura consentida de exemplos reais para ampliar o dataset.
- Visualização da imagem de entrada 32×32 recebida pelo modelo.

### 2.3 Fora do escopo inicial

- Reconhecer letras, números, objetos ou desenhos arbitrários.
- Treinar o detector de mão.
- Implementar LLMs, Transformers, RAG, atenção ou modelos de raciocínio.
- Backend remoto, autenticação, contas, banco de dados ou armazenamento de vídeo.
- Suporte a múltiplas pessoas desenhando simultaneamente.
- Garantir uma classificação correta quando o traço ainda é geometricamente ambíguo.

## 3. Referências recebidas e aproveitamento

### 3.1 ZIP da disciplina 1 — CNN para gatos e cachorros

O repositório `coders-university-pos-ia-m5` contém `src/tensor.ts`, `src/convolve2d.ts`, `src/maxPool2x2Window.ts`, `src/dense.ts`, `src/activation.ts`, `src/back-propagation.ts`, `src/adam.ts`, `src/bce.ts`, `src/tiny-cnn.ts`, `src/training-loop.ts`, `src/dataset.ts`, `src/image-loader.ts`, `src/io.ts` e CLI de treino/predição. O dataset contém diretórios `train`, `validation` e `test` para gatos/cachorros; o código usa imagens 32×32 RGB, duas convoluções e saída binária com sigmoid/BCE.

**Reutilizar como ponto de partida:** Tensor, Conv2D, MaxPool2D, Dense, ReLU, Adam, inicialização, infraestrutura de parâmetros nomeados, persistência e estrutura do treinamento. **Adaptar:** entrada 1 canal, três saídas, softmax + cross-entropy, gerador de figuras, métricas multiclasse e execução no navegador.

### 3.2 ZIP da disciplina 2 — evolução do projeto

O segundo ZIP preserva grande parte do núcleo da CNN e acrescenta um mini-GPT, tokenização, embeddings, atenção e `src/cel.ts`, que contém implementação de **cross-entropy e softmax numericamente estável**. Para este projeto, aproveitar **apenas a matemática multiclasse pertinente**; a implementação de Transformer não é necessária. A classe `CrossEntropyLoss` existente trabalha com logits no formato `[T, vocab]`; deve ser generalizada/adaptada para logits de classificação `[batch, 3]` ou `[1, 3]`, sem dependência de conceitos de tokens.

### 3.3 ZIP da disciplina 3 — explicações técnicas

O terceiro ZIP contém 18 arquivos HTML explicativos sobre tensores, indexação/strides, pesos, convolução conceitual, backpropagation, Adam, loop de treinamento, ReLU, sigmoid, cross-entropy, ciclo de vida de modelos e tópicos relacionados a LLMs. Utilizar os materiais relacionados à rede neural como apoio para a documentação didática. Não são uma implementação funcional da interface ou do classificador.

### 3.4 Adaptações obrigatórias e cautelas

- O classificador original é binário; **não basta trocar os nomes de gato/cachorro para três classes**.
- A BCE/sigmoid do exemplo anterior deve ser substituída por logits de três classes + softmax/cross-entropy.
- O loader original produz tensor `[3, 32, 32]`; a nova entrada será `[1, 32, 32]`.
- Os códigos-base não constituem, por si só, comprovação de testes do novo projeto; implementar testes de gradiente, integração e regressão.
- Verificar dimensões, aplicação dos gradientes, inicialização, serialização e estabilidade numérica antes de reutilizar os arquivos.
- **Não utilizar os pesos `cat-vs-dog.json`** para inicializar a nova CNN: a exigência é aprender as formas a partir de nova inicialização.

## 4. Tecnologias e decisões

| Área | Tecnologia | Justificativa |
|---|---|---|
| Aplicação web | React + TypeScript + Vite | Componentização, tipagem, desenvolvimento local rápido |
| Desenho/renderização | Canvas 2D nativo + elemento `<video>` oculto | Controle direto dos pixels e dos traços; dois canvas exibidos |
| Webcam | `navigator.mediaDevices.getUserMedia()` | Acesso nativo à câmera, com consentimento |
| Rastreamento da mão | `@mediapipe/tasks-vision` / Hand Landmarker | 21 landmarks e inferência sobre frames de vídeo |
| Gestos | Lógica própria em TypeScript | Detectar pinça com histerese e controle de estado |
| Núcleo de ML | TypeScript puro + `Float32Array` | Cálculos explícitos, compartilháveis entre Node e navegador |
| Treinamento | Node.js + TypeScript (`tsx`) | Executar CLI local sem backend e sem framework de ML |
| Dataset | Gerador procedural TypeScript, PRNG com seed | Fonte de dados reproduzível e controlável |
| Testes | Vitest + Playwright | Testes matemáticos, integração e E2E da UI |
| Gerenciador | pnpm workspace | Monorepo com módulos reutilizados |
| Empacotamento | JSON versionado de pesos | Transparência, inspeção e carregamento via `fetch` |
| Gráficos de métricas | CSV/JSON + visualização opcional | Evidência auditável sem exigir serviços externos |

**Versões:** registrar versões efetivas em `package.json`, lockfile e README. Evitar dependências não determinísticas (`latest`). O modelo Hand Landmarker deve ter a origem, versão, licença e tamanho registrados.

**Execução:** `localhost` para desenvolvimento e HTTPS em hospedagem, pois a webcam depende de contexto seguro e permissão explícita.

## 5. Arquitetura de alto nível

```text
┌───────────────────────────────────────────────────────────────┐
│                         Navegador                             │
│                                                               │
│   getUserMedia                                                │
│       │                                                       │
│       ▼                                                       │
│  VideoStream ──► HandLandmarker ──► 21 landmarks              │
│       │                                 │                     │
│       ▼                                 ▼                     │
│ Canvas webcam                    PinchDetector                │
│ (vídeo + overlay)                       │                     │
│                                        ▼                      │
│                                  StrokeController             │
│                                        │                      │
│                                        ▼                      │
│                                 StrokeCollection              │
│                                        │                      │
│                             ┌──────────┴───────────┐          │
│                             ▼                      ▼          │
│                        Canvas lousa          Preprocessor      │
│                                                    │          │
│                                            Tensor [1,32,32]   │
│                                                    │          │
│                                                    ▼          │
│                                          ShapeClassifier       │
│                                           (pesos locais)      │
│                                                    │          │
│                                                    ▼          │
│                                      softmax + probabilities  │
│                                                    │          │
│                                                    ▼          │
│                                            Prediction UI      │
└───────────────────────────────────────────────────────────────┘

  Offline/CLI (Node):
  Seed ─► ShapeGenerator ─► split por desenho-base ─► preprocess
       ─► TinyCNN from scratch ─► treino/validação/teste
       ─► metrics.json, history.csv, confusion-matrix.json
       ─► shape-cnn.v1.json ─► carregado pelo navegador
```

### 5.1 Separação de responsabilidades

- **Tracking:** transforma pixels da câmera em posições da mão; não reconhece formas geométricas.
- **Gesture:** determina se a pessoa está desenhando.
- **Drawing:** armazena e renderiza traços em coordenadas normalizadas.
- **Preprocessing:** transforma traços parciais em tensor de entrada.
- **ML core:** apenas matemática do classificador; não conhece React, DOM ou webcam.
- **Training:** gera exemplos, otimiza os pesos, avalia e exporta o modelo.
- **Presentation:** mostra a imagem, desenho, incerteza e probabilidades.

## 6. Layout e experiência do usuário

### 6.1 Estrutura da tela

```text
┌──────────────────────────────────────────────────────────────────┐
│ AirDraw                       Câmera: ativa   Mão: detectada     │
├───────────────────────────────┬──────────────────────────────────┤
│            WEBCAM             │              LOUSA               │
│                               │                                  │
│   imagem espelhada            │       traço preto                │
│   21 landmarks opcionais      │       cursor visível             │
│   cursor na ponta indicador   │                                  │
│   pinça: ATIVA/INATIVA        │                                  │
├───────────────────────────────┴──────────────────────────────────┤
│ Palpite: TRIÂNGULO (63%)  | Círculo 25% | Quadrado 12%           │
│ [Iniciar câmera] [Parar câmera] [Limpar] [Desfazer] [Mouse]      │
└──────────────────────────────────────────────────────────────────┘
```

- Desktop: canvases lado a lado, com largura proporcional e borda visível.
- Mobile: layout pode empilhar os canvases, preservando a ordem e a funcionalidade.
- Lousa com fundo branco real; traço escuro de espessura consistente.
- O palpite não deve impedir a renderização quando o ML ainda estiver carregando.
- Exibir **“Aguardando desenho”**, **“Ainda não sei”**, **“Provavelmente: círculo”** ou **“Erro ao carregar modelo”** conforme o estado.
- Mostrar as probabilidades separadamente do nível de confiança em uma decisão. Softmax não é garantia de acerto nem de calibração.
- Disponibilizar botão para limpar; nenhuma classificação deve persistir após limpeza.

### 6.2 Regras de UI

1. Sem permissão de webcam: exibir erro acionável e oferecer modo mouse.
2. Sem mão visível: mostrar “Mão não detectada”; preservar os traços já desenhados.
3. Ao aproximar dedos sem efetivar pinça: atualizar cursor, mas não desenhar.
4. Durante pinça: desenhar segmentos somente entre amostras consecutivas válidas.
5. Ao soltar: encerrar stroke; próxima pinça inicia um stroke novo.
6. Ao limpar: apagar desenho, resetar estado da predição e descartar resultados assíncronos antigos.
7. Após pausa: manter o último palpite, marcado como referente ao desenho atual; não inventar atualização sem novos traços.

## 7. Webcam e Hand Landmarker

### 7.1 Inicialização

- Chamar `getUserMedia({ audio: false, video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } } })` mediante ação do usuário.
- Atribuir stream a `<video autoplay playsInline muted>` e aguardar metadados/`play()`.
- Inicializar Hand Landmarker em `runningMode: "VIDEO"`, `numHands: 1`.
- Executar `detectForVideo(video, timestampMs)` usando um timestamp coerente e crescente. Evitar processar duas vezes o mesmo frame.
- Executar o loop preferencialmente com `requestAnimationFrame`; considerar `requestVideoFrameCallback` quando disponível.
- Se tracking causar travamento, isolar a detecção em Worker com estratégia de transferência de frames compatível; **a API síncrona no main thread é aceitável inicialmente apenas se passar no orçamento de performance**.
- Em desligamento ou desmontagem: cancelar loops, remover listeners e parar cada track do stream via `track.stop()`.

### 7.2 Landmarks relevantes

- `4`: ponta do polegar (`THUMB_TIP`).
- `8`: ponta do indicador (`INDEX_FINGER_TIP`).
- `0`: punho (`WRIST`).
- `5`: base do indicador (`INDEX_FINGER_MCP`).
- `9`: base do dedo médio (`MIDDLE_FINGER_MCP`).
- `17`: base do dedo mínimo (`PINKY_MCP`).

As coordenadas retornadas pelo rastreador são normalizadas em relação ao frame, sujeitas a variações, oclusão e ruído.

## 8. Detecção da pinça e desenho

### 8.1 Critério de pinça

A distância em pixels muda quando a mão se aproxima da câmera. Usar distância **normalizada pelo tamanho aparente da mão**:

```ts
const thumb = landmarks[4];
const index = landmarks[8];
const wrist = landmarks[0];
const middleMcp = landmarks[9];

const distance2D = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const handScale = Math.max(distance2D(wrist, middleMcp), 1e-6);
const pinchRatio = distance2D(thumb, index) / handScale;
```

**Parâmetros iniciais a validar experimentalmente:** `PINCH_START_RATIO = 0.25`, `PINCH_END_RATIO = 0.35`. Os limiares são sugestões, não valores universalmente corretos: diferentes ângulos, usuários e câmeras exigem calibração. Se houver grande variabilidade, oferecer controle de sensibilidade.

### 8.2 Máquina de estados

```text
NO_HAND ── mão detectada ──► HOVER
HOVER   ── ratio <= start ──► DRAWING
DRAWING ── ratio >= end ──► HOVER
HOVER/DRAWING ── perda de mão ──► NO_HAND
NO_HAND ── mão retorna ──► HOVER (sem conectar traço anterior)
```

**Histerese:** usar um limiar para iniciar e outro, maior, para soltar; opcionalmente exigir 2 ou 3 frames consistentes para reduzir oscilações. Ao perder a mão, fechar o stroke imediatamente ou após curta tolerância sem desenhar segmentos interpolados.

### 8.3 Posição e suavização

- Usar a ponta do indicador como cursor. Também é possível usar o ponto médio polegar-indicador; escolher **uma** definição e mantê-la.
- Aplicar EMA leve ao cursor: `smooth = alpha * current + (1 - alpha) * previous`, com `alpha` inicial entre `0.4` e `0.7`.
- Rejeitar pontos inválidos (`NaN`, fora de alcance) e saltos abruptos acima de um limite relativo à lousa.
- Evitar suavização excessiva, pois ela arredonda os vértices de quadrados e triângulos.
- Opcionalmente interpolar pequenos intervalos entre pontos consecutivos válidos, mas **nunca** entre dois strokes separados por uma liberação.

### 8.4 Coordenadas e espelhamento

**Fonte de verdade:** armazenar cada ponto no espaço normalizado `[0,1] × [0,1]` da lousa. A conversão para pixels ocorre apenas na renderização.

- Se a webcam é exibida espelhada, mapear explicitamente `boardX = 1 - cameraX` (e não apenas aplicar CSS ao preview).
- Se não está espelhada, `boardX = cameraX`.
- `boardY = cameraY`, respeitando eventual recorte (`object-fit`) e aspecto do vídeo.
- Para `cover`, calcular o offset e a escala reais da imagem visível antes de transformar os pontos; não assumir equivalência entre vídeo e canvas quando as proporções diferirem.
- O atributo de tamanho do canvas em pixels deve ser compatível com `devicePixelRatio`, sem mudar as coordenadas normalizadas da lógica.
- Testes de mapeamento devem cobrir extremos, centro, espelhamento e vídeo 16:9 em canvas 4:3.

### 8.5 Modelo de dados do desenho

```ts
type ShapeLabel = "circle" | "square" | "triangle";

type Point2D = {
  x: number; // [0, 1]
  y: number; // [0, 1]
  t: number; // tempo relativo em ms
};

type Stroke = {
  id: string;
  points: Point2D[];
};

type Drawing = {
  strokes: Stroke[];
  revision: number;
};
```

`revision` aumenta em qualquer mudança que altere a imagem (novo ponto, desfazer, limpar). Não armazenar o vídeo como entrada de treinamento; o modelo classifica **a lousa**, não a mão.

## 9. Pré-processamento: traços até tensor

O pré-processamento precisa ser **idêntico no treino e na inferência**. Implementar sua lógica no pacote compartilhado `packages/ml-core` ou `packages/geometry`, sem APIs específicas do Node e sem depender de `CanvasRenderingContext2D`.

### 9.1 Etapas obrigatórias

1. Receber `Drawing` contendo apenas os pontos que já foram desenhados.
2. Retornar estado `empty` se houver quantidade/ extensão insuficiente de tinta.
3. Calcular bounding box dos **pontos visíveis até o momento**, e não da forma final imaginada.
4. Acrescentar margem de aproximadamente 10% a 15% à bounding box visível.
5. Fazer escala **uniforme**, preservando o aspecto; centralizar numa grade quadrada.
6. Rasterizar segmentos com espessura consistente em uma matriz monocromática; não ligar strokes separados.
7. Produzir `[1, 32, 32]`, valores `0.0` para fundo e até `1.0` para tinta.
8. Confirmar que não existem valores `NaN` ou fora de `[0,1]`.

### 9.2 Rasterização compartilhada

Implementar rasterização determinística em TypeScript com `Float32Array`. Estratégia simples:

- Para cada segmento de reta, calcular a distância dos centros/subamostras de pixels até o segmento.
- Pintar pixels quando a distância ficar dentro do raio de espessura definido.
- Usar supersampling leve (por exemplo, 2×) com média na redução, caso a implementação continue performática.
- Evitar depender do antialiasing diferente entre Chrome, Node e navegador.

**Importante:** normalizar dinamicamente a bounding box de traços parciais pode fazer a escala aparente variar durante o desenho. Esse comportamento deve estar presente tanto na geração de treino como no runtime e deve ser avaliado. Nunca usar a bounding box da forma final no pré-processamento de um prefixo: isso provocaria vazamento de informação futura.

### 9.3 Contrato

```ts
type PreprocessResult =
  | { kind: "empty"; reason: "no-ink" | "too-short" }
  | {
      kind: "ready";
      tensor: Float32Array; // 1024 elementos, [1, 32, 32]
      width: 32;
      height: 32;
      inkFraction: number;
    };

function preprocessDrawing(drawing: Drawing): PreprocessResult;
```

Não derivar “percentual concluído” na execução real: em geral, a aplicação não sabe como o usuário pretende terminar o desenho.

## 10. Dataset de formas completas e parciais

### 10.1 Estratégia

O dataset principal será **sintético e procedural**, gerado a partir de trajetórias geométricas, não de fotos. Cada figura-base possui uma classe e gera exemplos com rotações, tamanhos, velocidades e imperfeições naturais. A vantagem é obter dados rotulados, reproduzíveis e ajustados à lousa real.

O modelo deve ser treinado com imagens completas **e com prefixos dos traços**, porque a inferência acontece durante a execução do desenho.

### 10.2 Geração por classe

**Círculo:** parametrizar `(cx + rx cos θ, cy + ry sin θ)` com `rx ≈ ry` e pequena variação admissível de proporção; permitir início em ângulos distintos, sentido horário/anti-horário, discretização irregular, ruído pequeno, fechamento imperfeito.

**Quadrado:** gerar quatro vértices de um quadrado, com rotações variadas; percorrer as quatro arestas com velocidades e amostragem irregulares; tolerar pequenas distorções nos ângulos e no fechamento, sem transformar os exemplos rotulados em retângulos extremamente alongados.

**Triângulo:** gerar três vértices a partir de uma configuração válida; variar orientação, aspecto, posições e inclinação, preservando três lados discerníveis; percorrer arestas em sentidos variados; não restringir a triângulos equiláteros.

**Em todas as classes:** variar posição original na lousa, escala, ponto inicial, direção do traço, número de amostras, espessura, jitter e pequenas interrupções. Garantir que a imagem normalizada se pareça com a obtida pela câmera.

### 10.3 Prefixos temporais

Para cada trajetória-base, produzir imagens correspondentes a frações do **comprimento percorrido** (e não simplesmente número de pontos, que depende da velocidade):

- `0.25` — início do desenho;
- `0.40` — prefixo curto/intermediário;
- `0.60` — parcial;
- `0.80` — quase completo;
- `1.00` — completo.

Adicionar frações aleatórias durante o treino é desejável. Os valores são metadados de avaliação; **não entram como feature de entrada do classificador**.

Em prefixos curtos, classes diferentes podem ser visualmente indistinguíveis. Portanto, os rótulos descrevem **a intenção conhecida do gerador**, e não uma certeza inferível da imagem. A avaliação deve tratar isso explicitamente.

### 10.4 Split sem vazamento

- A unidade de divisão é **uma trajetória/figura-base identificada por `groupId`**.
- Distribuição inicial: 70% train, 15% validation, 15% test, estratificada por classe.
- **Todos os prefixos e variações derivadas do mesmo `groupId` ficam em um único split.**
- Gerar ou separar grupos antes de criar os prefixos e suas augmentations.
- Não selecionar hiperparâmetros ou limiar de confiança olhando o conjunto de test.
- Repetir treino com uma seed fixa e registrar a seed no artefato.

### 10.5 Volume inicial sugerido

- **400 trajetórias-base por classe** = 1.200 grupos.
- **5 prefixos por grupo** = 6.000 exemplos rasterizados antes de augmentations extras.
- Aproximadamente 4.200 exemplos para train, 900 para validation e 900 para test.
- Dimensionar volumes e epochs após medir o custo real da CNN em CPU; não afirmar performance não medida.
- Criar um conjunto adicional `real-test`, a partir de desenhos feitos por pessoas na própria aplicação, **quando houver exemplos consentidos**. Não misturar esse conjunto com o treinamento durante a avaliação inicial.

### 10.6 Formato dos dados

```json
{
  "id": "triangle-g0123-p060",
  "groupId": "triangle-g0123",
  "split": "train",
  "label": "triangle",
  "labelId": 2,
  "visibleFraction": 0.6,
  "seed": 42,
  "strokesFile": "strokes/triangle-g0123.json",
  "preprocessVersion": "1.0.0"
}
```

O `id` é único por amostra e o `groupId` identifica a figura-base. O manifesto pode ser armazenado como `manifest.jsonl`, com uma linha JSON por exemplo. O gerador deve ter opção de salvar os dados geométricos e, opcionalmente, os tensores pré-processados para acelerar treinos posteriores.

### 10.7 Sanidade e auditoria do dataset

- Conferir contagem de exemplos por split, classe e faixa de conclusão.
- Validar ausência de IDs/grupos repetidos entre splits.
- Gerar uma grade visual de amostras completas, parciais e adversas.
- Registrar distribuições de rotação, escala, espessura, jitter e ordem de percurso.
- Detectar imagens vazias e rótulos inválidos.
- Armazenar checksum/manifesto dos artefatos para reprodução.

## 11. Classificador CNN implementado do zero

### 11.1 Arquitetura proposta (MVP)

Uma CNN pequena é adequada ao problema, mais diretamente relacionada ao conteúdo do primeiro ZIP e mais simples que uma arquitetura sequencial/Transformer.

| Camada | Entrada | Saída | Parâmetros |
|---|---|---|---|
| Input | — | `[1,32,32]` | — |
| Conv2D, 4 filtros, kernel 3, padding 1 | `[1,32,32]` | `[4,32,32]` | 40 |
| ReLU + MaxPool 2×2 | `[4,32,32]` | `[4,16,16]` | 0 |
| Conv2D, 8 filtros, kernel 3, padding 1 | `[4,16,16]` | `[8,16,16]` | 296 |
| ReLU + MaxPool 2×2 | `[8,16,16]` | `[8,8,8]` | 0 |
| Flatten | `[8,8,8]` | `[512]` | 0 |
| Dense + ReLU | `[512]` | `[32]` | 16.416 |
| Dense (logits) | `[32]` | `[3]` | 99 |
| Softmax (inferência) | `[3]` | `[3]` | 0 |

**Total:** aproximadamente **16.851 parâmetros treináveis**. A organização pode manter as mesmas operações do `TinyCNN` recebido, adaptadas para um canal de entrada e três logits de saída.

### 11.2 Convenção de classes

```ts
const CLASS_NAMES = ["circle", "square", "triangle"] as const;
// IDs: circle=0, square=1, triangle=2.
```

Não permitir ordens diferentes entre gerador, treinamento, artefato e frontend.

### 11.3 Forward

```text
x [1,32,32]
 └─ conv1 → relu → pool
      └─ conv2 → relu → pool
           └─ flatten → dense1 → relu → denseOut
                └─ logits [3] → softmax → P(circle,square,triangle)
```

### 11.4 Função de perda

Usar **cross-entropy categórica** com logits, aplicando log-sum-exp numericamente estável:

```text
L = -log( softmax(logits)[targetClass] )

softmax(z_i) = exp(z_i - max(z)) / Σ_j exp(z_j - max(z))
```

No backward combinado de softmax + cross-entropy, o gradiente em relação aos logits é `p - oneHot(target)` (dividido pelo tamanho do batch quando aplicável). Evitar calcular sigmoid e BCE para três classes mutuamente exclusivas.

### 11.5 Treinamento e otimização

- Inicialização determinística com seed (He para camadas com ReLU é uma boa opção).
- Treino em CPU, com implementação explícita de forward/backward.
- Otimizador **Adam** próprio, aproveitando a base recebida e seus momentos/viés corrigido.
- Learning rate inicial `0.001`.
- `epochs = 25` como ponto de partida, ajustado por resultados.
- Tentar mini-batches de 16 ou 32 **somente se os gradientes forem acumulados e normalizados corretamente**. Se o código original operar por amostra, implementar inicialmente SGD/Adam por amostra e registrar essa escolha.
- Embaralhamento determinístico a cada época.
- Opcional: early stopping por `validation loss` com `patience = 5`, restaurando o melhor checkpoint.
- Nunca atualizar pesos durante validation e test.
- Falhar imediatamente em perdas `NaN`, parâmetros não finitos ou incompatibilidade de shapes.

### 11.6 Validação da implementação matemática

Antes de treinar o modelo completo:

1. Validar índices/strides e shapes de `Tensor`.
2. Verificar valores conhecidos de convolução 2D e pooling.
3. Conferir o gradiente de Dense e Conv2D contra diferenças finitas em tensores pequenos.
4. Verificar estabilidade da softmax com logits muito grandes/pequenos.
5. Verificar que a cross-entropy diminui quando aumenta o logit da classe correta.
6. Overfit intencional em um conjunto minúsculo de desenhos (por exemplo, 3–12 exemplos) para comprovar capacidade de aprendizagem.
7. Comparar predição antes/depois de serializar os pesos, com tolerância numérica explícita.

## 12. Inferência contínua e política de incerteza

### 12.1 Agendamento

O rastreamento da câmera e a predição do classificador não precisam rodar na mesma frequência:

- Rendering/tracking: tentar acompanhar o vídeo (ideal ~30 FPS; reduzir se necessário).
- Classificação: iniciar em **5–10 inferências por segundo**, somente se o desenho tiver mudado.
- Se o modelo ainda estiver ocupado, não acumular uma fila de predições: descartar frames intermediários e processar a versão mais recente.
- Incluir `drawing.revision` na solicitação/resultado; descartar qualquer predição referente a uma revisão antiga após limpar/desfazer.
- Executar a CNN preferencialmente em Web Worker para evitar interrupção do desenho; permitir execução local no main thread apenas com medição que comprove fluidez.
- Carregar e validar o modelo uma vez, não a cada inferência.

### 12.2 Contrato de saída

```ts
type Prediction = {
  revision: number;
  probabilities: {
    circle: number;
    square: number;
    triangle: number;
  };
  topClass: ShapeLabel;
  topProbability: number;
  status: "insufficient-ink" | "uncertain" | "predicted";
  inferenceMs: number;
  modelVersion: string;
};
```

A soma das probabilidades deve ser aproximadamente `1.0`, com tolerância a erro de ponto flutuante.

### 12.3 Regras para exibir palpite

- Não há strokes: **Aguardando desenho** e probabilidades ocultas/zeradas na interface.
- Tinta muito curta ou degenera: **Ainda não sei — desenhe um pouco mais**.
- Com imagem válida: sempre mostrar as **três probabilidades**, mesmo que a decisão seja incerta.
- Rótulo principal somente se `topProbability >= 0.65` **e** `(topProbability - secondProbability) >= 0.15`, valores iniciais ajustáveis por validation.
- Abaixo desses limiares: **Ainda não sei**; não inventar uma quarta classe neural.
- Evitar alternância rápida de rótulos exigindo, opcionalmente, duas atualizações consistentes antes de trocar o texto principal; exibir as probabilidades atuais sem atraso artificial.

**Limitação fundamental:** um arco inicial pode ser compatível com círculo, quadrado ou triângulo. O sistema deve tentar classificar desde cedo, mas **não pode prometer certeza antes da existência de informação visual discriminante**.

## 13. Organização do repositório

```text
airdraw/
├── apps/
│   └── web/
│       ├── public/
│       │   ├── models/shape-cnn.v1.json
│       │   └── mediapipe/                 # artefatos licenciados, se distribuídos localmente
│       ├── src/
│       │   ├── components/
│       │   │   ├── WebcamCanvas.tsx
│       │   │   ├── WhiteboardCanvas.tsx
│       │   │   ├── PredictionPanel.tsx
│       │   │   └── Toolbar.tsx
│       │   ├── hooks/
│       │   │   ├── useCamera.ts
│       │   │   ├── useHandTracking.ts
│       │   │   └── useShapePrediction.ts
│       │   ├── tracking/
│       │   │   ├── HandTracker.ts
│       │   │   ├── PinchDetector.ts
│       │   │   └── CoordinateMapper.ts
│       │   ├── drawing/
│       │   │   ├── StrokeController.ts
│       │   │   └── WhiteboardRenderer.ts
│       │   ├── workers/
│       │   │   └── prediction.worker.ts
│       │   ├── App.tsx
│       │   └── main.tsx
│       └── index.html
├── packages/
│   ├── ml-core/
│   │   └── src/
│   │       ├── tensor/Tensor.ts
│   │       ├── layers/{Conv2D,Dense,ReLU,MaxPool2D}.ts
│   │       ├── losses/SoftmaxCrossEntropy.ts
│   │       ├── optimizers/Adam.ts
│   │       ├── models/ShapeCNN.ts
│   │       ├── preprocessing/{normalize,rasterize,preprocess}.ts
│   │       ├── inference/predict.ts
│   │       └── serialization/model-artifact.ts
│   ├── dataset/
│   │   └── src/
│   │       ├── generators/{circle,square,triangle}.ts
│   │       ├── trajectory.ts
│   │       ├── augment.ts
│   │       ├── split.ts
│   │       └── manifest.ts
│   └── training/
│       └── src/
│           ├── train.ts
│           ├── evaluate.ts
│           ├── metrics.ts
│           ├── checkpoint.ts
│           └── cli.ts
├── datasets/
│   ├── generated/                      # gerado localmente ou versionado se pequeno
│   └── real-test/                      # opcional; não registrar dados sem consentimento
├── artifacts/
│   ├── history.csv
│   ├── metrics.json
│   ├── confusion-matrix.json
│   ├── dataset-summary.json
│   └── training-config.json
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATASET.md
│   ├── TRAINING.md
│   ├── PREPROCESSING.md
│   ├── EVALUATION.md
│   └── LIMITATIONS.md
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── README.md
└── SPEC.md
```

**Importante:** `apps/web` não pode importar `node:fs`, `node:path` ou qualquer módulo exclusivamente de Node. `ml-core` deve ser isomórfico; acesso a arquivos ocorre somente no treinamento.

## 14. Contrato do artefato de modelo

O checkpoint exportado deve conter pesos, arquitetura e informações que impeçam incompatibilidades silenciosas:

```json
{
  "schemaVersion": 1,
  "modelVersion": "shape-cnn-v1",
  "architecture": {
    "inputShape": [1, 32, 32],
    "conv1Filters": 4,
    "conv2Filters": 8,
    "kernelSize": 3,
    "denseUnits": 32,
    "outputUnits": 3
  },
  "classNames": ["circle", "square", "triangle"],
  "preprocessingVersion": "1.0.0",
  "training": {
    "seed": 42,
    "datasetManifestHash": "sha256:...",
    "epochsCompleted": 0,
    "bestValidationEpoch": 0
  },
  "parameters": {
    "conv1.conv.k[0,0]": [],
    "...": []
  }
}
```

**Os arrays vazios e os valores zero acima são ilustrativos, não um modelo treinado.** A exportação real deve conter todos os tensores nomeados com comprimentos e valores exatos, finitos e validados. Pode-se simplificar os nomes dos parâmetros, desde que sejam estáveis e sem colisões.

Durante a carga:

1. Validar schema/version e classNames.
2. Instanciar a arquitetura indicada.
3. Verificar a presença de cada parâmetro e o comprimento exato do tensor.
4. Verificar que todos os números são finitos.
5. Carregar os pesos por nome.
6. Executar smoke-test com tensor conhecido.
7. Bloquear a classificação e apresentar erro claro se algo falhar.

## 15. Pipeline de treino e comandos

### 15.1 Comandos a disponibilizar

```bash
pnpm install
pnpm dataset:generate --seed 42
pnpm dataset:inspect
pnpm ml:train --seed 42 --epochs 25 --lr 0.001
pnpm ml:evaluate --split test
pnpm ml:export
pnpm test
pnpm test:e2e
pnpm dev
pnpm build
```

Os scripts devem existir no `package.json` ou ser documentados com uma sintaxe real equivalente. O treino **não deve ser acionado automaticamente** ao iniciar o frontend.

### 15.2 Fluxo de treinamento

```text
load manifest
  → validar splits e labels
  → carregar trajetórias e gerar prefixos
  → preprocessDrawing (mesma função usada no navegador)
  → construir ShapeCNN com pesos novos e seed fixa
  → para cada época:
       shuffle(train, seed+epoch)
       forward → loss → backward → optimizer.step
       calcular train/validation metrics (sem atualizar pesos)
       salvar melhor checkpoint por validation loss
       registrar histórico
  → restaurar melhor checkpoint
  → avaliar test uma vez, após escolher configuração
  → exportar modelo e relatório de treinamento
```

### 15.3 Reprodutibilidade

Registrar:

- Versões de Node, pnpm, TypeScript e dependências.
- Seed do dataset e seed da inicialização.
- Parâmetros do gerador (ruído, rotações, tamanhos, frações, distribuição).
- Lista/split de `groupId` ou hash do manifesto.
- Arquitetura, épocas, LR, estratégia de batch, early stopping e seed de shuffle.
- Hardware, duração real do treinamento e configurações relevantes.
- Checksum SHA-256 do artefato exportado.

A mesma configuração deve permitir reproduzir o processo e obter métricas e pesos determinísticos, **dentro das limitações documentadas de runtime/plataforma**.

## 16. Métricas e evidências de treino

### 16.1 Métricas obrigatórias

- Loss por época para train e validation.
- Accuracy total para train, validation e test.
- Accuracy, precision, recall e F1 **por classe**.
- Matriz de confusão 3×3.
- Accuracy por prefixo/faixa de completude (`25%`, `40%`, `60%`, `80%`, `100%`).
- Taxa de abstenção (`uncertain`) por faixa e **accuracy somente nas predições aceitas**; reportar ambas para impedir que um limiar alto mas inútil pareça bom.
- Tempo de inferência no navegador (mediana e p95 em máquina especificada).
- Contagem de exemplos por split/classe/faixa.

### 16.2 Arquivos mínimos

`artifacts/history.csv`:

```csv
epoch,train_loss,train_accuracy,val_loss,val_accuracy
1,0.0,0.0,0.0,0.0
```

`artifacts/metrics.json` deve conter métricas reais agregadas e por classe, por fração de desenho, seed, versão do modelo e data do experimento. `artifacts/confusion-matrix.json` deverá registrar a ordem das classes. Os zeros acima ilustram **somente o formato**, não resultados obtidos.

### 16.3 Como interpretar os resultados

- Reportar separadamente o desempenho em figuras completas e desenhos parciais.
- Não esconder desempenho baixo no início dos traços: ele é esperado quando não há informação suficiente.
- Comparar desempenho em dados sintéticos e capturas reais, se disponíveis.
- Usar validation para calibrar limiares de abstenção; nunca otimizar após observar os resultados de test.
- Se o modelo memorizar o gerador mas falhar com humanos, registrar **domain gap** e ajustar o dataset, não afirmar sucesso por uma accuracy sintética alta.

## 17. Testes

### 17.1 Unitários: núcleo matemático

- `Tensor`: indexação, reshape, shape mismatch, integridade de valores.
- `Conv2D`: forward com resultado conhecido, canais e padding.
- `MaxPool`: forward/backward, incluindo empate com desempate determinístico.
- `Dense`: forward/backward, shapes e gradientes.
- `ReLU`: valores positivos/negativos e gradiente.
- `SoftmaxCrossEntropy`: soma de probabilidades, estabilidade numérica e gradiente.
- `Adam`: um ou mais steps com valores esperados; parâmetros independentes.
- `ShapeCNN`: forward `[1,32,32] → [3]` e backward sem shapes inválidos.
- `preprocessDrawing`: vazio, degenerado, múltiplos strokes, limite dos canvas, consistência e determinismo.

### 17.2 Unitários: interação

- Pinça ativa/desativa com histerese.
- Perda de mão encerra stroke sem conectar pontos distantes.
- Espelhamento e transformação de coordenadas com proporções diferentes.
- Limpar lousa remove todos os strokes e invalida a predição anterior.
- `revision` antigo jamais sobrescreve a UI após uma revisão nova.
- Sem câmera: UI em erro controlado, sem exceção não tratada.

### 17.3 Integração

- Carregar JSON de modelo exportado e obter predição igual ao CLI para tensor fixo.
- Treinar um dataset pequeno e comprovar diminuição de loss.
- Dataset: ausência de `groupId` em splits diferentes.
- Mesmo `Drawing` → exatamente o mesmo tensor no treino e no navegador, salvo tolerância explícita.
- Simulação de sequência de landmarks → strokes esperados → tensor → predição.

### 17.4 E2E

Com Playwright, simular câmera quando viável e criar fixtures de landmarks ou utilizar modo mouse:

1. App carrega com dois canvas.
2. Iniciar câmera demonstra estado de solicitação/autorização ou erro compreensível.
3. Pinça simulada cria traço; soltar interrompe; nova pinça não conecta o gap.
4. Desenho parcial aciona inferência e atualiza probabilidades.
5. Limpar reseta imagem e probabilidades.
6. Modelo inexistente/corrompido produz mensagem de erro clara.
7. Desenho por mouse passa pelo **mesmo** classificador e pré-processamento.

**Teste manual obrigatório:** fluxo real com webcam e mão, em pelo menos um navegador desktop suportado. Testes com webcam simulada não substituem o teste físico.

## 18. Metas não funcionais e aceitação

### 18.1 Metas de engenharia (medir; não presumir)

- Interação com aparência fluida em notebook comum: objetivo ~24–30 FPS no pipeline visual, com ajuste de resolução/frequência quando necessário.
- Predição atualizada em aproximadamente 100–250 ms após uma mudança relevante, sob condições de referência documentadas.
- Inferência da CNN isolada: objetivo p95 inferior a 50 ms em ambiente de referência; reavaliar se execução em CPU puro não atingir.
- Sem consumo de memória crescente por loop, câmeras não encerradas ou workers duplicados.
- Sem envio da webcam para servidores; processamento local no navegador.

### 18.2 Critérios funcionais de aprovação

- [ ] Dois canvas visíveis e responsivos: webcam e lousa.
- [ ] Usuário consegue iniciar/parar câmera.
- [ ] Mão detectada e pinça funcional em teste real.
- [ ] Desenho acompanha a posição do indicador, com strokes corretamente separados.
- [ ] Botão limpar funciona e invalida predições antigas.
- [ ] Três classes suportadas em modelo treinado do zero.
- [ ] Palpite atualizado **antes de a figura estar completa**, quando o modelo emitir uma decisão, ou status de incerteza explicado.
- [ ] Três probabilidades coerentes exibidas continuamente com tinta suficiente.
- [ ] Dataset reproduzível de desenhos completos e parciais com train/validation/test sem leakage.
- [ ] Treino executável por comando, com seed, métricas e exportação.
- [ ] Pesos exportados carregam e inferem no navegador.
- [ ] Testes matemáticos, de gestos, de pré-processamento e E2E existentes.
- [ ] README e documentação cobrem arquitetura, execução, dados, treino, métricas, limitações e uso do MediaPipe.

### 18.3 Critérios de qualidade do classificador (alvos, não fatos)

- **Objetivo inicial:** accuracy em imagens sintéticas completas de pelo menos 90% no test separado por grupos.
- **Objetivo exploratório:** acurácia de figuras reais completas de pelo menos 75%, **se houver conjunto real de avaliação com quantidade relevante e proveniência documentada**.
- Para prefixos curtos, **não impor um mínimo artificial de accuracy**; apresentar curva de accuracy e taxa de abstenção por estágio e interpretar ambiguidades.
- Se os alvos não forem atingidos, a entrega deve permanecer **honesta**, com resultados reais, análise de erro e limitações; não fabricar métricas ou substituir discretamente a CNN por regras geométricas.

## 19. Privacidade, confiabilidade e falhas

- Webcam somente após consentimento; indicador visual de câmera ativa.
- Não enviar frames, landmarks nem desenhos a serviços externos por padrão.
- Não gravar vídeo; captura de exemplos reais exige ação afirmativa e explicação de armazenamento.
- Armazenar somente traços e rótulos necessários, se o usuário solicitar exportação.
- Erros previstos: permissão negada, ausência de câmera, dispositivo ocupado, modelo de mão indisponível, incompatibilidade de navegador, mão fora do enquadramento, checkpoint inválido, tensor vazio.
- Prever retentativa de inicialização e encerramento seguro.
- Validar JSON carregado e tamanho dos parâmetros antes de alocar/executar o modelo.
- Hospedagem em HTTPS e registro das licenças/condições de distribuição do modelo de rastreamento.

## 20. Sequência de implementação sugerida

### Fase 1 — Base matemática e testes

- Adaptar componentes aproveitáveis do ZIP 1.
- Incorporar softmax/cross-entropy multiclasse inspirado em `src/cel.ts` do ZIP 2.
- Construir `ShapeCNN`, testes de gradientes e serialização.
- **Entrega da fase:** CNN faz forward/backward em dados artificiais com testes passando.

### Fase 2 — Dados, treinamento e evidências

- Implementar gerador de trajetórias e prefixos.
- Implementar pré-processamento compartilhado.
- Gerar splits por `groupId` e auditoria do dataset.
- Treinar CNN, medir train/validation/test e exportar artefatos.
- **Entrega da fase:** modelo treinado e reproduzível, antes de integrar com a webcam.

### Fase 3 — Aplicação web e lousa

- Criar React/Vite e dois canvas.
- Implementar modo mouse primeiro, com StrokeController e preprocess.
- Carregar modelo JSON e exibir probabilidades continuamente.
- **Entrega da fase:** desenhar com mouse já produz predições reais.

### Fase 4 — Rastreamento e pinça

- Integrar `getUserMedia`, Hand Landmarker e loop de frames.
- Implementar pinça, histerese, espelhamento e suavização.
- Integrar tracking ao mesmo StrokeController usado no modo mouse.
- **Entrega da fase:** desenho por pinça com webcam, sem alterar o núcleo de ML.

### Fase 5 — Robustez e documentação

- Otimizar frequência/Worker com medições.
- Testar casos adversos e capturas reais.
- Registrar métricas, limitações, vídeos/screenshots de demonstração (sem expor dados sem consentimento).
- Completar README, documentação e checklist de aceitação.
- **Entrega da fase:** app demonstrável, treinável novamente e auditável.

## 21. README obrigatório

O `README.md` final deve conter:

1. Descrição do problema e demonstração (GIF/vídeo/imagens opcionais).
2. Requisitos locais, versões e instalação.
3. Comandos exatos para instalar, executar, testar e gerar dados.
4. Como iniciar câmera, desenhar, soltar a pinça e limpar a lousa.
5. Definição precisa do que foi construído *from scratch* e do que utiliza MediaPipe.
6. Diagrama do fluxo webcam → landmarks → gesto → strokes → tensor → CNN → probabilidades.
7. Modelo: arquitetura, número de parâmetros, loss, otimizador, seeds e hiperparâmetros.
8. Dataset: algoritmo de geração, splits, prefixos, exemplos e medidas contra leakage.
9. Resultados reais de treinamento, validation e test; matriz de confusão e performance parcial.
10. Limitações: ambiguidade precoce, ruído de tracking, latência, domínio sintético × humano e sensibilidade a estilo.
11. Critérios de aceitação, testes e instruções para reproduzir a demonstração.
12. Atribuições, licenças, bibliografia e origem dos artefatos externos.

## 22. Bibliografia e documentação externa

### Referências diretamente relevantes

- Aurélien Géron — *Hands-On Machine Learning with Scikit-Learn and PyTorch*. Capítulos de classificação, treinamento e CNNs. https://www.oreilly.com/library/view/hands-on-machine-learning/9798341607972/
- Aurélien Géron — *Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow*, 3ª edição. Metodologia de classificação, métricas e redes convolucionais. https://www.oreilly.com/library/view/hands-on-machine-learning/9781098125967/
- Chip Huyen — *Designing Machine Learning Systems*. Separação de dados, desenho do pipeline, monitoramento e avaliação. https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/
- Howard Huang e colaboradores — *Deep Learning with PyTorch*, 2ª edição. Conceitos de camadas, treinamento e avaliação como orientação conceitual; **não utilizar PyTorch no classificador exigido**. https://www.oreilly.com/library/view/deep-learning-with/9781633438859/
- Google AI Edge — *Hand landmarks detection guide for Web*. https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js
- Google AI Edge — *HandLandmarker JS API*. https://developers.google.com/edge/api/mediapipe/js/tasks-vision.handlandmarker
- MDN — *getUserMedia*. https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- MDN — *HTMLCanvasElement*. https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement

### Referências complementares, não exigidas na implementação

- Sebastian Raschka — *Build a Large Language Model (From Scratch)*. Valor metodológico: implementação explícita de camadas e pipeline; arquitetura LLM fora do escopo. https://www.oreilly.com/library/view/build-a-large/9781633437166/
- Sebastian Raschka — *Build a Reasoning Model (From Scratch)*. Valor metodológico: medição e implementação transparente; reasoning LLM fora do escopo. https://www.oreilly.com/library/view/build-a-reasoning/9781633434677/
- Nicole Koenigstein — *Transformers: The Definitive Guide*. Contexto geral de visão e modelos; Transformers fora do MVP. https://www.oreilly.com/library/view/transformers-the-definitive/9781098167004/
- Jay Alammar e Maarten Grootendorst — *Hands-On Large Language Models*. Conceitos complementares de ML/LLM, não necessários para classificação das formas. https://www.oreilly.com/library/view/hands-on-large-language/9781098150952/

## 23. Definição de pronto (*Definition of Done*)

O projeto está pronto quando uma pessoa consegue, seguindo **somente o README**, instalar dependências, regenerar o dataset, treinar e avaliar o classificador sem framework de ML, iniciar a aplicação, autorizar a câmera, desenhar círculo/quadrado/triângulo por pinça, observar probabilidades sendo atualizadas durante o desenho e conferir o resultado de um teste reproduzível. Os artefatos devem demonstrar que o modelo foi **efetivamente treinado para esta tarefa**, e não adaptado de pesos previamente treinados ou substituído por um algoritmo de regras fixas.

**Prioridade central:** a experiência de desenhar deve ser utilizável, mas nenhuma simplificação da UI pode comprometer a evidência de treinamento from scratch; da mesma forma, nenhuma métrica sintética elevada substitui a avaliação honesta de desenhos parciais e capturas reais.
