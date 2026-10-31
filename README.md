# AirDraw

Aplicação acadêmica para desenhar formas no ar. Esta entrega cobre a interação: dois canvas responsivos, lousa por mouse/toque, webcam opcional, landmarks de mão e gesto de pinça. O classificador, o pré-processamento, o dataset e o treino ainda **não** fazem parte desta fase; por isso a área de predição informa “Ainda não sei”.

## Requisitos e início

Node.js 20.11+ e pnpm 9.15.4+.

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm test:e2e
```

Abra a URL informada pelo Vite em `localhost` ou use HTTPS: navegadores só concedem câmera em contexto seguro. Os comandos futuros `dataset:generate`, `dataset:inspect`, `ml:train`, `ml:evaluate` e `ml:export` continuam deliberadamente indisponíveis até suas fases próprias.

## Como usar

- Sem câmera, o modo inicial é **Mouse**. Desenhe na lousa com mouse, caneta ou toque; o cursor indica a posição. Cada pressionamento/soltura cria um stroke independente.
- Use **Limpar lousa** para remover todos os strokes, ou **Desfazer** para remover somente o último. Ambos encerram qualquer interação em curso.
- Para desenhar no ar, escolha **Modo: Câmera** e depois **Iniciar câmera**. Conceda a permissão do navegador, mantenha uma mão no enquadramento e una polegar e indicador para iniciar o stroke. Separe os dedos ou retire a mão do quadro para encerrá-lo; uma nova pinça começa outro stroke, sem ligar os dois.
- **Parar câmera** encerra as tracks e o loop de desenho. Uma mensagem acionável é exibida quando a permissão é negada, não há câmera, o dispositivo está ocupado, o navegador não oferece suporte ou o rastreador não inicia.

## Privacidade e referências locais

A câmera só é solicitada após o clique em **Iniciar câmera**. Vídeo, frames e landmarks não são armazenados nem enviados: eles são usados em memória apenas para desenhar a prévia e o cursor.

O painel **Salvar referência** só libera a ação após haver traços e confirmação explícita. Ele grava somente os strokes da lousa no `localStorage` deste navegador. A referência pode ser revisada, exportada como JSON/PNG ou apagada.

- Em `pnpm dev`, **Exportar PNG da lousa** grava automaticamente em `docs/images/` como `rotulo-n.png` (por exemplo, `circle-1.png`, depois `circle-2.png`).
- Em uma build publicada, o mesmo botão faz download automático com `rotulo-n.png`; o contador é local ao navegador, pois uma hospedagem estática não pode enumerar ou escrever em `docs/images/`.

O modo é controlado por `VITE_PNG_EXPORT_MODE`: `.env.development` usa `local-server` e `.env.production` usa `download`. Valores inválidos, ou `local-server` em produção, interrompem a inicialização para impedir uma publicação configurada incorretamente. Variáveis `VITE_*` são públicas: nunca armazene segredos nelas. A importação JSON é validada antes de ser aceita. Capturas humanas voluntárias devem ser exportadas e importadas conscientemente; `datasets/real-test/` é ignorado pelo Git e não entra automaticamente em treino.

## Limitações conhecidas

- O MediaPipe rastreia mãos; ele não reconhece círculo, quadrado ou triângulo.
- Não há CNN, pré-processamento, probabilidades ou classificação nesta fase.
- A pinça usa limiares normalizados com histerese, mas iluminação, enquadramento, oclusão, ângulo e diferenças entre câmeras podem exigir calibração futura.
- O rastreamento e a webcam dependem de navegador compatível, conexão segura e um modelo MediaPipe que possa ser carregado.
- O cursor e a tinta são atualizados imperativamente no canvas para não renderizar React por frame ou ponto; React é atualizado apenas nas transições da interação e nos controles.

## Roteiro manual obrigatório de webcam real

Este roteiro está documentado, mas **não foi executado nesta máquina nesta entrega**, pois não houve uma webcam física disponível ao agente.

1. Execute `pnpm dev` em `localhost`/HTTPS e abra a página em um navegador com webcam.
2. Confirme os dois canvas e desenhe dois strokes separados no modo Mouse; valide Limpar e Desfazer.
3. Troque para o modo Câmera, inicie a câmera e conceda permissão. Confirme prévia espelhada, indicador “Mão detectada” e cursor sobre a lousa.
4. Faça uma pinça, mova o indicador e solte. Faça outra pinça distante; confirme que não há segmento ligando os strokes.
5. Retire a mão do quadro durante uma pinça, redimensione a janela e pare a câmera; confirme encerramento limpo do stroke, redraw correto e ausência de travamento.
6. Repita negando a permissão e com outro app segurando a webcam; confirme as mensagens e que o modo Mouse segue utilizável.

## Verificação e medições

Nesta entrega foram executados com sucesso `pnpm test` (31 testes do web, além dos workspaces), `pnpm build` e `pnpm test:e2e` (5 cenários em modo Mouse). Não foi feita medição de FPS/deteções em hardware com webcam física; portanto não há métrica de desempenho declarada. O loop evita detecção duplicada para o mesmo frame de vídeo e não agenda atualizações React por ponto/frame.

## Estrutura e fronteira de fase

O fluxo de integração é `webcam → landmarks → gesto → Drawing`. O contrato `Drawing` preserva coordenadas normalizadas e limites de stroke; será a única entrada da fase posterior de pré-processamento. Veja [a arquitetura](docs/ARCHITECTURE.md) para a separação entre browser, núcleo isomórfico e CLIs Node.
