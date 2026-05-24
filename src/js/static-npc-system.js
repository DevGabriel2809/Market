// ======================================================
// DOCUMENTAÇÃO DO ARQUIVO: static-npc-system.js
// ======================================================
// Controla NPCs parados que dão dicas ao jogador. Eles possuem diálogo, prompt de interação e hitbox física.
// Ajustes comuns:
// - STATIC_NPC_DEFS muda posição, nome, título e falas de cada NPC.
// - STATIC_NPC_INTERACTION_DISTANCE muda a distância necessária para falar.
// - obterCaixasColisaoNPCsEstaticos() torna esses NPCs sólidos para o player.
// ======================================================

// ======================================================
// NPCS ESTATICOS / DICAS SECRETAS
// ======================================================

window.staticNpcSystem = {
  inicializado: false,
  npcs: [],
  npcProximoId: null,
  dialogoAtivo: null,
  promptEl: null
};

const STATIC_NPC_INTERACTION_DISTANCE = 112;

const STATIC_NPC_COLLISION = {
  largura: 40,
  altura: 28,
  margemPlayer: 2
};

const STATIC_NPC_DEFS = [
  {
    id: "runa",
    nome: "Runa",
    titulo: "contadora errante",
    classe: "npc-variant-2",
    x: 700,
    y: 385,
    falas: [
      "Segredo de balcão: preco alto demais assusta mais do que ajuda. Suba pouco, observe a fila, e ajuste de novo no dia seguinte.",
      "O caixa que vence nao e o que vende caro. E o que compra bem, gira estoque e evita mercadoria parada.",
      "Se a fila crescer, atendimento vira reputacao. Cliente que espera demais carrega seu lucro embora."
    ]
  },
  {
    id: "cedro",
    nome: "Cedro",
    titulo: "almoxarife velho",
    classe: "npc-variant-3",
    x: 570,
    y: 1000,
    falas: [
      "Produtos baratos puxam movimento. Eles parecem pequenos, mas enchem o caixa quando o dia esta fraco.",
      "Antes do expediente, compre com calma. Depois que abrir, tempo e cliente viram a mesma moeda.",
      "Nao lote pereciveis cedo demais. Perda de estoque come lucro sem fazer barulho."
    ]
  },
  {
    id: "mira",
    nome: "Mira",
    titulo: "olheira da feira",
    classe: "npc-variant-5",
    x: 1010,
    y: 900,
    falas: [
      "Missao boa nem sempre da dinheiro direto. As melhores abrem desconto, produto novo ou ajudante.",
      "Quando uma missao pedir estoque, pense como investimento. As vezes perder mercadoria hoje libera margem amanha.",
      "Reputacao aumenta movimento, mas movimento sem estoque vira cliente perdido."
    ]
  },
  {
    id: "borin",
    nome: "Borin",
    titulo: "fiscal do caixa",
    classe: "npc-variant-6",
    x: 1770,
    y: 720,
    falas: [
      "No balcão, confira o troco. Venda so entra no caixa quando voce devolve o valor certo.",
      "Cliente entrega dinheiro em cedulas grandes porque quer testar seu caixa. Monte o troco pelas moedas da bandeja.",
      "Recusar compra evita erro, mas tambem queima movimento. Use isso so quando faltar estoque ou paciencia."
    ]
  },
  {
    id: "sibil",
    nome: "Sibil",
    titulo: "mensageira discreta",
    classe: "npc-variant-7",
    x: 1310,
    y: 1020,
    falas: [
      "Ajudante custa caro, mas fila cheia custa invisivel. Desbloquear por missao costuma doer menos que comprar cedo.",
      "Olhe o relatorio no fim do dia. Receita alta com lucro baixo e sinal de custo mal domado.",
      "Seu mercado cresce quando cada dia responde uma pergunta: faltou cliente, faltou estoque ou faltou margem?"
    ]
  }
];

