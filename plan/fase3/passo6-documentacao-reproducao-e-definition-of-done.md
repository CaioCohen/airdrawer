# Fase 3 — Passo 6: documentação, reprodução e aceite final

## Objetivo

Fazer com que a entrega seja reproduzível, auditável e utilizável por alguém que só tenha o repositório.

## Implementação

1. Completar README com requisitos/versões, instalação, comandos exatos, webcam/pinça/mouse, limites de segurança, esquema de arquitetura, o que foi from scratch e o papel limitado do MediaPipe.
2. Criar/atualizar `docs/DATASET.md`, `TRAINING.md`, `PREPROCESSING.md`, `EVALUATION.md` e `LIMITATIONS.md`: seeds, gerador, split anti-leakage, mesma função de preprocessamento, resultados reais, evidências e domínio sintético × humano.
3. Inserir tabela de resultados reais e links a `artifacts/`; não preencher números ilustrativos como se fossem medidos. Registrar atribuições/licenças das referências e do modelo Hand Landmarker.
4. Rodar em checkout limpo: instalação, geração de dados, inspeção, treino, avaliação, exportação, testes unitários/integração/E2E, build e demonstração manual com webcam em navegador desktop suportado.
5. Registrar resultado de cada comando, ambiente/hardware e pendências conhecidas. Se metas de acurácia não forem atingidas, entregar análise de erro e limitações honestas.

## Gate final

- Uma pessoa consegue seguir somente o README para treinar e executar a aplicação.
- O modelo é treinado do zero para as três classes, seus pesos são carregados no browser e predições parciais são mostradas com incerteza apropriada.
- Dois canvas, câmera, pinça, persistência consentida de referências, dataset reprodutível, testes e métricas estão presentes.
- Não há dependência de framework de ML, backend de classificação ou envio de vídeo/dados de webcam.
