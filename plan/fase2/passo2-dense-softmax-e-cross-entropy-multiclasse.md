# Fase 2 — Passo 2: Dense, softmax e cross-entropy multiclasse

## Objetivo

Substituir o caminho binário sigmoid/BCE por logits de três classes e loss categórica estável.

## Implementação

1. Implementar `Dense` com contrato inequívoco: entrada achatada `[inFeatures]`, pesos/documentação em uma única convenção, saída `[outFeatures]`, gradientes de entrada/pesos/bias e validação de shapes.
2. Adaptar a técnica de `src/cel.ts` do D2: subtrair o maior logit, computar log-sum-exp, cachear probabilidades e retornar `softmax(logits) - oneHot(target)` (normalizado por batch quando houver batch).
3. Expor `softmax` de inferência que retorna três probabilidades na ordem fixa `circle`, `square`, `triangle`. Não aplicar sigmoid aos logits multiclasse e não criar uma quarta classe “incerto”.
4. Manter suporte explícito para lote unitário primeiro; só adicionar mini-batch se acumulação e normalização de gradientes receberem testes próprios.

## Verificação / aceite

- Softmax soma aproximadamente 1 e permanece finita com logits muito grandes/pequenos.
- Cross-entropy cai quando o logit da classe correta aumenta.
- Dense passa forward/backward de valores conhecidos e diferenças finitas.
- Os testes demonstram `p - oneHot` para cada um dos IDs 0, 1 e 2.

## Referências

`../coders-university-pos-ia-m5-d2/coders-university-pos-ia-m5/src/cel.ts` é a referência para estabilidade numérica, mas seu formato original `[T,vocab]` deve ser adaptado a classificação `[batch,3]`.
