// ===============================
// SELEÇÃO DE TELAS
// ===============================

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

function mostrarTela(tela) {
  const telas = document.querySelectorAll(".screen");
  telas.forEach((item) => item.classList.remove("active"));
  tela.classList.add("active");
}

// ===============================
// BOTÃO INICIAR COM NOME
// ===============================

btnIniciar.addEventListener("click", () => {
  const nome = inputNome.value.trim();

  if (nome === "") {
    erroNome.style.display = "block";
    inputNome.focus();
    return;
  }

  erroNome.style.display = "none";
  gameState.nomeJogador = nome;

  tituloJogo.textContent = `Mercado de ${nome}`;

  mostrarTela(telaJogo);
});

// ===============================
// BOTÕES DO MENU
// ===============================

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

// ===============================
// MENUS RECOLHÍVEIS
// ===============================

const btnFinanceToggle = document.getElementById("btn-finance-toggle");
const btnActionsToggle = document.getElementById("btn-actions-toggle");

const financePanel = document.querySelector(".finance-panel");
const actionsPanel = document.querySelector(".actions-panel");

btnFinanceToggle.addEventListener("click", () => {
  financePanel.classList.toggle("open");
});

btnActionsToggle.addEventListener("click", () => {
  actionsPanel.classList.toggle("open");
});

// ===============================
// SELEÇÃO DE PERSONAGEM
// ===============================

const botoesPersonagem = document.querySelectorAll(".character-option");
const personagemJogo = document.getElementById("player-character");

let personagemSelecionado = "male";

botoesPersonagem.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesPersonagem.forEach((item) => item.classList.remove("selected"));

    botao.classList.add("selected");
    personagemSelecionado = botao.dataset.character;

    personagemJogo.classList.remove("manager-male-idle", "manager-female-idle");

    if (personagemSelecionado === "male") {
      personagemJogo.classList.add("manager-male-idle");
    } else {
      personagemJogo.classList.add("manager-female-idle");
    }
  });
});

// ===============================
// MOVIMENTAÇÃO + CÂMERA
// ===============================

const world = document.getElementById("world");
const player = document.getElementById("player-character");

let playerX = 600;
let playerY = 400;
let speed = 4;

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

// INPUT TECLADO

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

// ANIMAÇÕES

function aplicarAnimacaoParado() {
  player.classList.remove("manager-male-walk", "manager-female-walk");

  if (personagemSelecionado === "male") {
    player.classList.add("manager-male-idle");
  } else {
    player.classList.add("manager-female-idle");
  }
}

function aplicarAnimacaoAndando() {
  player.classList.remove("manager-male-idle", "manager-female-idle");

  if (personagemSelecionado === "male") {
    player.classList.add("manager-male-walk");
  } else {
    player.classList.add("manager-female-walk");
  }
}

// LOOP PRINCIPAL

function moverPersonagem() {
  let moving = false;

  if (keysPressed.ArrowUp || keysPressed.w) {
    playerY -= speed;
    moving = true;
  }

  if (keysPressed.ArrowDown || keysPressed.s) {
    playerY += speed;
    moving = true;
  }

  if (keysPressed.ArrowLeft || keysPressed.a) {
    playerX -= speed;
    player.style.transform = "translate(-50%, -50%) scale(1.05) scaleX(-1)";
    moving = true;
  }

  if (keysPressed.ArrowRight || keysPressed.d) {
    playerX += speed;
    player.style.transform = "translate(-50%, -50%) scale(1.05) scaleX(1)";
    moving = true;
  }

  // limites do mapa
  const mapWidth = 1400;
  const mapHeight = 800;

  if (playerX < 0) playerX = 0;
  if (playerY < 0) playerY = 0;
  if (playerX > mapWidth) playerX = mapWidth;
  if (playerY > mapHeight) playerY = mapHeight;

  // câmera
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  const offsetX = screenWidth / 2 - playerX;
  const offsetY = screenHeight / 2 - playerY;

  world.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

  // animação
  if (moving) {
    aplicarAnimacaoAndando();
  } else {
    aplicarAnimacaoParado();
  }

  requestAnimationFrame(moverPersonagem);
}

// START
moverPersonagem();