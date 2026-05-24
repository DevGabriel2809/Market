// ======================================================
// DOCUMENTAÇÃO DO ARQUIVO: quests.js
// ======================================================
// Controla missões, recompensas, desbloqueios e animação de missão. Ajuste requisitos e recompensas em QUEST_DEFS.
// ======================================================

const questTips = [
  "Preço alto demais reduz demanda, mesmo quando a margem parece bonita.",
  "Produtos baratos formam clientela; produtos caros constroem caixa.",
  "Estoque parado também custa dinheiro quando o produto é perecível.",
  "Reputação aumenta o movimento e melhora a chance nas missões.",
  "Guarde caixa antes de buscar produtos premium."
];

const questDefinitions = [
  {
    id: "entrega_taverna",
    titulo: "Entrega para a taverna",
    tipo: "Pedido rápido",
    descricao: "Separar uma cesta de alimentos para uma taverna próxima.",
    chanceBase: 0.88,
    repetivel: true,
    cooldown: 2,
    custo: {
      estoque: { pao: 6, queijo: 2 }
    },
    recompensa: {
      caixa: 230,
      reputacao: 1,
      experiencia: 2
    },
    falha: {
      caixa: -45,
      reputacao: -1
    }
  },
  {
    id: "feira_colheita",
    titulo: "Ajuda na colheita",
    tipo: "Abastecimento",
    descricao: "Ajudar produtores locais e voltar com mercadorias frescas.",
    chanceBase: 0.82,
    repetivel: true,
    cooldown: 3,
    recompensa: {
      estoque: { maca: 14, pao: 6 },
      reputacao: 1,
      experiencia: 2
    },
    falha: {
      caixa: -35
    }
  },
  {
    id: "auditoria_custos",
    titulo: "Auditoria dos custos",
    tipo: "Gestão",
    descricao: "Revisar gastos fixos e cortar desperdícios da operação.",
    chanceBase: 0.84,
    requisitos: {
      diasJogados: 2
    },
    recompensa: {
      energia: -10,
      reputacao: 1,
      experiencia: 3
    },
    falha: {
      caixa: -60
    }
  },
  {
    id: "negociar_fornecedor",
    titulo: "Rota com o moleiro",
    tipo: "Fornecedor",
    descricao: "Negociar uma rota de abastecimento com desconto permanente.",
    chanceBase: 0.76,
    requisitos: {
      diaMinimo: 2,
      reputacaoMinima: 1
    },
    recompensa: {
      descontoFornecedor: 0.05,
      reputacao: 1,
      experiencia: 3
    },
    falha: {
      caixa: -80
    }
  },
  {
    id: "mutirao_mercado",
    titulo: "Mutirão no mercado",
    tipo: "Divulgação",
    descricao: "Organizar uma pequena ação para atrair clientes novos.",
    chanceBase: 0.78,
    repetivel: true,
    cooldown: 4,
    requisitos: {
      diaMinimo: 5
    },
    custo: {
      caixa: 60
    },
    recompensa: {
      clientela: 0.05,
      reputacao: 1,
      experiencia: 2
    },
    falha: {
      caixa: -35
    }
  },
  {
    id: "contrato_mercadores",
    titulo: "Contrato dos mercadores",
    tipo: "Guilda",
    descricao: "Conseguir acesso a produtos raros e clientes mais exigentes.",
    chanceBase: 0.72,
    requisitos: {
      reputacaoMinima: 4,
      caixaMinimo: 500,
      questConcluida: "negociar_fornecedor"
    },
    custo: {
      caixa: 180
    },
    recompensa: {
      caixa: 120,
      reputacao: 2,
      experiencia: 4,
      desbloqueiaProduto: "especiaria"
    },
    falha: {
      caixa: -120,
      reputacao: -1
    }
  },
  {
    id: "treinar_ajudante",
    titulo: "Treinar ajudante",
    tipo: "Equipe",
    descricao: "Convencer a guilda a indicar alguém confiável para o balcão.",
    chanceBase: 0.68,
    requisitos: {
      reputacaoMinima: 6,
      questConcluida: "contrato_mercadores"
    },
    custo: {
      caixa: 250
    },
    recompensa: {
      ajudanteDesbloqueado: true,
      reputacao: 2,
      experiencia: 5
    },
    falha: {
      caixa: -150
    }
  }
];

