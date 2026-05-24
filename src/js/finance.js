// ======================================================
// DOCUMENTAÇÃO DO ARQUIVO: finance.js
// ======================================================
// Controla dia, expediente, relatórios, custos fixos, vendas e fechamento. Ajuste duração do expediente e fórmulas financeiras aqui.
// ======================================================

const MINUTOS_PREPARACAO_RELOGIO = 3;
const HORA_PREPARACAO = (8 * 60) - MINUTOS_PREPARACAO_RELOGIO;
const HORA_ABERTURA = 8 * 60;
const HORA_FECHAMENTO = 18 * 60;
const MINUTOS_EXPEDIENTE = HORA_FECHAMENTO - HORA_ABERTURA;

const eventosDeMercado = [
  {
    id: "feira_movimentada",
    titulo: "Feira movimentada",
    descricao: "Mais viajantes passaram pela vila hoje.",
    demanda: 1.18
  },
  {
    id: "chuva_forte",
    titulo: "Chuva forte",
    descricao: "Pouca gente saiu de casa.",
    demanda: 0.82
  },
  {
    id: "festa_na_taverna",
    titulo: "Festa na taverna",
    descricao: "Comidas venderam melhor perto da taberna.",
    categoria: "Alimento",
    demanda: 1.28
  },
  {
    id: "noite_escura",
    titulo: "Noite escura",
    descricao: "A procura por velas aumentou.",
    produtoId: "vela",
    demanda: 1.55
  },
  {
    id: "guarda_doente",
    titulo: "Guarda adoentado",
    descricao: "Poções simples saíram melhor.",
    produtoId: "pocao",
    demanda: 1.45
  },
  {
    id: "reparo_urgente",
    titulo: "Reparo urgente",
    descricao: "Uma prateleira precisou de conserto.",
    custoExtra: 70
  }
];

