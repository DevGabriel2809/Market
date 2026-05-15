// ======================================================
// 1. ELEMENTOS DAS TELAS
// ======================================================

const telaMenu = document.getElementById("tela-menu");
const telaComoJogar = document.getElementById("tela-como-jogar");
const telaCreditos = document.getElementById("tela-creditos");
const telaJogo = document.getElementById("tela-jogo");

const btnIniciar = document.getElementById("btn-iniciar");
const btnComoJogar = document.getElementById("btn-como-jogar");
const btnCreditos = document.getElementById("btn-creditos");
const btnVoltarMenu = document.querySelectorAll(".btn-voltar-menu");

const inputNome = document.getElementById("player-name");
const erroNome = document.getElementById("name-error");
const tituloJogo = document.getElementById("titulo-jogo");


// ======================================================
// 2. ELEMENTOS DO MAPA E DO PLAYER
// ======================================================

const world = document.getElementById("world");
const playerElement = document.getElementById("player-character");
const mapElement = document.getElementById("map");

// Overlay opcional de decoração acima do player
const foregroundWorld = document.getElementById("foreground-world");
const mapOverlayElement = document.getElementById("map-overlay");


// ======================================================
// 3. CONFIGURAÇÕES INICIAIS DO PLAYER
// ======================================================

let playerX = 600;
let playerY = 400;
let speed = 4.5;

let ultimaDirecao = "down";
let personagemSelecionado = gameState.personagem || "male";

let animacaoAtual = "";
let transformAtual = "";

// Escala visual do personagem.
// Como o sprite tem 128px de altura, 128 * 0.56 ≈ 72px.
const PLAYER_SCALE = 0.86;

// Hitbox real do player.
// O ponto principal do personagem continua sendo o "pé".
window.player = {
  get x() { return playerX - 18; },
  get y() { return playerY - 12; },
  set x(valor) { playerX = valor + 18; },
  set y(valor) { playerY = valor + 12; },
  width: 36,
  height: 24
};


// ======================================================
// 4. CONFIGURAÇÕES DO MAPA
// ======================================================

let mapWidth = 2240;
let mapHeight = 1760;

window.mapaObjetos = [];
window.objetosInteracao = [];
window.objetosChao = [];
window.objetosColisao = [];


// ======================================================
// 5. CONTROLE DE TELAS
// ======================================================

function mostrarTela(tela) {
  document.querySelectorAll(".screen").forEach((item) => {
    item.classList.remove("active");
  });

  tela.classList.add("active");
}

btnIniciar.addEventListener("click", () => {
  const nome = inputNome.value.trim();

  if (nome === "") {
    erroNome.style.display = "block";
    inputNome.focus();
    return;
  }

  erroNome.style.display = "none";
  resetarPartida(nome, personagemSelecionado);
  resetarPosicaoPersonagem();

  if (tituloJogo) {
    tituloJogo.textContent = `Mercado de ${nome}`;
  }

  if (typeof atualizarInterfaceJogo === "function") {
    atualizarInterfaceJogo();
  }

  mostrarTela(telaJogo);
});

btnComoJogar.addEventListener("click", () => {
  mostrarTela(telaComoJogar);
});

btnCreditos.addEventListener("click", () => {
  mostrarTela(telaCreditos);
});

btnVoltarMenu.forEach((botao) => {
  botao.addEventListener("click", () => {
    mostrarTela(telaMenu);
  });
});

inputNome.addEventListener("input", () => {
  if (inputNome.value.trim() !== "") {
    erroNome.style.display = "none";
  }
});


// ======================================================
// 6. PAINÉIS LATERAIS / HUD
// ======================================================

const btnFinanceToggle = document.getElementById("btn-finance-toggle");
const btnActionsToggle = document.getElementById("btn-actions-toggle");

const financePanel = document.querySelector(".finance-panel");
const actionsPanel = document.querySelector(".actions-panel");

if (btnFinanceToggle && financePanel) {
  btnFinanceToggle.addEventListener("click", () => {
    financePanel.classList.toggle("open");
  });
}

if (btnActionsToggle && actionsPanel) {
  btnActionsToggle.addEventListener("click", () => {
    actionsPanel.classList.toggle("open");
  });
}


// ======================================================
// 7. SELEÇÃO DE PERSONAGEM
// ======================================================

const botoesPersonagem = document.querySelectorAll(".character-option");

botoesPersonagem.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesPersonagem.forEach((item) => item.classList.remove("selected"));

    botao.classList.add("selected");
    personagemSelecionado = botao.dataset.character;
    gameState.personagem = personagemSelecionado;

    ultimaDirecao = "down";

    // Força atualizar sprite ao trocar personagem
    animacaoAtual = "";
    transformAtual = "";

    aplicarAnimacaoParado();
  });
});


// ======================================================
// 8. TECLAS PRESSIONADAS
// ======================================================

const keysPressed = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  w: false,
  a: false,
  s: false,
  d: false
};

