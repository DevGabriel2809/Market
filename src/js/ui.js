let interfaceInicializada = false;
let ultimoResultadoQuest = null;
let questEmAndamento = false;
const QUEST_LOADING_MS = 7800;

const ui = {};

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
  ui.questLoadingModal = document.getElementById("quest-loading-modal");
  ui.toast = document.getElementById("game-toast");

  const btnPassarDia = ui.btnPassarDia;
  const btnStatus = document.getElementById("btn-status");
  const btnEstoque = document.getElementById("btn-estoque");
  const btnQuests = document.getElementById("btn-quests");
  const btnRelatorio = document.getElementById("btn-relatorio");
  const btnSalvar = document.getElementById("btn-salvar");
  const btnCarregar = document.getElementById("btn-carregar");
  const stockList = document.getElementById("stock-product-list");
  const questsList = document.getElementById("quests-list");
  const objectives = document.getElementById("status-objectives");

  if (btnPassarDia) {
    btnPassarDia.addEventListener("click", () => {
      const relatorio = passarDia();
      atualizarInterfaceJogo();

      if (relatorio) {
        abrirRelatorio(relatorio);
        mostrarToast(gameState.fimDeJogo ? gameState.fimDeJogo.titulo : "Dia encerrado.");
      }
    });
  }

  if (btnStatus) {
    btnStatus.addEventListener("click", abrirStatus);
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

function atualizarInterfaceJogo(opcoes = {}) {
  inicializarEstoque();
  renderizarHud();
  renderizarCustosFixos();
  renderizarProdutosResumo();

  if (ui.statusModal && !ui.statusModal.classList.contains("hidden")) {
    renderizarStatus();
  }

  if (ui.stockModal && !ui.stockModal.classList.contains("hidden") && opcoes.origem !== "venda") {
    renderizarEstoque();
  }

  if (ui.questsModal && !ui.questsModal.classList.contains("hidden")) {
    renderizarQuests();
  }
}

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

function atualizarHudTempo() {
  if (ui.horaAtual) ui.horaAtual.textContent = formatarHoraDoJogo();

  if (ui.dayProgressBar) {
    ui.dayProgressBar.style.width = `${Math.round(obterProgressoDia() * 100)}%`;
  }

  if (ui.dayStatusText) {
    if (gameState.fimDeJogo) {
      ui.dayStatusText.textContent = "Campanha encerrada";
    } else if (gameState.diaProntoParaEncerrar) {
      ui.dayStatusText.textContent = "Expediente concluído";
    } else {
      ui.dayStatusText.textContent = `Fecha em ${formatarTempoCurto(obterTempoRestanteDia())}`;
    }
  }

  if (ui.btnPassarDia) {
    ui.btnPassarDia.disabled = !gameState.diaProntoParaEncerrar || Boolean(gameState.fimDeJogo);
    ui.btnPassarDia.textContent = gameState.diaProntoParaEncerrar
      ? "Encerrar Dia"
      : `Aguarde ${formatarTempoCurto(obterTempoRestanteDia())}`;
  }
}

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

function abrirModal(modalId) {
  if (!ui.modalBackdrop) return;

  document.querySelector(".actions-panel")?.classList.remove("open");
  document.querySelector(".finance-panel")?.classList.remove("open");

  [ui.statusModal, ui.stockModal, ui.questsModal, ui.reportModal, ui.questLoadingModal].forEach((modal) => {
    if (modal) modal.classList.add("hidden");
  });

  const modal = document.getElementById(modalId);
  if (!modal) return;

  ui.modalBackdrop.classList.remove("hidden");
  modal.classList.remove("hidden");
}

function fecharModal() {
  if (!ui.modalBackdrop || questEmAndamento) return;

  ui.modalBackdrop.classList.add("hidden");
  [ui.statusModal, ui.stockModal, ui.questsModal, ui.reportModal, ui.questLoadingModal].forEach((modal) => {
    if (modal) modal.classList.add("hidden");
  });
}

function modalEstaAberto() {
  return ui.modalBackdrop && !ui.modalBackdrop.classList.contains("hidden");
}

function abrirStatus() {
  renderizarStatus();
  abrirModal("status-modal");
}

function abrirEstoque() {
  renderizarEstoque();
  abrirModal("stock-modal");
}

function abrirQuests() {
  renderizarQuests();
  abrirModal("quests-modal");
}

function abrirRelatorio(relatorio) {
  renderizarRelatorio(relatorio);
  abrirModal("report-modal");
}

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
    operacao.innerHTML = `
      ${linhaStatus("Dia", `${gameState.dia}/${gameState.diaMaximo}`)}
      ${linhaStatus("Reputação", gameState.reputacao)}
      ${linhaStatus("Experiência", gameState.experiencia)}
      ${linhaStatus("Vendas hoje", resumo.unidadesHoje)}
      ${linhaStatus("Itens em estoque", resumo.quantidadeEstoque)}
      ${linhaStatus("Custo fixo diário", formatarMoeda(calcularCustosFixos()))}
      ${linhaStatus("Desconto fornecedor", `${Math.round((gameState.descontoFornecedor || 0) * 100)}%`)}
    `;
  }

  if (objetivos) {
    const progressoCaixa = Math.min(100, Math.round((gameState.caixa / 5000) * 100));
    const concluidas = gameState.quests.concluidas.length;
    const ajudanteTexto = gameState.ajudanteContratado
      ? "Ajudante contratado"
      : gameState.ajudanteDesbloqueado
        ? `<button class="btn primary small" data-hire-helper>Contratar ajudante por ${formatarMoeda(900)}</button>`
        : "Ajudante bloqueado pela guilda";

    objetivos.innerHTML = `
      ${barraObjetivo("Meta de caixa", progressoCaixa, `${formatarMoeda(gameState.caixa)} / ${formatarMoeda(5000)}`)}
      ${barraObjetivo("Campanha", Math.round((gameState.dia / gameState.diaMaximo) * 100), `Dia ${gameState.dia} de ${gameState.diaMaximo}`)}
      ${barraObjetivo("Missões únicas", Math.round((concluidas / 4) * 100), `${concluidas} concluída(s)`)}
      <div class="objective-row">
        <span>Equipe</span>
        <strong>${ajudanteTexto}</strong>
      </div>
    `;
  }
}

