# Fase 1 — Passo 7: endurecimento e aceite da interação

## Objetivo

Consolidar a Fase 1 como uma entrega utilizável e testável, pronta para ser conectada ao classificador sem mudar a semântica do desenho.

## Implementação

1. Garantir que renderização/tracking frequentes não causem renderizações React por ponto/frame. Manter canvas, stream, tracker e buffers em refs/controladores apropriados.
2. Exercitar cenários de erro: câmera negada, câmera ocupada, modelo de mão indisponível, mão fora do quadro, resize durante desenho e desmontagem durante câmera ativa.
3. Executar testes E2E no modo mouse (confiável para CI) e testes de integração com fixtures de landmarks. Registrar separadamente o teste manual obrigatório de webcam real.
4. Medir, se possível, FPS visual e frequência real de detecção em hardware identificado; documentar valores medidos e decisões de redução de carga. Não afirmar metas sem medição.
5. Atualizar README com uso de câmera, pinça, soltar, mouse, limpar, desfazer, privacidade e limitações conhecidas.

## Verificação / gate da fase

- Dois canvas aparecem; mouse/touch funciona sem câmera; webcam inicia/para; cursor e pinça criam strokes separados.
- Há testes para pinch, mapeamento, controller e erros de câmera, além de um roteiro de teste manual real executado.
- A aplicação pode salvar e recuperar uma referência sem armazenar vídeo.
- O contrato `Drawing` fica estável e é entregue à Fase 2 como única entrada de pré-processamento.
