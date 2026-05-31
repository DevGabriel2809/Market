# Documentação técnica do projeto

Este arquivo complementa os comentários adicionados diretamente em `index.html`, em todos os arquivos de `src/js` e em todos os arquivos de `src/css`.

## Como ler os comentários

- `@doc-html` explica para que serve uma tag importante do HTML e o que pode ser editado sem quebrar os seletores.
- `@doc-css` explica para que serve um bloco de estilo e onde mexer para mudar visual, animação, modais, HUD, NPCs ou morcegos.
- `@doc-func` explica cada função JavaScript, seus parâmetros e o cuidado principal para editar.

## Arquivos principais

- `index.html`: estrutura das telas, botões, modais, HUD e ordem dos scripts.
- `src/js/main.js`: troca de telas, jogador, câmera, colisão e loop do jogo.
- `src/js/npc-system.js`: clientes, fila, compras, desistência, colisão e desvio de obstáculos.
- `src/js/bat-system.js`: cria a camada dos morcegos, controla intro e ondas ambiente.
- `src/js/ui.js`: renderiza modais, listas, checkout, HUD, toast e relatórios.
- `src/js/finance.js`: regras de expediente, eventos de mercado, fechamento do dia e relatórios.
- `src/js/products.js`: catálogo, estoque, compra e venda de produtos.
- `src/js/quests.js`: missões e recompensas.
- `src/js/events.js`: tecla E, interação com objetos, sons e balcão.
- `src/js/static-npc-system.js`: NPCs fixos de dicas/missões.
- `src/js/helpers-system.js`: ajudante contratado.
- `src/js/storage.js`: salvar/carregar.
- `src/js/gameState.js`: estado central da campanha.

## Ajustes feitos nesta versão

### NPCs

Os clientes agora têm colisão entre si, mas não ficam apenas parados repetindo “Com licença”. Quando encontram obstáculo, eles:

1. detectam se o bloqueio é mapa, player ou outro cliente;
2. pedem licença uma vez durante aquele bloqueio;
3. tentam um desvio lateral curto;
4. voltam para o caminho original assim que existe espaço.

Os principais pontos de ajuste estão no objeto `NPC_CONFIG` em `src/js/npc-system.js`:

- `tempoEsperaFilaMax`: tempo máximo no balcão/fila antes de desistir. Agora está em `40000` milissegundos.
- `tempoAntesDesvio`: quanto tempo o cliente espera antes de tentar contornar.
- `tempoMensagemLicenca`: quanto tempo espera antes de mostrar a fala.
- `multiplicadorPassoDesvio`: tamanho do passo lateral de desvio.

### Morcegos

Os morcegos agora usam opacidade maior e a direção foi corrigida:

- quando voam para a direita, o sprite é espelhado para olhar para a direita;
- quando voam para a esquerda, usam o sprite original;
- a opacidade gerada pelo JS agora fica mais alta.

Edite `BAT_CONFIG` em `src/js/bat-system.js` para alterar quantidade, intervalo, duração e escala.

## Observação sobre o pixel art dos morcegos

O `@keyframes batPixelSprite` tem centenas de coordenadas de `box-shadow`, porque cada sombra representa um pixel do sprite. Esse bloco foi preservado e comentado como sistema, mas as coordenadas individuais não devem ser comentadas uma por uma: mexer nelas manualmente sem visualizar pode deformar o desenho.

## Ajuste v24 - Rotas variadas dos clientes

Os clientes agora recebem um plano de rota individual em `criarPlanoRotaCliente()` dentro de `src/js/npc-system.js`. Esse plano muda o corredor, a aproximação da prateleira, o caminho para a fila e a saída, evitando que todos passem pelo mesmo pixel.

A v23 usava separação local por empurrão entre NPCs. Isso foi removido porque causava tremedeira quando dois clientes encostavam. Agora, quando um cliente é bloqueado, `criarDesvioEstavelCliente()` tenta criar um ponto intermediário fixo e seguro, respeitando colisões do mapa.

## v25 - Dicas sequenciais dos NPCs fixos

- O arquivo `src/js/static-npc-system.js` agora controla dicas por dia, por NPC e por etapa.
- Cada NPC fixo tem até 3 dicas por dia, com textos em `STATIC_NPC_DAILY_TIPS`.
- A primeira dica do dia começa liberada. Quando o jogador confirma a leitura, o marcador `!` some.
- A próxima dica é liberada por `agendarProximaDicaNpcEstatico()` após um intervalo aleatório entre `STATIC_NPC_TIP_UNLOCK_MIN_MS` e `STATIC_NPC_TIP_UNLOCK_MAX_MS`.
- O popup só aparece quando `npcEstaticoTemDicaDisponivel(npc)` retorna verdadeiro.
- O progresso de leitura fica em `gameState.staticNpcTips`; saves antigos são migrados em `src/js/storage.js`.
- Ao iniciar novo dia, `iniciarNovoDia()` chama `resetarDicasNPCsEstaticosDoDia()` para trocar o conjunto de dicas.

## v25 - Revisão das rotas dos clientes