/**
 * @doc-func obterQuest
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: questId.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterQuest(questId) {
  return questDefinitions.find((quest) => quest.id === questId);
}

/**
 * @doc-func questFoiConcluida
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: questId.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function questFoiConcluida(questId) {
  return gameState.quests.concluidas.includes(questId);
}

/**
 * @doc-func avaliarRequisitosQuest
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: quest.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function avaliarRequisitosQuest(quest) {
  const motivos = [];
  const requisitos = quest.requisitos || {};

  if (!quest.repetivel && questFoiConcluida(quest.id)) {
    motivos.push("Missão já concluída.");
  }

  if (gameState.quests.cooldowns[quest.id]) {
    motivos.push(`Disponível em ${gameState.quests.cooldowns[quest.id]} dia(s).`);
  }

  if (requisitos.diaMinimo && gameState.dia < requisitos.diaMinimo) {
    motivos.push(`Disponível a partir do dia ${requisitos.diaMinimo}.`);
  }

  if (requisitos.diasJogados && gameState.historico.length < requisitos.diasJogados) {
    motivos.push(`Passe ${requisitos.diasJogados} dia(s) para liberar.`);
  }

  if (requisitos.reputacaoMinima && gameState.reputacao < requisitos.reputacaoMinima) {
    motivos.push(`Requer reputação ${requisitos.reputacaoMinima}.`);
  }

  if (requisitos.caixaMinimo && gameState.caixa < requisitos.caixaMinimo) {
    motivos.push(`Requer ${formatarMoeda(requisitos.caixaMinimo)} em caixa.`);
  }

  if (requisitos.questConcluida && !questFoiConcluida(requisitos.questConcluida)) {
    const questRequerida = obterQuest(requisitos.questConcluida);
    motivos.push(`Requer "${questRequerida ? questRequerida.titulo : requisitos.questConcluida}".`);
  }

  const custo = quest.custo || {};
  if (custo.caixa && gameState.caixa < custo.caixa) {
    motivos.push(`Custa ${formatarMoeda(custo.caixa)}.`);
  }

  if (custo.estoque) {
    Object.entries(custo.estoque).forEach(([produtoId, quantidade]) => {
      const produto = obterProduto(produtoId);
      const estoque = obterEstoque(produtoId);

      if (estoque.quantidade < quantidade) {
        motivos.push(`Requer ${quantidade}x ${produto ? produto.nome : produtoId}.`);
      }
    });
  }

  return {
    ok: motivos.length === 0,
    motivos
  };
}

/**
 * @doc-func calcularChanceQuest
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: quest.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularChanceQuest(quest) {
  const bonusReputacao = Math.min(gameState.reputacao, 20) * 0.01;
  const bonusExperiencia = Math.min(gameState.experiencia, 30) * 0.003;
  const bonusAjudante = gameState.ajudanteContratado ? 0.04 : 0;
  return Math.min(0.95, quest.chanceBase + bonusReputacao + bonusExperiencia + bonusAjudante);
}

/**
 * @doc-func aplicarCustoQuest
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: quest.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function aplicarCustoQuest(quest) {
  const custo = quest.custo || {};

  if (custo.caixa) {
    gameState.caixa -= custo.caixa;
  }

  if (custo.estoque) {
    Object.entries(custo.estoque).forEach(([produtoId, quantidade]) => {
      const estoque = obterEstoque(produtoId);
      estoque.quantidade = Math.max(0, estoque.quantidade - quantidade);
    });
  }
}

/**
 * @doc-func aplicarEfeitoQuest
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: efeito.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function aplicarEfeitoQuest(efeito) {
  if (!efeito) return [];

  const detalhes = [];

  if (efeito.caixa) {
    gameState.caixa += efeito.caixa;
    detalhes.push(`Caixa ${efeito.caixa > 0 ? "+" : ""}${formatarMoeda(efeito.caixa)}`);
  }

  if (efeito.reputacao) {
    gameState.reputacao = Math.max(0, gameState.reputacao + efeito.reputacao);
    detalhes.push(`Reputação ${efeito.reputacao > 0 ? "+" : ""}${efeito.reputacao}`);
  }

  if (efeito.experiencia) {
    gameState.experiencia += efeito.experiencia;
    detalhes.push(`Experiência +${efeito.experiencia}`);
  }

  if (efeito.clientela) {
    gameState.clientela = Math.min(1.45, gameState.clientela + efeito.clientela);
    detalhes.push(`Clientela +${Math.round(efeito.clientela * 100)}%`);
  }

  if (efeito.energia) {
    gameState.energia = Math.max(25, gameState.energia + efeito.energia);
    detalhes.push(`Iluminação ${efeito.energia > 0 ? "+" : ""}${formatarMoeda(efeito.energia)}`);
  }

  if (efeito.desbloqueiaProduto) {
    const produto = obterProduto(efeito.desbloqueiaProduto);
    detalhes.push(`${produto ? produto.nome : "Produto"} liberado`);
  }

  if (efeito.descontoFornecedor) {
    gameState.descontoFornecedor = Math.min(0.25, gameState.descontoFornecedor + efeito.descontoFornecedor);
    detalhes.push(`Desconto fornecedor +${Math.round(efeito.descontoFornecedor * 100)}%`);
  }

  if (efeito.ajudanteDesbloqueado) {
    gameState.ajudanteDesbloqueado = true;
    detalhes.push("Ajudante liberado");
  }

  if (efeito.estoque) {
    Object.entries(efeito.estoque).forEach(([produtoId, quantidade]) => {
      const produto = obterProduto(produtoId);
      adicionarEstoque(produtoId, quantidade);
      detalhes.push(`${produto ? produto.nome : produtoId} +${quantidade}`);
    });
  }

  return detalhes;
}

/**
 * @doc-func executarQuest
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: questId.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function executarQuest(questId) {
  const quest = obterQuest(questId);
  if (!quest) return { ok: false, mensagem: "Missão não encontrada." };

  const requisitos = avaliarRequisitosQuest(quest);
  if (!requisitos.ok) {
    return { ok: false, mensagem: requisitos.motivos.join(" ") };
  }

  aplicarCustoQuest(quest);

  const chance = calcularChanceQuest(quest);
  const sucesso = Math.random() <= chance;
  const efeito = sucesso ? quest.recompensa : quest.falha;
  const detalhes = aplicarEfeitoQuest(efeito);

  gameState.quests.tentativas[quest.id] = (gameState.quests.tentativas[quest.id] || 0) + 1;

  if (!sucesso) {
    gameState.quests.falhas[quest.id] = (gameState.quests.falhas[quest.id] || 0) + 1;
    gameState.experiencia += 1;
    detalhes.push("Experiência +1");
  }

  if (sucesso && !quest.repetivel && !questFoiConcluida(quest.id)) {
    gameState.quests.concluidas.push(quest.id);
  }

  if (quest.repetivel && quest.cooldown) {
    gameState.quests.cooldowns[quest.id] = quest.cooldown;
  }

  return {
    ok: true,
    sucesso,
    quest,
    chance,
    detalhes,
    mensagem: sucesso
      ? `${quest.titulo} concluída.`
      : `${quest.titulo} falhou, mas a tentativa ainda conta como experiência.`
  };
}

/**
 * @doc-func contratarAjudante
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function contratarAjudante() {
  if (!gameState.ajudanteDesbloqueado) {
    return { ok: false, mensagem: "Conclua a missão de treinamento antes." };
  }

  if (gameState.ajudanteContratado) {
    return { ok: false, mensagem: "O ajudante já está contratado." };
  }

  if (gameState.caixa < 900) {
    return { ok: false, mensagem: "Contratar o ajudante custa R$ 900,00." };
  }

  gameState.caixa -= 900;
  gameState.ajudanteContratado = true;

  if (typeof sincronizarAjudanteVisual === "function") {
    sincronizarAjudanteVisual();
  }

  return {
    ok: true,
    mensagem: "Ajudante contratado. O movimento melhora, mas o custo diário aumenta."
  };
}