/**
 * @doc-func formatarMoeda
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: valor.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

/**
 * @doc-func calcularCustosFixos
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularCustosFixos() {
  const custoAjudante = gameState.ajudanteContratado ? gameState.custoAjudante : 0;
  return gameState.aluguel + gameState.energia + custoAjudante;
}

/**
 * @doc-func obterCustosFixosDetalhados
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterCustosFixosDetalhados() {
  const custos = [
    { nome: "Aluguel do espaço", valor: gameState.aluguel },
    { nome: "Iluminação", valor: gameState.energia }
  ];

  if (gameState.ajudanteContratado) {
    custos.push({ nome: "Ajudante contratado", valor: gameState.custoAjudante });
  }

  return custos;
}

/**
 * @doc-func calcularBonusClientela
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularBonusClientela() {
  const reputacao = Math.min(gameState.reputacao, 40) * 0.015;
  const experiencia = Math.min(gameState.experiencia, 25) * 0.006;
  const ajudante = gameState.ajudanteContratado ? 0.18 : 0;
  return gameState.clientela + reputacao + experiencia + ajudante;
}

/**
 * @doc-func sortearEventoDeMercado
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function sortearEventoDeMercado() {
  if (Math.random() > 0.55) {
    return {
      id: "dia_normal",
      titulo: "Dia normal",
      descricao: "O movimento seguiu o ritmo comum da vila.",
      demanda: 1
    };
  }

  return eventosDeMercado[Math.floor(Math.random() * eventosDeMercado.length)];
}

/**
 * @doc-func calcularMultiplicadorEvento
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: produto, evento.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularMultiplicadorEvento(produto, evento) {
  let multiplicador = evento.demanda || 1;

  if (evento.produtoId && evento.produtoId !== produto.id) {
    multiplicador = 1;
  }

  if (evento.categoria && evento.categoria !== produto.categoria) {
    multiplicador = 1;
  }

  return multiplicador;
}

/**
 * @doc-func criarRelatorioBase
 * O que faz: cria elementos ou dados novos; mude aqui quando quiser alterar estrutura, classe CSS ou valores iniciais.
 * Parâmetros: evento.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function criarRelatorioBase(evento) {
  return {
    dia: gameState.dia,
    evento,
    vendas: productCatalog.map((produto) => ({
      produtoId: produto.id,
      nome: produto.nome,
      vendidos: 0,
      receita: 0,
      custoMercadoria: 0,
      preco: obterEstoque(produto.id).precoVenda
    })),
    perdas: [],
    receita: 0,
    custoMercadorias: 0,
    custosFixos: 0,
    lucroBruto: 0,
    lucroLiquido: 0,
    unidadesVendidas: 0,
    caixaAntes: gameState.caixa,
    caixaDepois: gameState.caixa,
    fechado: false
  };
}

/**
 * @doc-func iniciarNovoDia
 * O que faz: inicia um fluxo/sistema; ajuste valores iniciais e chamadas de preparação aqui.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function iniciarNovoDia() {
  if (gameState.fimDeJogo) return;

  gameState.faseDia = "preparacao";
  gameState.tempoDiaDecorridoMs = 0;
  gameState.tempoPreparacaoDecorridoMs = 0;
  gameState.preparacaoAvisoMostrado = false;
  gameState.diaEmAndamento = false;
  gameState.diaProntoParaEncerrar = false;
  gameState.diaEncerradoNotificado = false;
  gameState.relatorioEmAndamento = criarRelatorioBase(sortearEventoDeMercado());

  if (typeof resetarNPCsDoDia === "function") {
    resetarNPCsDoDia();
  }

  if (typeof resetarDicasNPCsEstaticosDoDia === "function") {
    resetarDicasNPCsEstaticosDoDia();
  }

  if (typeof sincronizarAjudanteVisual === "function") {
    sincronizarAjudanteVisual();
  }
}

/**
 * @doc-func iniciarExpediente
 * O que faz: inicia um fluxo/sistema; ajuste valores iniciais e chamadas de preparação aqui.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function iniciarExpediente() {
  if (gameState.fimDeJogo) {
    return { ok: false, mensagem: "A campanha já terminou." };
  }

  if (gameState.faseDia !== "preparacao") {
    return { ok: false, mensagem: "O expediente já foi iniciado." };
  }

  gameState.faseDia = "expediente";
  gameState.tempoDiaDecorridoMs = 0;
  gameState.tempoPreparacaoDecorridoMs = 0;
  gameState.preparacaoAvisoMostrado = false;
  gameState.diaEmAndamento = true;
  gameState.diaProntoParaEncerrar = false;
  gameState.diaEncerradoNotificado = false;

  if (!gameState.relatorioEmAndamento) {
    gameState.relatorioEmAndamento = criarRelatorioBase(sortearEventoDeMercado());
  }

  if (typeof cancelarAvisoInicioExpediente === "function") {
    cancelarAvisoInicioExpediente();
  }

  if (typeof abrirExpediente === "function") {
    abrirExpediente();
  }

  return {
    ok: true,
    mensagem: "Expediente iniciado. As vendas só acontecerão com clientes reais."
  };
}

/**
 * @doc-func obterMinutosDoDia
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterMinutosDoDia() {
  if (gameState.faseDia === "preparacao") {
    const duracaoPreparacao = gameState.duracaoPreparacaoMs || 150000;
    const progressoPreparacao = Math.min(1, (gameState.tempoPreparacaoDecorridoMs || 0) / duracaoPreparacao);
    return Math.min(HORA_ABERTURA, HORA_PREPARACAO + Math.floor(progressoPreparacao * MINUTOS_PREPARACAO_RELOGIO));
  }

  if (gameState.faseDia === "fechamento" || gameState.diaProntoParaEncerrar) {
    return HORA_FECHAMENTO;
  }

  const minutoDiaMs = gameState.duracaoExpedienteMs / MINUTOS_EXPEDIENTE;
  const minutosPassados = Math.floor(gameState.tempoDiaDecorridoMs / minutoDiaMs);
  return Math.min(HORA_FECHAMENTO, HORA_ABERTURA + minutosPassados);
}

/**
 * @doc-func formatarHoraDoJogo
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function formatarHoraDoJogo() {
  const minutosDoDia = obterMinutosDoDia();
  const horas = Math.floor(minutosDoDia / 60);
  const minutos = minutosDoDia % 60;
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

/**
 * @doc-func obterProgressoDia
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterProgressoDia() {
  if (gameState.faseDia === "preparacao") {
    const duracaoPreparacao = gameState.duracaoPreparacaoMs || 150000;
    return Math.min(1, (gameState.tempoPreparacaoDecorridoMs || 0) / duracaoPreparacao);
  }
  if (gameState.faseDia === "fechamento") return 1;
  return Math.min(1, gameState.tempoDiaDecorridoMs / gameState.duracaoExpedienteMs);
}

/**
 * @doc-func obterTempoRestanteDia
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterTempoRestanteDia() {
  if (gameState.faseDia === "preparacao") {
    return Math.max(0, (gameState.duracaoPreparacaoMs || 150000) - (gameState.tempoPreparacaoDecorridoMs || 0));
  }

  if (gameState.faseDia !== "expediente") return 0;
  return Math.max(0, gameState.duracaoExpedienteMs - gameState.tempoDiaDecorridoMs);
}

/**
 * @doc-func formatarTempoCurto
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: ms.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function formatarTempoCurto(ms) {
  const totalSegundos = Math.ceil(ms / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

/**
 * @doc-func processarTempoDoDia
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: deltaTime.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function processarTempoDoDia(deltaTime) {
  if (gameState.fimDeJogo) return;

  if (gameState.faseDia === "preparacao") {
    const duracaoPreparacao = gameState.duracaoPreparacaoMs || 150000;
    gameState.tempoPreparacaoDecorridoMs = Math.min(
      duracaoPreparacao,
      (gameState.tempoPreparacaoDecorridoMs || 0) + deltaTime
    );

    if (typeof atualizarHudTempo === "function") {
      atualizarHudTempo();
    }

    if (gameState.tempoPreparacaoDecorridoMs >= duracaoPreparacao && !gameState.preparacaoAvisoMostrado) {
      gameState.preparacaoAvisoMostrado = true;

      if (typeof mostrarAvisoInicioExpediente === "function") {
        mostrarAvisoInicioExpediente();
      } else {
        iniciarExpediente();
      }
    }

    return;
  }

  if (gameState.faseDia !== "expediente" || !gameState.diaEmAndamento) return;

  gameState.tempoDiaDecorridoMs += deltaTime;

  if (gameState.tempoDiaDecorridoMs >= gameState.duracaoExpedienteMs) {
    gameState.tempoDiaDecorridoMs = gameState.duracaoExpedienteMs;
    gameState.faseDia = "fechamento";
    gameState.diaEmAndamento = false;
    gameState.diaProntoParaEncerrar = true;

    if (typeof fecharExpediente === "function") {
      fecharExpediente();
    }

    if (!gameState.diaEncerradoNotificado) {
      gameState.diaEncerradoNotificado = true;

      if (typeof mostrarToast === "function") {
        mostrarToast("O expediente terminou. Nenhuma venda acontece até o próximo dia.");
      }
    }
  }

  if (typeof atualizarHudTempo === "function") {
    atualizarHudTempo();
  }
}

/**
 * @doc-func venderProdutoParaCliente
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: produtoId, quantidade = 1.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function venderProdutoParaCliente(produtoId, quantidade = 1) {
  if (gameState.faseDia !== "expediente" || !gameState.diaEmAndamento) {
    return { ok: false, mensagem: "O mercado não está aberto para vendas." };
  }

  const produto = obterProduto(produtoId);
  if (!produto || !produtoEstaLiberado(produto)) {
    return { ok: false, mensagem: "Produto indisponível." };
  }

  const estoque = obterEstoque(produtoId);
  const quantidadeFinal = Math.min(Math.max(1, Number(quantidade) || 1), estoque.quantidade);

  if (quantidadeFinal <= 0) {
    return { ok: false, mensagem: `${produto.nome} está sem estoque.` };
  }

  const relatorio = gameState.relatorioEmAndamento;
  if (!relatorio) return { ok: false, mensagem: "Relatório do dia não foi iniciado." };

  registrarVenda(produto, quantidadeFinal, relatorio);

  if (typeof atualizarInterfaceJogo === "function") {
    atualizarInterfaceJogo({ origem: "venda" });
  }

  return {
    ok: true,
    mensagem: `${quantidadeFinal}x ${produto.nome} vendido(s).`,
    produto,
    quantidade: quantidadeFinal,
    receita: Math.max(1, estoque.precoVenda) * quantidadeFinal
  };
}

/**
 * @doc-func venderCarrinhoParaCliente
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: itens = [].
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function venderCarrinhoParaCliente(itens = []) {
  if (gameState.faseDia !== "expediente" || !gameState.diaEmAndamento) {
    return { ok: false, mensagem: "O mercado não está aberto para vendas." };
  }

  if (!gameState.relatorioEmAndamento) {
    return { ok: false, mensagem: "Relatório do dia não foi iniciado." };
  }

  const itensValidados = itens
    .map((item) => {
      const produto = obterProduto(item.produtoId);
      const quantidade = Math.max(1, Number(item.quantidade) || 1);
      const estoque = produto ? obterEstoque(produto.id) : null;

      return { produto, quantidade, estoque };
    })
    .filter((item) => item.produto && produtoEstaLiberado(item.produto));

  if (!itensValidados.length) {
    return { ok: false, mensagem: "O cliente não tem itens válidos." };
  }

  const itemSemEstoque = itensValidados.find((item) => item.estoque.quantidade < item.quantidade);
  if (itemSemEstoque) {
    return {
      ok: false,
      mensagem: `${itemSemEstoque.produto.nome} não tem estoque suficiente.`
    };
  }

  const relatorio = gameState.relatorioEmAndamento;
  let receita = 0;
  let quantidadeTotal = 0;

  itensValidados.forEach((item) => {
    registrarVenda(item.produto, item.quantidade, relatorio);
    receita += Math.max(1, item.estoque.precoVenda) * item.quantidade;
    quantidadeTotal += item.quantidade;
  });

  if (typeof atualizarInterfaceJogo === "function") {
    atualizarInterfaceJogo({ origem: "venda" });
  }

  return {
    ok: true,
    mensagem: `${quantidadeTotal} item(ns) vendido(s).`,
    receita,
    quantidade: quantidadeTotal
  };
}

/**
 * @doc-func escolherProdutoParaCliente
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: evento.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function escolherProdutoParaCliente(evento) {
  const candidatos = productCatalog
    .filter((produto) => produtoEstaLiberado(produto) && obterEstoque(produto.id).quantidade > 0)
    .map((produto) => {
      const estoque = obterEstoque(produto.id);
      const preco = Math.max(1, estoque.precoVenda);
      const precoReferencia = Math.max(1, produto.precoInicial);
      const fatorPreco = Math.max(0.08, Math.min(1.85, precoReferencia / preco));
      const peso = produto.demandaBase
        * Math.pow(fatorPreco, 1.35)
        * calcularBonusClientela()
        * calcularMultiplicadorEvento(produto, evento);

      return { produto, peso };
    })
    .filter((item) => item.peso > 0);

  const pesoTotal = candidatos.reduce((total, item) => total + item.peso, 0);
  if (pesoTotal <= 0) return null;

  let roleta = Math.random() * pesoTotal;

  for (const item of candidatos) {
    roleta -= item.peso;

    if (roleta <= 0) {
      return item.produto;
    }
  }

  return candidatos[candidatos.length - 1].produto;
}

/**
 * @doc-func registrarVenda
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: produto, quantidade, relatorio.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
/**
 * @doc-func registrarVenda
 * O que faz: registra um evento/estado temporário; edite para mudar feedback ou contadores.
 * Parâmetros: produto, quantidade, relatorio.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function registrarVenda(produto, quantidade, relatorio) {
  const estoque = obterEstoque(produto.id);
  const preco = Math.max(1, estoque.precoVenda);
  const receita = preco * quantidade;
  const custoMercadoria = calcularCustoCompraUnitario(produto) * quantidade;
  const venda = relatorio.vendas.find((item) => item.produtoId === produto.id);

  estoque.quantidade -= quantidade;
  estoque.vendidosTotal += quantidade;
  gameState.caixa += receita;

  venda.vendidos += quantidade;
  venda.receita += receita;
  venda.custoMercadoria += custoMercadoria;
  venda.preco = preco;

  relatorio.receita += receita;
  relatorio.custoMercadorias += custoMercadoria;
  relatorio.unidadesVendidas += quantidade;
  relatorio.lucroBruto = relatorio.receita - relatorio.custoMercadorias;
  relatorio.caixaDepois = gameState.caixa;
}

/**
 * @doc-func aplicarPerdasDeEstoque
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function aplicarPerdasDeEstoque() {
  const perdas = [];

  productCatalog.forEach((produto) => {
    if (!produto.perecivel) return;

    const estoque = obterEstoque(produto.id);
    if (estoque.quantidade <= 8) return;

    const chance = produto.perecivel * (0.25 + Math.random() * 0.75);
    const perdidos = Math.floor(estoque.quantidade * chance);
    if (perdidos <= 0) return;

    estoque.quantidade -= perdidos;
    estoque.perdidosTotal += perdidos;
    perdas.push({
      produtoId: produto.id,
      nome: produto.nome,
      quantidade: perdidos,
      valor: perdidos * calcularCustoCompraUnitario(produto)
    });
  });

  return perdas;
}

/**
 * @doc-func passarDia
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function passarDia() {
  if (gameState.fimDeJogo) {
    return gameState.ultimoRelatorio;
  }

  if (!gameState.diaProntoParaEncerrar || gameState.faseDia !== "fechamento") {
    if (typeof mostrarToast === "function") {
      const mensagem = gameState.faseDia === "preparacao"
        ? "Inicie o expediente antes de encerrar o dia."
        : `Aguarde o fim do expediente: ${formatarTempoCurto(obterTempoRestanteDia())}.`;
      mostrarToast(mensagem);
    }

    return null;
  }

  const relatorio = gameState.relatorioEmAndamento || criarRelatorioBase(sortearEventoDeMercado());
  const custoExtra = relatorio.evento.custoExtra || 0;
  const perdas = aplicarPerdasDeEstoque();
  const custosFixos = calcularCustosFixos() + custoExtra;
  const valorPerdas = perdas.reduce((total, item) => total + item.valor, 0);

  gameState.caixa -= custosFixos;

  relatorio.perdas = perdas;
  relatorio.custosFixos = custosFixos;
  relatorio.lucroBruto = relatorio.receita - relatorio.custoMercadorias;
  relatorio.lucroLiquido = relatorio.lucroBruto - custosFixos - valorPerdas;
  relatorio.caixaDepois = gameState.caixa;
  relatorio.fechado = true;

  if (relatorio.unidadesVendidas > 0) {
    gameState.experiencia += Math.max(1, Math.ceil(relatorio.unidadesVendidas / 14));
  }

  if (relatorio.unidadesVendidas >= 32) {
    gameState.reputacao += 1;
  }

  gameState.ultimoRelatorio = relatorio;
  gameState.historico.push(relatorio);
  gameState.relatorioEmAndamento = null;
  gameState.diaProntoParaEncerrar = false;
  gameState.diaEmAndamento = false;
  gameState.faseDia = "preparacao";

  atualizarCooldownsDeQuests();
  verificarFimDeJogo();

  if (!gameState.fimDeJogo) {
    gameState.dia += 1;
    iniciarNovoDia();
  }

  return relatorio;
}

/**
 * @doc-func atualizarCooldownsDeQuests
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarCooldownsDeQuests() {
  Object.keys(gameState.quests.cooldowns).forEach((questId) => {
    gameState.quests.cooldowns[questId] -= 1;

    if (gameState.quests.cooldowns[questId] <= 0) {
      delete gameState.quests.cooldowns[questId];
    }
  });
}

/**
 * @doc-func verificarFimDeJogo
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function verificarFimDeJogo() {
  if (gameState.caixa < 0) {
    gameState.fimDeJogo = {
      tipo: "derrota",
      titulo: "Caixa negativo",
      mensagem: "O mercado não conseguiu pagar as despesas."
    };
    return;
  }

  if (gameState.dia >= gameState.diaMaximo) {
    const venceu = gameState.caixa >= 5000;
    gameState.fimDeJogo = {
      tipo: venceu ? "vitoria" : "derrota",
      titulo: venceu ? "Mercado consolidado" : "Meta não alcançada",
      mensagem: venceu
        ? "O reino reconheceu seu mercado como uma operação sustentável."
        : "O mercado sobreviveu, mas não juntou caixa suficiente para vencer."
    };
  }
}

/**
 * @doc-func calcularResumoFinanceiro
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularResumoFinanceiro() {
  const receitaTotal = gameState.historico.reduce((total, dia) => total + dia.receita, 0);
  const custoMercadorias = gameState.historico.reduce((total, dia) => total + dia.custoMercadorias, 0);
  const custosFixos = gameState.historico.reduce((total, dia) => total + dia.custosFixos, 0);
  const lucroLiquido = gameState.historico.reduce((total, dia) => total + dia.lucroLiquido, 0);
  const receitaHoje = gameState.relatorioEmAndamento ? gameState.relatorioEmAndamento.receita : 0;
  const unidadesHoje = gameState.relatorioEmAndamento ? gameState.relatorioEmAndamento.unidadesVendidas : 0;

  return {
    receitaTotal,
    custoMercadorias,
    custosFixos,
    lucroLiquido,
    receitaHoje,
    unidadesHoje,
    valorEstoque: calcularValorEstoque(),
    quantidadeEstoque: calcularQuantidadeEstoque()
  };
}
