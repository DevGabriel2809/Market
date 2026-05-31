// ======================================================
// DOCUMENTAÇÃO DO ARQUIVO: products.js
// ======================================================
// Define catálogo de produtos, estoque, preços, compras e validações de mercadorias. Ajuste custos/demanda em productCatalog.
// ======================================================

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
    id: "mel",
    nome: "Mel silvestre",
    sigla: "MS",
    categoria: "Alimento",
    custo: 7,
    precoInicial: 15,
    demandaBase: 9,
    estoqueInicial: 8,
    estoqueMaximo: 60,
    perecivel: 0.02,
    descricao: "Produto versatil, bom para clientes que buscam algo doce e acessivel."
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
    id: "corda",
    nome: "Corda de linho",
    sigla: "CL",
    categoria: "Utilidade",
    custo: 6,
    precoInicial: 14,
    demandaBase: 6,
    estoqueInicial: 7,
    estoqueMaximo: 70,
    perecivel: 0,
    descricao: "Item de trabalho que vende bem para viajantes e pequenos artesoes."
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
    id: "ervas",
    nome: "Ervas curativas",
    sigla: "EC",
    categoria: "Especial",
    custo: 9,
    precoInicial: 20,
    demandaBase: 7,
    estoqueInicial: 7,
    estoqueMaximo: 48,
    perecivel: 0.01,
    descricao: "Giro medio e boa margem para clientes ligados a remedios simples."
  },
  {
    id: "hidromel",
    nome: "Hidromel suave",
    sigla: "HS",
    categoria: "Especial",
    custo: 14,
    precoInicial: 30,
    demandaBase: 5,
    estoqueInicial: 4,
    estoqueMaximo: 36,
    perecivel: 0.02,
    descricao: "Compra menos frequente, mas aumenta o valor das cestas dos clientes."
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

/**
 * @doc-func inicializarEstoque
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
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

/**
 * @doc-func obterProduto
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: produtoId.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterProduto(produtoId) {
  return productCatalog.find((produto) => produto.id === produtoId);
}

/**
 * @doc-func produtoEstaLiberado
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: produto.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function produtoEstaLiberado(produto) {
  if (!produto.requerQuest) return true;
  return gameState.quests.concluidas.includes(produto.requerQuest);
}

/**
 * @doc-func obterEstoque
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: produtoId.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterEstoque(produtoId) {
  inicializarEstoque();
  return gameState.estoque[produtoId];
}

/**
 * @doc-func calcularCustoCompraUnitario
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: produto.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularCustoCompraUnitario(produto) {
  const desconto = Math.min(gameState.descontoFornecedor || 0, 0.35);
  return Math.max(1, Math.round(produto.custo * (1 - desconto)));
}

/**
 * @doc-func comprarProduto
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: produtoId, quantidade.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
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

/**
 * @doc-func alterarPrecoProduto
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: produtoId, preco.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function alterarPrecoProduto(produtoId, preco) {
  const produto = obterProduto(produtoId);
  if (!produto) return { ok: false, mensagem: "Produto não encontrado." };

  const valor = Math.max(1, Math.round(Number(preco) || produto.precoInicial));
  const estoque = obterEstoque(produtoId);
  estoque.precoVenda = valor;

  return { ok: true, mensagem: `Preço de ${produto.nome} ajustado.` };
}

/**
 * @doc-func adicionarEstoque
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: produtoId, quantidade.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function adicionarEstoque(produtoId, quantidade) {
  const produto = obterProduto(produtoId);
  if (!produto) return;

  const estoque = obterEstoque(produtoId);
  estoque.quantidade = Math.min(produto.estoqueMaximo, estoque.quantidade + quantidade);
}

/**
 * @doc-func calcularQuantidadeEstoque
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularQuantidadeEstoque() {
  inicializarEstoque();

  return productCatalog.reduce((total, produto) => {
    return total + obterEstoque(produto.id).quantidade;
  }, 0);
}

/**
 * @doc-func calcularValorEstoque
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularValorEstoque() {
  inicializarEstoque();

  return productCatalog.reduce((total, produto) => {
    const estoque = obterEstoque(produto.id);
    return total + estoque.quantidade * calcularCustoCompraUnitario(produto);
  }, 0);
}

inicializarEstoque();
