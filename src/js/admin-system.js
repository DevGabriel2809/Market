// ======================================================
// DOCUMENTACAO DO ARQUIVO: admin-system.js
// ======================================================
// Ferramentas de teste liberadas apenas no modo Demo. A senha padrao e "admin".
// Use este arquivo para adicionar atalhos de balanceamento sem afetar a campanha normal.
// ======================================================

const ADMIN_MODE_PASSWORD = "admin";

/**
 * @doc-func garantirEstadoAdmin
 * O que faz: cria o estado administrativo quando um save antigo nao possui o campo.
 * Parametros: sem parametros diretos.
 * Como editar: adicione novos toggles administrativos dentro do objeto retornado.
 */
function garantirEstadoAdmin() {
  if (!gameState.adminMode || typeof gameState.adminMode !== "object") {
    gameState.adminMode = {
      ativo: false,
      npcsPausados: false
    };
  }

  if (!modoAdminDisponivel()) {
    gameState.adminMode.ativo = false;
    gameState.adminMode.npcsPausados = false;
  }

  return gameState.adminMode;
}

/**
 * @doc-func ativarModoAdmin
 * O que faz: valida a senha e liga as ferramentas de teste da Demo.
 * Parametros: senha.
 * Como editar: mantenha o bloqueio de demo para nao contaminar a campanha principal.
 */
function ativarModoAdmin(senha) {
  const estado = garantirEstadoAdmin();

  if (!modoAdminDisponivel()) {
    return { ok: false, mensagem: "Modo admin so existe na Demo." };
  }

  if (String(senha || "").trim() !== ADMIN_MODE_PASSWORD) {
    return { ok: false, mensagem: "Senha admin incorreta." };
  }

  estado.ativo = true;
  return { ok: true, mensagem: "Modo admin ativado para a Demo." };
}

function exigirModoAdmin() {
  garantirEstadoAdmin();
  if (!modoAdminAtivo()) {
    return { ok: false, mensagem: "Ative o modo admin primeiro." };
  }

  return { ok: true };
}

/**
 * @doc-func adminAdicionarSaldo
 * O que faz: soma dinheiro ao caixa para testes rapidos de balanceamento.
 * Parametros: valor.
 * Como editar: altere o limite se precisar de testes com valores maiores.
 */
function adminAdicionarSaldo(valor) {
  const permissao = exigirModoAdmin();
  if (!permissao.ok) return permissao;

  const quantia = Math.min(999999, Math.max(1, Math.round(Number(valor) || 0)));
  gameState.caixa += quantia;

  return {
    ok: true,
    mensagem: `${formatarMoeda(quantia)} adicionado ao caixa.`
  };
}

/**
 * @doc-func adminEncherEstoque
 * O que faz: preenche todo o estoque sem cobrar o caixa, incluindo produtos bloqueados para teste.
 * Parametros: sem parametros diretos.
 * Como editar: remova incluirBloqueados se quiser testar apenas o fluxo desbloqueado.
 */
function adminEncherEstoque() {
  const permissao = exigirModoAdmin();
  if (!permissao.ok) return permissao;

  return encherEstoque({
    gratis: true,
    incluirBloqueados: true
  });
}

/**
 * @doc-func adminCompletarTodasMissoes
 * O que faz: aplica uma vez as recompensas e marca todas as missoes unicas como concluidas.
 * Parametros: sem parametros diretos.
 * Como editar: cuidado para nao duplicar recompensas em chamadas repetidas.
 */
function adminCompletarTodasMissoes() {
  const permissao = exigirModoAdmin();
  if (!permissao.ok) return permissao;

  const detalhes = [];

  questDefinitions.forEach((quest) => {
    gameState.quests.tentativas[quest.id] = Math.max(1, gameState.quests.tentativas[quest.id] || 0);

    if (!quest.repetivel && questFoiConcluida(quest.id)) {
      return;
    }

    if (typeof aplicarEfeitoQuest === "function") {
      detalhes.push(...aplicarEfeitoQuest(quest.recompensa || {}));
    }

    if (!quest.repetivel && !questFoiConcluida(quest.id)) {
      gameState.quests.concluidas.push(quest.id);
    }
  });

  gameState.quests.cooldowns = {};

  if (typeof reposicionarNPCsEstaticos === "function") {
    reposicionarNPCsEstaticos("admin_missoes");
  }

  return {
    ok: true,
    mensagem: "Missoes concluidas instantaneamente.",
    detalhes
  };
}

/**
 * @doc-func adminFinalizarExpedienteAgora
 * O que faz: pula o relogio ate o fechamento do expediente atual.
 * Parametros: sem parametros diretos.
 * Como editar: mantenha a chamada de fecharExpediente para os NPCs sairem corretamente.
 */
