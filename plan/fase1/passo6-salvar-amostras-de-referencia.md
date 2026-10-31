# Fase 1 — Passo 6: salvar desenhos de referência com consentimento

## Objetivo

Dar à pessoa um modo explícito de guardar desenhos/traços para consulta ou futura avaliação real, sem coletar vídeo e sem contaminar automaticamente o dataset de treinamento.

## Implementação

1. Criar um painel “Salvar referência” que só se torna disponível para uma lousa não vazia. Solicitar rótulo (`circle`, `square` ou `triangle`) e confirmação clara de que serão guardados os traços, não o vídeo.
2. Exportar `Drawing` com schema/version, rótulo opcional, data, modo de entrada, dimensões lógicas e metadados mínimos. Oferecer download JSON; opcionalmente exportar PNG renderizado para inspeção humana.
3. Para referência local entre sessões, usar armazenamento local somente com ação explícita, lista para revisar e controles de exportar/apagar. Não usar armazenamento remoto.
4. Separar capturas humanas em `datasets/real-test` apenas mediante importação consciente em ambiente de desenvolvimento; não adicioná-las a treino, validation ou controle de versão por padrão.
5. Validar arquivos importados: schema, limites, valores finitos, quantidade de pontos e label. Arquivos inválidos devem falhar com erro compreensível.

## Verificação / aceite

- Exportar um desenho gera JSON que pode ser reimportado e redesenhado com strokes/revision coerentes.
- Limpar a lousa não apaga referências já salvas sem confirmação separada.
- Inspeção confirma que não há chamada de rede nem persistência de vídeo/frame/landmarks brutos.

## Dependências

Passo 2 da Fase 1. Este recurso pode ser concluído antes da webcam, mas deve aceitar os dois modos de entrada.
