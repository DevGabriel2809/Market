// ======================================================
// DOCUMENTAÇÃO DO ARQUIVO: npc-system.js
// ======================================================
// Controla clientes que entram no mercado, escolhem produtos, entram na fila e aguardam atendimento no caixa.
// Ajustes comuns:
// - NPC_CONFIG controla velocidade, tempo de escolha, paciência e intervalo de spawn.
// - npcSystem.pontos define rotas, prateleiras e posições da fila.
// - obterCaixasColisaoNPCs() entrega as hitboxes para main.js impedir que o player atravesse clientes.
// - clienteColidiriaComOutroCliente() evita clientes atravessando uns aos outros em rotas e fila.
// - expedienteEstaAbertoParaNPC() garante que compras só aconteçam durante o expediente.
// ======================================================

// ======================================================
// SISTEMA DE NPCS / CLIENTES
// ======================================================

window.npcSystem = {
  ativo: true,
  expedienteAberto: false,
  clientes: [],
  spawnTimer: 0,
  spawnIntervalAtual: 3400,
  maxClientesNaLoja: 7,
  totalClientesDia: 0,
  totalVendasDia: 0,
  totalPerdidosDia: 0,
  totalAtendidosDia: 0,
  proximoPerfil: 0,
  clientesIniciaisPendentes: 0,
  timerInicial: 0,
  ultimoIndiceSpawn: -1,

  pontos: {
    foraPorta: { x: 260, y: 920 },
    porta: { x: 300, y: 920 },
    entradaLoja: { x: 420, y: 920 },
    corredorSul: { x: 520, y: 840 },
    corredorInterno: { x: 520, y: 450 },
    entradaFilaCaixa: { x: 1240, y: 840 },
    corredorCaixa: { x: 1240, y: 680 },

    filaCaixa: [
      { x: 1240, y: 600 },
      { x: 1200, y: 640 },
      { x: 1160, y: 680 },
      { x: 1120, y: 720 },
      { x: 1120, y: 760 },
      { x: 1120, y: 800 },
      { x: 1120, y: 840 }
    ],

    prateleiras: [
      { id: "pao", nome: "Pães", x: 690, y: 840, produtos: ["pao", "queijo"] },
      { id: "frutas", nome: "Frutas", x: 840, y: 840, produtos: ["maca"] },
      { id: "frios", nome: "Frios", x: 1040, y: 805, produtos: ["queijo", "carne"] },
      { id: "utilidades", nome: "Utilidades", x: 1190, y: 840, produtos: ["vela"] },
      { id: "especial", nome: "Especiais", x: 520, y: 405, produtos: ["pocao", "especiaria"] }
    ]
  }
};

const NPC_CONFIG = {
  velocidadeMin: 1.05,
  velocidadeMax: 1.45,
  spawnIntervalBase: 4200,
  spawnIntervalMin: 2200,
  tempoEscolhendoMin: 1800,
  tempoEscolhendoMax: 4200,
  tempoEsperaFilaMax: 40000,
  chanceCompraBase: 0.88,
  intervaloClientesIniciais: 1150,
  tentativaRespawnBloqueado: 420,
  tempoAntesDesvio: 260,
  tempoMensagemLicenca: 280,
  multiplicadorPassoDesvio: 1.15
};

const NPC_COLLISION = {
  // A hitbox fica nos pés do sprite, não no corpo inteiro.
  // Isso deixa o personagem encostar no visual do NPC sem travar de longe.
  largura: 38,
  altura: 26,
  margemPlayer: 2
};

const NPC_PERFIS = [
  { nome: "Lia", classe: "npc-variant-1", preferencias: ["maca", "pao"], paciencia: 1.18, chanceCompra: 0.08 },
  { nome: "Bruno", classe: "npc-variant-2", preferencias: ["carne", "queijo"], paciencia: 1, chanceCompra: 0.03 },
  { nome: "Marta", classe: "npc-variant-3", preferencias: ["pao", "vela"], paciencia: 1.22, chanceCompra: 0.06 },
  { nome: "Caio", classe: "npc-variant-4", preferencias: ["pocao", "vela"], paciencia: 0.88, chanceCompra: -0.02 },
  { nome: "Nina", classe: "npc-variant-5", preferencias: ["queijo", "maca"], paciencia: 1.06, chanceCompra: 0.04 },
  { nome: "Tomas", classe: "npc-variant-6", preferencias: ["vela", "pao"], paciencia: 0.98, chanceCompra: 0.01 },
  { nome: "Rosa", classe: "npc-variant-7", preferencias: ["especiaria", "pocao", "queijo"], paciencia: 1.12, chanceCompra: 0.03 }
];

