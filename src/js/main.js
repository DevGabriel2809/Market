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

  telas.forEach((item) => {
    item.classList.remove("active");
  });

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
// SELECIONAR GERENTE
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
// MOVIMENTAÇÃO DO GERENTE
// ===============================

// ===============================
// MOVIMENTAÇÃO DO GERENTE
// ===============================

const marketScene = document.getElementById("market-scene");
const player = document.getElementById("player-character");

let playerX = 120;
let playerY = 260;
let playerSpeed = 4;

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

function aplicarAnimacaoParado() {
  player.classList.remove(
    "manager-male-walk",
    "manager-female-walk"
  );

  if (personagemSelecionado === "male") {
    player.classList.add("manager-male-idle");
  } else {
    player.classList.add("manager-female-idle");
  }
}

function aplicarAnimacaoAndando() {
  player.classList.remove(
    "manager-male-idle",
    "manager-female-idle"
  );

  if (personagemSelecionado === "male") {
    player.classList.add("manager-male-walk");
  } else {
    player.classList.add("manager-female-walk");
  }
}

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

function moverPersonagem() {
  const sceneWidth = marketScene.clientWidth;
  const sceneHeight = marketScene.clientHeight;

  const playerWidth = 128;
  const playerHeight = 128;

  let moving = false;

  if (keysPressed.ArrowUp || keysPressed.w) {
    playerY -= playerSpeed;
    moving = true;
  }

  if (keysPressed.ArrowDown || keysPressed.s) {
    playerY += playerSpeed;
    moving = true;
  }

  if (keysPressed.ArrowLeft || keysPressed.a) {
    playerX -= playerSpeed;
    player.style.transform = "scale(1.15) scaleX(-1)";
    moving = true;
  }

  if (keysPressed.ArrowRight || keysPressed.d) {
    playerX += playerSpeed;
    player.style.transform = "scale(1.15) scaleX(1)";
    moving = true;
  }

  if (playerX < 0) playerX = 0;
  if (playerY < 0) playerY = 0;

  if (playerX > sceneWidth - playerWidth) {
    playerX = sceneWidth - playerWidth;
  }

  if (playerY > sceneHeight - playerHeight) {
    playerY = sceneHeight - playerHeight;
  }

  player.style.left = `${playerX}px`;
  player.style.top = `${playerY}px`;

  if (moving) {
    aplicarAnimacaoAndando();
  } else {
    aplicarAnimacaoParado();
  }

  requestAnimationFrame(moverPersonagem);
}

moverPersonagem();