# Fase 3 — Passo 1: gerador procedural de trajetórias

## Objetivo

Gerar exemplos reprodutíveis que representam a maneira como a lousa recebe traços, e não imagens geométricas perfeitas desconectadas da interação.

## Implementação

1. Implementar PRNG seedado e geradores de `Drawing`/trajetória para círculo, quadrado e triângulo. Cada classe deve variar posição, escala, rotação, início, direção, quantidade/velocidade de amostras, espessura, jitter e fechamento imperfeito sem perder a identidade do rótulo.
2. Círculo: parametrização angular com pequena variação de razão. Quadrado: quatro lados/rotação e pequenas imperfeições sem virar retângulo muito alongado. Triângulo: três lados com orientações e aspectos variados, sem restringir a equiláteros.
3. Gerar trajetórias completas primeiro, atribuindo `groupId` estável por figura-base. Persistir traços e parâmetros com versão/seed para auditoria e regeneração.
4. Produzir prefixos por distância percorrida em 0,25; 0,40; 0,60; 0,80; 1,00, mais frações aleatórias apenas no treino se configuradas. Prefixo nunca acessa ponto futuro nem bbox final.
5. Passar cada prefixo pela mesma `preprocessDrawing` do navegador; nenhum renderizador Canvas pode produzir pixels de treino.

## Verificação / aceite

- Mesma seed/configuração gera manifest e amostras idênticos/compatíveis conforme tolerância documentada.
- Grade visual mostra todas as classes e frações, incluindo casos imperfeitos plausíveis.
- Testes confirmam que prefixo só contém distância/pontos já percorridos e que label/ID é válido.

## Referências

As referências D1/D2 tratam imagens gato/cachorro; o formato de trajetória procedural é novo e atende à especificação do AirDraw.
