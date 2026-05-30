// ======================================================
// DOCUMENTAÇÃO DO ARQUIVO: helpers-system.js
// ======================================================
// Controla o ajudante contratado: cria/remove sprite, melhora velocidade de atendimento e fornece hitbox física.
// Ajustes comuns:
// - criarSpriteAjudante() muda a posição visual do ajudante.
// - getVelocidadeAtendimento() define o bônus operacional por ter ajudante.
// - obterCaixasColisaoAjudantes() impede o player de atravessar o ajudante.
// ======================================================

// ======================================================
// VISUAL DO AJUDANTE
// ======================================================

window.helpersState = {
  sprite: null
};

const HELPER_COLLISION = {
  x: 1495,
  y: 535,
  largura: 40,
  altura: 28,
  margemPlayer: 2
};

/**
 * @doc-func criarSpriteAjudante
 * O que faz: cria elementos ou dados novos; mude aqui quando quiser alterar estrutura, classe CSS ou valores iniciais.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function criarSpriteAjudante() {
  const world = document.getElementById("world");
  if (!world) return null;

  const helper = document.createElement("div");
  helper.className = "helper-npc";
  helper.dataset.helperId = "principal";
  helper.style.left = `${HELPER_COLLISION.x}px`;
  helper.style.top = `${HELPER_COLLISION.y}px`;
  helper.style.zIndex = typeof window.calcularZIndexProfundidadeMapa === "function"
    ? window.calcularZIndexProfundidadeMapa(HELPER_COLLISION.y)
    : String(1000 + Math.round(HELPER_COLLISION.y));

  world.appendChild(helper);
  return helper;
}

/**
 * @doc-func sincronizarAjudanteVisual
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
/**
 * @doc-func sincronizarAjudanteVisual
 * O que faz: mantém DOM e estado interno iguais; chame depois de mudar dados que afetam a tela.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function sincronizarAjudanteVisual() {
  if (!window.helpersState) return;

  const contratado = Boolean(typeof gameState !== "undefined" && gameState.ajudanteContratado);

  if (!contratado && helpersState.sprite) {
    helpersState.sprite.remove();
    helpersState.sprite = null;
    return;
  }

  if (contratado && (!helpersState.sprite || !helpersState.sprite.isConnected)) {
    helpersState.sprite = criarSpriteAjudante();
  }
}

/**
 * @doc-func resetarHelpersVisuais
 * O que faz: volta dados/visuais para o estado inicial; inclua novos campos aqui quando criar novos sistemas.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function resetarHelpersVisuais() {
  if (helpersState.sprite) {
    helpersState.sprite.remove();
    helpersState.sprite = null;
  }
}

/**
 * @doc-func obterCaixasColisaoAjudantes
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterCaixasColisaoAjudantes() {
  if (!helpersState.sprite || !helpersState.sprite.isConnected) return [];

  return [{
    x: HELPER_COLLISION.x - HELPER_COLLISION.largura / 2 - HELPER_COLLISION.margemPlayer,
    y: HELPER_COLLISION.y - HELPER_COLLISION.altura / 2 - HELPER_COLLISION.margemPlayer,
    width: HELPER_COLLISION.largura + HELPER_COLLISION.margemPlayer * 2,
    height: HELPER_COLLISION.altura + HELPER_COLLISION.margemPlayer * 2,
    tipo: "ajudante",
    id: "principal"
  }];
}

/**
 * @doc-func getVelocidadeAtendimento
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function getVelocidadeAtendimento() {
  return typeof gameState !== "undefined" && gameState.ajudanteContratado ? 1.35 : 1;
}

window.sincronizarAjudanteVisual = sincronizarAjudanteVisual;
window.resetarHelpersVisuais = resetarHelpersVisuais;
window.getVelocidadeAtendimento = getVelocidadeAtendimento;
window.obterCaixasColisaoAjudantes = obterCaixasColisaoAjudantes;
