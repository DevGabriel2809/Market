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
  const custoAjudante = gameState.ajudanteContratado ? 120 : 0;
  return gameState.aluguel + gameState.energia + gameState.funcionarios + custoAjudante;
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

function simularVendaProduto(produto, evento) {
  const estoque = obterEstoque(produto.id);

  if (!produtoEstaLiberado(produto) || estoque.quantidade <= 0) {
    return {
      produtoId: produto.id,
      nome: produto.nome,
      vendidos: 0,
      receita: 0,
      custoMercadoria: 0,
      preco: estoque.precoVenda
    };
  }

  const preco = Math.max(1, estoque.precoVenda);
  const precoReferencia = Math.max(1, produto.precoInicial);
  const fatorPreco = Math.max(0.18, Math.min(1.75, precoReferencia / preco));
  const variacao = 0.78 + Math.random() * 0.46;
  const demanda = produto.demandaBase
    * Math.pow(fatorPreco, 1.28)
    * calcularBonusClientela()
    * calcularMultiplicadorEvento(produto, evento)
    * variacao;
  const vendidos = Math.min(estoque.quantidade, Math.max(0, Math.round(demanda)));
  const receita = vendidos * preco;
  const custoMercadoria = vendidos * calcularCustoCompraUnitario(produto);

  estoque.quantidade -= vendidos;
  estoque.vendidosTotal += vendidos;

  return {
    produtoId: produto.id,
    nome: produto.nome,
    vendidos,
    receita,
    custoMercadoria,
    preco
  };
}

function aplicarPerdasDeEstoque() {
  const perdas = [];

  productCatalog.forEach((produto) => {
    if (!produto.perecivel) return;

    const estoque = obterEstoque(produto.id);
    if (estoque.quantidade <= 8) return;

    const chance = produto.perecivel * (0.35 + Math.random());
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

  const diaProcessado = gameState.dia;
  const evento = sortearEventoDeMercado();
  const vendas = productCatalog.map((produto) => simularVendaProduto(produto, evento));
  const perdas = aplicarPerdasDeEstoque();
  const receita = vendas.reduce((total, item) => total + item.receita, 0);
  const custoMercadorias = vendas.reduce((total, item) => total + item.custoMercadoria, 0);
  const unidadesVendidas = vendas.reduce((total, item) => total + item.vendidos, 0);
  const custoExtra = evento.custoExtra || 0;
  const custosFixos = calcularCustosFixos() + custoExtra;
  const lucroBruto = receita - custoMercadorias;
  const lucroLiquido = lucroBruto - custosFixos;
  const caixaAntes = gameState.caixa;

  gameState.caixa += receita - custosFixos;
  gameState.experiencia += Math.max(1, Math.ceil(unidadesVendidas / 12));

  if (unidadesVendidas >= 35) {
    gameState.reputacao += 1;
  }

  const relatorio = {
    dia: diaProcessado,
    evento,
    vendas,
    perdas,
    receita,
    custoMercadorias,
    custosFixos,
    lucroBruto,
    lucroLiquido,
    unidadesVendidas,
    caixaAntes,
    caixaDepois: gameState.caixa
  };

  gameState.ultimoRelatorio = relatorio;
  gameState.historico.push(relatorio);

  atualizarCooldownsDeQuests();
  verificarFimDeJogo();

  if (!gameState.fimDeJogo) {
    gameState.dia += 1;
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
  const lucroLiquido = receitaTotal - custoMercadorias - custosFixos;

  return {
    receitaTotal,
    custoMercadorias,
    custosFixos,
    lucroLiquido,
    valorEstoque: calcularValorEstoque(),
    quantidadeEstoque: calcularQuantidadeEstoque()
  };
}