- `criarPlanoRotaCliente()` ganhou mais faixas de corredor para reduzir clientes usando o mesmo pixel.
- `replanejarRotaCompletaCliente()` troca o caminho inteiro quando o cliente fica preso por tempo demais, sem empurrar NPCs entre si.
- A correção evita a vibração da v23: ninguém recebe força de afastamento; o NPC apenas escolhe outra rota estável.

## v26 - Navegação dos clientes via Tiled

A camada `npc_zones` do mapa agora é lida por `registrarZonasNPC()` em `src/js/npc-system.js`.

- `buy_*`: cria uma zona de compra. Exemplo: `buy_breads`, `buy_cheese`, `buy_meat`, `buy_fruits`, `buy_potions`, `buy_candles`, `buy_spices`.
- `queue_*`: cria pontos de fila, atualmente `queue_checkout`.
- `lane_*`: cria corredores seguros para variar as rotas, como `lane_cima`, `lane_meio` e `lane_baixo`.

Cada retângulo `buy_*` é dividido em vários pontos internos. Quando um cliente nasce, ele escolhe uma zona compatível com suas preferências e reserva um desses pontos. Isso evita que vários clientes tentem parar no mesmo pixel.

Cliente contra cliente não é mais colisão dura durante caminhada. Eles continuam respeitando paredes, balcões, prateleiras, player, NPCs fixos e ajudante. A organização entre clientes agora é feita por reserva de ponto de compra, fila gerada pelo Tiled e corredores variados.

## v28 - door_entry, destravamento e NPCs estáticos aleatórios

- `door_entry` na camada `npc_zones` agora é a única área de nascimento e desaparecimento dos clientes móveis.
- Se um cliente ficar mais de 3 segundos preso em “Procurando caminho”, ele é reposicionado aleatoriamente dentro do `door_entry` e recebe uma nova rota.
- Clientes móveis não colidem mais com NPCs estáticos; isso evita que tutores/dicas bloqueiem rotas de compra e fila.
- O jogador ainda colide com NPCs estáticos, então eles continuam parecendo personagens físicos para o player.
- NPCs estáticos trocam de posição aleatoriamente em quatro momentos: primeiro carregamento, novo dia, carregamento do mapa e missão concluída com sucesso.
- As posições aleatórias dos NPCs estáticos preferem objetos `lane_*` do Tiled, evitando `buy_*`, `queue_*` e a região do `door_entry`.

## v29 - Ajuste de fluxo dos clientes

O arquivo `src/js/npc-system.js` agora contém um bloco de pathfinding A* leve. Ele transforma os pontos gerais do Tiled (`buy_*`, `queue_checkout`, `lane_*` e `door_entry`) em trechos navegáveis que respeitam `window.objetosColisao`.

Pontos principais para editar:

- `NPC_CONFIG.velocidadeMin` e `NPC_CONFIG.velocidadeMax`: controlam a velocidade visual dos clientes.
- `NPC_CONFIG.tempoEscolhendoMin` e `NPC_CONFIG.tempoEscolhendoMax`: controlam quanto tempo o cliente fica na prateleira antes de ir ao caixa.
- `NPC_CONFIG.tempoMaxAtePrateleira`: limite de segurança antes do cliente ser colocado no ponto de compra se travar muito.
- `NPC_CONFIG.tempoMaxAteFila`: limite de segurança antes do cliente ser colocado na fila se travar indo ao caixa.
- `NPC_CONFIG.tamanhoCelulaPathfinding`: tamanho da grade usada pelo A*. Valores menores desviam melhor, mas custam mais processamento.

A regra de fallback para fila existe para preservar o ritmo do caixa: se uma rota ficar ruim por causa de colisão ou desenho de lane, o cliente não reinicia o trajeto pela porta; ele entra na fila e o jogo continua andando.


## v30 - Morcegos mais visíveis
- Morcegos ampliados no `src/js/bat-system.js` via `BAT_CONFIG.escalaMin/escalaMax`.
- Opacidade dos voos travada em 100% (`--bat-opacity: 1`).
- Sprite CSS escurecido no `src/css/game.css` para deixar corpo e contorno bem escuros.
- Cache dos arquivos atualizado para `?v=30`.


## v32 - Corrida por missão

- A missão única "Passo apressado" libera a corrida do gerente.
- Depois de concluir a missão, segure Shift enquanto usa WASD/setas para correr.
- Ajuste a força do sprint em `PLAYER_SPRINT_MULTIPLIER` dentro de `src/js/main.js`.
- O desbloqueio fica salvo em `gameState.sprintDesbloqueado`.


## v32 - Preparação com tempo real

- A preparação agora dura 2 minutos e 30 segundos reais.
- O jogador ainda pode iniciar o expediente antes pelo botão “Iniciar agora”.
- Quando o tempo acaba, uma janela avisa que o expediente vai começar e abre automaticamente após poucos segundos.
- Para editar a duração, ajuste `duracaoPreparacaoMs` em `src/js/gameState.js`; para editar a janela, ajuste `PREP_START_MODAL_MS` em `src/js/ui.js`.
