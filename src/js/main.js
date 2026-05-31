// ======================================================
// DOCUMENTAÇÃO DO ARQUIVO: main.js
// ======================================================
// Controla o fluxo central do jogo: troca de telas, seleção do personagem, movimento, câmera e loop principal.
// Ajustes comuns:
// - PLAYER_SCALE_* muda o tamanho visual do gerente por tipo de tela.
// - speed muda a velocidade base do player.
// - PLAYER_SPRINT_MULTIPLIER controla o bônus quando a corrida com Ctrl é desbloqueada.
// - temColisao(...) decide o que bloqueia passagem; agora inclui mapa + NPCs + ajudante.
// - gameLoop(...) chama os sistemas que precisam atualizar a cada frame.
// ======================================================

// ======================================================
// 1. ELEMENTOS DAS TELAS
// ======================================================

const telaMenu = document.getElementById("tela-menu");
const telaComoJogar = document.getElementById("tela-como-jogar");
const telaCreditos = document.getElementById("tela-creditos");
const telaJogo = document.getElementById("tela-jogo");

const btnIniciar = document.getElementById("btn-iniciar");
const btnDemo = document.getElementById("btn-demo");
const btnComoJogar = document.getElementById("btn-como-jogar");
const btnCreditos = document.getElementById("btn-creditos");
const btnVoltarMenu = document.querySelectorAll(".btn-voltar-menu");

const inputNome = document.getElementById("player-name");
const erroNome = document.getElementById("name-error");
const tituloJogo = document.getElementById("titulo-jogo");
const introOverlay = document.getElementById("intro-overlay");
const introSkip = document.getElementById("intro-skip");
const introModeLabel = document.getElementById("intro-mode-label");
const introTitle = document.getElementById("intro-title");
const introSubtitle = document.getElementById("intro-subtitle");
const introRunner = document.querySelector(".intro-runner");


// ======================================================
// 2. ELEMENTOS DO MAPA E DO PLAYER
// ======================================================

const world = document.getElementById("world");
const playerElement = document.getElementById("player-character");
const playerShadow = document.getElementById("player-shadow");
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

// Multiplicador aplicado quando o jogador segura Ctrl após concluir a missão "Passo apressado".
// Aumente para sprint mais forte ou reduza para uma corrida mais sutil.
const PLAYER_SPRINT_MULTIPLIER = 1.65;
const PLAYER_FRAME_PADRAO_MS = 1000 / 60;
const PLAYER_FRAME_MAX_MULTIPLIER = 1.35;

let ultimaDirecao = "down";
let personagemSelecionado = gameState.personagem || "male";

let animacaoAtual = "";
let transformAtual = "";

// Escala visual do personagem por tipo de tela.
// Como o sprite tem 128px de altura, 128 * 0.56 ≈ 72px.
const PLAYER_SCALE_DESKTOP = 0.86;
const PLAYER_SCALE_TABLET = 0.78;
const PLAYER_SCALE_MOBILE = 0.68;

function calcularZIndexProfundidadeMapa(y, ajuste = 0) {
  return String(1000 + Math.round(Number(y) || 0) + ajuste);
}

window.calcularZIndexProfundidadeMapa = calcularZIndexProfundidadeMapa;

function garantirPlayerNaCamadaDoMundo() {
  if (!world || !playerElement) return;
  if (playerShadow && playerShadow.parentElement !== world) {
    world.appendChild(playerShadow);
  }
  if (playerElement.parentElement !== world) {
    world.appendChild(playerElement);
  }
}

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

function viewportUsaLayoutMovel() {
  return window.matchMedia("(max-width: 760px), (max-width: 1180px) and (max-height: 540px), (pointer: coarse) and (max-width: 1180px)").matches;
}

function obterEscalaPlayer() {
  if (window.innerWidth <= 480 || viewportUsaLayoutMovel()) return PLAYER_SCALE_MOBILE;
  if (window.innerWidth <= 1000 || window.innerHeight <= 620) return PLAYER_SCALE_TABLET;
  return PLAYER_SCALE_DESKTOP;
}

