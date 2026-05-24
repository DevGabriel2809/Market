// ======================================================
// DOCUMENTAÇÃO DO ARQUIVO: ui.js
// ======================================================
// Renderiza HUD, modais, listas, checkout, status e relatórios. Mude textos e layout dinâmico aqui.
// ======================================================

let interfaceInicializada = false;
let ultimoResultadoQuest = null;
let questEmAndamento = false;
let prepStartTimeoutId = null;
let prepStartCountdownId = null;
const QUEST_LOADING_MS = 10000;
const PREP_START_MODAL_MS = 10000;

const ui = {};

/**
 * @doc-func inicializarInterface
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function inicializarInterface() {
  if (interfaceInicializada) return;

  ui.diaAtual = document.getElementById("dia-atual");
  ui.horaAtual = document.getElementById("hora-atual");
  ui.caixaAtual = document.getElementById("caixa-atual");
  ui.tituloJogo = document.getElementById("titulo-jogo");
  ui.listaProdutos = document.getElementById("lista-produtos");
  ui.financeCostList = document.getElementById("finance-cost-list");
  ui.dayStatusText = document.getElementById("day-status-text");
  ui.dayProgressBar = document.getElementById("day-progress-bar");
  ui.btnPassarDia = document.getElementById("btn-passar-dia");
  ui.modalBackdrop = document.getElementById("modal-backdrop");
  ui.statusModal = document.getElementById("status-modal");
  ui.stockModal = document.getElementById("stock-modal");
  ui.questsModal = document.getElementById("quests-modal");
  ui.reportModal = document.getElementById("report-modal");
  ui.checkoutModal = document.getElementById("checkout-modal");
  ui.questLoadingModal = document.getElementById("quest-loading-modal");
  ui.prepStartModal = document.getElementById("prep-start-modal");
  ui.prepStartCountdown = document.getElementById("prep-start-countdown");
  ui.btnPrepStartNow = document.getElementById("btn-prep-start-now");
  ui.toast = document.getElementById("game-toast");

  const btnPassarDia = ui.btnPassarDia;
  const btnCaixa = document.getElementById("btn-caixa");
  const btnStatus = document.getElementById("btn-status");
  const btnEstoque = document.getElementById("btn-estoque");
  const btnQuests = document.getElementById("btn-quests");
  const btnRelatorio = document.getElementById("btn-relatorio");
  const btnSalvar = document.getElementById("btn-salvar");
  const btnCarregar = document.getElementById("btn-carregar");
  const stockList = document.getElementById("stock-product-list");
  const questsList = document.getElementById("quests-list");
  const checkoutContent = document.getElementById("checkout-content");
  const objectives = document.getElementById("status-objectives");

  if (btnPassarDia) {
    btnPassarDia.addEventListener("click", () => {
      if (gameState.faseDia === "preparacao") {
        const resultado = iniciarExpediente();
        atualizarInterfaceJogo();
        mostrarToast(resultado.mensagem);
        return;
      }

      const relatorio = passarDia();
      atualizarInterfaceJogo();

      if (relatorio) {
        abrirRelatorio(relatorio);
        mostrarToast(gameState.fimDeJogo ? gameState.fimDeJogo.titulo : "Dia encerrado.");
      }
    });
  }

  if (ui.btnPrepStartNow) {
    ui.btnPrepStartNow.addEventListener("click", () => {
      const resultado = iniciarExpediente();
      atualizarInterfaceJogo();
      fecharModal();
      mostrarToast(resultado.mensagem);
    });
  }

  if (btnStatus) {
    btnStatus.addEventListener("click", abrirStatus);
  }

  if (btnCaixa) {
    btnCaixa.addEventListener("click", abrirCheckout);
  }

  if (btnEstoque) {
    btnEstoque.addEventListener("click", abrirEstoque);
  }

  if (btnQuests) {
    btnQuests.addEventListener("click", abrirQuests);
  }

  if (btnRelatorio) {
    btnRelatorio.addEventListener("click", () => abrirRelatorio(gameState.ultimoRelatorio));
  }

  if (btnSalvar) {
    btnSalvar.addEventListener("click", () => {
      if (typeof salvarJogo === "function") {
        salvarJogo();
      }
    });
  }

  if (btnCarregar) {
    btnCarregar.addEventListener("click", () => {
      if (typeof carregarJogo === "function") {
        carregarJogo();
      }
    });
  }

  if (stockList) {
    stockList.addEventListener("click", lidarCliqueEstoque);
    stockList.addEventListener("change", lidarAlteracaoEstoque);
  }

  if (questsList) {
    questsList.addEventListener("click", lidarCliqueQuest);
  }

  if (checkoutContent) {
    checkoutContent.addEventListener("click", lidarCliqueCheckout);
    checkoutContent.addEventListener("input", lidarInputCheckout);
  }

  if (objectives) {
    objectives.addEventListener("click", lidarCliqueObjetivo);
  }

  document.querySelectorAll("[data-close-modal]").forEach((botao) => {
    botao.addEventListener("click", fecharModal);
  });

  if (ui.modalBackdrop) {
    ui.modalBackdrop.addEventListener("click", (event) => {
      if (event.target === ui.modalBackdrop && !questEmAndamento) {
        fecharModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !questEmAndamento) {
      fecharModal();
    }
  });

  interfaceInicializada = true;
  atualizarInterfaceJogo();
}

/**
 * @doc-func atualizarInterfaceJogo
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: opcoes = {}.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarInterfaceJogo(opcoes = {}) {
  inicializarEstoque();
  renderizarHud();
  renderizarCustosFixos();
  renderizarProdutosResumo();
  renderizarBotaoCheckout();

  if (ui.statusModal && !ui.statusModal.classList.contains("hidden")) {
    renderizarStatus();
  }

  if (ui.stockModal && !ui.stockModal.classList.contains("hidden") && opcoes.origem !== "venda") {
    renderizarEstoque();
  }

  if (ui.questsModal && !ui.questsModal.classList.contains("hidden")) {
    renderizarQuests();
  }

  if (ui.checkoutModal && !ui.checkoutModal.classList.contains("hidden")) {
    renderizarCheckout();
  }
}

/**
 * @doc-func renderizarHud
 * O que faz: monta HTML dinâmico na interface; altere classes, textos e botões aqui.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function renderizarHud() {
  if (ui.diaAtual) ui.diaAtual.textContent = gameState.dia;
  if (ui.caixaAtual) ui.caixaAtual.textContent = formatarMoeda(gameState.caixa);

  if (ui.tituloJogo) {
    ui.tituloJogo.textContent = gameState.nomeJogador
      ? `Mercado de ${gameState.nomeJogador}`
      : "Mercado Tycoon";
  }

  atualizarHudTempo();
}

/**
 * @doc-func atualizarHudTempo
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarHudTempo() {
  if (ui.horaAtual) ui.horaAtual.textContent = formatarHoraDoJogo();

  if (ui.dayProgressBar) {
    ui.dayProgressBar.style.width = `${Math.round(obterProgressoDia() * 100)}%`;
  }

  if (ui.dayStatusText) {
    if (gameState.fimDeJogo) {
      ui.dayStatusText.textContent = "Campanha encerrada";
    } else if (gameState.faseDia === "preparacao") {
      const restantePreparacao = obterTempoRestanteDia();
      ui.dayStatusText.textContent = gameState.preparacaoAvisoMostrado
        ? "Expediente iniciando..."
        : `Preparação: abre em ${formatarTempoCurto(restantePreparacao)}`;
    } else if (gameState.diaProntoParaEncerrar) {
      ui.dayStatusText.textContent = "Expediente concluído";
    } else {
      ui.dayStatusText.textContent = `Aberto: fecha em ${formatarTempoCurto(obterTempoRestanteDia())}`;
    }
  }

  if (ui.btnPassarDia) {
    ui.btnPassarDia.disabled = Boolean(gameState.fimDeJogo) || gameState.faseDia === "expediente";

    if (gameState.faseDia === "preparacao") {
      ui.btnPassarDia.textContent = "Iniciar agora";
    } else if (gameState.faseDia === "fechamento") {
      ui.btnPassarDia.textContent = "Encerrar Dia";
    } else {
      ui.btnPassarDia.textContent = `Aberto ${formatarTempoCurto(obterTempoRestanteDia())}`;
    }
  }
}

/**
 * @doc-func cancelarAvisoInicioExpediente
 * O que faz: cancela o modal/contador automático da preparação quando o expediente começa manualmente.
 * Como editar: mude PREP_START_MODAL_MS no topo do arquivo para alterar o tempo da janela.
 */
