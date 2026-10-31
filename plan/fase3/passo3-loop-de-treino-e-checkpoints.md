# Fase 3 — Passo 3: loop de treino, validação e checkpoints

## Objetivo

Treinar uma nova instância da ShapeCNN de forma determinística, observável e sem atualizar em validation/test.

## Implementação

1. Adaptar a separação de responsabilidades do `training-loop.ts` de D1: treino chama forward/backward/Adam; avaliação chama somente forward/loss/métricas. Trocar BCE/sigmoid pelo contrato categórico da Fase 2.
2. Implementar `ml:train --seed 42 --epochs 25 --lr 0.001` no pacote Node. Inicializar pesos novos, embaralhar train determinísticamente por época e falhar para loss/parâmetros não finitos.
3. Começar com atualização por amostra se o core ainda não suportar batches; introduzir batch 16/32 somente após implementar/testar acumulação e normalização corretas.
4. Medir train e validation por época, persistir `history.csv` e checkpoint de melhor `validation loss`; usar early stopping opcional com patience 5 e restaurar melhor estado ao final.
5. Registrar configuração completa: versões, seeds, hash do manifesto, arquitetura, hiperparâmetros, duração/hardware, estratégia de batch, melhor época e limitações de reprodutibilidade de plataforma.

## Verificação / aceite

- Treino pequeno de CI reduz loss sem atualizar validation/test.
- Um checkpoint restaurado reproduz as predições do melhor epoch para tensor fixo.
- O log/CSV contém uma linha por época e não apresenta métricas fabricadas.

## Referências

Reaproveitar o desenho geral de `training-loop.ts`, Adam e parâmetros nomeados da disciplina 1, nunca seus pesos gato/cachorro ou sua loss binária.