function obterZoomCamera() {
  if (window.innerWidth <= 430) return 0.72;
  if (window.innerWidth <= 760 || window.innerHeight <= 540 || viewportUsaLayoutMovel()) return 0.78;
  if (window.innerWidth <= 1000) return 0.88;
  return 1;
}

function obterEscalaPlayerNoMundo() {
  return obterEscalaPlayer() / Math.max(0.1, obterZoomCamera());
}

function limitarOffsetCamera(offset, tamanhoViewport, tamanhoMundo, zoomCamera) {
  const tamanhoEscalado = tamanhoMundo * zoomCamera;

  if (tamanhoEscalado <= tamanhoViewport) {
    return (tamanhoViewport - tamanhoEscalado) / 2;
  }

  return Math.min(0, Math.max(tamanhoViewport - tamanhoEscalado, offset));
}

function appEstaEmModoInstalado() {
  return Boolean(
    window.navigator.standalone
    || window.matchMedia("(display-mode: standalone)").matches
    || window.matchMedia("(display-mode: fullscreen)").matches
  );
}

function tentarModoImersivo() {
  if (!viewportUsaLayoutMovel() || appEstaEmModoInstalado()) return;

  const root = document.documentElement;
  const pedirTelaCheia = root.requestFullscreen
    || root.webkitRequestFullscreen
    || root.msRequestFullscreen;

  if (pedirTelaCheia && !document.fullscreenElement && !document.webkitFullscreenElement) {
    Promise.resolve(pedirTelaCheia.call(root)).catch(() => {});
  }

  window.setTimeout(() => {
    window.scrollTo(0, 1);
  }, 80);
}


// ======================================================
// 4. CONFIGURAÇÕES DO MAPA
// ======================================================

let mapWidth = 2240;
let mapHeight = 1760;

window.mapaObjetos = [];
window.objetosInteracao = [];
window.objetosChao = [];
window.objetosColisao = [];
window.objetosNpcZones = [];


// ======================================================
// 5. CONTROLE DE TELAS
// ======================================================

