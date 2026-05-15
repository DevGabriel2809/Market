function salvarJogo() {
  const estado = JSON.stringify(gameState);
  localStorage.setItem(GAME_SAVE_KEY, estado);

  if (typeof mostrarToast === "function") {
    mostrarToast("Jogo salvo.");
  }
}

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

    gameState.quests = {
      concluidas: [],
      tentativas: {},
      falhas: {},
      cooldowns: {},
      ...(gameState.quests || {})
    };

    inicializarEstoque();

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

function existeJogoSalvo() {
  return Boolean(localStorage.getItem(GAME_SAVE_KEY));
}