function cancelarAvisoInicioExpediente() {
  if (prepStartTimeoutId) {
    clearTimeout(prepStartTimeoutId);
    prepStartTimeoutId = null;
  }

  if (prepStartCountdownId) {
    clearInterval(prepStartCountdownId);
    prepStartCountdownId = null;
  }
}

/**
 * @doc-func mostrarAvisoInicioExpediente
 * O que faz: abre a janela bonita avisando que a preparação acabou e agenda o início automático.
 * Como editar: altere textos do modal no index.html e estilos .prep-start-* no CSS.
 */
function mostrarAvisoInicioExpediente() {
  if (gameState.faseDia !== "preparacao" || gameState.fimDeJogo) return;

  cancelarAvisoInicioExpediente();

  const tempoFinal = performance.now() + PREP_START_MODAL_MS;
  const atualizarContagem = () => {
    if (!ui.prepStartCountdown) return;
    const restante = Math.max(0, tempoFinal - performance.now());
    ui.prepStartCountdown.textContent = `${Math.ceil(restante / 1000)}s`;
  };

  atualizarContagem();
  prepStartCountdownId = setInterval(atualizarContagem, 200);

  abrirModal("prep-start-modal");

  prepStartTimeoutId = setTimeout(() => {
    prepStartTimeoutId = null;

    if (gameState.faseDia === "preparacao" && !gameState.fimDeJogo) {
      const resultado = iniciarExpediente();
      atualizarInterfaceJogo();
      fecharModal();
      mostrarToast(resultado.mensagem);
    }
  }, PREP_START_MODAL_MS);
}

window.cancelarAvisoInicioExpediente = cancelarAvisoInicioExpediente;
window.mostrarAvisoInicioExpediente = mostrarAvisoInicioExpediente;

