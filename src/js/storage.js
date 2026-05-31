// ======================================================
// DOCUMENTAÇÃO DO ARQUIVO: storage.js
// ======================================================
// Salva e carrega a partida no localStorage. Ajuste migrações quando gameState ganhar novos campos.
// ======================================================

/**
 * @doc-func salvarJogo
 * O que faz: persiste ou restaura informações do jogo; altere junto com gameState quando criar novos dados salvos.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function salvarJogo() {
  const estado = JSON.stringify(gameState);
  localStorage.setItem(GAME_SAVE_KEY, estado);

  if (typeof mostrarToast === "function") {
    mostrarToast("Jogo salvo.");
  }
}

/**
 * @doc-func carregarJogo
 * O que faz: persiste ou restaura informações do jogo; altere junto com gameState quando criar novos dados salvos.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function carregarJogo() {
  const salvo = localStorage.getItem(GAME_SAVE_KEY);

  if (!salvo) {
    if (typeof mostrarToast === "function") {
      mostrarToast("Nenhum save encontrado.");
    }
    return false;
  }

  try {
    const dados = JSON.parse(salvo);
    Object.assign(gameState, dados);

    gameState.modoJogo = dados.modoJogo === "demo" ? "demo" : "normal";
    gameState.diaMaximo = gameState.modoJogo === "demo" ? GAME_DEMO_DAYS : GAME_NORMAL_DAYS;
    const demo = gameState.modoJogo === "demo";
    gameState.custoAjudante = gameState.custoAjudante || 120;
    gameState.faseDia = gameState.faseDia || (gameState.diaProntoParaEncerrar
      ? "fechamento"
      : gameState.diaEmAndamento
        ? "expediente"
        : "preparacao");
    gameState.duracaoExpedienteMs = gameState.duracaoExpedienteMs || gameState.duracaoDiaMs || (demo ? 240000 : 300000);
    gameState.duracaoPreparacaoMs = gameState.duracaoPreparacaoMs || (demo ? 75000 : 150000);
    gameState.tempoPreparacaoDecorridoMs = gameState.faseDia === "preparacao"
      ? Math.min(gameState.duracaoPreparacaoMs, gameState.tempoPreparacaoDecorridoMs || 0)
      : 0;
    gameState.preparacaoAvisoMostrado = Boolean(gameState.preparacaoAvisoMostrado);

    if (gameState.faseDia === "preparacao" && gameState.tempoPreparacaoDecorridoMs >= gameState.duracaoPreparacaoMs) {
      gameState.preparacaoAvisoMostrado = false;
    }

    gameState.tempoDiaDecorridoMs = gameState.tempoDiaDecorridoMs || 0;
    gameState.diaProntoParaEncerrar = Boolean(gameState.diaProntoParaEncerrar);
    gameState.diaEmAndamento = Boolean(gameState.diaEmAndamento);
    gameState.diaEncerradoNotificado = Boolean(gameState.diaEncerradoNotificado);
    gameState.alertasEstoqueBaixo = gameState.alertasEstoqueBaixo && typeof gameState.alertasEstoqueBaixo === "object"
      ? gameState.alertasEstoqueBaixo
      : {};
    // @doc-migration Saves antigos não possuem sprintDesbloqueado; mantém a habilidade bloqueada até a missão ser concluída.
    gameState.sprintDesbloqueado = Boolean(gameState.sprintDesbloqueado);

    // @doc-migration Mantém compatibilidade com saves antigos que não tinham dicas sequenciais dos NPCs fixos.
    gameState.staticNpcTips = {
      dia: Number(gameState.staticNpcTips && gameState.staticNpcTips.dia ? gameState.staticNpcTips.dia : gameState.dia || 1),
      npcs: gameState.staticNpcTips && typeof gameState.staticNpcTips.npcs === "object"
        ? gameState.staticNpcTips.npcs
        : {}
    };

    gameState.quests = {
      concluidas: [],
      tentativas: {},
      falhas: {},
      cooldowns: {},
      ...(gameState.quests || {})
    };

    inicializarEstoque();

    if (typeof garantirEstadoDicasNPCsEstaticos === "function") {
      garantirEstadoDicasNPCsEstaticos();
    }

    if (!gameState.fimDeJogo && !gameState.relatorioEmAndamento && !gameState.diaProntoParaEncerrar) {
      iniciarNovoDia();
    }

    if (typeof aplicarPersonagemSalvo === "function") {
      aplicarPersonagemSalvo();
    }

    if (typeof atualizarInterfaceJogo === "function") {
      atualizarInterfaceJogo();
    }

    if (typeof mostrarToast === "function") {
      mostrarToast("Jogo carregado.");
    }

    return true;
  } catch (erro) {
    console.error("Erro ao carregar save:", erro);

    if (typeof mostrarToast === "function") {
      mostrarToast("Não foi possível carregar o save.");
    }

    return false;
  }
}

/**
 * @doc-func existeJogoSalvo
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function existeJogoSalvo() {
  return Boolean(localStorage.getItem(GAME_SAVE_KEY));
}