/**
 * @doc-func mostrarTela
 * O que faz: exibe feedback visual para o jogador; ajuste mensagens, telas ou animações aqui.
 * Parâmetros: tela.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function mostrarTela(tela) {
  // Remove a tela atual e ativa somente a tela solicitada.
  // Como .screen usa display flex/none, essa função é o ponto único para navegação.
  document.querySelectorAll(".screen").forEach((item) => {
    item.classList.remove("active");
  });

  tela.classList.add("active");

  if (typeof trocarContextoMusical === "function") {
    trocarContextoMusical(tela === telaJogo ? "game" : "menu");
  }

  // Mantém a camada de morcegos no z-index correto para menu ou mapa.
  if (typeof sincronizarCamadaMorcegos === "function") {
    sincronizarCamadaMorcegos();
  }

  if (tela !== telaJogo && typeof limparMovimentoVirtual === "function") {
    limparMovimentoVirtual();
  }
}

let introTimeoutId = null;
let introAoConcluir = null;

function concluirIntroInicio() {
  if (!introOverlay || !introAoConcluir) return;

  window.clearTimeout(introTimeoutId);
  introTimeoutId = null;
  introOverlay.classList.add("ending");

  const aoConcluir = introAoConcluir;
  introAoConcluir = null;

  window.setTimeout(() => {
    introOverlay.classList.add("hidden");
    introOverlay.classList.remove("playing", "ending");
    document.body.classList.remove("intro-active");
    aoConcluir();
  }, 360);
}

function exibirIntroInicio({ nome, modoJogo, aoConcluir }) {
  if (!introOverlay) {
    aoConcluir();
    return;
  }

  window.clearTimeout(introTimeoutId);
  introAoConcluir = aoConcluir;

  if (introModeLabel) {
    introModeLabel.textContent = modoJogo === "demo" ? "Demo de 7 dias" : "Campanha de 30 dias";
  }

  if (introTitle) {
    introTitle.textContent = `${nome}, as portas se abrem`;
  }

  if (introSubtitle) {
    introSubtitle.textContent = modoJogo === "demo"
      ? "Uma semana, poucas moedas e uma chance de provar que o balcao pode virar lenda."
      : "Trinta dias para transformar compras pequenas em um mercado respeitado por todo o reino.";
  }

  if (introRunner) {
    introRunner.className = "intro-runner";
    introRunner.classList.add(personagemSelecionado === "female" ? "manager-female-walk-side" : "manager-male-walk-side");
  }

  document.body.classList.add("intro-active");
  introOverlay.classList.remove("hidden", "ending");
  introOverlay.classList.add("playing");

  introTimeoutId = window.setTimeout(concluirIntroInicio, 5200);
}

function iniciarPartida(nome, modoJogo) {
  resetarPartida(nome, personagemSelecionado, modoJogo);
  resetarPosicaoPersonagem();

  if (tituloJogo) {
    tituloJogo.textContent = `Mercado de ${nome}`;
  }

  if (typeof atualizarInterfaceJogo === "function") {
    atualizarInterfaceJogo({ silenciarEstoqueBaixo: true });
  }

  mostrarTela(telaJogo);

  if (typeof dispararIntroMorcegos === "function") {
    dispararIntroMorcegos("game");
  }
}

function iniciarPartidaPeloMenu(modoJogo = "normal") {
  const nome = inputNome.value.trim();

  if (nome === "") {
    erroNome.style.display = "block";
    inputNome.focus();
    return;
  }

  erroNome.style.display = "none";
  tentarModoImersivo();
  exibirIntroInicio({
    nome,
    modoJogo,
    aoConcluir: () => iniciarPartida(nome, modoJogo)
  });
}

btnIniciar.addEventListener("click", () => iniciarPartidaPeloMenu("normal"));

if (btnDemo) {
  btnDemo.addEventListener("click", () => iniciarPartidaPeloMenu("demo"));
}

if (introSkip) {
  introSkip.addEventListener("click", concluirIntroInicio);
}

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
  d: false,
  Control: false
};

/**
 * @doc-func obterTeclaMovimento
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: event.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterTeclaMovimento(event) {
  if (!event || typeof event.key !== "string") return "";

  // Normaliza WASD para funcionar mesmo se o navegador enviar W/A/S/D maiúsculo.
  if (event.key.length === 1) return event.key.toLowerCase();

  // Ctrl vira a tecla da corrida depois que a missão certa é concluída.
  if (event.key === "Control") return "Control";

  return event.key;
}

function eventoVemDeCampoEditavel(event) {
  const alvo = event && event.target;
  if (!alvo) return false;

  const tag = alvo.tagName ? alvo.tagName.toLowerCase() : "";
  return tag === "input"
    || tag === "textarea"
    || tag === "select"
    || Boolean(alvo.isContentEditable);
}

document.addEventListener("keydown", (event) => {
  if (eventoVemDeCampoEditavel(event) || !telaJogo.classList.contains("active")) return;

  const tecla = obterTeclaMovimento(event);

  if (tecla in keysPressed) {
    keysPressed[tecla] = true;
    event.preventDefault();
  }
});

document.addEventListener("keyup", (event) => {
  if (eventoVemDeCampoEditavel(event) || !telaJogo.classList.contains("active")) return;

  const tecla = obterTeclaMovimento(event);

  if (tecla in keysPressed) {
    keysPressed[tecla] = false;
    event.preventDefault();
  }
});


// ======================================================
// 9. TRANSFORMAÇÃO VISUAL DO PERSONAGEM
// ======================================================

/**
 * @doc-func definirTransform
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: transform.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
/**
 * @doc-func definirTransform
 * O que faz: define estado, caminho ou opção usada depois por outros sistemas; altere junto com seus consumidores.
 * Parâmetros: transform.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
const MOBILE_CONTROL_KEYS = {
  up: "w",
  down: "s",
  left: "a",
  right: "d"
};

function setarMovimentoVirtual(tecla, ativo) {
  if (!(tecla in keysPressed)) return;
  keysPressed[tecla] = Boolean(ativo);

  if (ativo && viewportUsaLayoutMovel()) {
    keysPressed.Control = false;
  }
}

function limparMovimentoVirtual() {
  Object.keys(keysPressed).forEach((tecla) => {
    keysPressed[tecla] = false;
  });

  document.querySelectorAll(".mobile-control.active, .mobile-action.active").forEach((botao) => {
    botao.classList.remove("active");
  });
}

function dispararInteracaoVirtual() {
  window.dispatchEvent(new KeyboardEvent("keydown", {
    key: "e",
    code: "KeyE",
    bubbles: true
  }));
}

function gestoNativoDeveSerBloqueado(event) {
  if (!viewportUsaLayoutMovel() || !event.target) return false;

  const alvo = typeof event.target.closest === "function"
    ? event.target
    : event.target.parentElement;

  if (!alvo || typeof alvo.closest !== "function") return false;

  return Boolean(alvo.closest(
    ".mobile-controls, .game-header, .hud-toggle, .finance-panel, .actions-panel, .market-area, .game-toast"
  ));
}

function bloquearGestoNativoDoJogo(event) {
  if (gestoNativoDeveSerBloqueado(event)) {
    event.preventDefault();
  }
}

function inicializarControlesMoveis() {
  document.querySelectorAll("[data-mobile-control]").forEach((botao) => {
    const tecla = MOBILE_CONTROL_KEYS[botao.dataset.mobileControl];
    if (!tecla) return;

    const ativar = (event) => {
      event.preventDefault();
      tentarModoImersivo();
      setarMovimentoVirtual(tecla, true);
      botao.classList.add("active");

      if (typeof botao.setPointerCapture === "function" && event.pointerId !== undefined) {
        botao.setPointerCapture(event.pointerId);
      }
    };

    const desativar = (event) => {
      event.preventDefault();
      setarMovimentoVirtual(tecla, false);
      botao.classList.remove("active");

      if (typeof botao.releasePointerCapture === "function" && event.pointerId !== undefined) {
        try {
          botao.releasePointerCapture(event.pointerId);
        } catch (erro) {
          // O ponteiro pode ja ter sido solto pelo navegador.
        }
      }
    };

    botao.addEventListener("pointerdown", ativar);
    botao.addEventListener("pointermove", bloquearGestoNativoDoJogo);
    botao.addEventListener("pointerup", desativar);
    botao.addEventListener("pointercancel", desativar);
    botao.addEventListener("lostpointercapture", desativar);
    botao.addEventListener("contextmenu", bloquearGestoNativoDoJogo);
  });

  document.querySelectorAll("[data-mobile-action='interact']").forEach((botao) => {
    botao.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      tentarModoImersivo();
      botao.classList.add("active");
      dispararInteracaoVirtual();
    });

    ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"].forEach((evento) => {
      botao.addEventListener(evento, () => {
        botao.classList.remove("active");
      });
    });

    botao.addEventListener("pointermove", bloquearGestoNativoDoJogo);
    botao.addEventListener("contextmenu", bloquearGestoNativoDoJogo);
  });

  ["contextmenu", "selectstart", "dragstart"].forEach((evento) => {
    document.addEventListener(evento, bloquearGestoNativoDoJogo, { capture: true });
  });
}

window.addEventListener("blur", limparMovimentoVirtual);

function definirTransform(transform) {
  if (transformAtual === transform) return;

  playerElement.style.transform = transform;
  transformAtual = transform;
}

/**
 * @doc-func aplicarTransformPadrao
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function aplicarTransformPadrao() {
  definirTransform(`translate(-50%, -100%) scale(${obterEscalaPlayerNoMundo()})`);
}

/**
 * @doc-func aplicarTransformLado
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: direcao.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function aplicarTransformLado(direcao) {
  const escalaPlayer = obterEscalaPlayerNoMundo();

  if (direcao === "left") {
    definirTransform(`translate(-50%, -100%) scale(${escalaPlayer}) scaleX(-1)`);
    return;
  }

  definirTransform(`translate(-50%, -100%) scale(${escalaPlayer}) scaleX(1)`);
}


// ======================================================
// 10. ANIMAÇÕES DO PERSONAGEM
// ======================================================

/**
 * @doc-func definirAnimacao
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: classe.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
/**
 * @doc-func definirAnimacao
 * O que faz: define estado, caminho ou opção usada depois por outros sistemas; altere junto com seus consumidores.
 * Parâmetros: classe.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function definirAnimacao(classe) {
  if (animacaoAtual === classe) return;

  playerElement.className = "sprite-game";
  playerElement.classList.add(classe);

  animacaoAtual = classe;
}

/**
 * @doc-func aplicarAnimacaoParado
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
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

/**
 * @doc-func aplicarAnimacaoAndando
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: direcao.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
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

/**
 * @doc-func retangulosColidem
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: a, b.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function retangulosColidem(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * @doc-func obterObjetosColisaoDinamica
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterObjetosColisaoDinamica() {
  // Hitboxes dinâmicas são criadas em tempo real por outros sistemas.
  // Isso evita cadastrar NPCs no mapa JSON, porque eles nascem, somem e se movem durante o expediente.
  const caixas = [];

  if (typeof obterCaixasColisaoNPCs === "function") {
    caixas.push(...obterCaixasColisaoNPCs());
  }

  if (typeof obterCaixasColisaoNPCsEstaticos === "function") {
    caixas.push(...obterCaixasColisaoNPCsEstaticos());
  }

  if (typeof obterCaixasColisaoAjudantes === "function") {
    caixas.push(...obterCaixasColisaoAjudantes());
  }

  return caixas;
}

/**
 * @doc-func temColisao
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: x, y.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function temColisao(x, y) {
  const playerBox = {
    x: x - 18,
    y: y - 12,
    width: window.player.width,
    height: window.player.height
  };

  // A colisão final combina objetos fixos do mapa com entidades vivas.
  // Resultado: o player não atravessa balcões, paredes, clientes, NPCs estáticos ou ajudante.
  return [
    ...window.objetosColisao,
    ...obterObjetosColisaoDinamica()
  ].some((obj) => {
    return retangulosColidem(playerBox, obj);
  });
}


// ======================================================
// 12. MOVIMENTO DO PERSONAGEM
// ======================================================

/**
 * @doc-func moverPersonagem
 * O que faz: controla deslocamento no mapa; altere velocidade, colisão ou rotas com cautela.
 * Parâmetros: deltaTime = 16.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
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

  // A corrida só existe depois da missão de treinamento.
  // Antes disso, segurar Ctrl não muda a velocidade e não quebra o progresso inicial.
  const corridaAtiva = Boolean(gameState.sprintDesbloqueado && keysPressed.Control && (cima || baixo || esquerda || direita));
  const deltaSeguro = Number.isFinite(deltaTime) && deltaTime > 0 ? deltaTime : PLAYER_FRAME_PADRAO_MS;
  const fatorTempo = Math.min(PLAYER_FRAME_MAX_MULTIPLIER, deltaSeguro / PLAYER_FRAME_PADRAO_MS);
  const velocidadeBase = corridaAtiva ? speed * PLAYER_SPRINT_MULTIPLIER : speed;
  const velocidadeAtual = velocidadeBase * fatorTempo;

  // CIMA
  if (cima) {
    novoY -= velocidadeAtual;
    moving = true;
    direcaoMovimento = "up";
    ultimaDirecao = "up";
  }

  // BAIXO
  if (baixo) {
    novoY += velocidadeAtual;
    moving = true;
    direcaoMovimento = "down";
    ultimaDirecao = "down";
  }

  // ESQUERDA
  if (esquerda) {
    novoX -= velocidadeAtual;
    moving = true;
    direcaoMovimento = "left";
    ultimaDirecao = "left";
  }

  // DIREITA
  if (direita) {
    novoX += velocidadeAtual;
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

/**
 * @doc-func atualizarCamera
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarCamera() {
  garantirPlayerNaCamadaDoMundo();

  const zoomCamera = obterZoomCamera();
  const offsetX = limitarOffsetCamera(
    window.innerWidth / 2 - playerX * zoomCamera,
    window.innerWidth,
    mapWidth,
    zoomCamera
  );
  const offsetY = limitarOffsetCamera(
    window.innerHeight / 2 - playerY * zoomCamera,
    window.innerHeight,
    mapHeight,
    zoomCamera
  );

  const cameraTransform = `translate(${offsetX}px, ${offsetY}px) scale(${zoomCamera})`;

  world.style.transform = cameraTransform;

  if (foregroundWorld) {
    foregroundWorld.style.transform = cameraTransform;
  }

  playerElement.style.left = `${playerX}px`;
  playerElement.style.top = `${playerY}px`;
  playerElement.style.zIndex = calcularZIndexProfundidadeMapa(playerY, 2);

  if (playerShadow) {
    playerShadow.style.left = `${playerX}px`;
    playerShadow.style.top = `${playerY}px`;
    playerShadow.style.zIndex = calcularZIndexProfundidadeMapa(playerY, -1);
  }
}


// ======================================================
// 14. CARREGAR MAPA JSON DO TILED
// ======================================================

/**
 * @doc-func carregarMapa
 * O que faz: persiste ou restaura informações do jogo; altere junto com gameState quando criar novos dados salvos.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
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

        if (layer.name === "npc_zones") {
          // Camada criada no Tiled para guiar clientes sem precisar mexer no código.
          // Objetos buy_* viram pontos de compra, queue_* vira fila e lane_* vira corredor seguro.
          window.objetosNpcZones = layer.objects || [];

          if (typeof registrarZonasNPC === "function") {
            registrarZonasNPC(window.objetosNpcZones);
          }
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

/**
 * @doc-func gameLoop
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: tempoAtual.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function gameLoop(tempoAtual) {
  const deltaTime = tempoAtual - ultimoTempo;
  ultimoTempo = tempoAtual;

  moverPersonagem(deltaTime);

  if (telaJogo.classList.contains("active") && typeof processarTempoDoDia === "function") {
    processarTempoDoDia(deltaTime);
  }

  if (telaJogo.classList.contains("active") && typeof processarInteracaoAutomatica === "function") {
    processarInteracaoAutomatica();
  }

  if (telaJogo.classList.contains("active") && typeof atualizarNPCs === "function") {
    atualizarNPCs(deltaTime);
  }

  if (telaJogo.classList.contains("active") && typeof atualizarNPCsEstaticos === "function") {
    atualizarNPCsEstaticos(deltaTime);
  }

  requestAnimationFrame(gameLoop);
}

/**
 * @doc-func aplicarPersonagemSalvo
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
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

/**
 * @doc-func resetarPosicaoPersonagem
 * O que faz: volta dados/visuais para o estado inicial; inclua novos campos aqui quando criar novos sistemas.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
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

function recalcularLayoutJogo() {
  transformAtual = "";
  aplicarAnimacaoParado();
  atualizarCamera();
}

window.addEventListener("resize", recalcularLayoutJogo);
window.addEventListener("orientationchange", recalcularLayoutJogo);


// ======================================================
// 16. INICIAR JOGO
// ======================================================

carregarMapa();
if (typeof inicializarSistemaAudio === "function") {
  inicializarSistemaAudio();
}
if (typeof trocarContextoMusical === "function") {
  trocarContextoMusical("menu", { imediato: true });
}
inicializarControlesMoveis();
aplicarPersonagemSalvo();
aplicarAnimacaoParado();
if (typeof atualizarInterfaceJogo === "function") {
  atualizarInterfaceJogo();
}
if (typeof inicializarNPCsEstaticos === "function") {
  inicializarNPCsEstaticos();
}
if (typeof sincronizarCamadaMorcegos === "function") {
  sincronizarCamadaMorcegos();
}
requestAnimationFrame(gameLoop);