function adminFinalizarExpedienteAgora() {
  const permissao = exigirModoAdmin();
  if (!permissao.ok) return permissao;

  if (gameState.fimDeJogo) {
    return { ok: false, mensagem: "A campanha ja terminou." };
  }

  if (gameState.faseDia === "preparacao" && typeof iniciarExpediente === "function") {
    iniciarExpediente();
  }

  if (gameState.faseDia !== "expediente") {
    return { ok: false, mensagem: "O expediente ja esta fechado." };
  }

  gameState.tempoDiaDecorridoMs = gameState.duracaoExpedienteMs;
  gameState.faseDia = "fechamento";
  gameState.diaEmAndamento = false;
  gameState.diaProntoParaEncerrar = true;
  gameState.diaEncerradoNotificado = true;

  if (typeof fecharExpediente === "function") {
    fecharExpediente();
  }

  if (typeof cancelarAvisoInicioExpediente === "function") {
    cancelarAvisoInicioExpediente();
  }

  return { ok: true, mensagem: "Expediente finalizado pelo admin." };
}

/**
 * @doc-func adminEncerrarDiaAgora
 * O que faz: fecha o expediente e passa o dia imediatamente.
 * Parametros: sem parametros diretos.
 * Como editar: para ignorar custos fixos em testes, ajuste antes da chamada de passarDia.
 */
function adminEncerrarDiaAgora() {
  const permissao = exigirModoAdmin();
  if (!permissao.ok) return permissao;

  if (gameState.faseDia === "expediente" || gameState.faseDia === "preparacao") {
    adminFinalizarExpedienteAgora();
  }

  const relatorio = typeof passarDia === "function" ? passarDia() : null;

  return {
    ok: Boolean(relatorio),
    mensagem: relatorio ? "Dia encerrado pelo admin." : "Nao foi possivel encerrar o dia agora.",
    relatorio
  };
}

/**
 * @doc-func criarRelatorioFinalAdmin
 * O que faz: monta um relatorio final quando a campanha e encerrada diretamente pelo painel admin.
 * Parametros: sem parametros diretos.
 * Como editar: mantenha as chaves iguais ao relatorio financeiro normal.
 */
function criarRelatorioFinalAdmin() {
  const eventoAdmin = {
    id: "admin_final",
    titulo: "Encerramento admin",
    descricao: "A campanha foi finalizada pelo painel de testes da Demo.",
    demanda: 1
  };

  const relatorio = typeof criarRelatorioBase === "function"
    ? criarRelatorioBase(eventoAdmin)
    : {
      dia: gameState.dia,
      evento: eventoAdmin,
      vendas: [],
      perdas: [],
      receita: 0,
      custoMercadorias: 0,
      custosFixos: 0,
      lucroBruto: 0,
      lucroLiquido: 0,
      unidadesVendidas: 0,
      caixaAntes: gameState.caixa
    };

  relatorio.dia = gameState.diaMaximo;
  relatorio.caixaDepois = gameState.caixa;
  relatorio.fechado = true;
  return relatorio;
}

/**
 * @doc-func adminFinalizarCampanhaAgora
 * O que faz: encerra a Demo com vitoria para testar relatorio e creditos finais.
 * Parametros: sem parametros diretos.
 * Como editar: troque tipo para derrota se precisar testar o outro final rapidamente.
 */
function adminFinalizarCampanhaAgora() {
  const permissao = exigirModoAdmin();
  if (!permissao.ok) return permissao;

  const metaCaixa = typeof obterMetaCaixaCampanha === "function" ? obterMetaCaixaCampanha() : 2600;
  gameState.caixa = Math.max(gameState.caixa, metaCaixa);
  gameState.dia = gameState.diaMaximo;
  gameState.faseDia = "fechamento";
  gameState.diaEmAndamento = false;
  gameState.diaProntoParaEncerrar = false;
  gameState.relatorioEmAndamento = null;

  const relatorio = criarRelatorioFinalAdmin();
  gameState.ultimoRelatorio = relatorio;
  gameState.historico.push(relatorio);
  gameState.creditosFinaisMostrados = false;
  gameState.fimDeJogo = {
    tipo: "vitoria",
    titulo: "Demo finalizada pelo admin",
    mensagem: `A meta de ${formatarMoeda(metaCaixa)} foi garantida para testar o final da campanha.`
  };

  if (typeof fecharExpediente === "function") {
    fecharExpediente();
  }

  return {
    ok: true,
    mensagem: "Campanha finalizada pelo admin.",
    relatorio
  };
}

/**
 * @doc-func adminAlternarPausaNPCs
 * O que faz: pausa ou libera compras dos NPCs durante a Demo.
 * Parametros: ativo.
 * Como editar: a pausa trava novos spawns e processamento de clientes, mantendo os sprites na tela.
 */
function adminAlternarPausaNPCs(ativo) {
  const permissao = exigirModoAdmin();
  if (!permissao.ok) return permissao;

  const estado = garantirEstadoAdmin();
  estado.npcsPausados = Boolean(ativo);

  return {
    ok: true,
    mensagem: estado.npcsPausados
      ? "NPCs pausados pelo admin."
      : "NPCs liberados pelo admin."
  };
}
