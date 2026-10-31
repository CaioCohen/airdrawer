# Limitações e Definition of Done

## Limitações conhecidas

- Split fornecido é muito pequeno fora de treino: validation=4 e test=3. Os resultados 3/3 não são estatisticamente significativos.
- O corpus contém rasters completos, sem trajetórias/prefixos; não existem métricas de 25/40/60/80%, nem se pode afirmar predição antecipada confiável.
- Não há desenhos humanos consentidos, avaliação real, webcam executada nem medição de latência/FPS de browser. Resultado de raster não representa pessoas, câmera ou gesto de pinça.
- O pipeline de PNG do corpus e `preprocessDrawing` da lousa compartilham formato e polaridade, mas não são a mesma transformação. O domain gap está aberto.
- O rastreamento depende de câmera, permissões, HTTPS/localhost, iluminação, oclusão e suporte do navegador. MediaPipe detecta mão, não forma.
- Resultados determinísticos com seed ainda podem diferir por runtime/CPU e ponto flutuante.

## Definition of Done — estado verificável

| Critério | Estado / evidência |
| --- | --- |
| Instalar, gerar manifesto, inspecionar, treinar, avaliar, exportar e executar só com README | **Atendido por comandos documentados**; a reprodução completa de checkout limpo deve ser executada por quem a realizar. |
| CNN três classes treinada do zero e artefato carregado pelo browser | **Atendido**: artefato servido SHA-256 `dd6e…025a9c`, schema/seed/hash no JSON. |
| Sem framework de ML, classificador remoto ou envio de webcam | **Atendido por arquitetura/código**; MediaPipe é limitado a landmarks. |
| Dois canvas, mouse, câmera/pinça, limpeza/desfazer e referência consentida | **Implementado**; roteiro manual de webcam está pendente nesta máquina sem câmera física. |
| Métricas, split anti-leakage e incerteza | **Atendido com limites**: manifesto/auditoria, checkpoint por validation, política congelada; test=3 é descritivo. |
| Evidência para humanos, webcam e desenhos parciais | **Não atendido**: faltam dados consentidos e avaliação correspondente. |
| Metas de tempo no navegador | **Não atendido/sem medição**. |

## Pendências prioritárias

1. Coletar dados voluntários e consentidos separados em `datasets/real-test/`, sem ajuste posterior nos mesmos exemplos.
2. Gerar trajetórias por `groupId` e prefixos com `preprocessDrawing`; redividir antes de aumentar/derivar exemplos.
3. Unificar ou medir formalmente a equivalência entre entrada de lousa e treino.
4. Rodar o roteiro manual de câmera e medir inferência/atualização em navegador desktop, registrando hardware e método.
