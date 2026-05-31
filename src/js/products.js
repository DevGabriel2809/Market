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

const PRODUCT_PRICE_MAX_MULTIPLIER = 3;
const PRODUCT_PRICE_DEMAND_WARNING_MULTIPLIER = 2;

/**
 * @doc-func calcularPrecoMaximoProduto
 * O que faz: define o teto de venda em 3x o preco sugerido do produto.
 * Parametros: produto.
 * Como editar: altere PRODUCT_PRICE_MAX_MULTIPLIER para mudar o limite global.
 */
function calcularPrecoMaximoProduto(produto) {
  if (!produto) return 1;
  return Math.max(1, Math.round(produto.precoInicial * PRODUCT_PRICE_MAX_MULTIPLIER));
}

/**
 * @doc-func obterMultiplicadorPrecoProduto
 * O que faz: compara o preco atual com o preco sugerido para mostrar avisos e balancear demanda.
 * Parametros: produto, estoque = null.
 * Como editar: mantenha o retorno numerico para NPCs e interface compartilharem a mesma regra.
 */
function obterMultiplicadorPrecoProduto(produto, estoque = null) {
  if (!produto) return 1;

  const estoqueProduto = estoque || obterEstoque(produto.id);
  const preco = Math.max(1, Number(estoqueProduto && estoqueProduto.precoVenda) || produto.precoInicial);
  const sugerido = Math.max(1, produto.precoInicial);
  return preco / sugerido;
}

/**
 * @doc-func calcularFatorPrecoDemanda
 * O que faz: reduz a vontade de compra dos NPCs quando o preco sobe, principalmente acima de 2x o sugerido.
 * Parametros: produto, estoque = null.
 * Como editar: ajuste PRODUCT_PRICE_DEMAND_WARNING_MULTIPLIER ou a penalidade para mudar a sensibilidade dos clientes.
 */
function calcularFatorPrecoDemanda(produto, estoque = null) {
  if (!produto) return 0;

  const multiplicador = obterMultiplicadorPrecoProduto(produto, estoque);
  const fatorBase = Math.max(0.12, Math.min(1.85, 1 / Math.max(0.1, multiplicador)));

  if (multiplicador <= PRODUCT_PRICE_DEMAND_WARNING_MULTIPLIER) {
    return Math.pow(fatorBase, 1.15);
  }

  const faixaAlta = PRODUCT_PRICE_MAX_MULTIPLIER - PRODUCT_PRICE_DEMAND_WARNING_MULTIPLIER;
  const excesso = Math.min(1, (multiplicador - PRODUCT_PRICE_DEMAND_WARNING_MULTIPLIER) / faixaAlta);
  const penalidadeAlta = 1 - (excesso * 0.72);
  return Math.max(0.06, Math.pow(fatorBase, 1.35) * penalidadeAlta);
}

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
 * @doc-func listarProdutosParaEstoque
 * O que faz: seleciona produtos que podem entrar em uma acao de compra ou preenchimento de estoque.
 * Parametros: opcoes = {}.
 * Como editar: use incluirBloqueados apenas para ferramentas administrativas, nao para a campanha normal.
 */
function listarProdutosParaEstoque(opcoes = {}) {
  const incluirBloqueados = Boolean(opcoes.incluirBloqueados);
  return productCatalog.filter((produto) => incluirBloqueados || produtoEstaLiberado(produto));
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
  const compraGratis = typeof modoAdminAtivo === "function" && modoAdminAtivo();

  if (!produtoEstaLiberado(produto) && !compraGratis) {
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

  if (!compraGratis && gameState.caixa < total) {
    return { ok: false, mensagem: "Caixa insuficiente para essa compra." };
  }

  if (!compraGratis) {
    gameState.caixa -= total;
  }

  estoque.quantidade += quantidadeFinal;

  return {
    ok: true,
    mensagem: compraGratis
      ? `${quantidadeFinal} unidade(s) de ${produto.nome} adicionada(s) pelo admin.`
      : `${quantidadeFinal} unidade(s) de ${produto.nome} comprada(s).`,
    total
  };
}

/**
 * @doc-func calcularPlanoEncherEstoque
 * O que faz: calcula unidades faltantes e custo total para completar o estoque.
 * Parametros: opcoes = {}.
 * Como editar: use gratis para mostrar o custo sem cobrar, e incluirBloqueados apenas no modo admin.
 */
function calcularPlanoEncherEstoque(opcoes = {}) {
  inicializarEstoque();

  const produtos = listarProdutosParaEstoque(opcoes);
  const gratis = Boolean(opcoes.gratis);
  const itens = [];
  let total = 0;
  let unidades = 0;

  produtos.forEach((produto) => {
    const estoque = obterEstoque(produto.id);
    const faltantes = Math.max(0, produto.estoqueMaximo - estoque.quantidade);
    if (faltantes <= 0) return;

    const custoUnitario = calcularCustoCompraUnitario(produto);
    const custo = custoUnitario * faltantes;
    itens.push({ produto, quantidade: faltantes, custoUnitario, custo });
    unidades += faltantes;
    total += custo;
  });

  return {
    itens,
    total,
    unidades,
    gratis,
    temEspaco: unidades > 0
  };
}

/**
 * @doc-func encherEstoque
 * O que faz: completa todos os produtos liberados ate o limite de estoque, cobrando o saldo necessario.
 * Parametros: opcoes = {}.
 * Como editar: opcoes.gratis deve ficar restrita a ferramentas de teste/admin.
 */
function encherEstoque(opcoes = {}) {
  const gratis = Boolean(opcoes.gratis || (typeof modoAdminAtivo === "function" && modoAdminAtivo()));
  const plano = calcularPlanoEncherEstoque({ ...opcoes, gratis });

  if (!plano.temEspaco) {
    return { ok: false, mensagem: "Todo o estoque ja esta cheio.", plano };
  }

  if (!gratis && gameState.caixa < plano.total) {
    return {
      ok: false,
      mensagem: `Caixa insuficiente para encher tudo. Faltam ${formatarMoeda(plano.total - gameState.caixa)}.`,
      plano
    };
  }

  if (!gratis) {
    gameState.caixa -= plano.total;
  }

  plano.itens.forEach((item) => {
    const estoque = obterEstoque(item.produto.id);
    estoque.quantidade = Math.min(item.produto.estoqueMaximo, estoque.quantidade + item.quantidade);
  });

  return {
    ok: true,
    mensagem: gratis
      ? `${plano.unidades} unidade(s) adicionada(s) ao estoque pelo admin.`
      : `Estoque cheio por ${formatarMoeda(plano.total)}.`,
    plano
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

  const precoMaximo = calcularPrecoMaximoProduto(produto);
  const valorInformado = Math.max(1, Math.round(Number(preco) || produto.precoInicial));
  const valor = Math.min(precoMaximo, valorInformado);
  const estoque = obterEstoque(produtoId);
  estoque.precoVenda = valor;

  if (valorInformado > precoMaximo) {
    return {
      ok: true,
      mensagem: `Preco limitado a ${formatarMoeda(precoMaximo)} (3x o sugerido).`,
      preco: valor
    };
  }

  return { ok: true, mensagem: `Preço de ${produto.nome} ajustado.`, preco: valor };
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