/**
 * @doc-func numeroAleatorio
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: min, max.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function numeroAleatorio(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * @doc-func escolherItem
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: lista.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function escolherItem(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * @doc-func clienteEstaNaZonaDeEntrada
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente, x = cliente.x, y = cliente.y.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function clienteEstaNaZonaDeEntrada(cliente, x = cliente.x, y = cliente.y) {
  // A porta é um gargalo natural do mapa. Aqui a colisão entre clientes é mais
  // flexível para que uma pequena fila não vire um engarrafamento permanente.
  return x <= 470 && y >= 860 && y <= 980;
}

/**
 * @doc-func obterPontosSpawnClientes
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterPontosSpawnClientes() {
  // Pontos em leque do lado de fora da porta. Cada novo cliente tenta nascer em
  // uma dessas vagas antes de entrar, evitando todos aparecerem no mesmo pixel.
  const base = npcSystem.pontos.foraPorta;
  return [
    { x: base.x - 52, y: base.y - 34 },
    { x: base.x - 28, y: base.y + 28 },
    { x: base.x - 92, y: base.y + 6 },
    { x: base.x - 124, y: base.y - 42 },
    { x: base.x - 140, y: base.y + 46 },
    { x: base.x - 160, y: base.y - 2 }
  ];
}

/**
 * @doc-func pontoSpawnLivre
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: ponto.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function pontoSpawnLivre(ponto) {
  if (typeof retangulosColidem !== "function") return true;

  const caixaSpawn = criarHitboxPorPe(ponto.x, ponto.y, NPC_COLLISION.largura, NPC_COLLISION.altura, 12);

  const ocupadoPorCliente = npcSystem.clientes.some((cliente) => {
    if (!cliente.el || !cliente.el.isConnected) return false;
    if (!clienteEstaNaZonaDeEntrada(cliente)) return false;
    return retangulosColidem(caixaSpawn, obterHitboxCliente(cliente, 10));
  });

  if (ocupadoPorCliente) return false;

  if (window.player) {
    const caixaPlayer = {
      x: window.player.x,
      y: window.player.y,
      width: window.player.width,
      height: window.player.height
    };

    if (retangulosColidem(caixaSpawn, caixaPlayer)) return false;
  }

  return true;
}

/**
 * @doc-func obterPontoSpawnLivreCliente
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterPontoSpawnLivreCliente() {
  const pontos = obterPontosSpawnClientes();
  const inicio = (npcSystem.ultimoIndiceSpawn + 1) % pontos.length;

  for (let tentativa = 0; tentativa < pontos.length; tentativa += 1) {
    const indice = (inicio + tentativa) % pontos.length;
    const ponto = pontos[indice];

    if (pontoSpawnLivre(ponto)) {
      npcSystem.ultimoIndiceSpawn = indice;
      return {
        x: ponto.x + numeroAleatorio(-8, 8),
        y: ponto.y + numeroAleatorio(-5, 5)
      };
    }
  }

  return null;
}

/**
 * @doc-func criarHitboxPorPe
 * O que faz: cria elementos ou dados novos; mude aqui quando quiser alterar estrutura, classe CSS ou valores iniciais.
 * Parâmetros: x, y, largura = NPC_COLLISION.largura, altura = NPC_COLLISION.altura, margem = 0.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function criarHitboxPorPe(x, y, largura = NPC_COLLISION.largura, altura = NPC_COLLISION.altura, margem = 0) {
  // O ponto (x, y) representa o pé do personagem no mapa.
  // A caixa sobe um pouco a partir desse pé para simular o espaço físico ocupado.
  return {
    x: x - largura / 2 - margem,
    y: y - altura / 2 - margem,
    width: largura + margem * 2,
    height: altura + margem * 2
  };
}

/**
 * @doc-func obterHitboxCliente
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: cliente, margem = 0.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterHitboxCliente(cliente, margem = 0) {
  return {
    ...criarHitboxPorPe(cliente.x, cliente.y, NPC_COLLISION.largura, NPC_COLLISION.altura, margem),
    tipo: "npc-cliente",
    id: cliente.id
  };
}

/**
 * @doc-func obterCaixasColisaoNPCs
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterCaixasColisaoNPCs() {
  if (!window.npcSystem || !Array.isArray(npcSystem.clientes)) return [];

  return npcSystem.clientes
    .filter((cliente) => cliente.el && cliente.el.isConnected)
    .map((cliente) => obterHitboxCliente(cliente, NPC_COLLISION.margemPlayer));
}

/**
 * @doc-func clienteColidiriaComPlayer
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente, proximoX, proximoY.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function clienteColidiriaComPlayer(cliente, proximoX, proximoY) {
  // Clientes também respeitam o player. Se o jogador ficar parado no caminho,
  // o NPC espera em vez de atravessar o corpo do gerente.
  if (!window.player || typeof retangulosColidem !== "function") return false;

  const caixaCliente = criarHitboxPorPe(proximoX, proximoY, NPC_COLLISION.largura, NPC_COLLISION.altura, 1);
  const caixaPlayer = {
    x: window.player.x,
    y: window.player.y,
    width: window.player.width,
    height: window.player.height
  };

  return retangulosColidem(caixaCliente, caixaPlayer);
}

/**
 * @doc-func clienteColidiriaComOutroCliente
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente, proximoX, proximoY.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function clienteColidiriaComOutroCliente(cliente, proximoX, proximoY) {
  // Evita que clientes atravessem uns aos outros em corredores e na fila.
  // A margem é menor que a do player para reduzir engarrafamentos.
  if (typeof retangulosColidem !== "function") return false;

  const caixaCliente = criarHitboxPorPe(proximoX, proximoY, NPC_COLLISION.largura - 6, NPC_COLLISION.altura - 6, 0);

  return npcSystem.clientes.some((outro) => {
    if (outro.id === cliente.id || !outro.el || !outro.el.isConnected) return false;
    if (outro.estado === "saindo" && cliente.estado === "saindo") return false;

    const clienteNaEntrada = clienteEstaNaZonaDeEntrada(cliente, proximoX, proximoY);
    const outroNaEntrada = clienteEstaNaZonaDeEntrada(outro);

    // Dentro do gargalo da porta, clientes em fluxo de entrada/saída deixam uma
    // margem macia entre si. A colisão com o jogador continua sólida, mas os
    // clientes não formam um bloco impossível de desfazer.
    if (clienteNaEntrada && outroNaEntrada) {
      const ambosEmFluxo = ["entrando", "saindo"].includes(cliente.estado)
        && ["entrando", "saindo"].includes(outro.estado);

      if (ambosEmFluxo) return false;
    }

    return retangulosColidem(caixaCliente, obterHitboxCliente(outro, 0));
  });
}

/**
 * @doc-func clienteColidiriaComMapa
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente, proximoX, proximoY.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function clienteColidiriaComMapa(cliente, proximoX, proximoY) {
  // Clientes seguem rotas planejadas pelo mapa, mas esta checagem impede que
  // um desvio lateral empurre o NPC para dentro de balcões, paredes ou objetos sólidos.
  if (!Array.isArray(window.objetosColisao) || typeof retangulosColidem !== "function") return false;

  const caixaCliente = criarHitboxPorPe(proximoX, proximoY, NPC_COLLISION.largura - 10, NPC_COLLISION.altura - 8, 0);

  return window.objetosColisao.some((obj) => retangulosColidem(caixaCliente, obj));
}

/**
 * @doc-func clienteColidiriaComEntidadeFixa
 * O que faz: checa se o próximo passo do cliente bateria em NPC estático ou ajudante.
 * Parâmetros: cliente, proximoX, proximoY.
 * Como editar: adicione novas fontes de hitbox fixa no array fontes se criar mais entidades sólidas.
 */