/**
 * @doc-func renderizarCustosFixos
 * O que faz: monta HTML dinâmico na interface; altere classes, textos e botões aqui.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function renderizarCustosFixos() {
  if (!ui.financeCostList) return;

  const custos = obterCustosFixosDetalhados();
  const total = custos.reduce((soma, custo) => soma + custo.valor, 0);
  const equipe = gameState.ajudanteContratado
    ? "Ajudante ativo no balcão."
    : "Sem ajudante contratado.";

  ui.financeCostList.innerHTML = `
    ${custos.map((custo) => `
      <div class="finance-item">
        <span>${custo.nome}</span>
        <strong>${formatarMoeda(custo.valor)}</strong>
      </div>
    `).join("")}
    <div class="finance-note">${equipe}</div>
    <div class="finance-total">
      <span>Total diário</span>
      <strong>${formatarMoeda(total)}</strong>
    </div>
  `;
}

/**
 * @doc-func renderizarBotaoCheckout
 * O que faz: monta HTML dinâmico na interface; altere classes, textos e botões aqui.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function renderizarBotaoCheckout() {
  const btnCaixa = document.getElementById("btn-caixa");
  if (!btnCaixa) return;

  const fila = typeof obterFilaAtendimento === "function" ? obterFilaAtendimento() : [];
  const aguardando = typeof existeClienteAguardando === "function" && existeClienteAguardando();

  btnCaixa.textContent = aguardando
    ? `Atender Caixa (${fila.length})`
    : `Caixa (${fila.length})`;
  btnCaixa.classList.toggle("attention", aguardando);
  btnCaixa.disabled = Boolean(gameState.fimDeJogo);
}

/**
 * @doc-func renderizarProdutosResumo
 * O que faz: monta HTML dinâmico na interface; altere classes, textos e botões aqui.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function renderizarProdutosResumo() {
  if (!ui.listaProdutos) return;

  ui.listaProdutos.innerHTML = productCatalog
    .filter((produto) => produtoEstaLiberado(produto))
    .map((produto) => {
      const estoque = obterEstoque(produto.id);
      return `
        <article class="product-pill">
          <span class="product-sigil">${produto.sigla}</span>
          <div>
            <strong>${produto.nome}</strong>
            <span>${estoque.quantidade} un. · ${formatarMoeda(estoque.precoVenda)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

/**
 * @doc-func abrirModal
 * O que faz: abre uma tela/modal/fluxo; edite textos e chamadas caso o comportamento de abertura mude.
 * Parâmetros: modalId.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function abrirModal(modalId) {
  if (!ui.modalBackdrop) return;

  document.querySelector(".actions-panel")?.classList.remove("open");
  document.querySelector(".finance-panel")?.classList.remove("open");

  [ui.statusModal, ui.stockModal, ui.questsModal, ui.reportModal, ui.checkoutModal, ui.questLoadingModal, ui.prepStartModal].forEach((modal) => {
    if (modal) modal.classList.add("hidden");
  });

  const modal = document.getElementById(modalId);
  if (!modal) return;

  ui.modalBackdrop.classList.remove("hidden");
  modal.classList.remove("hidden");
}

/**
 * @doc-func fecharModal
 * O que faz: fecha uma tela/modal/fluxo; edite para limpar estados extras ao sair.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function fecharModal() {
  if (!ui.modalBackdrop || questEmAndamento) return;

  if (ui.checkoutModal && !ui.checkoutModal.classList.contains("hidden") && typeof liberarAtendimentoCheckout === "function") {
    liberarAtendimentoCheckout();
  }

  ui.modalBackdrop.classList.add("hidden");
  [ui.statusModal, ui.stockModal, ui.questsModal, ui.reportModal, ui.checkoutModal, ui.questLoadingModal, ui.prepStartModal].forEach((modal) => {
    if (modal) modal.classList.add("hidden");
  });
}

/**
 * @doc-func modalEstaAberto
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function modalEstaAberto() {
  return ui.modalBackdrop && !ui.modalBackdrop.classList.contains("hidden");
}

/**
 * @doc-func abrirStatus
 * O que faz: abre uma tela/modal/fluxo; edite textos e chamadas caso o comportamento de abertura mude.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function abrirStatus() {
  renderizarStatus();
  abrirModal("status-modal");
}

/**
 * @doc-func abrirEstoque
 * O que faz: abre uma tela/modal/fluxo; edite textos e chamadas caso o comportamento de abertura mude.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function abrirEstoque() {
  renderizarEstoque();
  abrirModal("stock-modal");
}

/**
 * @doc-func abrirQuests
 * O que faz: abre uma tela/modal/fluxo; edite textos e chamadas caso o comportamento de abertura mude.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function abrirQuests() {
  renderizarQuests();
  abrirModal("quests-modal");
}

/**
 * @doc-func abrirRelatorio
 * O que faz: abre uma tela/modal/fluxo; edite textos e chamadas caso o comportamento de abertura mude.
 * Parâmetros: relatorio.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function abrirRelatorio(relatorio) {
  renderizarRelatorio(relatorio);
  abrirModal("report-modal");
}

/**
 * @doc-func jogadorPodeAtenderCaixa
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function jogadorPodeAtenderCaixa() {
  return typeof jogadorEstaNoPisoBalcao === "function" && jogadorEstaNoPisoBalcao();
}

/**
 * @doc-func abrirCheckout
 * O que faz: abre uma tela/modal/fluxo; edite textos e chamadas caso o comportamento de abertura mude.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function abrirCheckout() {
  if (!jogadorPodeAtenderCaixa()) {
    mostrarToast("Entre no balcao para atender clientes.");
    return;
  }

  renderizarCheckout();
  abrirModal("checkout-modal");
}

/**
 * @doc-func renderizarStatus
 * O que faz: monta HTML dinâmico na interface; altere classes, textos e botões aqui.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function renderizarStatus() {
  const resumo = calcularResumoFinanceiro();
  const nome = document.getElementById("status-player-name");
  const cargo = document.getElementById("status-player-role");
  const personagem = document.getElementById("status-character");
  const financas = document.getElementById("status-finances");
  const operacao = document.getElementById("status-operation");
  const objetivos = document.getElementById("status-objectives");

  if (nome) nome.textContent = gameState.nomeJogador || "Gerente";
  if (cargo) {
    cargo.textContent = gameState.ajudanteContratado
      ? "Administrador com equipe"
      : "Administrador independente";
  }

  if (personagem) {
    personagem.className = "status-character";
    personagem.classList.add(gameState.personagem === "female" ? "manager-female-idle" : "manager-male-idle");
  }

  if (financas) {
    financas.innerHTML = `
      ${linhaStatus("Caixa", formatarMoeda(gameState.caixa))}
      ${linhaStatus("Receita hoje", formatarMoeda(resumo.receitaHoje))}
      ${linhaStatus("Receita acumulada", formatarMoeda(resumo.receitaTotal))}
      ${linhaStatus("Custos fixos acumulados", formatarMoeda(resumo.custosFixos))}
      ${linhaStatus("Lucro líquido acumulado", formatarMoeda(resumo.lucroLiquido))}
      ${linhaStatus("Valor do estoque", formatarMoeda(resumo.valorEstoque))}
    `;
  }

  if (operacao) {
    const npcResumo = obterResumoNPCs();

    operacao.innerHTML = `
      ${linhaStatus("Fase do dia", descreverFaseDia())}
      ${linhaStatus("Dia", `${gameState.dia}/${gameState.diaMaximo}`)}
      ${linhaStatus("Reputação", gameState.reputacao)}
      ${linhaStatus("Experiência", gameState.experiencia)}
      ${linhaStatus("Vendas hoje", resumo.unidadesHoje)}
      ${linhaStatus("Clientes na loja", npcResumo.naLoja)}
      ${linhaStatus("Fila do caixa", npcResumo.fila)}
      ${linhaStatus("Clientes do dia", npcResumo.total)}
      ${linhaStatus("Receita dos NPCs", formatarMoeda(npcResumo.receita))}
      ${linhaStatus("Itens em estoque", resumo.quantidadeEstoque)}
      ${linhaStatus("Custo fixo diário", formatarMoeda(calcularCustosFixos()))}
      ${linhaStatus("Desconto fornecedor", `${Math.round((gameState.descontoFornecedor || 0) * 100)}%`)}
      ${linhaStatus("Corrida", gameState.sprintDesbloqueado ? "Ctrl liberado" : "Bloqueada por missão")}
    `;
  }

  if (objetivos) {
    const progressoCaixa = Math.min(100, Math.round((gameState.caixa / 5000) * 100));
    const concluidas = gameState.quests.concluidas.length;
    const totalMissoesUnicas = questDefinitions.filter((quest) => !quest.repetivel).length || 1;
    const ajudanteTexto = gameState.ajudanteContratado
      ? "Ajudante contratado"
      : gameState.ajudanteDesbloqueado
        ? `<button class="btn primary small" data-hire-helper>Contratar ajudante por ${formatarMoeda(900)}</button>`
        : "Ajudante bloqueado pela guilda";

    objetivos.innerHTML = `
      ${barraObjetivo("Meta de caixa", progressoCaixa, `${formatarMoeda(gameState.caixa)} / ${formatarMoeda(5000)}`)}
      ${barraObjetivo("Campanha", Math.round((gameState.dia / gameState.diaMaximo) * 100), `Dia ${gameState.dia} de ${gameState.diaMaximo}`)}
      ${barraObjetivo("Missões únicas", Math.round((concluidas / totalMissoesUnicas) * 100), `${concluidas}/${totalMissoesUnicas} concluída(s)`)}
      <div class="objective-row">
        <span>Equipe</span>
        <strong>${ajudanteTexto}</strong>
      </div>
    `;
  }
}

/**
 * @doc-func obterResumoNPCs
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterResumoNPCs() {
  if (typeof npcSystem === "undefined") {
    return { naLoja: 0, fila: 0, total: 0, receita: 0 };
  }

  return {
    naLoja: npcSystem.clientes ? npcSystem.clientes.length : 0,
    fila: typeof obterFilaAtendimento === "function" ? obterFilaAtendimento().length : 0,
    total: npcSystem.totalClientesDia || 0,
    receita: npcSystem.totalVendasDia || 0
  };
}

/**
 * @doc-func linhaStatus
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: rotulo, valor.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function linhaStatus(rotulo, valor) {
  return `
    <div class="status-row">
      <span>${rotulo}</span>
      <strong>${valor}</strong>
    </div>
  `;
}

/**
 * @doc-func descreverFaseDia
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function descreverFaseDia() {
  if (gameState.fimDeJogo) return "Campanha encerrada";
  if (gameState.faseDia === "preparacao") return "Preparação, antes da abertura";
  if (gameState.faseDia === "fechamento") return "Expediente encerrado";
  return `Expediente aberto, ${formatarTempoCurto(obterTempoRestanteDia())}`;
}

/**
 * @doc-func barraObjetivo
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: rotulo, percentual, detalhe.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function barraObjetivo(rotulo, percentual, detalhe) {
  const largura = Math.max(0, Math.min(100, percentual));
  return `
    <div class="objective-row">
      <div>
        <span>${rotulo}</span>
        <strong>${detalhe}</strong>
      </div>
      <div class="objective-bar">
        <span style="width: ${largura}%"></span>
      </div>
    </div>
  `;
}

/**
 * @doc-func renderizarEstoque
 * O que faz: monta HTML dinâmico na interface; altere classes, textos e botões aqui.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function renderizarEstoque() {
  const resumo = document.getElementById("stock-summary");
  const lista = document.getElementById("stock-product-list");
  if (!resumo || !lista) return;

  resumo.innerHTML = `
    <div><span>Caixa</span><strong>${formatarMoeda(gameState.caixa)}</strong></div>
    <div><span>Itens</span><strong>${calcularQuantidadeEstoque()}</strong></div>
    <div><span>Valor em estoque</span><strong>${formatarMoeda(calcularValorEstoque())}</strong></div>
    <div><span>Receita hoje</span><strong>${formatarMoeda(calcularResumoFinanceiro().receitaHoje)}</strong></div>
  `;

  lista.innerHTML = productCatalog
    .map((produto) => {
      const estoque = obterEstoque(produto.id);
      const liberado = produtoEstaLiberado(produto);
      const requisito = produto.requerQuest ? obterQuest(produto.requerQuest) : null;

      return `
        <article class="stock-card ${liberado ? "" : "locked"}">
          <div class="stock-card-header">
            <span class="product-sigil">${produto.sigla}</span>
            <div>
              <h3>${produto.nome}</h3>
              <span>${produto.categoria}</span>
            </div>
          </div>

          <p>${liberado ? produto.descricao : `Libere em "${requisito ? requisito.titulo : "missão da guilda"}".`}</p>

          <div class="stock-metrics">
            ${linhaStatus("Estoque", `${estoque.quantidade}/${produto.estoqueMaximo}`)}
            ${linhaStatus("Custo", formatarMoeda(calcularCustoCompraUnitario(produto)))}
            ${linhaStatus("Sugerido", formatarMoeda(produto.precoInicial))}
          </div>

          <label class="price-control">
            Preço de venda
            <input type="number" min="1" step="1" value="${estoque.precoVenda}" data-price-product="${produto.id}" ${liberado ? "" : "disabled"} />
          </label>

          <div class="stock-actions">
            <button class="btn ghost small" title="Comprar 1 unidade" data-buy-product="${produto.id}" data-buy-amount="1" ${liberado ? "" : "disabled"}>1 un.</button>
            <button class="btn secondary small" title="Comprar 5 unidades" data-buy-product="${produto.id}" data-buy-amount="5" ${liberado ? "" : "disabled"}>5 un.</button>
            <button class="btn primary small" title="Comprar 10 unidades" data-buy-product="${produto.id}" data-buy-amount="10" ${liberado ? "" : "disabled"}>10 un.</button>
          </div>
        </article>
      `;
    })
    .join("");
}

/**
 * @doc-func lidarCliqueEstoque
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: event.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function lidarCliqueEstoque(event) {
  const botaoCompra = event.target.closest("[data-buy-product]");
  if (!botaoCompra) return;

  const resultado = comprarProduto(botaoCompra.dataset.buyProduct, botaoCompra.dataset.buyAmount);
  mostrarToast(resultado.mensagem);
  atualizarInterfaceJogo();
}

/**
 * @doc-func lidarAlteracaoEstoque
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: event.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function lidarAlteracaoEstoque(event) {
  const inputPreco = event.target.closest("[data-price-product]");
  if (!inputPreco) return;

  const resultado = alterarPrecoProduto(inputPreco.dataset.priceProduct, inputPreco.value);
  mostrarToast(resultado.mensagem);
  atualizarInterfaceJogo();
}

/**
 * @doc-func renderizarCheckout
 * O que faz: monta HTML dinâmico na interface; altere classes, textos e botões aqui.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function renderizarCheckout() {
  const conteudo = document.getElementById("checkout-content");
  if (!conteudo) return;

  const fila = typeof obterFilaAtendimento === "function" ? obterFilaAtendimento() : [];
  const cliente = typeof obterClienteParaAtender === "function" ? obterClienteParaAtender() : null;

  if (!cliente) {
    conteudo.innerHTML = `
      <div class="checkout-empty">
        <h3>Nenhum cliente no caixa</h3>
        <p>${fila.length ? "Os clientes ainda estão entrando na fila." : "Quando alguém terminar as compras, ele vai esperar atendimento aqui."}</p>
        <div class="checkout-queue-strip">
          ${fila.map((item) => `<span>${item.perfil.nome}</span>`).join("") || "<span>Fila vazia</span>"}
        </div>
      </div>
    `;
    return;
  }

  const carrinho = cliente.carrinho;
  if (typeof marcarClienteEmAtendimento === "function") {
    marcarClienteEmAtendimento(cliente.id);
  }

  const estoqueOk = carrinho.itens.every((item) => obterEstoque(item.produtoId).quantidade >= item.quantidade);
  const dinheiroOk = carrinho.valorEntregue >= carrinho.total;
  const trocoEsperado = Math.max(0, Number(carrinho.troco) || 0);
  const inputTrocoAtual = document.getElementById("checkout-change-input");
  const pilhaTrocoAtual = inputTrocoAtual && inputTrocoAtual.dataset.checkoutClient === cliente.id
    ? inputTrocoAtual.dataset.changeStack || ""
    : "";
  const valorTrocoAtual = calcularTotalPilhaTroco(pilhaTrocoAtual);

  conteudo.innerHTML = `
    <section class="checkout-customer">
      <div>
        <span>Cliente da vez</span>
        <h3>${cliente.perfil.nome}</h3>
      </div>
      <strong>${fila.length} na fila</strong>
    </section>

    <section class="checkout-items">
      <h3>Cesta do cliente</h3>
      ${carrinho.itens.map((item) => `
        <div class="checkout-row">
          <span>${item.quantidade}x ${item.nome}</span>
          <strong>${formatarMoeda(item.subtotal)}</strong>
          <small>Estoque: ${obterEstoque(item.produtoId).quantidade}</small>
        </div>
      `).join("")}
    </section>

    <section class="checkout-payment">
      ${linhaStatus("Total da compra", formatarMoeda(carrinho.total))}
      ${linhaStatus("Cliente entregou", formatarMoeda(carrinho.valorEntregue))}
      ${linhaStatus("Troco a devolver", formatarMoeda(trocoEsperado))}
      ${!estoqueOk ? '<div class="checkout-warning">Estoque insuficiente para fechar essa cesta.</div>' : ""}
      ${!dinheiroOk ? '<div class="checkout-warning">O cliente não entregou dinheiro suficiente.</div>' : ""}
    </section>

    <section class="checkout-change">
      <div class="checkout-change-header">
        <div>
          <span>Bandeja de troco</span>
          <strong id="checkout-change-preview">${formatarMoeda(Number(valorTrocoAtual) || 0)}</strong>
        </div>
        <small>Monte o troco com moedas e fichas antes de fechar a venda.</small>
      </div>

      <input id="checkout-change-input" data-checkout-change data-checkout-client="${cliente.id}" data-change-stack="${pilhaTrocoAtual}" type="hidden" value="${valorTrocoAtual}" />

      <div class="checkout-coin-tray" aria-label="Bandeja de moedas para montar o troco">
        ${[1, 2, 5, 10, 20, 50].map((moeda) => `
          <button type="button" data-change-coin="${moeda}">
            <span>${moeda}</span>
            <strong>+ ${formatarMoeda(moeda)}</strong>
          </button>
        `).join("")}
      </div>

      <div id="checkout-change-ledger" class="checkout-coin-ledger">
        ${renderizarPilhaTroco(pilhaTrocoAtual)}
      </div>

      <div class="checkout-coin-actions">
        <button type="button" data-change-backspace>Retirar ultima moeda</button>
        <button type="button" data-change-clear>Zerar bandeja</button>
      </div>
    </section>

    <div class="checkout-actions">
      <button class="btn ghost" data-checkout-reject data-checkout-client="${cliente.id}">Recusar venda</button>
      <button class="btn primary" data-checkout-accept data-checkout-client="${cliente.id}" ${estoqueOk && dinheiroOk ? "" : "disabled"}>Receber e devolver troco</button>
    </div>
  `;
}

/**
 * @doc-func lidarCliqueCheckout
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: event.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function lidarCliqueCheckout(event) {
  const moeda = event.target.closest("[data-change-coin]");
  const limpar = event.target.closest("[data-change-clear]");
  const apagar = event.target.closest("[data-change-backspace]");

  if (moeda || limpar || apagar) {
    alterarTrocoCheckout({ moeda, limpar, apagar });
    return;
  }

  const aceitar = event.target.closest("[data-checkout-accept]");
  const recusar = event.target.closest("[data-checkout-reject]");
  if (!aceitar && !recusar) return;

  const alvo = aceitar || recusar;
  const inputTroco = document.getElementById("checkout-change-input");
  const trocoInformado = inputTroco ? inputTroco.value : 0;
  const resultado = atenderClienteDaFila(Boolean(aceitar), alvo.dataset.checkoutClient, trocoInformado);
  mostrarToast(resultado.mensagem);

  if (resultado.mantemAtendimento) {
    if (inputTroco) {
      inputTroco.focus();
      inputTroco.select();
    }
    return;
  }

  atualizarInterfaceJogo();
  renderizarCheckout();
}

/**
 * @doc-func lidarInputCheckout
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: event.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function lidarInputCheckout(event) {
  if (!event.target.closest("[data-checkout-change]")) return;
  atualizarPreviewTrocoCheckout();
}

/**
 * @doc-func alterarTrocoCheckout
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: acao.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function alterarTrocoCheckout(acao) {
  const input = document.getElementById("checkout-change-input");
  if (!input) return;

  const pilha = obterPilhaTroco(input.dataset.changeStack || "");

  if (acao.limpar) {
    pilha.length = 0;
  } else if (acao.apagar) {
    pilha.pop();
  } else if (acao.moeda) {
    pilha.push(Math.max(0, Number(acao.moeda.dataset.changeCoin) || 0));
  }

  input.dataset.changeStack = pilha.join(",");
  input.value = String(pilha.reduce((total, valor) => total + valor, 0));
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * @doc-func atualizarPreviewTrocoCheckout
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarPreviewTrocoCheckout() {
  const input = document.getElementById("checkout-change-input");
  const preview = document.getElementById("checkout-change-preview");
  const ledger = document.getElementById("checkout-change-ledger");
  if (!input || !preview) return;

  const pilhaTexto = input.dataset.changeStack || "";
  const valor = calcularTotalPilhaTroco(pilhaTexto);
  input.value = String(valor);
  preview.textContent = formatarMoeda(valor);

  if (ledger) {
    ledger.innerHTML = renderizarPilhaTroco(pilhaTexto);
  }
}

/**
 * @doc-func obterPilhaTroco
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: pilhaTexto.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterPilhaTroco(pilhaTexto) {
  return String(pilhaTexto || "")
    .split(",")
    .map((valor) => Number(valor))
    .filter((valor) => valor > 0);
}

/**
 * @doc-func calcularTotalPilhaTroco
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: pilhaTexto.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularTotalPilhaTroco(pilhaTexto) {
  return obterPilhaTroco(pilhaTexto).reduce((total, valor) => total + valor, 0);
}

/**
 * @doc-func renderizarPilhaTroco
 * O que faz: monta HTML dinâmico na interface; altere classes, textos e botões aqui.
 * Parâmetros: pilhaTexto.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function renderizarPilhaTroco(pilhaTexto) {
  const pilha = obterPilhaTroco(pilhaTexto);

  if (!pilha.length) {
    return "<span>Nenhuma moeda na bandeja.</span>";
  }

  return pilha
    .map((valor) => `<strong>${formatarMoeda(valor)}</strong>`)
    .join("");
}

/**
 * @doc-func renderizarQuests
 * O que faz: monta HTML dinâmico na interface; altere classes, textos e botões aqui.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function renderizarQuests() {
  const resumo = document.getElementById("quest-summary");
  const lista = document.getElementById("quests-list");
  if (!resumo || !lista) return;

  const desconto = Math.round((gameState.descontoFornecedor || 0) * 100);
  resumo.innerHTML = `
    <div><span>Reputação</span><strong>${gameState.reputacao}</strong></div>
    <div><span>Experiência</span><strong>${gameState.experiencia}</strong></div>
    <div><span>Desconto</span><strong>${desconto}%</strong></div>
    ${renderizarResultadoQuest()}
  `;

  lista.innerHTML = questDefinitions
    .map((quest) => {
      const requisitos = avaliarRequisitosQuest(quest);
      const concluida = !quest.repetivel && questFoiConcluida(quest.id);
      const chance = Math.round(calcularChanceQuest(quest) * 100);
      const custo = descreverCustoQuest(quest);
      const recompensa = descreverRecompensaQuest(quest);

      return `
        <article class="quest-card ${requisitos.ok ? "available" : "locked"}">
          <div class="quest-card-header">
            <div>
              <span>${quest.tipo}</span>
              <h3>${quest.titulo}</h3>
            </div>
            <strong>${chance}%</strong>
          </div>
          <p>${quest.descricao}</p>
          <div class="quest-details">
            <span>Custo: ${custo}</span>
            <span>Recompensa: ${recompensa}</span>
          </div>
          <div class="quest-footer">
            <small>${requisitos.ok ? "Disponível" : requisitos.motivos.join(" ")}</small>
            <button class="btn primary small" data-start-quest="${quest.id}" ${requisitos.ok && !concluida ? "" : "disabled"}>
              ${concluida ? "Concluída" : "Fazer missão"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

/**
 * @doc-func renderizarResultadoQuest
 * O que faz: monta HTML dinâmico na interface; altere classes, textos e botões aqui.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function renderizarResultadoQuest() {
  if (!ultimoResultadoQuest) return "";

  const detalhes = ultimoResultadoQuest.detalhes && ultimoResultadoQuest.detalhes.length
    ? ultimoResultadoQuest.detalhes
    : ["Sem ganhos diretos"];

  return `
    <div class="quest-result ${ultimoResultadoQuest.sucesso ? "success" : "failure"}">
      <div>
        <strong>${ultimoResultadoQuest.mensagem}</strong>
        <span>${ultimoResultadoQuest.sucesso ? "Recompensas aplicadas" : "Efeitos da tentativa aplicados"}</span>
      </div>
      <div class="quest-result-tags">
        ${detalhes.map((detalhe) => `<span>${detalhe}</span>`).join("")}
      </div>
    </div>
  `;
}

/**
 * @doc-func descreverCustoQuest
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: quest.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function descreverCustoQuest(quest) {
  const custo = quest.custo || {};
  const partes = [];

  if (custo.caixa) partes.push(formatarMoeda(custo.caixa));

  if (custo.estoque) {
    Object.entries(custo.estoque).forEach(([produtoId, quantidade]) => {
      const produto = obterProduto(produtoId);
      partes.push(`${quantidade}x ${produto ? produto.nome : produtoId}`);
    });
  }

  return partes.length ? partes.join(", ") : "Nenhum";
}

/**
 * @doc-func descreverRecompensaQuest
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: quest.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function descreverRecompensaQuest(quest) {
  const recompensa = quest.recompensa || {};
  const partes = [];

  if (recompensa.caixa) partes.push(formatarMoeda(recompensa.caixa));
  if (recompensa.reputacao) partes.push(`reputação +${recompensa.reputacao}`);
  if (recompensa.experiencia) partes.push(`experiência +${recompensa.experiencia}`);
  if (recompensa.clientela) partes.push("clientela");
  if (recompensa.energia) partes.push("energia reduzida");
  if (recompensa.descontoFornecedor) partes.push("desconto");
  if (recompensa.ajudanteDesbloqueado) partes.push("ajudante");
  if (recompensa.sprintDesbloqueado) partes.push("corrida com Ctrl");
  if (recompensa.desbloqueiaProduto) {
    const produto = obterProduto(recompensa.desbloqueiaProduto);
    partes.push(`${produto ? produto.nome : "produto"} liberado`);
  }

  if (recompensa.estoque) {
    Object.entries(recompensa.estoque).forEach(([produtoId, quantidade]) => {
      const produto = obterProduto(produtoId);
      partes.push(`${produto ? produto.nome : produtoId} +${quantidade}`);
    });
  }

  return partes.join(", ");
}

/**
 * @doc-func lidarCliqueQuest
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: event.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function lidarCliqueQuest(event) {
  const botao = event.target.closest("[data-start-quest]");
  if (!botao || questEmAndamento) return;

  executarQuestComLoading(botao.dataset.startQuest);
}

/**
 * @doc-func executarQuestComLoading
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: questId.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function executarQuestComLoading(questId) {
  const quest = obterQuest(questId);
  if (!quest) return;

  const requisitos = avaliarRequisitosQuest(quest);
  if (!requisitos.ok) {
    mostrarToast(requisitos.motivos[0]);
    return;
  }

  questEmAndamento = true;
  ultimoResultadoQuest = null;

  const titulo = document.getElementById("quest-loading-title");
  const dica = document.getElementById("quest-loading-tip");
  const runner = document.getElementById("quest-runner");
  const progress = document.querySelector(".quest-loading-progress span");

  if (titulo) titulo.textContent = quest.titulo;
  if (dica) dica.textContent = questTips[Math.floor(Math.random() * questTips.length)];

  if (runner) {
    runner.className = "quest-runner";
    runner.classList.add(gameState.personagem === "female" ? "manager-female-walk-side" : "manager-male-walk-side");
  }

  if (progress) {
    progress.style.animation = "none";
    progress.offsetHeight;
    progress.style.animation = "";
  }

  abrirModal("quest-loading-modal");

  window.setTimeout(() => {
    const resultado = executarQuest(questId);
    ultimoResultadoQuest = resultado.ok ? resultado : null;
    questEmAndamento = false;
    atualizarInterfaceJogo();
    abrirQuests();

    const detalhesResumo = resultado.detalhes && resultado.detalhes.length
      ? ` ${resultado.detalhes.slice(0, 2).join(" · ")}`
      : "";
    mostrarToast(`${resultado.mensagem}${detalhesResumo}`);
  }, QUEST_LOADING_MS);
}

/**
 * @doc-func renderizarRelatorio
 * O que faz: monta HTML dinâmico na interface; altere classes, textos e botões aqui.
 * Parâmetros: relatorio.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function renderizarRelatorio(relatorio) {
  const conteudo = document.getElementById("report-content");
  if (!conteudo) return;

  if (!relatorio) {
    conteudo.innerHTML = `
      <div class="empty-state">
        <h3>Nenhum dia encerrado ainda</h3>
        <p>O primeiro relatório aparece depois que o expediente terminar e você encerrar o dia.</p>
      </div>
    `;
    return;
  }

  const valorPerdas = relatorio.perdas.reduce((total, item) => total + item.valor, 0);
  const vendas = relatorio.vendas
    .filter((item) => item.vendidos > 0)
    .map((item) => `
      <div class="report-row">
        <span>${item.nome} · ${item.vendidos} un.</span>
        <strong>${formatarMoeda(item.receita)}</strong>
      </div>
    `)
    .join("");

  const perdas = relatorio.perdas
    .map((item) => `
      <div class="report-row muted">
        <span>${item.nome} perdido · ${item.quantidade} un.</span>
        <strong>${formatarMoeda(item.valor)}</strong>
      </div>
    `)
    .join("");

  conteudo.innerHTML = `
    <section class="report-highlight ${relatorio.lucroLiquido >= 0 ? "positive" : "negative"}">
      <span>Dia ${relatorio.dia}</span>
      <h3>${relatorio.lucroLiquido >= 0 ? "Lucro" : "Prejuízo"} de ${formatarMoeda(Math.abs(relatorio.lucroLiquido))}</h3>
      <p>${relatorio.evento.titulo}: ${relatorio.evento.descricao}</p>
    </section>

    <div class="report-columns">
      <section>
        <h3>Resultado</h3>
        ${linhaStatus("Receita", formatarMoeda(relatorio.receita))}
        ${linhaStatus("Custo das mercadorias", formatarMoeda(relatorio.custoMercadorias))}
        ${linhaStatus("Custos fixos", formatarMoeda(relatorio.custosFixos))}
        ${valorPerdas > 0 ? linhaStatus("Perdas de estoque", formatarMoeda(valorPerdas)) : ""}
        ${linhaStatus("Lucro líquido", formatarMoeda(relatorio.lucroLiquido))}
        ${linhaStatus("Caixa final", formatarMoeda(relatorio.caixaDepois))}
      </section>

      <section>
        <h3>Vendas</h3>
        ${vendas || '<div class="report-row muted"><span>Nada vendido</span><strong>R$ 0,00</strong></div>'}
        ${perdas ? `<h3>Perdas</h3>${perdas}` : ""}
      </section>
    </div>

    ${gameState.fimDeJogo ? `
      <section class="endgame-card ${gameState.fimDeJogo.tipo}">
        <h3>${gameState.fimDeJogo.titulo}</h3>
        <p>${gameState.fimDeJogo.mensagem}</p>
      </section>
    ` : ""}
  `;
}

/**
 * @doc-func lidarCliqueObjetivo
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: event.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function lidarCliqueObjetivo(event) {
  const contratar = event.target.closest("[data-hire-helper]");
  if (!contratar) return;

  const resultado = contratarAjudante();
  mostrarToast(resultado.mensagem);
  atualizarInterfaceJogo();
}

/**
 * @doc-func mostrarToast
 * O que faz: exibe feedback visual para o jogador; ajuste mensagens, telas ou animações aqui.
 * Parâmetros: mensagem.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function mostrarToast(mensagem) {
  if (!ui.toast || !mensagem) return;

  ui.toast.textContent = mensagem;
  ui.toast.classList.add("visible");

  window.clearTimeout(ui.toastTimer);
  ui.toastTimer = window.setTimeout(() => {
    ui.toast.classList.remove("visible");
  }, 2600);
}

if (document.readyState !== "loading") {
  inicializarInterface();
} else {
  document.addEventListener("DOMContentLoaded", inicializarInterface);
}
