# Fase 2 — Passo 6: inferência contínua na aplicação

## Objetivo

Conectar `Drawing` ao núcleo de ML e mostrar probabilidades sem bloquear a interação, preparado para receber o modelo treinado da Fase 3.

## Implementação

1. Criar `useShapePrediction` e painel de predição. Ao mudar `Drawing.revision`, executar o preprocessamento compartilhado e só agendar inferência para `ready`.
2. Limitar inicialmente a 5–10 predições/s e processar somente a revisão mais recente. Cada request/result carrega `revision`; clear, undo ou desenho novo invalidam resultados antigos.
3. Preferir `prediction.worker.ts` para inferência; caso comece no main thread, medir fluidez e conservar uma interface que permita mover ao Worker sem mudar regras de negócio.
4. Exibir “Aguardando desenho” quando vazio, “Ainda não sei — desenhe um pouco mais” para pouca tinta/incerteza, e sempre as três probabilidades quando existir tensor válido. Só exibir rótulo principal com `top >= 0.65` e margem >= 0.15, calibráveis na Fase 3.
5. Inicializar/validar o modelo uma vez. Até existir artefato treinado, mostrar estado explícito “modelo ainda não instalado”, não resultados inventados; permitir fixture somente em testes.

## Verificação / aceite

- Integração com fixture de modelo comprova o caminho `Drawing → tensor → probabilidades`.
- Testes de concorrência demonstram que resultado de revisão antiga não substitui o atual.
- Limpar zera predição; modo mouse e modo câmera usam a mesma entrada/classificador.

## Dependências

Fase 1, preprocessamento e serialização. Fase 3 trocará o fixture pelo modelo treinado e calibrará os limiares.
