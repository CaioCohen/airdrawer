# Fase 1 — Passo 3: câmera, ciclo de vida e renderização de vídeo

## Objetivo

Conectar a webcam apenas após ação da pessoa, renderizar seus frames no canvas esquerdo e encerrar todos os recursos corretamente.

## Implementação

1. Criar `useCamera` com botões Iniciar e Parar. Solicitar `getUserMedia({ audio:false, video:{ width:{ideal:640}, height:{ideal:480}, frameRate:{ideal:30} } })` somente ao iniciar.
2. Manter `<video autoplay playsInline muted>` interno/oculto como fonte de frames, aguardar metadados e `play()`, e desenhar o frame atual no canvas de webcam via `requestAnimationFrame` ou `requestVideoFrameCallback` quando disponível.
3. Modelar erros diferenciados: permissão negada, inexistência/ocupação de câmera, contexto inseguro e falha de reprodução. Oferecer retorno ao modo mouse em todos os casos.
4. Ao parar, desmontar componente ou trocar de dispositivo, cancelar loop, limpar `srcObject` e chamar `stop()` em cada `MediaStreamTrack`. Não abrir múltiplos streams.
5. Aplicar espelhamento visual de forma intencional e registrar sua configuração; o mapeamento para a lousa será implementado no Passo 5, não por um simples `transform: scaleX(-1)`.

## Verificação / aceite

- Testes mockam `getUserMedia` e cobrem sucesso, rejeição e cleanup.
- Manual em `localhost`: o vídeo surge após consentimento, para ao clicar Parar e o indicador de câmera atualiza.
- Repetir iniciar/parar não deixa tracks ou loops acumulados.

## Dependências

Passos 1–2 da Fase 1. HTTPS será obrigatório quando for hospedado; `localhost` é suficiente para desenvolvimento.
