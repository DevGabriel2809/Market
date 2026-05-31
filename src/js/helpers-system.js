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
  sprite: null,
  atendimento: null,
  cooldownMs: 0
};

const HELPER_POSITION = {
  x: 1600,
  y: 592
};

const HELPER_COLLISION = {
  x: HELPER_POSITION.x,
  y: HELPER_POSITION.y,
  largura: 30,
  altura: 18,
  margemPlayer: 1
};

const HELPER_SERVICE_BASE_MS = 3400;
const HELPER_SERVICE_COOLDOWN_MS = 650;

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
  helper.className = "helper-npc npc-tomas customer-idle";
  helper.dataset.helperId = "principal";
  posicionarSpriteAjudante(helper);

  world.appendChild(helper);
  return helper;
}

function posicionarSpriteAjudante(helper) {
  if (!helper) return;

  helper.style.left = `${HELPER_POSITION.x}px`;
  helper.style.top = `${HELPER_POSITION.y}px`;
  helper.style.zIndex = typeof window.calcularZIndexProfundidadeMapa === "function"
    ? window.calcularZIndexProfundidadeMapa(HELPER_POSITION.y)
    : String(1000 + Math.round(HELPER_POSITION.y));
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
    resetarAtendimentoAjudante();
    return;
  }

  if (contratado && (!helpersState.sprite || !helpersState.sprite.isConnected)) {
    helpersState.sprite = criarSpriteAjudante();
  } else if (contratado) {
    helpersState.sprite.className = "helper-npc npc-tomas customer-idle";
    posicionarSpriteAjudante(helpersState.sprite);
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

  resetarAtendimentoAjudante();
}

function resetarAtendimentoAjudante() {
  if (!window.helpersState) return;

  if (helpersState.atendimento && typeof obterClienteParaAtender === "function") {
    const cliente = obterClienteParaAtender(helpersState.atendimento.clienteId);
    if (cliente && cliente.atendidoPorAjudante) {
      cliente.emAtendimento = false;
      cliente.atendidoPorAjudante = false;
    }
  }

  helpersState.atendimento = null;
  helpersState.cooldownMs = 0;
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

function obterClienteLivreParaAjudante() {
  if (typeof npcSystem === "undefined" || !Array.isArray(npcSystem.clientes)) return null;

  return npcSystem.clientes.find((cliente) => {
    return cliente.estado === "aguardando_caixa"
      && cliente.carrinho
      && !cliente.emAtendimento
      && !cliente.atendidoPorAjudante;
  }) || null;
}

function iniciarAtendimentoAjudante(cliente) {
  if (!cliente) return;

  cliente.emAtendimento = true;
  cliente.atendidoPorAjudante = true;
  cliente.tempoFila = 0;

  if (typeof atualizarHumorCliente === "function") {
    atualizarHumorCliente(cliente, "Tomas atendendo");
  }

  helpersState.atendimento = {
    clienteId: cliente.id,
    restanteMs: HELPER_SERVICE_BASE_MS / getVelocidadeAtendimento()
  };
}

function concluirAtendimentoAjudante(cliente) {
  if (!cliente || !cliente.carrinho || typeof atenderClienteDaFila !== "function") return;

  const trocoCorreto = Number(cliente.carrinho.troco) || 0;
  const resultado = atenderClienteDaFila(true, cliente.id, trocoCorreto, {
    ignorarBalcao: true,
    origem: "ajudante"
  });

  if (typeof mostrarToast === "function" && resultado && resultado.ok) {
    mostrarToast(`Tomas atendeu ${cliente.perfil.nome}.`);
  }

  if (typeof atualizarInterfaceJogo === "function") {
    atualizarInterfaceJogo({ origem: "ajudante" });
  }
}

function processarAjudante(deltaTime = 16) {
  if (!window.helpersState || typeof gameState === "undefined") return;

  const podeTrabalhar = Boolean(
    gameState.ajudanteContratado
    && gameState.faseDia === "expediente"
    && gameState.diaEmAndamento
    && !(typeof modoAdminPausaNPCsAtiva === "function" && modoAdminPausaNPCsAtiva())
  );

  if (!podeTrabalhar) {
    resetarAtendimentoAjudante();
    return;
  }

  sincronizarAjudanteVisual();

  if (helpersState.cooldownMs > 0) {
    helpersState.cooldownMs = Math.max(0, helpersState.cooldownMs - deltaTime);
    return;
  }

  if (helpersState.atendimento) {
    const cliente = typeof obterClienteParaAtender === "function"
      ? obterClienteParaAtender(helpersState.atendimento.clienteId)
      : null;

    if (!cliente || cliente.estado !== "aguardando_caixa" || !cliente.carrinho) {
      helpersState.atendimento = null;
      return;
    }

    cliente.tempoFila = 0;
    helpersState.atendimento.restanteMs -= deltaTime;

    if (helpersState.atendimento.restanteMs <= 0) {
      helpersState.atendimento = null;
      helpersState.cooldownMs = HELPER_SERVICE_COOLDOWN_MS;
      concluirAtendimentoAjudante(cliente);
    }

    return;
  }

  iniciarAtendimentoAjudante(obterClienteLivreParaAjudante());
}

window.sincronizarAjudanteVisual = sincronizarAjudanteVisual;
window.resetarHelpersVisuais = resetarHelpersVisuais;
window.getVelocidadeAtendimento = getVelocidadeAtendimento;
window.obterCaixasColisaoAjudantes = obterCaixasColisaoAjudantes;
window.processarAjudante = processarAjudante;
