const productCatalog = [
  {
    id: "pao",
    nome: "Pão rústico",
    sigla: "PR",
    categoria: "Alimento",
    custo: 5,
    precoInicial: 10,
    demandaBase: 13,
    estoqueInicial: 14,
    estoqueMaximo: 80,
    perecivel: 0.08,
    descricao: "Vende bem todos os dias e ajuda a manter movimento constante."
  },
  {
    id: "maca",
    nome: "Maçã da feira",
    sigla: "MF",
    categoria: "Alimento",
    custo: 3,
    precoInicial: 7,
    demandaBase: 15,
    estoqueInicial: 18,
    estoqueMaximo: 100,
    perecivel: 0.06,
    descricao: "Produto barato, ótimo para formar clientela."
  },
  {
    id: "queijo",
    nome: "Queijo curado",
    sigla: "QC",
    categoria: "Alimento",
    custo: 12,
    precoInicial: 24,
    demandaBase: 8,
    estoqueInicial: 8,
    estoqueMaximo: 55,
    perecivel: 0.03,
    descricao: "Margem boa, mas precisa de caixa para abastecer."
  },
  {
    id: "carne",
    nome: "Carne salgada",
    sigla: "CS",
    categoria: "Alimento",
    custo: 18,
    precoInicial: 34,
    demandaBase: 6,
    estoqueInicial: 6,
    estoqueMaximo: 45,
    perecivel: 0.04,
    descricao: "Ticket alto e giro menor."
  },
  {
    id: "vela",
    nome: "Vela de sebo",
    sigla: "VS",
    categoria: "Utilidade",
    custo: 4,
    precoInicial: 9,
    demandaBase: 10,
    estoqueInicial: 12,
    estoqueMaximo: 90,
    perecivel: 0,
    descricao: "Não estraga e segura o caixa em dias fracos."
  },
  {
    id: "pocao",
    nome: "Poção simples",
    sigla: "PS",
    categoria: "Especial",
    custo: 24,
    precoInicial: 48,
    demandaBase: 4,
    estoqueInicial: 3,
    estoqueMaximo: 30,
    perecivel: 0,
    descricao: "Poucas vendas, mas cada venda pesa no lucro."
  },
  {
    id: "especiaria",
    nome: "Especiaria rara",
    sigla: "ER",
    categoria: "Especial",
    custo: 38,
    precoInicial: 76,
    demandaBase: 3,
    estoqueInicial: 0,
    estoqueMaximo: 24,
    perecivel: 0,
    requerQuest: "contrato_mercadores",
    descricao: "Produto premium liberado pela guilda dos mercadores."
  }
];

function inicializarEstoque() {
  productCatalog.forEach((produto) => {
    if (!gameState.estoque[produto.id]) {
      gameState.estoque[produto.id] = {
        quantidade: produto.estoqueInicial,
        precoVenda: produto.precoInicial,
        vendidosTotal: 0,
        perdidosTotal: 0
      };
    }
  });
}

function obterProduto(produtoId) {
  return productCatalog.find((produto) => produto.id === produtoId);
}

function produtoEstaLiberado(produto) {
  if (!produto.requerQuest) return true;
  return gameState.quests.concluidas.includes(produto.requerQuest);
}

function obterEstoque(produtoId) {
  inicializarEstoque();
  return gameState.estoque[produtoId];
}

function calcularCustoCompraUnitario(produto) {
  const desconto = Math.min(gameState.descontoFornecedor || 0, 0.35);
  return Math.max(1, Math.round(produto.custo * (1 - desconto)));
}

function comprarProduto(produtoId, quantidade) {
  const produto = obterProduto(produtoId);
  if (!produto) return { ok: false, mensagem: "Produto não encontrado." };

  if (!produtoEstaLiberado(produto)) {
    return { ok: false, mensagem: "Este produto ainda está bloqueado pela guilda." };
  }

  const estoque = obterEstoque(produtoId);
  const quantidadeDesejada = Math.max(1, Number(quantidade) || 1);
  const espacoDisponivel = Math.max(0, produto.estoqueMaximo - estoque.quantidade);
  const quantidadeFinal = Math.min(quantidadeDesejada, espacoDisponivel);

  if (quantidadeFinal <= 0) {
    return { ok: false, mensagem: "O estoque deste produto está cheio." };
  }

  const total = calcularCustoCompraUnitario(produto) * quantidadeFinal;

  if (gameState.caixa < total) {
    return { ok: false, mensagem: "Caixa insuficiente para essa compra." };
  }

  gameState.caixa -= total;
  estoque.quantidade += quantidadeFinal;

  return {
    ok: true,
    mensagem: `${quantidadeFinal} unidade(s) de ${produto.nome} comprada(s).`,
    total
  };
}

function alterarPrecoProduto(produtoId, preco) {
  const produto = obterProduto(produtoId);
  if (!produto) return { ok: false, mensagem: "Produto não encontrado." };

  const valor = Math.max(1, Math.round(Number(preco) || produto.precoInicial));
  const estoque = obterEstoque(produtoId);
  estoque.precoVenda = valor;

  return { ok: true, mensagem: `Preço de ${produto.nome} ajustado.` };
}

function adicionarEstoque(produtoId, quantidade) {
  const produto = obterProduto(produtoId);
  if (!produto) return;

  const estoque = obterEstoque(produtoId);
  estoque.quantidade = Math.min(produto.estoqueMaximo, estoque.quantidade + quantidade);
}

function calcularQuantidadeEstoque() {
  inicializarEstoque();

  return productCatalog.reduce((total, produto) => {
    return total + obterEstoque(produto.id).quantidade;
  }, 0);
}

function calcularValorEstoque() {
  inicializarEstoque();

  return productCatalog.reduce((total, produto) => {
    const estoque = obterEstoque(produto.id);
    return total + estoque.quantidade * calcularCustoCompraUnitario(produto);
  }, 0);
}

inicializarEstoque();
