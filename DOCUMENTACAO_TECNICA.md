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
