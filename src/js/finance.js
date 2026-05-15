const MINUTOS_DIA = 24 * 60;
const HORA_ABERTURA = 0;

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

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function calcularCustosFixos() {
  const custoAjudante = gameState.ajudanteContratado ? gameState.custoAjudante : 0;
  return gameState.aluguel + gameState.energia + custoAjudante;
}

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

function calcularBonusClientela() {
  const reputacao = Math.min(gameState.reputacao, 40) * 0.015;
  const experiencia = Math.min(gameState.experiencia, 25) * 0.006;
  const ajudante = gameState.ajudanteContratado ? 0.18 : 0;
  return gameState.clientela + reputacao + experiencia + ajudante;
}

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

function iniciarNovoDia() {
  if (gameState.fimDeJogo) return;

  const evento = sortearEventoDeMercado();
  gameState.tempoDiaDecorridoMs = 0;
  gameState.proximaVendaMs = 4500 + Math.random() * 3500;
  gameState.diaEmAndamento = true;
  gameState.diaProntoParaEncerrar = false;
  gameState.diaEncerradoNotificado = false;
  gameState.relatorioEmAndamento = criarRelatorioBase(evento);
}

function obterMinutosDoDia() {
  if (!gameState.diaEmAndamento && gameState.diaProntoParaEncerrar) {
    return 24 * 60;
  }

  const minutoDiaMs = gameState.duracaoDiaMs / MINUTOS_DIA;
  const minutosPassados = Math.floor(gameState.tempoDiaDecorridoMs / minutoDiaMs);
  return Math.min(MINUTOS_DIA, HORA_ABERTURA + minutosPassados);
}

function formatarHoraDoJogo() {
  const minutosDoDia = obterMinutosDoDia();
  const horas = Math.floor(minutosDoDia / 60);
  const minutos = minutosDoDia % 60;
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function obterProgressoDia() {
  return Math.min(1, gameState.tempoDiaDecorridoMs / gameState.duracaoDiaMs);
}

function obterTempoRestanteDia() {
  return Math.max(0, gameState.duracaoDiaMs - gameState.tempoDiaDecorridoMs);
}

function formatarTempoCurto(ms) {
  const totalSegundos = Math.ceil(ms / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

function processarTempoDoDia(deltaTime) {
  if (!gameState.diaEmAndamento || gameState.fimDeJogo) return;

  gameState.tempoDiaDecorridoMs += deltaTime;
  gameState.proximaVendaMs -= deltaTime;

  while (gameState.proximaVendaMs <= 0 && gameState.diaEmAndamento) {
    processarVendaEspontanea();
    gameState.proximaVendaMs += 6500 + Math.random() * 4500;
  }

  if (gameState.tempoDiaDecorridoMs >= gameState.duracaoDiaMs) {
    gameState.tempoDiaDecorridoMs = gameState.duracaoDiaMs;
    gameState.diaEmAndamento = false;
    gameState.diaProntoParaEncerrar = true;

    if (!gameState.diaEncerradoNotificado) {
      gameState.diaEncerradoNotificado = true;

      if (typeof mostrarToast === "function") {
        mostrarToast("O expediente terminou. Agora você pode fechar o dia.");
      }
    }
  }

  if (typeof atualizarHudTempo === "function") {
    atualizarHudTempo();
  }
}

function processarVendaEspontanea() {
  const relatorio = gameState.relatorioEmAndamento;
  if (!relatorio) return;

  const clientes = calcularClientesDoTick(relatorio.evento);
  if (clientes <= 0) return;

  let vendeu = false;

  for (let i = 0; i < clientes; i += 1) {
    const produto = escolherProdutoParaCliente(relatorio.evento);
    if (!produto) continue;

    const estoque = obterEstoque(produto.id);
    const quantidade = calcularQuantidadeVendida(produto, estoque.quantidade);
    if (quantidade <= 0) continue;

    registrarVenda(produto, quantidade, relatorio);
    vendeu = true;
  }

  if (vendeu && typeof atualizarInterfaceJogo === "function") {
    atualizarInterfaceJogo({ origem: "venda" });
  }
}

function calcularClientesDoTick(evento) {
  const movimento = Math.max(0.35, calcularBonusClientela() * (evento.demanda || 1));
  let clientes = 0;

  if (Math.random() < 0.46 * movimento) clientes += 1;
  if (Math.random() < 0.08 * movimento) clientes += 1;
  if (gameState.ajudanteContratado && Math.random() < 0.06 * movimento) clientes += 1;

  return clientes;
}

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

function calcularQuantidadeVendida(produto, quantidadeDisponivel) {
  if (quantidadeDisponivel <= 0) return 0;

  const compraExtra = produto.custo <= 5 && Math.random() < 0.26 ? 1 : 0;
  return Math.min(quantidadeDisponivel, 1 + compraExtra);
}

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

function passarDia() {
  if (gameState.fimDeJogo) {
    return gameState.ultimoRelatorio;
  }

  if (!gameState.diaProntoParaEncerrar) {
    if (typeof mostrarToast === "function") {
      mostrarToast(`Aguarde o fim do expediente: ${formatarTempoCurto(obterTempoRestanteDia())}.`);
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

  atualizarCooldownsDeQuests();
  verificarFimDeJogo();

  if (!gameState.fimDeJogo) {
    gameState.dia += 1;
    iniciarNovoDia();
  }

  return relatorio;
}

function atualizarCooldownsDeQuests() {
  Object.keys(gameState.quests.cooldowns).forEach((questId) => {
    gameState.quests.cooldowns[questId] -= 1;

    if (gameState.quests.cooldowns[questId] <= 0) {
      delete gameState.quests.cooldowns[questId];
    }
  });
}

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