function clienteColidiriaComEntidadeFixa(cliente, proximoX, proximoY) {
  // NPCs de dica e ajudantes não andam, então entram como obstáculos fixos
  // que o cliente deve contornar sem atravessar o sprite.
  if (typeof retangulosColidem !== "function") return false;

  const caixaCliente = criarHitboxPorPe(proximoX, proximoY, NPC_COLLISION.largura - 8, NPC_COLLISION.altura - 6, 0);
  const fontes = [];

  if (typeof obterCaixasColisaoNPCsEstaticos === "function") {
    fontes.push(...obterCaixasColisaoNPCsEstaticos());
  }

  if (typeof obterCaixasColisaoAjudantes === "function") {
    fontes.push(...obterCaixasColisaoAjudantes());
  }

  return fontes.some((obj) => retangulosColidem(caixaCliente, obj));
}

/**
 * @doc-func analisarBloqueioCliente
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente, proximoX, proximoY.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function analisarBloqueioCliente(cliente, proximoX, proximoY) {
  // Retorna o primeiro obstáculo encontrado. Essa separação permite mostrar
  // "Com licença" para gente no caminho e calcular desvio sem atravessar paredes.
  if (clienteColidiriaComMapa(cliente, proximoX, proximoY)) return "mapa";
  if (clienteColidiriaComEntidadeFixa(cliente, proximoX, proximoY)) return "entidade";
  if (clienteColidiriaComPlayer(cliente, proximoX, proximoY)) return "player";
  if (clienteColidiriaComOutroCliente(cliente, proximoX, proximoY)) return "cliente";
  return null;
}

/**
 * @doc-func posicaoLivreParaCliente
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente, proximoX, proximoY.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function posicaoLivreParaCliente(cliente, proximoX, proximoY) {
  // Uma posição livre é aquela que não bate no mapa, no player nem em outro cliente.
  return !analisarBloqueioCliente(cliente, proximoX, proximoY);
}

/**
 * @doc-func aplicarMovimentoCliente
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente, novoX, novoY, dxAnimacao, dyAnimacao.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function aplicarMovimentoCliente(cliente, novoX, novoY, dxAnimacao, dyAnimacao) {
  // Centraliza a atualização de posição para movimento direto e movimento de desvio.
  cliente.x = novoX;
  cliente.y = novoY;
  limitarClienteAoMapa(cliente);
  atualizarDirecaoCliente(cliente, dxAnimacao, dyAnimacao);
  atualizarPosicaoCliente(cliente);
}

/**
 * @doc-func registrarBloqueioCliente
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente, tipoBloqueio, deltaTime.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
/**
 * @doc-func registrarBloqueioCliente
 * O que faz: registra um evento/estado temporário; edite para mudar feedback ou contadores.
 * Parâmetros: cliente, tipoBloqueio, deltaTime.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function registrarBloqueioCliente(cliente, tipoBloqueio, deltaTime) {
  // O NPC pede licença uma única vez por bloqueio contínuo. Quando ele volta a
  // andar, a flag é resetada e uma próxima obstrução pode gerar nova fala.
  cliente.tempoBloqueado = (cliente.tempoBloqueado || 0) + deltaTime;
  cliente.ultimoTipoBloqueio = tipoBloqueio;

  if (!cliente.pediuLicencaNoBloqueio && cliente.tempoBloqueado > NPC_CONFIG.tempoMensagemLicenca) {
    cliente.pediuLicencaNoBloqueio = true;
    atualizarHumorCliente(cliente, tipoBloqueio === "mapa" ? "Procurando caminho" : "Com licença");
  }
}

/**
 * @doc-func resetarBloqueioCliente
 * O que faz: volta dados/visuais para o estado inicial; inclua novos campos aqui quando criar novos sistemas.
 * Parâmetros: cliente.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function resetarBloqueioCliente(cliente) {
  // Chamado sempre que o NPC consegue andar. Assim ele não fica preso exibindo
  // a mesma fala e pode voltar a tentar o caminho principal.
  cliente.tempoBloqueado = 0;
  cliente.pediuLicencaNoBloqueio = false;
  cliente.ultimoTipoBloqueio = null;
}

/**
 * @doc-func tentarDesvioCliente
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente, dx, dy, distancia, passo.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
/**
 * @doc-func tentarDesvioCliente
 * O que faz: executa uma alternativa segura quando o fluxo principal falha; ajuste ordem de tentativas aqui.
 * Parâmetros: cliente, dx, dy, distancia, passo.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function tentarDesvioCliente(cliente, dx, dy, distancia, passo) {
  // Se o caminho reto está bloqueado, o cliente tenta movimentos laterais curtos.
  // Isso evita que dois clientes fiquem eternamente parados falando "Com licença".
  if (!distancia) return false;

  const dirX = dx / distancia;
  const dirY = dy / distancia;
  const perpX = -dirY;
  const perpY = dirX;
  const direcoesLaterais = [cliente.ladoDesvio || 1, -(cliente.ladoDesvio || 1)];
  const forca = passo * NPC_CONFIG.multiplicadorPassoDesvio;

  for (const lado of direcoesLaterais) {
    const candidatos = [
      { x: cliente.x + perpX * forca * lado, y: cliente.y + perpY * forca * lado },
      { x: cliente.x + dirX * passo * 0.45 + perpX * forca * lado, y: cliente.y + dirY * passo * 0.45 + perpY * forca * lado },
      { x: cliente.x - dirX * passo * 0.2 + perpX * forca * lado, y: cliente.y - dirY * passo * 0.2 + perpY * forca * lado }
    ];

    for (const candidato of candidatos) {
      if (!posicaoLivreParaCliente(cliente, candidato.x, candidato.y)) continue;

      cliente.ladoDesvio = -lado;
      aplicarMovimentoCliente(cliente, candidato.x, candidato.y, candidato.x - cliente.x, candidato.y - cliente.y);
      resetarBloqueioCliente(cliente);
      return true;
    }
  }

  return false;
}

/**
 * @doc-func telaDoJogoEstaAtiva
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function telaDoJogoEstaAtiva() {
  const telaJogoAtual = document.getElementById("tela-jogo");
  return Boolean(telaJogoAtual && telaJogoAtual.classList.contains("active"));
}

/**
 * @doc-func expedienteEstaAbertoParaNPC
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function expedienteEstaAbertoParaNPC() {
  return Boolean(
    telaDoJogoEstaAtiva()
    && typeof gameState !== "undefined"
    && gameState.faseDia === "expediente"
    && gameState.diaEmAndamento
    && !gameState.fimDeJogo
  );
}

/**
 * @doc-func proximoPerfilNPC
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function proximoPerfilNPC() {
  const perfil = NPC_PERFIS[npcSystem.proximoPerfil % NPC_PERFIS.length];
  npcSystem.proximoPerfil += 1;
  return perfil;
}

/**
 * @doc-func calcularIntervaloSpawnNPC
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularIntervaloSpawnNPC() {
  const evento = gameState.relatorioEmAndamento ? gameState.relatorioEmAndamento.evento : null;
  const demandaEvento = evento && evento.demanda ? evento.demanda : 1;
  const movimento = Math.max(0.72, calcularBonusClientela() * demandaEvento);
  return Math.max(NPC_CONFIG.spawnIntervalMin, NPC_CONFIG.spawnIntervalBase / movimento);
}

/**
 * @doc-func calcularChanceCompraNPC
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: cliente.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularChanceCompraNPC(cliente) {
  const reputacao = Math.min(gameState.reputacao, 25) * 0.006;
  const experiencia = Math.min(gameState.experiencia, 30) * 0.003;
  return Math.min(0.98, NPC_CONFIG.chanceCompraBase + reputacao + experiencia + cliente.perfil.chanceCompra);
}

/**
 * @doc-func criarClienteNPC
 * O que faz: cria elementos ou dados novos; mude aqui quando quiser alterar estrutura, classe CSS ou valores iniciais.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function criarClienteNPC() {
  if (!expedienteEstaAbertoParaNPC()) return null;
  if (npcSystem.clientes.length >= npcSystem.maxClientesNaLoja) return null;

  const world = document.getElementById("world");
  if (!world) return null;

  const pontoSpawn = obterPontoSpawnLivreCliente();

  if (!pontoSpawn) {
    return null;
  }

  const perfil = proximoPerfilNPC();
  const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
  const prateleira = escolherPrateleiraParaPerfil(perfil);

  const el = document.createElement("div");
  el.className = `customer-npc ${perfil.classe}`;
  el.dataset.npcId = id;

  const nome = document.createElement("div");
  nome.className = "customer-name";
  nome.textContent = perfil.nome;

  const sprite = document.createElement("div");
  sprite.className = "customer-sprite customer-walk-up";

  const bubble = document.createElement("div");
  bubble.className = "customer-bubble";

  el.appendChild(nome);
  el.appendChild(sprite);
  el.appendChild(bubble);
  world.appendChild(el);

  const cliente = {
    id,
    perfil,
    el,
    sprite,
    bubble,
    x: pontoSpawn.x,
    y: pontoSpawn.y,
    caminho: [],
    caminhoIndex: 0,
    estado: "entrando",
    prateleira,
    velocidade: numeroAleatorio(NPC_CONFIG.velocidadeMin, NPC_CONFIG.velocidadeMax),
    tempoEstado: 0,
    tempoEscolhendo: numeroAleatorio(NPC_CONFIG.tempoEscolhendoMin, NPC_CONFIG.tempoEscolhendoMax) * perfil.paciencia,
    tempoFila: 0,
    tempoBloqueado: 0,
    pediuLicencaNoBloqueio: false,
    ladoDesvio: Math.random() > 0.5 ? 1 : -1,
    ultimoTipoBloqueio: null,
    comprou: false,
    carrinho: null
  };

  definirCaminho(cliente, rotaEntradaAtePrateleira(prateleira));
  atualizarPosicaoCliente(cliente);
  atualizarHumorCliente(cliente, "Chegando");
  npcSystem.clientes.push(cliente);
  npcSystem.totalClientesDia += 1;
  return cliente;
}

/**
 * @doc-func escolherPrateleiraParaPerfil
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: perfil.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function escolherPrateleiraParaPerfil(perfil) {
  const candidatas = npcSystem.pontos.prateleiras.filter((prateleira) => {
    return prateleira.produtos.some((produtoId) => perfil.preferencias.includes(produtoId));
  });

  return escolherItem(candidatas.length ? candidatas : npcSystem.pontos.prateleiras);
}

/**
 * @doc-func rotaEntradaAtePrateleira
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: prateleira.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function rotaEntradaAtePrateleira(prateleira) {
  return [
    { ...npcSystem.pontos.porta },
    { ...npcSystem.pontos.entradaLoja },
    { ...npcSystem.pontos.corredorSul },
    ...rotaCorredorParaPrateleira(prateleira)
  ];
}

/**
 * @doc-func rotaCorredorParaPrateleira
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: prateleira.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function rotaCorredorParaPrateleira(prateleira) {
  if (prateleira.id === "especial") {
    return [
      { x: npcSystem.pontos.corredorInterno.x, y: 740 },
      { ...npcSystem.pontos.corredorInterno },
      { x: prateleira.x, y: prateleira.y }
    ];
  }

  return [
    { x: prateleira.x, y: npcSystem.pontos.corredorSul.y },
    { x: prateleira.x, y: prateleira.y }
  ];
}

/**
 * @doc-func rotaPrateleiraParaFila
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente, pontoFila.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function rotaPrateleiraParaFila(cliente, pontoFila) {
  const prateleira = cliente.prateleira;
  const saidaPrateleira = prateleira.id === "especial"
    ? [
        { ...npcSystem.pontos.corredorInterno },
        { x: npcSystem.pontos.corredorInterno.x, y: 740 },
        { ...npcSystem.pontos.corredorSul }
      ]
    : [
        { x: prateleira.x, y: npcSystem.pontos.corredorSul.y },
        { ...npcSystem.pontos.corredorSul }
      ];

  return [
    ...saidaPrateleira,
    { ...npcSystem.pontos.entradaFilaCaixa },
    { ...npcSystem.pontos.corredorCaixa },
    { ...pontoFila }
  ];
}

/**
 * @doc-func rotaFilaParaSaida
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function rotaFilaParaSaida() {
  return [
    { ...npcSystem.pontos.corredorCaixa },
    { ...npcSystem.pontos.entradaFilaCaixa },
    { ...npcSystem.pontos.corredorSul },
    { ...npcSystem.pontos.entradaLoja },
    { ...npcSystem.pontos.porta },
    { ...npcSystem.pontos.foraPorta }
  ];
}

/**
 * @doc-func rotaClienteParaSaida
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function rotaClienteParaSaida(cliente) {
  const pertoDoCaixa = cliente.x >= 1080 && cliente.x <= 1280 && cliente.y <= 860;

  if (pertoDoCaixa || cliente.estado === "aguardando_caixa" || cliente.estado === "indo_fila") {
    return rotaFilaParaSaida();
  }

  return [
    { x: cliente.x, y: npcSystem.pontos.corredorSul.y },
    { ...npcSystem.pontos.corredorSul },
    { ...npcSystem.pontos.entradaLoja },
    { ...npcSystem.pontos.porta },
    { ...npcSystem.pontos.foraPorta }
  ];
}

/**
 * @doc-func definirCaminho
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente, pontos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
/**
 * @doc-func definirCaminho
 * O que faz: define estado, caminho ou opção usada depois por outros sistemas; altere junto com seus consumidores.
 * Parâmetros: cliente, pontos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function definirCaminho(cliente, pontos) {
  cliente.caminho = pontos.map((ponto) => ({ x: ponto.x, y: ponto.y }));
  cliente.caminhoIndex = 0;
}

/**
 * @doc-func seguirCaminho
 * O que faz: controla deslocamento no mapa; altere velocidade, colisão ou rotas com cautela.
 * Parâmetros: cliente, deltaTime.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function seguirCaminho(cliente, deltaTime) {
  const destino = cliente.caminho[cliente.caminhoIndex];
  if (!destino) return true;

  const chegou = moverClienteAte(cliente, destino, deltaTime);

  if (chegou) {
    cliente.caminhoIndex += 1;
    return cliente.caminhoIndex >= cliente.caminho.length;
  }

  return false;
}

/**
 * @doc-func moverClienteAte
 * O que faz: controla deslocamento no mapa; altere velocidade, colisão ou rotas com cautela.
 * Parâmetros: cliente, destino, deltaTime.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function moverClienteAte(cliente, destino, deltaTime) {
  const dx = destino.x - cliente.x;
  const dy = destino.y - cliente.y;
  const distancia = Math.sqrt(dx * dx + dy * dy);
  const passo = cliente.velocidade * (deltaTime / 16);

  if (distancia <= Math.max(3, passo)) {
    cliente.x = destino.x;
    cliente.y = destino.y;
    atualizarPosicaoCliente(cliente);
    return true;
  }

  const proximoX = cliente.x + (dx / distancia) * passo;
  const proximoY = cliente.y + (dy / distancia) * passo;

  const tipoBloqueio = analisarBloqueioCliente(cliente, proximoX, proximoY);

  if (tipoBloqueio) {
    registrarBloqueioCliente(cliente, tipoBloqueio, deltaTime);
    atualizarDirecaoCliente(cliente, dx, dy);

    if (cliente.tempoBloqueado >= NPC_CONFIG.tempoAntesDesvio && tentarDesvioCliente(cliente, dx, dy, distancia, passo)) {
      return false;
    }

    clienteIdle(cliente);
    return false;
  }

  resetarBloqueioCliente(cliente);
  aplicarMovimentoCliente(cliente, proximoX, proximoY, dx, dy);
  return false;
}

/**
 * @doc-func limitarClienteAoMapa
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
/**
 * @doc-func limitarClienteAoMapa
 * O que faz: controla deslocamento no mapa; altere velocidade, colisão ou rotas com cautela.
 * Parâmetros: cliente.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function limitarClienteAoMapa(cliente) {
  cliente.x = Math.max(96, Math.min(2140, cliente.x));
  cliente.y = Math.max(120, Math.min(1660, cliente.y));
}

/**
 * @doc-func atualizarPosicaoCliente
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: cliente.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarPosicaoCliente(cliente) {
  cliente.el.style.left = `${cliente.x}px`;
  cliente.el.style.top = `${cliente.y}px`;
  cliente.el.style.zIndex = String(3 + Math.floor(cliente.y / 24));
}

/**
 * @doc-func atualizarDirecaoCliente
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: cliente, dx, dy.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarDirecaoCliente(cliente, dx, dy) {
  cliente.sprite.classList.remove(
    "customer-walk-side",
    "customer-walk-up",
    "customer-walk-down",
    "customer-idle"
  );

  if (Math.abs(dx) > Math.abs(dy)) {
    cliente.sprite.classList.add("customer-walk-side");
    cliente.sprite.style.transform = dx < 0
      ? "translateX(-50%) scale(0.55) scaleX(-1)"
      : "translateX(-50%) scale(0.55) scaleX(1)";
    return;
  }

  cliente.sprite.style.transform = "translateX(-50%) scale(0.55)";
  cliente.sprite.classList.add(dy < 0 ? "customer-walk-up" : "customer-walk-down");
}

/**
 * @doc-func clienteIdle
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function clienteIdle(cliente) {
  cliente.sprite.classList.remove(
    "customer-walk-side",
    "customer-walk-up",
    "customer-walk-down"
  );
  cliente.sprite.style.transform = "translateX(-50%) scale(0.55)";
  cliente.sprite.classList.add("customer-idle");
}

/**
 * @doc-func atualizarHumorCliente
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: cliente, texto.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarHumorCliente(cliente, texto) {
  if (!cliente.bubble) return;

  cliente.bubble.textContent = texto || "";
  cliente.bubble.classList.toggle("visible", Boolean(texto));
}

/**
 * @doc-func atualizarCliente
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: cliente, deltaTime.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarCliente(cliente, deltaTime) {
  if (cliente.estado === "entrando") {
    const chegou = seguirCaminho(cliente, deltaTime);

    if (chegou) {
      cliente.estado = "escolhendo";
      cliente.tempoEstado = 0;
      clienteIdle(cliente);
      atualizarHumorCliente(cliente, "Escolhendo...");
    } else if (cliente.caminhoIndex >= 2) {
      atualizarHumorCliente(cliente, cliente.prateleira.nome);
    }

    return;
  }

  if (cliente.estado === "escolhendo") {
    cliente.tempoEstado += deltaTime;

    if (!expedienteEstaAbertoParaNPC()) {
      mandarClienteEmbora(cliente, "Fechou");
      return;
    }

    if (cliente.tempoEstado >= cliente.tempoEscolhendo) {
      const vaiComprar = Math.random() <= calcularChanceCompraNPC(cliente);
      const carrinho = vaiComprar ? montarCarrinhoCliente(cliente) : null;

      if (carrinho) {
        cliente.carrinho = carrinho;
        cliente.estado = "indo_fila";
        cliente.tempoFila = 0;
        const posicaoFila = obterFilaAtendimento().length - 1;
        const pontoFila = npcSystem.pontos.filaCaixa[Math.min(posicaoFila, npcSystem.pontos.filaCaixa.length - 1)];
        definirCaminho(cliente, rotaPrateleiraParaFila(cliente, pontoFila));
        atualizarHumorCliente(cliente, `${carrinho.quantidadeTotal} item(ns)`);
      } else {
        npcSystem.totalPerdidosDia += 1;
        criarPopupCliente(cliente.x, cliente.y, "Sem compra", "muted");
        mandarClienteEmbora(cliente, "Nada hoje");
      }
    }

    return;
  }

  if (cliente.estado === "indo_fila") {
    if (!expedienteEstaAbertoParaNPC()) {
      mandarClienteEmbora(cliente, "Fechou");
      return;
    }

    const chegou = seguirCaminho(cliente, deltaTime);

    if (chegou) {
      cliente.estado = "aguardando_caixa";
      cliente.tempoFila = 0;
      clienteIdle(cliente);
      atualizarHumorCliente(cliente, "Na fila");
      atualizarInterfaceJogo();
    }

    return;
  }

  if (cliente.estado === "aguardando_caixa") {
    if (cliente.caminhoIndex < cliente.caminho.length) {
      seguirCaminho(cliente, deltaTime);
      return;
    }

    if (cliente.emAtendimento) {
      cliente.tempoFila = 0;
      clienteIdle(cliente);
      atualizarHumorCliente(cliente, "Atendimento");
      return;
    }

    cliente.tempoFila += deltaTime;
    clienteIdle(cliente);

    if (!expedienteEstaAbertoParaNPC()) {
      mandarClienteEmbora(cliente, "Fechou");
      return;
    }

    if (cliente.tempoFila > NPC_CONFIG.tempoEsperaFilaMax) {
      npcSystem.totalPerdidosDia += 1;
      criarPopupCliente(cliente.x, cliente.y, "Cansou da fila", "muted");
      mandarClienteEmbora(cliente, "Desistiu");
      atualizarInterfaceJogo();
    }

    return;
  }

  if (cliente.estado === "saindo") {
    const saiu = seguirCaminho(cliente, deltaTime);

    if (saiu) {
      removerCliente(cliente);
      atualizarPosicoesFila();
      atualizarInterfaceJogo();
    }
  }
}

/**
 * @doc-func montarCarrinhoCliente
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function montarCarrinhoCliente(cliente) {
  const linhas = [];
  const maxLinhas = gameState.reputacao >= 5 ? 3 : 2;
  const tentativas = 2 + Math.floor(Math.random() * maxLinhas);

  for (let i = 0; i < tentativas; i += 1) {
    const produto = escolherProdutoParaClientePreferencias(cliente);
    if (!produto) continue;

    const quantidade = calcularQuantidadePedidoNPC(produto);
    if (quantidade <= 0) continue;

    const existente = linhas.find((linha) => linha.produtoId === produto.id);

    if (existente) {
      existente.quantidade += quantidade;
      existente.subtotal = existente.quantidade * existente.precoUnitario;
    } else {
      const estoque = obterEstoque(produto.id);
      linhas.push({
        produtoId: produto.id,
        nome: produto.nome,
        quantidade,
        precoUnitario: Math.max(1, estoque.precoVenda),
        subtotal: Math.max(1, estoque.precoVenda) * quantidade
      });
    }

    if (linhas.length >= maxLinhas) break;
  }

  if (!linhas.length) return null;

  const total = linhas.reduce((soma, item) => soma + item.subtotal, 0);
  const valorEntregue = calcularValorEntregue(total);

  return {
    itens: linhas,
    total,
    valorEntregue,
    troco: valorEntregue - total,
    quantidadeTotal: linhas.reduce((soma, item) => soma + item.quantidade, 0)
  };
}

/**
 * @doc-func escolherProdutoParaClientePreferencias
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function escolherProdutoParaClientePreferencias(cliente) {
  if (!gameState.relatorioEmAndamento) return null;

  const evento = gameState.relatorioEmAndamento.evento;
  const candidatos = productCatalog
    .map((produto) => ({
      produto,
      peso: calcularPesoProdutoParaNPC(produto, cliente.perfil, evento)
    }))
    .filter((item) => item.peso > 0);

  const pesoTotal = candidatos.reduce((total, item) => total + item.peso, 0);
  if (pesoTotal <= 0) return null;

  let roleta = Math.random() * pesoTotal;

  for (const item of candidatos) {
    roleta -= item.peso;
    if (roleta <= 0) return item.produto;
  }

  return candidatos[candidatos.length - 1].produto;
}

/**
 * @doc-func calcularPesoProdutoParaNPC
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: produto, perfil, evento.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularPesoProdutoParaNPC(produto, perfil, evento) {
  const estoque = obterEstoque(produto.id);
  if (!produtoEstaLiberado(produto) || estoque.quantidade <= 0) return 0;

  const preco = Math.max(1, estoque.precoVenda);
  const precoReferencia = Math.max(1, produto.precoInicial);
  const fatorPreco = Math.max(0.08, Math.min(1.85, precoReferencia / preco));
  const preferido = perfil.preferencias.includes(produto.id) ? 2.4 : 1;

  return produto.demandaBase
    * preferido
    * Math.pow(fatorPreco, 1.35)
    * calcularBonusClientela()
    * calcularMultiplicadorEvento(produto, evento || {});
}

/**
 * @doc-func calcularQuantidadePedidoNPC
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: produto.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularQuantidadePedidoNPC(produto) {
  const estoque = obterEstoque(produto.id);
  if (!estoque || estoque.quantidade <= 0) return 0;

  const extraProdutoBarato = produto.custo <= 5 && Math.random() < 0.34 ? 1 : 0;
  const extraBoaReputacao = gameState.reputacao >= 6 && Math.random() < 0.16 ? 1 : 0;
  return Math.min(estoque.quantidade, 1 + extraProdutoBarato + extraBoaReputacao);
}

/**
 * @doc-func calcularValorEntregue
 * O que faz: calcula um valor usado pelas regras do jogo; ajuste a fórmula interna para mudar o balanceamento.
 * Parâmetros: total.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function calcularValorEntregue(total) {
  const cedulas = [5, 10, 20, 50, 100, 200, 500];
  const exato = Math.random() < 0.26;

  if (exato) return total;

  const alvo = total + [1, 2, 3, 5, 10, 15, 20][Math.floor(Math.random() * 7)];
  return cedulas.find((valor) => valor >= alvo) || Math.ceil(alvo / 50) * 50;
}

/**
 * @doc-func atualizarPosicoesFila
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarPosicoesFila() {
  const fila = obterFilaAtendimento();

  fila.forEach((cliente, index) => {
    const pontoFila = npcSystem.pontos.filaCaixa[Math.min(index, npcSystem.pontos.filaCaixa.length - 1)];

    if (cliente.estado === "aguardando_caixa") {
      definirCaminho(cliente, [{ ...pontoFila }]);
    }
  });
}

/**
 * @doc-func obterFilaAtendimento
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterFilaAtendimento() {
  return npcSystem.clientes.filter((cliente) => {
    return ["indo_fila", "aguardando_caixa"].includes(cliente.estado);
  });
}

/**
 * @doc-func obterClienteParaAtender
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: clienteId = null.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function obterClienteParaAtender(clienteId = null) {
  if (clienteId) {
    return npcSystem.clientes.find((cliente) => {
      return cliente.id === clienteId && cliente.estado === "aguardando_caixa" && cliente.carrinho;
    }) || null;
  }

  return npcSystem.clientes.find((cliente) => cliente.estado === "aguardando_caixa" && cliente.carrinho) || null;
}

/**
 * @doc-func existeClienteAguardando
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function existeClienteAguardando() {
  return Boolean(obterClienteParaAtender());
}

/**
 * @doc-func marcarClienteEmAtendimento
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: clienteId.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function marcarClienteEmAtendimento(clienteId) {
  const cliente = obterClienteParaAtender(clienteId);
  if (!cliente) return;

  npcSystem.clientes.forEach((item) => {
    if (item.id !== cliente.id) {
      item.emAtendimento = false;
    }
  });

  cliente.emAtendimento = true;
  cliente.tempoFila = 0;
  atualizarHumorCliente(cliente, "Atendimento");
}

/**
 * @doc-func liberarAtendimentoCheckout
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function liberarAtendimentoCheckout() {
  npcSystem.clientes.forEach((cliente) => {
    cliente.emAtendimento = false;
  });
}

/**
 * @doc-func atenderClienteDaFila
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: aceitar, clienteId = null, trocoInformado = 0.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atenderClienteDaFila(aceitar, clienteId = null, trocoInformado = 0) {
  const cliente = obterClienteParaAtender(clienteId);

  if (!cliente) {
    return { ok: false, mensagem: "Esse cliente não está mais no caixa." };
  }

  if (typeof jogadorEstaNoPisoBalcao === "function" && !jogadorEstaNoPisoBalcao()) {
    cliente.emAtendimento = true;
    cliente.tempoFila = 0;
    return {
      ok: false,
      mensagem: "Entre no balcao para atender clientes.",
      mantemAtendimento: true
    };
  }

  cliente.emAtendimento = false;

  if (!aceitar) {
    npcSystem.totalPerdidosDia += 1;
    criarPopupCliente(cliente.x, cliente.y, "Compra recusada", "muted");
    mandarClienteEmbora(cliente, "Devolvido");
    atualizarPosicoesFila();
    return { ok: true, mensagem: `${cliente.perfil.nome} saiu sem comprar.` };
  }

  if (cliente.carrinho.valorEntregue < cliente.carrinho.total) {
    return { ok: false, mensagem: "O cliente não entregou dinheiro suficiente." };
  }

  const trocoDigitado = Math.max(0, Number(trocoInformado) || 0);
  const trocoEsperado = Math.max(0, Number(cliente.carrinho.troco) || 0);
  const trocoCorreto = Math.abs(trocoDigitado - trocoEsperado) < 0.01;

  if (!trocoCorreto) {
    cliente.emAtendimento = true;
    cliente.tempoFila = 0;
    atualizarHumorCliente(cliente, "Troco errado");
    return {
      ok: false,
      mensagem: `Troco errado. O correto e ${formatarMoeda(trocoEsperado)}.`,
      mantemAtendimento: true
    };
  }

  const resultado = venderCarrinhoParaCliente(cliente.carrinho.itens);

  if (!resultado.ok) {
    npcSystem.totalPerdidosDia += 1;
    criarPopupCliente(cliente.x, cliente.y, "Sem estoque", "muted");
    mandarClienteEmbora(cliente, "Sem estoque");
    atualizarPosicoesFila();
    return resultado;
  }

  cliente.comprou = true;
  npcSystem.totalVendasDia += resultado.receita;
  npcSystem.totalAtendidosDia += 1;
  criarPopupCliente(cliente.x, cliente.y, `+ ${formatarMoeda(resultado.receita)}`, "money");
  mandarClienteEmbora(cliente, `Troco ${formatarMoeda(cliente.carrinho.troco)}`);
  atualizarPosicoesFila();

  return {
    ok: true,
    mensagem: `${cliente.perfil.nome} atendido. Troco: ${formatarMoeda(cliente.carrinho.troco)}.`
  };
}

/**
 * @doc-func mandarClienteEmbora
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente, texto = "".
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function mandarClienteEmbora(cliente, texto = "") {
  const rotaSaida = rotaClienteParaSaida(cliente);
  cliente.estado = "saindo";
  cliente.tempoFila = 0;
  definirCaminho(cliente, rotaSaida);
  atualizarHumorCliente(cliente, texto);
}

/**
 * @doc-func criarPopupCliente
 * O que faz: cria elementos ou dados novos; mude aqui quando quiser alterar estrutura, classe CSS ou valores iniciais.
 * Parâmetros: x, y, texto, tipo = "money".
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function criarPopupCliente(x, y, texto, tipo = "money") {
  const world = document.getElementById("world");
  if (!world) return;

  const popup = document.createElement("div");
  popup.className = `money-popup ${tipo === "muted" ? "muted" : ""}`;
  popup.textContent = texto;
  popup.style.left = `${x}px`;
  popup.style.top = `${y - 92}px`;

  world.appendChild(popup);

  window.setTimeout(() => {
    popup.remove();
  }, 1200);
}

/**
 * @doc-func removerCliente
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: cliente.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function removerCliente(cliente) {
  if (cliente.el && cliente.el.isConnected) {
    cliente.el.remove();
  }

  npcSystem.clientes = npcSystem.clientes.filter((item) => item.id !== cliente.id);
}

/**
 * @doc-func atualizarClientesIniciais
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: deltaTime.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarClientesIniciais(deltaTime) {
  if (npcSystem.clientesIniciaisPendentes <= 0) return;

  npcSystem.timerInicial += deltaTime;
  if (npcSystem.timerInicial < NPC_CONFIG.intervaloClientesIniciais) return;

  const clienteCriado = criarClienteNPC();

  if (clienteCriado) {
    npcSystem.timerInicial = 0;
    npcSystem.clientesIniciaisPendentes -= 1;
  } else {
    // Entrada ocupada: tenta de novo logo, sem perder o cliente pendente.
    npcSystem.timerInicial = NPC_CONFIG.intervaloClientesIniciais - NPC_CONFIG.tentativaRespawnBloqueado;
  }
}

/**
 * @doc-func atualizarNPCs
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: deltaTime.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarNPCs(deltaTime) {
  if (!npcSystem.ativo) return;

  const expedienteAbertoAgora = expedienteEstaAbertoParaNPC();

  if (!expedienteAbertoAgora && npcSystem.expedienteAberto) {
    fecharExpediente();
  }

  if (expedienteAbertoAgora) {
    npcSystem.expedienteAberto = true;
    atualizarClientesIniciais(deltaTime);
    npcSystem.spawnIntervalAtual = calcularIntervaloSpawnNPC();
    npcSystem.spawnTimer += deltaTime;

    if (npcSystem.spawnTimer >= npcSystem.spawnIntervalAtual) {
      const clienteCriado = criarClienteNPC();

      if (clienteCriado) {
        npcSystem.spawnTimer = 0;
      } else {
        // Se a porta estiver cheia, reavalia rapidamente em vez de empilhar NPCs.
        npcSystem.spawnTimer = npcSystem.spawnIntervalAtual - NPC_CONFIG.tentativaRespawnBloqueado;
      }
    }
  }

  [...npcSystem.clientes].forEach((cliente) => {
    atualizarCliente(cliente, deltaTime);
  });
}

/**
 * @doc-func abrirExpediente
 * O que faz: abre uma tela/modal/fluxo; edite textos e chamadas caso o comportamento de abertura mude.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function abrirExpediente() {
  npcSystem.expedienteAberto = true;
  npcSystem.spawnTimer = 0;
  npcSystem.clientesIniciaisPendentes = Math.max(npcSystem.clientesIniciaisPendentes, 3);
  npcSystem.timerInicial = 0;
}

/**
 * @doc-func fecharExpediente
 * O que faz: fecha uma tela/modal/fluxo; edite para limpar estados extras ao sair.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function fecharExpediente() {
  npcSystem.expedienteAberto = false;
  npcSystem.clientesIniciaisPendentes = 0;

  npcSystem.clientes.forEach((cliente) => {
    if (cliente.estado !== "saindo") {
      mandarClienteEmbora(cliente, "Fechou");
    }
  });
}

/**
 * @doc-func resetarNPCsDoDia
 * O que faz: volta dados/visuais para o estado inicial; inclua novos campos aqui quando criar novos sistemas.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function resetarNPCsDoDia() {
  npcSystem.expedienteAberto = false;
  npcSystem.totalClientesDia = 0;
  npcSystem.totalVendasDia = 0;
  npcSystem.totalPerdidosDia = 0;
  npcSystem.totalAtendidosDia = 0;
  npcSystem.spawnTimer = 0;
  npcSystem.clientesIniciaisPendentes = 0;
  npcSystem.timerInicial = 0;
  npcSystem.ultimoIndiceSpawn = -1;

  npcSystem.clientes.forEach((cliente) => {
    if (cliente.el && cliente.el.isConnected) {
      cliente.el.remove();
    }
  });
  npcSystem.clientes = [];
}

window.atualizarNPCs = atualizarNPCs;
window.abrirExpediente = abrirExpediente;
window.fecharExpediente = fecharExpediente;
window.resetarNPCsDoDia = resetarNPCsDoDia;
window.obterCaixasColisaoNPCs = obterCaixasColisaoNPCs;
window.obterFilaAtendimento = obterFilaAtendimento;
window.obterClienteParaAtender = obterClienteParaAtender;
window.existeClienteAguardando = existeClienteAguardando;
window.atenderClienteDaFila = atenderClienteDaFila;
window.marcarClienteEmAtendimento = marcarClienteEmAtendimento;
window.liberarAtendimentoCheckout = liberarAtendimentoCheckout;