/**
 * @doc-func inicializarNPCsEstaticos
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function inicializarNPCsEstaticos() {
  if (staticNpcSystem.inicializado) return;

  const world = document.getElementById("world");
  if (!world) return;

  staticNpcSystem.npcs = STATIC_NPC_DEFS.map((definicao) => {
    const el = document.createElement("div");
    el.className = `static-npc ${definicao.classe}`;
    el.dataset.staticNpcId = definicao.id;
    el.style.left = `${definicao.x}px`;
    el.style.top = `${definicao.y}px`;
    el.style.zIndex = String(5 + Math.floor(definicao.y / 24));

    const nome = document.createElement("div");
    nome.className = "static-npc-name";
    nome.textContent = definicao.nome;

    const sprite = document.createElement("div");
    sprite.className = "static-npc-sprite customer-idle";

    const marker = document.createElement("div");
    marker.className = "static-npc-marker";
    marker.textContent = "!";

    const chat = document.createElement("div");
    chat.className = "static-npc-chat hidden";

    el.appendChild(marker);
    el.appendChild(nome);
    el.appendChild(sprite);
    el.appendChild(chat);
    world.appendChild(el);

    el.addEventListener("click", (event) => {
      if (event.target.closest(".static-npc-chat")) return;
      abrirDialogoNpcEstatico(definicao.id);
    });

    return {
      ...definicao,
      el,
      chat,
      falaAtual: 0
    };
  });

  staticNpcSystem.promptEl = document.createElement("div");
  staticNpcSystem.promptEl.className = "static-npc-prompt hidden";
  staticNpcSystem.promptEl.innerHTML = '<strong>E</strong><span>Falar</span>';
  world.appendChild(staticNpcSystem.promptEl);

  staticNpcSystem.inicializado = true;
}

/**
 * @doc-func calcularDistanciaDoPlayerNpc
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: npc.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularDistanciaDoPlayerNpc(npc) {
  if (!window.player) return Infinity;

  const playerXCentro = window.player.x + window.player.width / 2;
  const playerPe = window.player.y + window.player.height;
  const dx = npc.x - playerXCentro;
  const dy = npc.y - playerPe;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * @doc-func criarHitboxNpcEstatico
 * O que faz: cria elementos ou dados novos; mude aqui quando quiser alterar estrutura, classe CSS ou valores iniciais.
 * Parâmetros: npc, margem = 0.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function criarHitboxNpcEstatico(npc, margem = 0) {
  return {
    x: npc.x - STATIC_NPC_COLLISION.largura / 2 - margem,
    y: npc.y - STATIC_NPC_COLLISION.altura / 2 - margem,
    width: STATIC_NPC_COLLISION.largura + margem * 2,
    height: STATIC_NPC_COLLISION.altura + margem * 2,
    tipo: "npc-estatico",
    id: npc.id
  };
}

/**
 * @doc-func obterCaixasColisaoNPCsEstaticos
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterCaixasColisaoNPCsEstaticos() {
  if (!staticNpcSystem.inicializado) return [];

  return staticNpcSystem.npcs
    .filter((npc) => npc.el && npc.el.isConnected)
    .map((npc) => criarHitboxNpcEstatico(npc, STATIC_NPC_COLLISION.margemPlayer));
}

/**
 * @doc-func obterNpcEstaticoProximo
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterNpcEstaticoProximo() {
  if (!staticNpcSystem.inicializado) return null;

  let maisProximo = null;
  let menorDistancia = STATIC_NPC_INTERACTION_DISTANCE;

  staticNpcSystem.npcs.forEach((npc) => {
    const distancia = calcularDistanciaDoPlayerNpc(npc);
    if (distancia <= menorDistancia) {
      maisProximo = npc;
      menorDistancia = distancia;
    }
  });

  return maisProximo;
}

/**
 * @doc-func atualizarPromptNpcEstatico
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: npc.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarPromptNpcEstatico(npc) {
  const prompt = staticNpcSystem.promptEl;
  if (!prompt) return;

  if (!npc || staticNpcSystem.dialogoAtivo) {
    prompt.classList.add("hidden");
    return;
  }

  prompt.style.left = `${npc.x}px`;
  prompt.style.top = `${npc.y - 118}px`;
  prompt.style.zIndex = String(20 + Math.floor(npc.y / 24));
  prompt.classList.remove("hidden");
}

/**
 * @doc-func atualizarNPCsEstaticos
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarNPCsEstaticos() {
  inicializarNPCsEstaticos();
  if (!staticNpcSystem.inicializado) return;

  const proximo = obterNpcEstaticoProximo();
  staticNpcSystem.npcProximoId = proximo ? proximo.id : null;
  atualizarPromptNpcEstatico(proximo);

  if (staticNpcSystem.dialogoAtivo) {
    const npc = staticNpcSystem.npcs.find((item) => item.id === staticNpcSystem.dialogoAtivo.npcId);
    if (!npc || calcularDistanciaDoPlayerNpc(npc) > STATIC_NPC_INTERACTION_DISTANCE + 46) {
      fecharDialogoNpcEstatico();
    }
  }
}

/**
 * @doc-func renderizarDialogoNpcEstatico
 * O que faz: monta HTML dinâmico na interface; altere classes, textos e botões aqui.
 * Parâmetros: npc.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function renderizarDialogoNpcEstatico(npc) {
  if (!npc || !npc.chat) return;

  const fala = npc.falas[npc.falaAtual] || npc.falas[0];
  const ultimaFala = npc.falaAtual >= npc.falas.length - 1;

  npc.chat.innerHTML = `
    <div class="static-chat-heading">
      <span>${npc.titulo}</span>
      <strong>${npc.nome}</strong>
    </div>
    <p>${fala}</p>
    <div class="static-chat-footer">
      <span>${npc.falaAtual + 1}/${npc.falas.length}</span>
      <button type="button" data-static-npc-next>${ultimaFala ? "Fechar" : "Proxima dica"}</button>
    </div>
  `;

  const botao = npc.chat.querySelector("[data-static-npc-next]");
  if (botao) {
    botao.addEventListener("click", (event) => {
      event.stopPropagation();
      avancarDialogoNpcEstatico();
    });
  }

  npc.chat.classList.remove("hidden");
}

/**
 * @doc-func abrirDialogoNpcEstatico
 * O que faz: abre uma tela/modal/fluxo; edite textos e chamadas caso o comportamento de abertura mude.
 * Parâmetros: npcId = null.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function abrirDialogoNpcEstatico(npcId = null) {
  inicializarNPCsEstaticos();

  const npc = npcId
    ? staticNpcSystem.npcs.find((item) => item.id === npcId)
    : obterNpcEstaticoProximo();

  if (!npc) {
    return false;
  }

  if (calcularDistanciaDoPlayerNpc(npc) > STATIC_NPC_INTERACTION_DISTANCE + 32) {
    return false;
  }

  fecharDialogoNpcEstatico();
  npc.falaAtual = 0;
  staticNpcSystem.dialogoAtivo = { npcId: npc.id };
  atualizarPromptNpcEstatico(null);
  renderizarDialogoNpcEstatico(npc);
  return true;
}

/**
 * @doc-func avancarDialogoNpcEstatico
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function avancarDialogoNpcEstatico() {
  const ativo = staticNpcSystem.dialogoAtivo;
  if (!ativo) return false;

  const npc = staticNpcSystem.npcs.find((item) => item.id === ativo.npcId);
  if (!npc) {
    fecharDialogoNpcEstatico();
    return true;
  }

  if (npc.falaAtual >= npc.falas.length - 1) {
    fecharDialogoNpcEstatico();
    return true;
  }

  npc.falaAtual += 1;
  renderizarDialogoNpcEstatico(npc);
  return true;
}

/**
 * @doc-func fecharDialogoNpcEstatico
 * O que faz: fecha uma tela/modal/fluxo; edite para limpar estados extras ao sair.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function fecharDialogoNpcEstatico() {
  staticNpcSystem.npcs.forEach((npc) => {
    if (npc.chat) {
      npc.chat.classList.add("hidden");
    }
  });

  staticNpcSystem.dialogoAtivo = null;
  return true;
}

/**
 * @doc-func lidarTeclaInteracaoNpcEstatico
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function lidarTeclaInteracaoNpcEstatico() {
  if (staticNpcSystem.dialogoAtivo) {
    return avancarDialogoNpcEstatico();
  }

  return abrirDialogoNpcEstatico();
}

window.inicializarNPCsEstaticos = inicializarNPCsEstaticos;
window.atualizarNPCsEstaticos = atualizarNPCsEstaticos;
window.abrirDialogoNpcEstatico = abrirDialogoNpcEstatico;
window.fecharDialogoNpcEstatico = fecharDialogoNpcEstatico;
window.lidarTeclaInteracaoNpcEstatico = lidarTeclaInteracaoNpcEstatico;
window.obterCaixasColisaoNPCsEstaticos = obterCaixasColisaoNPCsEstaticos;
