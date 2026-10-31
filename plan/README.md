# Plano de implementação — AirDraw

Este plano reorganiza a sequência sugerida na especificação em torno das três entregas solicitadas: interação, núcleo de ML e treinamento. Cada passo tem uma entrega observável e uma condição de aceite; não há treinamento automático quando a aplicação web sobe.

## Ordem e dependências

```text
Fase 0 ──► Fase 1 (webcam + dois canvas + traços)
    └────► Fase 2 (CNN + preprocessamento + inferência)
Fase 1 + Fase 2 ──► Fase 3 (dados + treino + artefato + integração final)
```

| Fase | Objetivo | Entrega que desbloqueia a próxima |
| --- | --- | --- |
| 0 | Preparar monorepo, ferramentas e contratos básicos | `pnpm install`, lint/typecheck/test e app inicial executáveis |
| 1 | Desenhar com mouse e por pinça, em dois canvas, e salvar referências consentidas | `Drawing` normalizado, renderização, webcam e exportação de amostras funcionais |
| 2 | Implementar CNN multiclasse from scratch e o caminho desenho → tensor → probabilidades | modelo testado, serializável e carregável; ainda sem pesos treinados de produção |
| 3 | Gerar dados, treinar, avaliar, exportar pesos e conectar o artefato ao navegador | demonstração reprodutível com pesos reais e evidências de avaliação |

## Referências examinadas

- `../coders-university-pos-ia-m5-d1/coders-university-pos-ia-m5`: fonte de estrutura para `Tensor`, `Conv2D`, `MaxPool2D`, `ReLU`, Adam, parâmetros nomeados, serialização e loop de treino. A rede e o dataset originais são binários (gato/cachorro), RGB e não podem fornecer pesos ao AirDraw.
- `../coders-university-pos-ia-m5-d2/coders-university-pos-ia-m5`: `src/cel.ts` tem o padrão de log-sum-exp e gradiente `softmax - oneHot` a adaptar para logits `[batch, 3]`.
- `../coders-university-pos-ia-m5-d3/explanations`: apoio didático para `tensor`, `relu`, `dense`, `back_propagation`, `adam`, `bce_vs_cel`, `loop_treinamento` e `ciclo_vida_modelo`; não é código de produção.

As referências são ponto de partida, não dependência de runtime nem fonte de cópia cega. Em particular, a referência usa `Float64Array`, saída sigmoid/BCE e carece da cobertura de testes exigida; a versão do AirDraw usará `Float32Array`, entrada `[1,32,32]`, três logits e softmax/cross-entropy. Qualquer port deve passar pelos testes definidos na Fase 2 antes de entrar no treino.

## Decisões fechadas pelo plano

- Classes e IDs imutáveis: `circle=0`, `square=1`, `triangle=2`.
- A fonte de verdade do desenho é `Drawing` (traços separados, pontos normalizados e `revision`), nunca o vídeo ou pixels de um canvas.
- O mesmo pré-processamento TypeScript puro será usado pelo gerador/treino e pelo navegador.
- Exemplos humanos só são persistidos após ação explícita; vídeo e frames da webcam não são persistidos nem enviados.
- O modelo de mão do MediaPipe é apenas rastreamento. A CNN de formas será implementada e treinada do zero.

## Critério global de pronto

Seguindo o README final, uma pessoa instala as dependências, regenera os dados, treina e avalia a CNN, inicia a aplicação, autoriza a câmera, desenha por pinça e vê as probabilidades atualizarem durante a construção da forma. O repositório deve preservar artefatos e métricas reais, inclusive limitações de desenhos parciais.
