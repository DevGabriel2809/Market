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

const world = document.getElementById("world");
const playerElement = document.getElementById("player-character");
const mapElement = document.getElementById("map");

let playerX = 600;
let playerY = 400;
let speed = 4.5;

let mapWidth = 2240;
let mapHeight = 1760;


window.player = {
  get x() { return playerX - 18; },
  get y() { return playerY - 12; },
  set x(valor) { playerX = valor + 18; },
  set y(valor) { playerY = valor + 12; },
  width: 36,
  height: 24
};

window.mapaObjetos = [];
window.objetosInteracao = [];
window.objetosChao = [];
window.objetosColisao = [];

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
  gameState.nomeJogador = nome;

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

const botoesPersonagem = document.querySelectorAll(".character-option");

let personagemSelecionado = "male";

botoesPersonagem.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesPersonagem.forEach((item) => item.classList.remove("selected"));

    botao.classList.add("selected");
    personagemSelecionado = botao.dataset.character;

    playerElement.classList.remove("manager-male-idle", "manager-female-idle");

    if (personagemSelecionado === "male") {
      playerElement.classList.add("manager-male-idle");
    } else {
      playerElement.classList.add("manager-female-idle");
    }
  });
});

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

function aplicarAnimacaoParado() {
  playerElement.classList.remove("manager-male-walk", "manager-female-walk");

  if (personagemSelecionado === "male") {
    playerElement.classList.add("manager-male-idle");
  } else {
    playerElement.classList.add("manager-female-idle");
  }
}

function aplicarAnimacaoAndando() {
  playerElement.classList.remove("manager-male-idle", "manager-female-idle");

  if (personagemSelecionado === "male") {
    playerElement.classList.add("manager-male-walk");
  } else {
    playerElement.classList.add("manager-female-walk");
  }
}

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

function moverPersonagem(deltaTime = 16) {
  let moving = false;

  let novoX = playerX;
  let novoY = playerY;

  if (keysPressed.ArrowUp || keysPressed.w) {
    novoY -= speed;
    moving = true;
  }

  if (keysPressed.ArrowDown || keysPressed.s) {
    novoY += speed;
    moving = true;
  }

  if (keysPressed.ArrowLeft || keysPressed.a) {
    novoX -= speed;
    playerElement.style.transform = "translate(-50%, -100%) scale(1.05) scaleX(-1)";
    moving = true;
  }

  if (keysPressed.ArrowRight || keysPressed.d) {
    novoX += speed;
    playerElement.style.transform = "translate(-50%, -100%) scale(1.05) scaleX(1)";
    moving = true;
  }

  if (!temColisao(novoX, playerY)) {
    playerX = novoX;
  }

  if (!temColisao(playerX, novoY)) {
    playerY = novoY;
  }

  if (playerX < 0) playerX = 0;
  if (playerY < 0) playerY = 0;
  if (playerX > mapWidth - window.player.width) playerX = mapWidth - window.player.width;
  if (playerY > mapHeight - window.player.height) playerY = mapHeight - window.player.height;

  const offsetX = window.innerWidth / 2 - playerX;
  const offsetY = window.innerHeight / 2 - playerY;

  world.style.transform = `translate(${offsetX}px, ${offsetY}px)`;

  if (moving) {
    aplicarAnimacaoAndando();

    if (typeof atualizarSomPasso === "function") {
      atualizarSomPasso(deltaTime);
    }
  } else {
    aplicarAnimacaoParado();
  }
}

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

      // objetos de interação também bloqueiam passagem,
      // exceto portas, porque o player precisa encostar/interagir nelas
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

let ultimoTempo = performance.now();

function gameLoop(tempoAtual) {
  const deltaTime = tempoAtual - ultimoTempo;
  ultimoTempo = tempoAtual;

  moverPersonagem(deltaTime);

  requestAnimationFrame(gameLoop);
}

carregarMapa();
requestAnimationFrame(gameLoop);