function linhaStatus(rotulo, valor) {
  return `
    <div class="status-row">
      <span>${rotulo}</span>
      <strong>${valor}</strong>
    </div>
  `;
}

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

function lidarCliqueEstoque(event) {
  const botaoCompra = event.target.closest("[data-buy-product]");
  if (!botaoCompra) return;

  const resultado = comprarProduto(botaoCompra.dataset.buyProduct, botaoCompra.dataset.buyAmount);
  mostrarToast(resultado.mensagem);
  atualizarInterfaceJogo();
}

function lidarAlteracaoEstoque(event) {
  const inputPreco = event.target.closest("[data-price-product]");
  if (!inputPreco) return;

  const resultado = alterarPrecoProduto(inputPreco.dataset.priceProduct, inputPreco.value);
  mostrarToast(resultado.mensagem);
  atualizarInterfaceJogo();
}

function renderizarQuests() {
  const resumo = document.getElementById("quest-summary");
  const lista = document.getElementById("quests-list");
  if (!resumo || !lista) return;

  const desconto = Math.round((gameState.descontoFornecedor || 0) * 100);
  resumo.innerHTML = `
    <div><span>Reputação</span><strong>${gameState.reputacao}</strong></div>
    <div><span>Experiência</span><strong>${gameState.experiencia}</strong></div>
    <div><span>Desconto</span><strong>${desconto}%</strong></div>
    ${ultimoResultadoQuest ? `<div class="quest-result ${ultimoResultadoQuest.sucesso ? "success" : "failure"}"><strong>${ultimoResultadoQuest.mensagem}</strong><span>${ultimoResultadoQuest.detalhes.join(" · ") || "Sem ganhos diretos."}</span></div>` : ""}
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

function lidarCliqueQuest(event) {
  const botao = event.target.closest("[data-start-quest]");
  if (!botao || questEmAndamento) return;

  executarQuestComLoading(botao.dataset.startQuest);
}

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
    mostrarToast(resultado.mensagem);
  }, QUEST_LOADING_MS);
}

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

function lidarCliqueObjetivo(event) {
  const contratar = event.target.closest("[data-hire-helper]");
  if (!contratar) return;

  const resultado = contratarAjudante();
  mostrarToast(resultado.mensagem);
  atualizarInterfaceJogo();
}

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