document.addEventListener("keydown", (event) => {
  if (event.key in keysPressed) {
    keysPressed[event.key] = true;
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key in keysPressed) {
    keysPressed[event.key] = false;
  }
});


// ======================================================
// 9. TRANSFORMAÇÃO VISUAL DO PERSONAGEM
// ======================================================

function definirTransform(transform) {
  if (transformAtual === transform) return;

  playerElement.style.transform = transform;
  transformAtual = transform;
}

function aplicarTransformPadrao() {
  definirTransform(`translate(-50%, -100%) scale(${PLAYER_SCALE})`);
}

function aplicarTransformLado(direcao) {
  if (direcao === "left") {
    definirTransform(`translate(-50%, -100%) scale(${PLAYER_SCALE}) scaleX(-1)`);
    return;
  }

  definirTransform(`translate(-50%, -100%) scale(${PLAYER_SCALE}) scaleX(1)`);
}


// ======================================================
// 10. ANIMAÇÕES DO PERSONAGEM
// ======================================================

function definirAnimacao(classe) {
  if (animacaoAtual === classe) return;

  playerElement.className = "sprite-game";
  playerElement.classList.add(classe);

  animacaoAtual = classe;
}

function aplicarAnimacaoParado() {
  if (personagemSelecionado === "male") {
    if (ultimaDirecao === "up") {
      definirAnimacao("manager-male-idle-back");
      aplicarTransformPadrao();
      return;
    }

    if (ultimaDirecao === "down") {
      definirAnimacao("manager-male-idle-front");
      aplicarTransformPadrao();
      return;
    }

    if (ultimaDirecao === "left") {
      definirAnimacao("manager-male-idle-side");
      aplicarTransformLado("left");
      return;
    }

    definirAnimacao("manager-male-idle-side");
    aplicarTransformLado("right");
    return;
  }

  if (personagemSelecionado === "female") {
    if (ultimaDirecao === "up") {
      definirAnimacao("manager-female-idle-back");
      aplicarTransformPadrao();
      return;
    }

    if (ultimaDirecao === "down") {
      definirAnimacao("manager-female-idle-front");
      aplicarTransformPadrao();
      return;
    }

    if (ultimaDirecao === "left") {
      definirAnimacao("manager-female-idle-side");
      aplicarTransformLado("left");
      return;
    }

    definirAnimacao("manager-female-idle-side");
    aplicarTransformLado("right");
  }
}

function aplicarAnimacaoAndando(direcao) {
  if (personagemSelecionado === "male") {
    if (direcao === "up") {
      definirAnimacao("manager-male-walk-back");
      aplicarTransformPadrao();
      return;
    }

    if (direcao === "down") {
      definirAnimacao("manager-male-walk-front");
      aplicarTransformPadrao();
      return;
    }

    if (direcao === "left") {
      definirAnimacao("manager-male-walk-side");
      aplicarTransformLado("left");
      return;
    }

    definirAnimacao("manager-male-walk-side");
    aplicarTransformLado("right");
    return;
  }

  if (personagemSelecionado === "female") {
    if (direcao === "up") {
      definirAnimacao("manager-female-walk-back");
      aplicarTransformPadrao();
      return;
    }

    if (direcao === "down") {
      definirAnimacao("manager-female-walk-front");
      aplicarTransformPadrao();
      return;
    }

    if (direcao === "left") {
      definirAnimacao("manager-female-walk-side");
      aplicarTransformLado("left");
      return;
    }

    definirAnimacao("manager-female-walk-side");
    aplicarTransformLado("right");
  }
}


// ======================================================
// 11. COLISÃO
// ======================================================

function retangulosColidem(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function temColisao(x, y) {
  const playerBox = {
    x: x - 18,
    y: y - 12,
    width: window.player.width,
    height: window.player.height
  };

  return window.objetosColisao.some((obj) => {
    return retangulosColidem(playerBox, obj);
  });
}


// ======================================================
// 12. MOVIMENTO DO PERSONAGEM
// ======================================================

function moverPersonagem(deltaTime = 16) {
  if (!telaJogo.classList.contains("active")) {
    return;
  }

  if (typeof modalEstaAberto === "function" && modalEstaAberto()) {
    aplicarAnimacaoParado();
    return;
  }

  let moving = false;
  let direcaoMovimento = null;

  let novoX = playerX;
  let novoY = playerY;

  const cima = keysPressed.ArrowUp || keysPressed.w;
  const baixo = keysPressed.ArrowDown || keysPressed.s;
  const esquerda = keysPressed.ArrowLeft || keysPressed.a;
  const direita = keysPressed.ArrowRight || keysPressed.d;

  // CIMA
  if (cima) {
    novoY -= speed;
    moving = true;
    direcaoMovimento = "up";
    ultimaDirecao = "up";
  }

  // BAIXO
  if (baixo) {
    novoY += speed;
    moving = true;
    direcaoMovimento = "down";
    ultimaDirecao = "down";
  }

  // ESQUERDA
  if (esquerda) {
    novoX -= speed;
    moving = true;
    direcaoMovimento = "left";
    ultimaDirecao = "left";
  }

  // DIREITA
  if (direita) {
    novoX += speed;
    moving = true;
    direcaoMovimento = "right";
    ultimaDirecao = "right";
  }

  // Se andar na diagonal, prioriza visual lateral
  if (moving && esquerda) {
    direcaoMovimento = "left";
    ultimaDirecao = "left";
  }

  if (moving && direita) {
    direcaoMovimento = "right";
    ultimaDirecao = "right";
  }

  // Aplica colisão separada por eixo
  if (!temColisao(novoX, playerY)) {
    playerX = novoX;
  }

  if (!temColisao(playerX, novoY)) {
    playerY = novoY;
  }

  // Limites do mapa
  if (playerX < 0) playerX = 0;
  if (playerY < 0) playerY = 0;

  if (playerX > mapWidth - window.player.width) {
    playerX = mapWidth - window.player.width;
  }

  if (playerY > mapHeight - window.player.height) {
    playerY = mapHeight - window.player.height;
  }

  atualizarCamera();

  if (moving) {
    aplicarAnimacaoAndando(direcaoMovimento);

    if (typeof atualizarSomPasso === "function") {
      atualizarSomPasso(deltaTime);
    }
  } else {
    aplicarAnimacaoParado();
  }
}


// ======================================================
// 13. CÂMERA
// ======================================================

function atualizarCamera() {
  const offsetX = window.innerWidth / 2 - playerX;
  const offsetY = window.innerHeight / 2 - playerY;

  const cameraTransform = `translate(${offsetX}px, ${offsetY}px)`;

  world.style.transform = cameraTransform;

  if (foregroundWorld) {
    foregroundWorld.style.transform = cameraTransform;
  }
}


// ======================================================
// 14. CARREGAR MAPA JSON DO TILED
// ======================================================

function carregarMapa() {
  fetch("src/assets/maps/mapa.json")
    .then((res) => res.json())
    .then((data) => {
      mapWidth = data.width * data.tilewidth;
      mapHeight = data.height * data.tileheight;

      if (mapElement) {
        mapElement.style.width = `${mapWidth}px`;
        mapElement.style.height = `${mapHeight}px`;
      }

      if (mapOverlayElement) {
        mapOverlayElement.style.width = `${mapWidth}px`;
        mapOverlayElement.style.height = `${mapHeight}px`;
      }

      data.layers.forEach((layer) => {
        if (layer.name === "interacao") {
          window.objetosInteracao = layer.objects || [];
        }

        if (layer.name === "som") {
          window.objetosChao = layer.objects || [];
        }

        if (layer.name === "colisao") {
          window.objetosColisao = layer.objects || [];
        }

        if (layer.type === "objectgroup") {
          window.mapaObjetos.push(...(layer.objects || []));
        }
      });

      // Objetos de interação também bloqueiam passagem,
      // exceto portas, porque o player precisa encostar nelas.
      const interacoesQueBloqueiam = window.objetosInteracao.filter((obj) => {
        return obj.name !== "porta_balcao" && obj.name !== "porta_saida";
      });

      window.objetosColisao = [
        ...window.objetosColisao,
        ...interacoesQueBloqueiam
      ];

      console.log("Mapa carregado:", {
        interacao: window.objetosInteracao,
        som: window.objetosChao,
        colisao: window.objetosColisao,
        todos: window.mapaObjetos
      });
    })
    .catch((erro) => {
      console.error("Erro ao carregar mapa:", erro);
    });
}


// ======================================================
// 15. LOOP PRINCIPAL DO JOGO
// ======================================================

let ultimoTempo = performance.now();

function gameLoop(tempoAtual) {
  const deltaTime = tempoAtual - ultimoTempo;
  ultimoTempo = tempoAtual;

  moverPersonagem(deltaTime);

  if (telaJogo.classList.contains("active") && typeof processarInteracaoAutomatica === "function") {
    processarInteracaoAutomatica();
  }

  requestAnimationFrame(gameLoop);
}

function aplicarPersonagemSalvo() {
  personagemSelecionado = gameState.personagem || "male";
  ultimaDirecao = "down";
  animacaoAtual = "";
  transformAtual = "";

  botoesPersonagem.forEach((botao) => {
    botao.classList.toggle("selected", botao.dataset.character === personagemSelecionado);
  });

  aplicarAnimacaoParado();
}

function resetarPosicaoPersonagem() {
  playerX = 600;
  playerY = 400;
  ultimaDirecao = "down";
  animacaoAtual = "";
  transformAtual = "";

  if (typeof ultimaInteracaoAutomatica !== "undefined") {
    ultimaInteracaoAutomatica = null;
  }

  aplicarAnimacaoParado();
  atualizarCamera();
}


// ======================================================
// 16. INICIAR JOGO
// ======================================================

carregarMapa();
aplicarPersonagemSalvo();
aplicarAnimacaoParado();
if (typeof atualizarInterfaceJogo === "function") {
  atualizarInterfaceJogo();
}
requestAnimationFrame(gameLoop);
