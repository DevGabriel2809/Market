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
  maxClientesNaLoja: 6,
  totalClientesDia: 0,
  totalVendasDia: 0,
  totalPerdidosDia: 0,
  totalAtendidosDia: 0,
  proximoPerfil: 0,
  clientesIniciaisPendentes: 0,
  timerInicial: 0,
  ultimoIndiceSpawn: -1,

  // v26: dados vindos da camada npc_zones do Tiled.
  // buy_* gera pontos de compra, queue_* gera fila e lane_* gera corredores.
  navegacao: {
    carregada: false,
    buyZones: [],
    buyByProduct: {},
    queuePoints: [],
    // doorEntry vem do objeto door_entry criado no Tiled; clientes nascem e desaparecem somente dentro dele.
    doorEntry: null,
    lanes: { cima: [], meio: [], baixo: [], todas: [] },
    reservasCompra: {},
    reservasFila: {}
  },

  pontos: {
    foraPorta: { x: 260, y: 920 },
    porta: { x: 300, y: 920 },
    entradaLoja: { x: 420, y: 920 },
    corredorSul: { x: 520, y: 840 },
    corredorInterno: { x: 560, y: 520 },
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
      { id: "pao", nome: "Pães", x: 690, y: 840, produtos: ["pao", "queijo", "mel"] },
      { id: "frutas", nome: "Frutas", x: 840, y: 840, produtos: ["maca", "mel"] },
      { id: "frios", nome: "Frios", x: 1040, y: 805, produtos: ["queijo", "carne", "hidromel"] },
      { id: "utilidades", nome: "Utilidades", x: 1190, y: 840, produtos: ["vela", "corda"] },
      { id: "especial", nome: "Especiais", x: 600, y: 500, produtos: ["pocao", "ervas", "hidromel", "especiaria"] }
    ]
  }
};

const NPC_CONFIG = {
  velocidadeMin: 1.35,
  velocidadeMax: 1.82,
  spawnIntervalBase: 4200,
  spawnIntervalMin: 2200,
  tempoEscolhendoMin: 1000,
  tempoEscolhendoMax: 2400,
  tempoEsperaFilaMax: 62000,
  chanceCompraBase: 0.88,
  intervaloClientesIniciais: 1150,
  tentativaRespawnBloqueado: 420,
  tempoAntesDesvio: 220,
  tempoMensagemLicenca: 260,
  multiplicadorPassoDesvio: 2.4,
  tempoAntesPassagemForcada: 999999,
  duracaoPassagemForcada: 0,
  passoSeparacao: 0,
  tempoAntesReplanejar: 900,
  intervaloReplanejamento: 1400,
  // @doc-config Tempo mínimo preso antes de trocar a rota inteira. Evita tremedeira porque não empurra NPCs; só escolhe outro corredor.
  tempoAntesReplanejarRota: 2600,
  intervaloReplanejamentoRota: 3200,
  // Se o cliente passar muito tempo preso em “Procurando caminho”, ele é realocado para o door_entry.
  tempoMaxProcurandoCaminho: 3000,
  // v29: limites de segurança para manter o fluxo do caixa vivo mesmo se uma rota ficar ruim.
  tempoMaxAtePrateleira: 14000,
  tempoMaxAteFila: 11000,
  tamanhoCelulaPathfinding: 32
};

const NPC_COLLISION = {
  // A hitbox fica nos pés do sprite, não no corpo inteiro.
  // Isso deixa o personagem encostar no visual do NPC sem travar de longe.
  largura: 30,
  altura: 18,
  margemPlayer: 1
};

function zIndexProfundidadeNPC(y, ajuste = 0) {
  if (typeof window.calcularZIndexProfundidadeMapa === "function") {
    return window.calcularZIndexProfundidadeMapa(y, ajuste);
  }

  return String(1000 + Math.round(Number(y) || 0) + ajuste);
}

const NPC_PERFIS = [
  { nome: "Lia", classe: "npc-lia", preferencias: ["maca", "pao", "mel"], paciencia: 1.42, chanceCompra: 0.24 },
  { nome: "Bruno", classe: "npc-bruno", preferencias: ["carne", "queijo", "hidromel"], paciencia: 1.24, chanceCompra: 0.43 },
  { nome: "Marta", classe: "npc-marta", preferencias: ["pao", "vela", "corda"], paciencia: 1.46, chanceCompra: 0.38 },
  { nome: "Caio", classe: "npc-caio", preferencias: ["pocao", "vela", "ervas"], paciencia: 1.18, chanceCompra: 0.42 },
  { nome: "Nina", classe: "npc-nina", preferencias: ["queijo", "maca", "mel"], paciencia: 1.32, chanceCompra: 0.24 },
  { nome: "Tomas", classe: "npc-tomas", preferencias: ["vela", "pao", "corda"], paciencia: 1.22, chanceCompra: 0.28 },
  { nome: "Rosa", classe: "npc-rosa", preferencias: ["especiaria", "pocao", "queijo", "ervas"], paciencia: 1.36, chanceCompra: 0.25 }
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


// ======================================================
// NAVEGAÇÃO DE CLIENTES PELO TILED (v26)
// ======================================================

// Relaciona os nomes simples usados na camada npc_zones com os produtos reais do jogo.
// Para editar no Tiled: basta criar/renomear um retângulo buy_nome. Ex.: buy_breads -> pão.
const NPC_ZONE_PRODUCT_MAP = {
  breads: ["pao", "mel"],
  bread: ["pao", "mel"],
  paes: ["pao", "mel"],
  cheese: ["queijo", "hidromel"],
  queijo: ["queijo", "hidromel"],
  meat: ["carne", "hidromel"],
  meats: ["carne", "hidromel"],
  carne: ["carne", "hidromel"],
  fruits: ["maca", "mel"],
  fruit: ["maca", "mel"],
  frutas: ["maca", "mel"],
  maca: ["maca", "mel"],
  candles: ["vela", "corda"],
  candle: ["vela", "corda"],
  velas: ["vela", "corda"],
  utilities: ["vela", "corda"],
  utilidades: ["vela", "corda"],
  potions: ["pocao", "ervas"],
  potion: ["pocao", "ervas"],
  pocoes: ["pocao", "ervas"],
  herbs: ["ervas"],
  ervas: ["ervas"],
  spices: ["especiaria", "ervas"],
  spice: ["especiaria", "ervas"],
  especiarias: ["especiaria", "ervas"],
  especiais: ["pocao", "ervas", "hidromel", "especiaria"]
};

function obterNomeZona(objeto) {
  return String(objeto && objeto.name ? objeto.name : "").trim();
}

function obterSufixoZona(objeto, prefixo) {
  return obterNomeZona(objeto).replace(prefixo, "").trim().toLowerCase();
}

function centroObjetoMapa(objeto) {
  return {
    x: Number(objeto.x || 0) + Number(objeto.width || 0) / 2,
    y: Number(objeto.y || 0) + Number(objeto.height || 0) / 2
  };
}

function pontoDentroObjeto(objeto, margem = 8) {
  const largura = Math.max(1, Number(objeto.width || 0));
  const altura = Math.max(1, Number(objeto.height || 0));
  const minX = Number(objeto.x || 0) + Math.min(margem, largura / 3);
  const maxX = Number(objeto.x || 0) + largura - Math.min(margem, largura / 3);
  const minY = Number(objeto.y || 0) + Math.min(margem, altura / 3);
  const maxY = Number(objeto.y || 0) + altura - Math.min(margem, altura / 3);

  return {
    x: Math.max(96, Math.min(2140, numeroAleatorio(Math.min(minX, maxX), Math.max(minX, maxX)))),
    y: Math.max(120, Math.min(1660, numeroAleatorio(Math.min(minY, maxY), Math.max(minY, maxY))))
  };
}

function criarSpotsDoObjeto(objeto, prefixoId) {
  const largura = Math.max(1, Number(objeto.width || 1));
  const altura = Math.max(1, Number(objeto.height || 1));
  const horizontal = largura >= altura;
  const comprimento = horizontal ? largura : altura;
  const quantidade = Math.max(1, Math.min(8, Math.floor(comprimento / 38) + 1));
  const spots = [];

  for (let i = 0; i < quantidade; i += 1) {
    const t = quantidade === 1 ? 0.5 : (i + 0.5) / quantidade;
    spots.push({
      id: `${prefixoId}_spot_${i + 1}`,
      x: Number(objeto.x || 0) + (horizontal ? largura * t : largura / 2),
      y: Number(objeto.y || 0) + (horizontal ? altura / 2 : altura * t)
    });
  }

  return spots;
}

function produtosDaZonaCompra(objeto) {
  const sufixo = obterSufixoZona(objeto, "buy_");
  return NPC_ZONE_PRODUCT_MAP[sufixo] || [];
}

function nomeAmigavelZonaCompra(objeto) {
  const sufixo = obterSufixoZona(objeto, "buy_");
  const nomes = {
    breads: "Pães",
    cheese: "Queijos",
    meat: "Carnes",
    fruits: "Frutas",
    potions: "Poções",
    candles: "Velas",
    spices: "Especiarias",
    equips: "Equipamentos",
    seeds: "Sementes",
    book: "Livros",
    weapons: "Armas"
  };
  return nomes[sufixo] || sufixo || "Compras";
}

function reconstruirIndiceProdutosCompra() {
  const byProduct = {};

  npcSystem.navegacao.buyZones.forEach((zona) => {
    zona.produtos.forEach((produtoId) => {
      if (!byProduct[produtoId]) byProduct[produtoId] = [];
      byProduct[produtoId].push(zona);
    });
  });

  npcSystem.navegacao.buyByProduct = byProduct;
}

function gerarFilaPorObjeto(objeto) {
  const largura = Math.max(1, Number(objeto.width || 1));
  const altura = Math.max(1, Number(objeto.height || 1));
  const vertical = altura >= largura;
  const comprimento = vertical ? altura : largura;
  const quantidade = Math.max(3, Math.min(9, Math.floor(comprimento / 38) + 1));
  const pontos = [];

  for (let i = 0; i < quantidade; i += 1) {
    const t = quantidade === 1 ? 0.5 : (i + 0.5) / quantidade;
    pontos.push({
      // A fila é ordenada do balcão para trás. Em retângulo vertical, começa pelo fundo visual do objeto.
      x: Number(objeto.x || 0) + (vertical ? largura / 2 : largura * (1 - t)),
      y: Number(objeto.y || 0) + (vertical ? altura * (1 - t) : altura / 2)
    });
  }

  return pontos;
}

function registrarZonasNPC(objetos = []) {
  const zonas = Array.isArray(objetos) ? objetos : [];
  const navegacao = npcSystem.navegacao;

  navegacao.carregada = true;
  navegacao.buyZones = [];
  navegacao.queuePoints = [];
  navegacao.doorEntry = null;
  navegacao.lanes = { cima: [], meio: [], baixo: [], todas: [] };
  navegacao.reservasCompra = {};
  navegacao.reservasFila = {};

  zonas.forEach((objeto) => {
    const nome = obterNomeZona(objeto);

    if (nome.startsWith("buy_")) {
      const produtos = produtosDaZonaCompra(objeto);
      if (!produtos.length) return;

      const id = `${nome}_${objeto.id || navegacao.buyZones.length}`;
      const centro = centroObjetoMapa(objeto);
      navegacao.buyZones.push({
        id,
        nome: nomeAmigavelZonaCompra(objeto),
        objeto,
        x: centro.x,
        y: centro.y,
        produtos,
        spots: criarSpotsDoObjeto(objeto, id)
      });
      return;
    }

    if (nome.startsWith("queue_")) {
      navegacao.queuePoints.push(...gerarFilaPorObjeto(objeto));
      return;
    }

    if (nome === "door_entry" || nome === "door_entrada" || nome === "door_saida") {
      navegacao.doorEntry = objeto;
      const centroDoor = centroObjetoMapa(objeto);
      npcSystem.pontos.foraPorta = { ...centroDoor };
      npcSystem.pontos.porta = { ...centroDoor };
      return;
    }

    if (nome.startsWith("lane_")) {
      const tipo = obterSufixoZona(objeto, "lane_");
      const lane = { id: `${nome}_${objeto.id || Math.random()}`, tipo, objeto, centro: centroObjetoMapa(objeto) };
      if (!navegacao.lanes[tipo]) navegacao.lanes[tipo] = [];
      navegacao.lanes[tipo].push(lane);
      navegacao.lanes.todas.push(lane);
    }
  });

  reconstruirIndiceProdutosCompra();

  if (navegacao.queuePoints.length) {
    npcSystem.pontos.filaCaixa = navegacao.queuePoints.map((ponto) => ({ x: ponto.x, y: ponto.y }));
  }

  if (typeof reposicionarNPCsEstaticos === "function") {
    reposicionarNPCsEstaticos("mapa_carregado");
  }

  console.log("Zonas de NPC carregadas:", {
    compras: navegacao.buyZones.length,
    fila: navegacao.queuePoints.length,
    porta: navegacao.doorEntry ? obterNomeZona(navegacao.doorEntry) : "fallback",
    lanes: navegacao.lanes.todas.length
  });
}

function obterZonasCompraDisponiveis() {
  return npcSystem.navegacao.buyZones.length ? npcSystem.navegacao.buyZones : npcSystem.pontos.prateleiras;
}

function obterSpotsZonaCompra(zona) {
  if (Array.isArray(zona.spots) && zona.spots.length) return zona.spots;
  return [{ id: `${zona.id || zona.nome}_fallback`, x: zona.x, y: zona.y }];
}

function spotEstaReservado(spotId, clienteId = null) {
  const dono = npcSystem.navegacao.reservasCompra[spotId];
  return Boolean(dono && dono !== clienteId);
}

function escolherSpotLivreDaZona(zona, clienteId) {
  const spots = [...obterSpotsZonaCompra(zona)].sort(() => Math.random() - 0.5);

  for (const spot of spots) {
    if (!spotEstaReservado(spot.id, clienteId)) return spot;
  }

  return escolherItem(spots);
}

function reservarPontoCompra(cliente, zona) {
  if (!zona) return null;
  liberarReservaCompraCliente(cliente);

  const spot = escolherSpotLivreDaZona(zona, cliente.id);
  if (!spot) return null;

  npcSystem.navegacao.reservasCompra[spot.id] = cliente.id;
  cliente.compraSpotId = spot.id;
  cliente.pontoCompra = { x: spot.x, y: spot.y };
  return cliente.pontoCompra;
}

function liberarReservaCompraCliente(cliente) {
  if (!cliente || !cliente.compraSpotId) return;

  if (npcSystem.navegacao.reservasCompra[cliente.compraSpotId] === cliente.id) {
    delete npcSystem.navegacao.reservasCompra[cliente.compraSpotId];
  }

  cliente.compraSpotId = null;
}

function pontoAleatorioEmLane(tipoPreferido, destino = null) {
  const grupos = npcSystem.navegacao.lanes;
  let candidatas = grupos[tipoPreferido] && grupos[tipoPreferido].length
    ? grupos[tipoPreferido]
    : grupos.todas;

  if (!candidatas.length) return null;

  if (destino && candidatas.length > 1) {
    candidatas = [...candidatas].sort((a, b) => {
      const da = Math.hypot(a.centro.x - destino.x, a.centro.y - destino.y);
      const db = Math.hypot(b.centro.x - destino.x, b.centro.y - destino.y);
      return da - db;
    }).slice(0, Math.min(4, candidatas.length));
  }

  const lane = escolherItem(candidatas);
  return pontoDentroObjeto(lane.objeto, 14);
}

function tipoLaneParaDestino(destino) {
  if (!destino) return escolherItem(["cima", "meio", "baixo"]);
  if (destino.y < 760) return "cima";
  if (destino.y > 1080) return "baixo";
  return "meio";
}

function criarWaypointsPorLanes(destino) {
  if (!npcSystem.navegacao.lanes.todas.length || !destino) return [];

  const tipo = tipoLaneParaDestino(destino);
  const entrada = pontoAleatorioEmLane("meio", npcSystem.pontos.entradaLoja);
  const meio = pontoAleatorioEmLane(tipo, destino);
  const aproximacao = pontoAleatorioEmLane(tipo, destino);

  return [entrada, meio, aproximacao]
    .filter(Boolean)
    .filter((ponto, index, lista) => index === 0 || Math.hypot(ponto.x - lista[index - 1].x, ponto.y - lista[index - 1].y) > 60);
}

function obterDoorEntryObjeto() {
  return npcSystem.navegacao && npcSystem.navegacao.doorEntry
    ? npcSystem.navegacao.doorEntry
    : null;
}

function obterPontoDoorEntry(margem = 6) {
  const door = obterDoorEntryObjeto();

  if (!door) {
    return {
      x: npcSystem.pontos.foraPorta.x + numeroAleatorio(-18, 18),
      y: npcSystem.pontos.foraPorta.y + numeroAleatorio(-10, 10)
    };
  }

  return pontoDentroObjeto(door, margem);
}

function pontoEstaDentroDoorEntry(x, y, margem = 2) {
  const door = obterDoorEntryObjeto();
  if (!door) return false;

  return x >= Number(door.x || 0) - margem
    && x <= Number(door.x || 0) + Number(door.width || 0) + margem
    && y >= Number(door.y || 0) - margem
    && y <= Number(door.y || 0) + Number(door.height || 0) + margem;
}

function criarRotaAtualParaDestino(cliente, destino) {
  const waypoints = criarWaypointsPorLanes(destino);
  return [
    { x: cliente.x, y: cliente.y },
    ...waypoints,
    destino
  ];
}


// ======================================================
// PATHFINDING SIMPLES PARA CLIENTES (v29)
// ======================================================
// A v28 dependia demais de pontos intermediários/lane_* e, quando um segmento
// reto cruzava uma colisão, o cliente ficava recalculando rota por tempo demais.
// A partir da v29, cada trecho importante passa por uma grade A* leve. Isso
// preserva as zonas do Tiled, mas evita que o NPC tente atravessar prateleiras.

const NPC_PATH_CACHE = {
  celulasLivres: new Map()
};

function obterLimitesPathfinding() {
  return {
    minX: 80,
    minY: 96,
    maxX: 2160,
    maxY: 1680,
    celula: NPC_CONFIG.tamanhoCelulaPathfinding
  };
}

function chaveCelulaPath(gx, gy) {
  return `${gx},${gy}`;
}

function pontoParaCelulaPath(ponto) {
  const limites = obterLimitesPathfinding();
  return {
    gx: Math.round(Number(ponto.x || 0) / limites.celula),
    gy: Math.round(Number(ponto.y || 0) / limites.celula)
  };
}

function celulaParaPontoPath(celula) {
  const limites = obterLimitesPathfinding();
  return {
    x: celula.gx * limites.celula,
    y: celula.gy * limites.celula
  };
}

function pontoLivreParaPathfinding(x, y) {
  const limites = obterLimitesPathfinding();
  if (x < limites.minX || x > limites.maxX || y < limites.minY || y > limites.maxY) return false;
  if (!Array.isArray(window.objetosColisao) || typeof retangulosColidem !== "function") return true;

  const caixaCliente = criarHitboxPorPe(x, y, NPC_COLLISION.largura - 8, NPC_COLLISION.altura - 6, 1);
  return !window.objetosColisao.some((obj) => retangulosColidem(caixaCliente, obj));
}

function celulaLivrePath(gx, gy) {
  const key = chaveCelulaPath(gx, gy);
  if (NPC_PATH_CACHE.celulasLivres.has(key)) return NPC_PATH_CACHE.celulasLivres.get(key);

  const ponto = celulaParaPontoPath({ gx, gy });
  const livre = pontoLivreParaPathfinding(ponto.x, ponto.y);
  NPC_PATH_CACHE.celulasLivres.set(key, livre);
  return livre;
}

function encontrarCelulaLivreProxima(ponto, raioMax = 9) {
  const base = pontoParaCelulaPath(ponto);

  if (celulaLivrePath(base.gx, base.gy)) return base;

  for (let raio = 1; raio <= raioMax; raio += 1) {
    const candidatas = [];
    for (let dx = -raio; dx <= raio; dx += 1) {
      for (let dy = -raio; dy <= raio; dy += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== raio) continue;
        const celula = { gx: base.gx + dx, gy: base.gy + dy };
        if (!celulaLivrePath(celula.gx, celula.gy)) continue;
        const p = celulaParaPontoPath(celula);
        candidatas.push({ celula, distancia: Math.hypot(p.x - ponto.x, p.y - ponto.y) });
      }
    }
    if (candidatas.length) {
      candidatas.sort((a, b) => a.distancia - b.distancia);
      return candidatas[0].celula;
    }
  }

  return base;
}

function segmentoLivreParaPath(a, b) {
  const distancia = Math.hypot(b.x - a.x, b.y - a.y);
  const passos = Math.max(1, Math.ceil(distancia / 18));

  for (let i = 1; i <= passos; i += 1) {
    const t = i / passos;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    if (!pontoLivreParaPathfinding(x, y)) return false;
  }

  return true;
}

function simplificarRotaPath(pontos) {
  if (pontos.length <= 2) return pontos;

  const simplificada = [pontos[0]];
  let indiceAtual = 0;

  while (indiceAtual < pontos.length - 1) {
    let melhor = indiceAtual + 1;
    for (let i = pontos.length - 1; i > indiceAtual + 1; i -= 1) {
      if (segmentoLivreParaPath(pontos[indiceAtual], pontos[i])) {
        melhor = i;
        break;
      }
    }
    simplificada.push(pontos[melhor]);
    indiceAtual = melhor;
  }

  return simplificada;
}

function calcularRotaAEstrela(inicio, destino) {
  if (!destino) return [];

  // Quando o segmento já é livre, evita custo extra e mantém o movimento natural.
  if (segmentoLivreParaPath(inicio, destino)) {
    return [{ x: destino.x, y: destino.y }];
  }

  const start = encontrarCelulaLivreProxima(inicio);
  const goal = encontrarCelulaLivreProxima(destino);
  const startKey = chaveCelulaPath(start.gx, start.gy);
  const goalKey = chaveCelulaPath(goal.gx, goal.gy);

  if (startKey === goalKey) return [{ x: destino.x, y: destino.y }];

  const abertos = new Map();
  const fechados = new Set();
  const veioDe = new Map();
  const gScore = new Map([[startKey, 0]]);
  const fScore = new Map([[startKey, Math.hypot(goal.gx - start.gx, goal.gy - start.gy)]]);
  abertos.set(startKey, start);

  const vizinhos = [
    { dx: 1, dy: 0, custo: 1 }, { dx: -1, dy: 0, custo: 1 },
    { dx: 0, dy: 1, custo: 1 }, { dx: 0, dy: -1, custo: 1 },
    { dx: 1, dy: 1, custo: 1.42 }, { dx: -1, dy: 1, custo: 1.42 },
    { dx: 1, dy: -1, custo: 1.42 }, { dx: -1, dy: -1, custo: 1.42 }
  ];

  let iteracoes = 0;
  const limiteIteracoes = 2800;

  while (abertos.size && iteracoes < limiteIteracoes) {
    iteracoes += 1;

    let atualKey = null;
    let atual = null;
    let melhorF = Infinity;

    abertos.forEach((celula, key) => {
      const f = fScore.get(key) ?? Infinity;
      if (f < melhorF) {
        melhorF = f;
        atualKey = key;
        atual = celula;
      }
    });

    if (!atual) break;

    if (atualKey === goalKey) {
      const celulas = [];
      let key = atualKey;
      while (key) {
        const [gx, gy] = key.split(",").map(Number);
        celulas.push({ gx, gy });
        key = veioDe.get(key);
      }
      celulas.reverse();
      const pontos = celulas.slice(1).map(celulaParaPontoPath);
      pontos.push({ x: destino.x, y: destino.y });
      return simplificarRotaPath(pontos);
    }

    abertos.delete(atualKey);
    fechados.add(atualKey);

    for (const v of vizinhos) {
      const viz = { gx: atual.gx + v.dx, gy: atual.gy + v.dy };
      const vizKey = chaveCelulaPath(viz.gx, viz.gy);
      if (fechados.has(vizKey) || !celulaLivrePath(viz.gx, viz.gy)) continue;

      // Evita diagonais atravessando o canto de duas paredes.
      if (v.dx !== 0 && v.dy !== 0) {
        if (!celulaLivrePath(atual.gx + v.dx, atual.gy) || !celulaLivrePath(atual.gx, atual.gy + v.dy)) continue;
      }

      const tentativeG = (gScore.get(atualKey) ?? Infinity) + v.custo;
      if (tentativeG >= (gScore.get(vizKey) ?? Infinity)) continue;

      veioDe.set(vizKey, atualKey);
      gScore.set(vizKey, tentativeG);
      fScore.set(vizKey, tentativeG + Math.hypot(goal.gx - viz.gx, goal.gy - viz.gy));
      abertos.set(vizKey, viz);
    }
  }

  // Fallback: retorna o destino original. A checagem de colisão do movimento ainda
  // impede atravessar parede e acionará os atalhos de fluxo se necessário.
  return [{ x: destino.x, y: destino.y }];
}

function montarRotaPlanejadaPorMapa(cliente, pontos) {
  const filtrados = (pontos || []).filter(Boolean).map((p) => ({ x: Number(p.x), y: Number(p.y) }));
  if (!filtrados.length) return [];

  const rota = [];
  let atual = { x: cliente.x, y: cliente.y };

  filtrados.forEach((ponto) => {
    const trecho = calcularRotaAEstrela(atual, ponto);
    trecho.forEach((p) => {
      const ultimo = rota[rota.length - 1];
      if (!ultimo || Math.hypot(ultimo.x - p.x, ultimo.y - p.y) > 4) rota.push(p);
    });
    atual = ponto;
  });

  return rota;
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
  // v28: se o mapa tem door_entry, todo spawn/despawn fica limitado a esse retângulo.
  // Isso evita clientes surgindo em parede, prateleira ou corredor estreito.
  if (obterDoorEntryObjeto()) {
    return Array.from({ length: 10 }, () => obterPontoDoorEntry(5));
  }

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
        x: ponto.x,
        y: ponto.y
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
function tempoAtualNPC() {
  // performance.now() é mais estável para temporizadores curtos de IA; Date.now() fica como reserva.
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

function clienteEstaEmPassagemForcada(cliente) {
  // Depois de pedir licença e ficar preso por alguns instantes, o cliente ganha
  // uma janela curta para ignorar apenas colisão com outros clientes. Parede,
  // balcão, player e NPCs fixos continuam sólidos. Isso elimina engarrafamento
  // infinito sem voltar ao problema de atravessar todo o mapa livremente.
  return (cliente.ignorarClientesAte || 0) > tempoAtualNPC();
}

function obterClienteBloqueando(cliente, proximoX, proximoY) {
  // Retorna qual cliente bloqueou o próximo passo. Separar isso do booleano
  // permite calcular uma força de afastamento quando dois NPCs se encostam.
  if (typeof retangulosColidem !== "function") return null;
  if (clienteEstaEmPassagemForcada(cliente)) return null;

  const caixaCliente = criarHitboxPorPe(proximoX, proximoY, NPC_COLLISION.largura - 18, NPC_COLLISION.altura - 14, 0);

  return npcSystem.clientes.find((outro) => {
    if (outro.id === cliente.id || !outro.el || !outro.el.isConnected) return false;
    if (clienteEstaEmPassagemForcada(outro)) return false;
    if (outro.estado === "saindo" && cliente.estado === "saindo") return false;

    const clienteNaEntrada = clienteEstaNaZonaDeEntrada(cliente, proximoX, proximoY);
    const outroNaEntrada = clienteEstaNaZonaDeEntrada(outro);

    if (clienteNaEntrada && outroNaEntrada) {
      const ambosEmFluxo = ["entrando", "saindo"].includes(cliente.estado)
        && ["entrando", "saindo"].includes(outro.estado);
      if (ambosEmFluxo) return false;
    }

    return retangulosColidem(caixaCliente, obterHitboxCliente(outro, -7));
  }) || null;
}

function clienteColidiriaComOutroCliente(cliente, proximoX, proximoY) {
  // Colisão entre clientes agora é "educada": ela bloqueia por pouco tempo,
  // gera a fala de licença e depois permite passagem curta para o fluxo não morrer.
  return Boolean(obterClienteBloqueando(cliente, proximoX, proximoY));
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

  // v28: clientes móveis atravessam NPCs estáticos de dica.
  // Isso impede que um tutor parado bloqueie rota de compra/fila.
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

  // v26: cliente contra cliente não é mais parede dura durante deslocamento.
  // A distribuição por buy_/queue_/lane_ evita que todos escolham os mesmos pixels;
  // manter colisão dura aqui era a causa principal de NPC parado ou tremendo.
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
function posicaoLivreSemClientes(cliente, proximoX, proximoY) {
  // Usada na passagem forçada: ignora somente outros clientes, mas continua
  // respeitando obstáculos reais do mapa e entidades importantes.
  return !clienteColidiriaComMapa(cliente, proximoX, proximoY)
    && !clienteColidiriaComEntidadeFixa(cliente, proximoX, proximoY)
    && !clienteColidiriaComPlayer(cliente, proximoX, proximoY);
}

function tentarSepararDeClientes(cliente) {
  // Quando dois NPCs encostam, esta função tenta um pequeno empurrão visual
  // para longe do outro. É uma separação local, não um teleporte.
  let afastarX = 0;
  let afastarY = 0;
  let quantidade = 0;

  npcSystem.clientes.forEach((outro) => {
    if (outro.id === cliente.id || !outro.el || !outro.el.isConnected) return;

    const dx = cliente.x - outro.x;
    const dy = cliente.y - outro.y;
    const distancia = Math.sqrt(dx * dx + dy * dy);

    if (distancia > 0 && distancia < 42) {
      const peso = (42 - distancia) / 42;
      afastarX += (dx / distancia) * peso;
      afastarY += (dy / distancia) * peso;
      quantidade += 1;
    }
  });

  if (!quantidade) return false;

  const modulo = Math.sqrt(afastarX * afastarX + afastarY * afastarY);
  if (!modulo) return false;

  const novoX = cliente.x + (afastarX / modulo) * NPC_CONFIG.passoSeparacao;
  const novoY = cliente.y + (afastarY / modulo) * NPC_CONFIG.passoSeparacao;

  if (!posicaoLivreSemClientes(cliente, novoX, novoY)) return false;

  aplicarMovimentoCliente(cliente, novoX, novoY, afastarX, afastarY);
  return true;
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
  // O NPC pede licença uma única vez por bloqueio contínuo. Quando o bloqueio é
  // outro cliente e dura demais, ele abre uma janela curta de passagem educada.
  cliente.tempoBloqueado = (cliente.tempoBloqueado || 0) + deltaTime;
  cliente.ultimoTipoBloqueio = tipoBloqueio;

  if (!cliente.pediuLicencaNoBloqueio && cliente.tempoBloqueado > NPC_CONFIG.tempoMensagemLicenca) {
    cliente.pediuLicencaNoBloqueio = true;
    atualizarHumorCliente(cliente, tipoBloqueio === "mapa" ? "Procurando caminho" : "Com licença");
  }

  // A versão anterior liberava passagem forçada entre clientes; isso resolvia alguns
  // engarrafamentos, mas causava o efeito visual de vibração quando dois NPCs
  // se encostavam. Agora o cliente replaneja uma rota estável em vez de empurrar.
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
  // Em vez de só tentar esquerda/direita, o NPC testa uma pequena rosa de
  // movimentos ao redor da direção desejada. Isso resolve corredores estreitos,
  // clientes parados e cantos de prateleira sem precisar de pathfinding pesado.
  if (!distancia) return false;

  const dirX = dx / distancia;
  const dirY = dy / distancia;
  const baseAngulo = Math.atan2(dirY, dirX);
  const ladoPreferido = cliente.ladoDesvio || 1;
  const abertura = [
    Math.PI / 2 * ladoPreferido,
    Math.PI / 2 * -ladoPreferido,
    Math.PI / 4 * ladoPreferido,
    Math.PI / 4 * -ladoPreferido,
    Math.PI * 0.75 * ladoPreferido,
    Math.PI * 0.75 * -ladoPreferido,
    0,
    Math.PI
  ];
  const forca = Math.max(2.4, passo * NPC_CONFIG.multiplicadorPassoDesvio);

  for (const anguloExtra of abertura) {
    const angulo = baseAngulo + anguloExtra;
    const candidato = {
      x: cliente.x + Math.cos(angulo) * forca,
      y: cliente.y + Math.sin(angulo) * forca
    };

    if (!posicaoLivreParaCliente(cliente, candidato.x, candidato.y)) continue;

    cliente.ladoDesvio = anguloExtra >= 0 ? -1 : 1;
    aplicarMovimentoCliente(cliente, candidato.x, candidato.y, candidato.x - cliente.x, candidato.y - cliente.y);
    resetarBloqueioCliente(cliente);
    return true;
  }

  // Não aplicamos mais separação local por empurrão: ela fazia dois clientes
  // tremerem quando se tocavam. Se nenhum desvio curto serve, o NPC espera
  // até um replanejamento estável do caminho abrir espaço.
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
  if (typeof modoAdminPausaNPCsAtiva === "function" && modoAdminPausaNPCsAtiva()) return null;
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
  const rotaCliente = criarPlanoRotaCliente();

  const el = document.createElement("div");
  el.className = `customer-npc ${perfil.classe}`;
  el.dataset.npcId = id;

  const nome = document.createElement("div");
  nome.className = "customer-name";
  nome.textContent = perfil.nome;

  const sombra = document.createElement("div");
  sombra.className = "customer-shadow";

  const sprite = document.createElement("div");
  sprite.className = "customer-sprite customer-walk-up";

  const bubble = document.createElement("div");
  bubble.className = "customer-bubble";

  el.appendChild(sombra);
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
    rota: rotaCliente,
    velocidade: numeroAleatorio(NPC_CONFIG.velocidadeMin, NPC_CONFIG.velocidadeMax),
    tempoEstado: 0,
    tempoEscolhendo: numeroAleatorio(NPC_CONFIG.tempoEscolhendoMin, NPC_CONFIG.tempoEscolhendoMax) * perfil.paciencia,
    tempoFila: 0,
    tempoBloqueado: 0,
    procurandoCaminhoMs: 0,
    pediuLicencaNoBloqueio: false,
    ladoDesvio: rotaCliente.ladoDesvioInicial,
    ultimoTipoBloqueio: null,
    ignorarClientesAte: 0,
    desvioAtual: null,
    proximoReplanejamento: 0,
    comprou: false,
    carrinho: null
  };

  reservarPontoCompra(cliente, prateleira);
  definirCaminho(cliente, rotaEntradaAtePrateleira(cliente, prateleira));
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
  const zonas = obterZonasCompraDisponiveis();
  const candidatas = zonas.filter((prateleira) => {
    return prateleira.produtos.some((produtoId) => perfil.preferencias.includes(produtoId));
  });

  const grupo = candidatas.length ? candidatas : zonas;

  // Prefere zonas com algum spot livre. Se todas estiverem ocupadas, ainda escolhe uma
  // para não impedir o fluxo de clientes.
  const comVaga = grupo.filter((zona) => {
    return obterSpotsZonaCompra(zona).some((spot) => !spotEstaReservado(spot.id));
  });

  return escolherItem(comVaga.length ? comVaga : grupo);
}


/**
 * @doc-func criarPlanoRotaCliente
 * O que faz: cria uma assinatura de caminho para cada cliente. A ideia é que
 * dois NPCs não usem exatamente os mesmos pixels, evitando filas travadas.
 * Como editar: mexa nas listas de Y/X para abrir ou fechar corredores seguros.
 */
function criarPlanoRotaCliente() {
  return {
    // Mais faixas que a v24: os clientes deixam de disputar os mesmos pixels e
    // continuam respeitando colisão porque cada ponto ainda passa por ajustarPontoRotaAoMapa().
    yCorredorSul: escolherItem([820, 836, 852, 870, 888, 906]) + numeroAleatorio(-6, 6),
    yCorredorFila: escolherItem([822, 842, 862, 884, 906]) + numeroAleatorio(-5, 5),
    xEntrada: escolherItem([382, 410, 438, 466]) + numeroAleatorio(-8, 8),
    xCorredorCentral: escolherItem([470, 505, 540, 575, 610]) + numeroAleatorio(-6, 6),
    xCorredorInterno: escolherItem([505, 532, 560, 588]) + numeroAleatorio(-6, 6),
    xCorredorCaixa: escolherItem([1168, 1196, 1224, 1252]) + numeroAleatorio(-5, 5),
    offsetPrateleiraX: numeroAleatorio(-18, 18),
    offsetPrateleiraY: numeroAleatorio(-7, 7),
    ladoDesvioInicial: Math.random() > 0.5 ? 1 : -1
  };
}

/**
 * @doc-func obterPlanoRotaCliente
 * O que faz: garante que todo cliente tenha um plano de rota mesmo em saves antigos.
 */
function obterPlanoRotaCliente(cliente) {
  if (!cliente.rota) cliente.rota = criarPlanoRotaCliente();
  return cliente.rota;
}

/**
 * @doc-func pontoPrateleiraCliente
 * O que faz: gera uma posição de compra levemente diferente para cada cliente.
 * Isso evita que vários NPCs tentem parar exatamente no mesmo ponto da prateleira.
 */
function pontoPrateleiraCliente(cliente, prateleira) {
  if (cliente.pontoCompra) {
    return { x: cliente.pontoCompra.x, y: cliente.pontoCompra.y };
  }

  const rota = obterPlanoRotaCliente(cliente);
  const limiteX = prateleira.id === "especial" ? 12 : 24;
  const limiteY = prateleira.id === "especial" ? 8 : 10;

  return {
    x: prateleira.x + Math.max(-limiteX, Math.min(limiteX, rota.offsetPrateleiraX)),
    y: prateleira.y + Math.max(-limiteY, Math.min(limiteY, rota.offsetPrateleiraY))
  };
}

/**
 * @doc-func ajustarPontoRotaAoMapa
 * O que faz: se um ponto aleatório cair em colisão do mapa, tenta pontos próximos
 * antes de salvar a rota. Assim a aleatoriedade não joga NPC dentro de parede.
 */
function ajustarPontoRotaAoMapa(cliente, ponto) {
  if (!ponto) return null;
  if (posicaoLivreSemClientes(cliente, ponto.x, ponto.y)) return { x: ponto.x, y: ponto.y };

  const offsets = [
    [0, -28], [0, 28], [-28, 0], [28, 0],
    [-40, -24], [40, -24], [-40, 24], [40, 24],
    [0, -56], [0, 56], [-56, 0], [56, 0]
  ];

  for (const [ox, oy] of offsets) {
    const candidato = { x: ponto.x + ox, y: ponto.y + oy };
    if (posicaoLivreSemClientes(cliente, candidato.x, candidato.y)) return candidato;
  }

  return { x: ponto.x, y: ponto.y };
}

/**
 * @doc-func criarDesvioEstavelCliente
 * O que faz: quando um cliente encontra outro, cria um ponto intermediário fixo
 * para mudar de faixa. Isso substitui o empurrão local da v23, que causava tremedeira.
 */
function criarDesvioEstavelCliente(cliente, destino, dx, dy, distancia) {
  if (!distancia || cliente.desvioAtual) return false;

  const agora = tempoAtualNPC();
  if ((cliente.proximoReplanejamento || 0) > agora) return false;

  const dirX = dx / distancia;
  const dirY = dy / distancia;
  const perpX = -dirY;
  const perpY = dirX;
  const ladoBase = cliente.ladoDesvio || obterPlanoRotaCliente(cliente).ladoDesvioInicial || 1;
  const laterais = [44, 68, 92];
  const avancos = [36, 64, 92];

  for (const lateral of laterais) {
    for (const avanco of avancos) {
      for (const lado of [ladoBase, -ladoBase]) {
        const candidato = {
          x: cliente.x + dirX * avanco + perpX * lateral * lado,
          y: cliente.y + dirY * avanco + perpY * lateral * lado
        };

        if (!posicaoLivreParaCliente(cliente, candidato.x, candidato.y)) continue;

        cliente.desvioAtual = candidato;
        cliente.ladoDesvio = -lado;
        cliente.proximoReplanejamento = agora + NPC_CONFIG.intervaloReplanejamento;
        atualizarHumorCliente(cliente, "Procurando caminho");
        return true;
      }
    }
  }

  cliente.proximoReplanejamento = agora + NPC_CONFIG.intervaloReplanejamento;
  return false;
}


/**
 * @doc-func replanejarRotaCompletaCliente
 * O que faz: se um cliente fica preso tempo demais, troca o plano de caminho inteiro por outro corredor.
 * Por que existe: a v23 tentava empurrar NPCs e gerava vibração; esta abordagem não empurra ninguém,
 * apenas escolhe uma rota nova e estável para diminuir a chance de dois clientes seguirem juntos.
 * Como editar: ajuste tempoAntesReplanejarRota ou as faixas de criarPlanoRotaCliente().
 */
function replanejarRotaCompletaCliente(cliente) {
  const agora = tempoAtualNPC();

  if ((cliente.proximoReplanejamentoRota || 0) > agora) return false;
  if (!["entrando", "indo_fila", "saindo"].includes(cliente.estado)) return false;

  cliente.rota = criarPlanoRotaCliente();
  cliente.desvioAtual = null;
  cliente.proximoReplanejamentoRota = agora + NPC_CONFIG.intervaloReplanejamentoRota;

  if (cliente.estado === "entrando") {
    definirCaminho(cliente, [
      { x: cliente.x, y: cliente.y },
      ...rotaEntradaAtePrateleira(cliente, cliente.prateleira)
    ]);
    atualizarHumorCliente(cliente, "Nova rota");
    return true;
  }

  if (cliente.estado === "indo_fila") {
    const destinoFila = cliente.caminho[cliente.caminho.length - 1]
      || npcSystem.pontos.filaCaixa[Math.min(obterFilaAtendimento().length, npcSystem.pontos.filaCaixa.length - 1)];
    definirCaminho(cliente, [
      { x: cliente.x, y: cliente.y },
      ...rotaPrateleiraParaFila(cliente, destinoFila)
    ]);
    atualizarHumorCliente(cliente, "Nova rota");
    return true;
  }

  if (cliente.estado === "saindo") {
    definirCaminho(cliente, [
      { x: cliente.x, y: cliente.y },
      ...rotaClienteParaSaida(cliente)
    ]);
    atualizarHumorCliente(cliente, "Saindo");
    return true;
  }

  return false;
}

/**
 * @doc-func rotaEntradaAtePrateleira
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: prateleira.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function rotaEntradaAtePrateleira(cliente, prateleira) {
  const rota = obterPlanoRotaCliente(cliente);
  const pontoCompra = pontoPrateleiraCliente(cliente, prateleira);
  const waypointsTiled = criarWaypointsPorLanes(pontoCompra);

  if (waypointsTiled.length) {
    return [
      obterPontoDoorEntry(6),
      { x: rota.xEntrada, y: npcSystem.pontos.entradaLoja.y + numeroAleatorio(-14, 10) },
      ...waypointsTiled,
      pontoCompra
    ];
  }

  return [
    obterPontoDoorEntry(6),
    { x: rota.xEntrada, y: npcSystem.pontos.entradaLoja.y + numeroAleatorio(-14, 10) },
    { x: rota.xCorredorCentral, y: rota.yCorredorSul },
    ...rotaCorredorParaPrateleira(cliente, prateleira)
  ];
}

/**
 * @doc-func rotaCorredorParaPrateleira
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: prateleira.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function rotaCorredorParaPrateleira(cliente, prateleira) {
  const rota = obterPlanoRotaCliente(cliente);
  const pontoCompra = pontoPrateleiraCliente(cliente, prateleira);

  if (prateleira.id === "especial") {
    return [
      { x: rota.xCorredorInterno, y: rota.yCorredorSul },
      { x: rota.xCorredorInterno, y: 740 + numeroAleatorio(-8, 8) },
      { x: rota.xCorredorInterno, y: npcSystem.pontos.corredorInterno.y + numeroAleatorio(-10, 10) },
      pontoCompra
    ];
  }

  return [
    { x: pontoCompra.x, y: rota.yCorredorSul },
    pontoCompra
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
  const rota = obterPlanoRotaCliente(cliente);
  const pontoCompra = pontoPrateleiraCliente(cliente, prateleira);
  const filaComLeveVariacao = {
    x: pontoFila.x + numeroAleatorio(-4, 4),
    y: pontoFila.y + numeroAleatorio(-4, 4)
  };

  const waypointsTiled = criarWaypointsPorLanes(filaComLeveVariacao);

  if (waypointsTiled.length) {
    return [
      pontoCompra,
      ...waypointsTiled,
      filaComLeveVariacao
    ];
  }

  const saidaPrateleira = prateleira.id === "especial"
    ? [
        { x: rota.xCorredorInterno, y: npcSystem.pontos.corredorInterno.y + numeroAleatorio(-8, 8) },
        { x: rota.xCorredorInterno, y: 740 + numeroAleatorio(-8, 8) },
        { x: rota.xCorredorCentral, y: rota.yCorredorFila }
      ]
    : [
        { x: pontoCompra.x, y: rota.yCorredorFila },
        { x: rota.xCorredorCentral, y: rota.yCorredorFila }
      ];

  return [
    ...saidaPrateleira,
    { x: npcSystem.pontos.entradaFilaCaixa.x + numeroAleatorio(-24, 12), y: rota.yCorredorFila },
    { x: rota.xCorredorCaixa, y: npcSystem.pontos.corredorCaixa.y + numeroAleatorio(-12, 12) },
    filaComLeveVariacao
  ];
}

/**
 * @doc-func rotaFilaParaSaida
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function rotaFilaParaSaida(cliente = null) {
  const rota = cliente ? obterPlanoRotaCliente(cliente) : criarPlanoRotaCliente();
  const destinoSaida = obterPontoDoorEntry(6);
  const waypointsTiled = criarWaypointsPorLanes(npcSystem.pontos.entradaLoja);

  if (waypointsTiled.length) {
    return [
      ...waypointsTiled.reverse(),
      { x: rota.xEntrada, y: npcSystem.pontos.entradaLoja.y + numeroAleatorio(-8, 12) },
      destinoSaida
    ];
  }

  return [
    { x: rota.xCorredorCaixa, y: npcSystem.pontos.corredorCaixa.y + numeroAleatorio(-10, 10) },
    { x: npcSystem.pontos.entradaFilaCaixa.x + numeroAleatorio(-20, 12), y: rota.yCorredorFila },
    { x: rota.xCorredorCentral, y: rota.yCorredorSul },
    { x: rota.xEntrada, y: npcSystem.pontos.entradaLoja.y + numeroAleatorio(-8, 12) },
    destinoSaida
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
    return rotaFilaParaSaida(cliente);
  }

  const rota = obterPlanoRotaCliente(cliente);

  return [
    { x: cliente.x, y: rota.yCorredorSul },
    { x: rota.xCorredorCentral, y: rota.yCorredorSul },
    { x: rota.xEntrada, y: npcSystem.pontos.entradaLoja.y + numeroAleatorio(-8, 12) },
    obterPontoDoorEntry(6)
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
  cliente.desvioAtual = null;

  const pontosAjustados = (pontos || [])
    .map((ponto) => ajustarPontoRotaAoMapa(cliente, ponto))
    .filter(Boolean)
    .map((ponto) => ({ x: ponto.x, y: ponto.y }));

  // v29: transforma os pontos gerais em uma rota navegável que contorna colisões.
  // Isso é o que impede o cliente de ficar recalculando caminho por minutos.
  cliente.caminho = montarRotaPlanejadaPorMapa(cliente, pontosAjustados);
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
function obterPontoFilaParaCliente(cliente) {
  const fila = obterFilaAtendimento();
  let index = fila.findIndex((item) => item.id === cliente.id);
  if (index < 0) index = fila.length;
  return npcSystem.pontos.filaCaixa[Math.min(index, npcSystem.pontos.filaCaixa.length - 1)] || npcSystem.pontos.filaCaixa[0];
}

function forcarClienteParaCompra(cliente, texto = "Escolhendo...") {
  const pontoCompra = pontoPrateleiraCliente(cliente, cliente.prateleira);
  const pontoSeguro = ajustarPontoRotaAoMapa(cliente, pontoCompra) || pontoCompra;

  cliente.x = pontoSeguro.x;
  cliente.y = pontoSeguro.y;
  cliente.estado = "escolhendo";
  cliente.tempoEstado = 0;
  cliente.caminho = [];
  cliente.caminhoIndex = 0;
  cliente.desvioAtual = null;
  cliente.procurandoCaminhoMs = 0;
  resetarBloqueioCliente(cliente);
  atualizarPosicaoCliente(cliente);
  clienteIdle(cliente);
  atualizarHumorCliente(cliente, texto);
  return true;
}

function forcarClienteParaFila(cliente, texto = "Na fila") {
  const pontoFila = obterPontoFilaParaCliente(cliente);
  const pontoSeguro = ajustarPontoRotaAoMapa(cliente, pontoFila) || pontoFila;

  cliente.x = pontoSeguro.x;
  cliente.y = pontoSeguro.y;
  cliente.estado = "aguardando_caixa";
  cliente.tempoFila = 0;
  cliente.caminho = [];
  cliente.caminhoIndex = 0;
  cliente.desvioAtual = null;
  cliente.procurandoCaminhoMs = 0;
  resetarBloqueioCliente(cliente);
  atualizarPosicaoCliente(cliente);
  clienteIdle(cliente);
  atualizarHumorCliente(cliente, texto);
  alertarClienteNaFila(cliente);
  atualizarInterfaceJogo();
  return true;
}

function alertarClienteNaFila(cliente) {
  if (!cliente || cliente.alertaFilaEmitido) return;

  cliente.alertaFilaEmitido = true;
  const nome = cliente.perfil && cliente.perfil.nome ? cliente.perfil.nome : "Cliente";

  criarPopupCliente(cliente.x, cliente.y, "Caixa!", "money");

  if (typeof mostrarToast === "function") {
    mostrarToast(`${nome} entrou na fila do caixa.`);
  }
}

function respawnarClienteNoDoorEntry(cliente, texto = "Recalculando") {
  const ponto = obterPontoDoorEntry(5);

  cliente.x = ponto.x;
  cliente.y = ponto.y;
  cliente.rota = criarPlanoRotaCliente();
  cliente.desvioAtual = null;
  cliente.proximoReplanejamento = 0;
  cliente.proximoReplanejamentoRota = 0;
  cliente.procurandoCaminhoMs = 0;
  resetarBloqueioCliente(cliente);

  if (cliente.estado === "entrando") {
    definirCaminho(cliente, rotaEntradaAtePrateleira(cliente, cliente.prateleira));
  } else if (cliente.estado === "indo_fila") {
    const pontoFila = obterPontoFilaParaCliente(cliente);
    definirCaminho(cliente, rotaPrateleiraParaFila(cliente, pontoFila));
  } else if (cliente.estado === "saindo") {
    definirCaminho(cliente, rotaClienteParaSaida(cliente));
  }

  atualizarPosicaoCliente(cliente);
  atualizarHumorCliente(cliente, texto);
  return true;
}

function moverClienteAte(cliente, destino, deltaTime) {
  const destinoOriginal = destino;
  const destinoAtivo = cliente.desvioAtual || destinoOriginal;
  const dx = destinoAtivo.x - cliente.x;
  const dy = destinoAtivo.y - cliente.y;
  const distancia = Math.sqrt(dx * dx + dy * dy);
  const passo = cliente.velocidade * (deltaTime / 16);

  if (distancia <= Math.max(3, passo)) {
    cliente.x = destinoAtivo.x;
    cliente.y = destinoAtivo.y;
    atualizarPosicaoCliente(cliente);

    if (cliente.desvioAtual) {
      cliente.desvioAtual = null;
      resetarBloqueioCliente(cliente);
      return false;
    }

    return true;
  }

  const proximoX = cliente.x + (dx / distancia) * passo;
  const proximoY = cliente.y + (dy / distancia) * passo;

  const tipoBloqueio = analisarBloqueioCliente(cliente, proximoX, proximoY);

  if (tipoBloqueio) {
    registrarBloqueioCliente(cliente, tipoBloqueio, deltaTime);
    atualizarDirecaoCliente(cliente, dx, dy);

    if (cliente.tempoBloqueado >= NPC_CONFIG.tempoAntesReplanejar) {
      criarDesvioEstavelCliente(cliente, destinoOriginal, destinoOriginal.x - cliente.x, destinoOriginal.y - cliente.y, Math.sqrt((destinoOriginal.x - cliente.x) ** 2 + (destinoOriginal.y - cliente.y) ** 2));
    }

    if (cliente.tempoBloqueado >= NPC_CONFIG.tempoAntesReplanejarRota) {
      replanejarRotaCompletaCliente(cliente);
    }

    if (tipoBloqueio !== "player" && cliente.tempoBloqueado >= NPC_CONFIG.tempoMaxProcurandoCaminho) {
      if (cliente.estado === "indo_fila") {
        forcarClienteParaFila(cliente, "Na fila");
        return false;
      }

      if (cliente.estado === "entrando" && (cliente.tempoEstado || 0) >= NPC_CONFIG.tempoMaxAtePrateleira) {
        forcarClienteParaCompra(cliente, "Escolhendo...");
        return false;
      }

      respawnarClienteNoDoorEntry(cliente, "Reentrando");
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
  cliente.el.style.transform = `translate3d(${cliente.x}px, ${cliente.y}px, 0) translate(-50%, -100%)`;
  cliente.el.style.zIndex = zIndexProfundidadeNPC(cliente.y);
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
    cliente.sprite.style.removeProperty("transform");
    cliente.sprite.style.setProperty("--npc-facing", dx < 0 ? "-1" : "1");
    return;
  }

  cliente.sprite.style.removeProperty("transform");
  cliente.sprite.style.setProperty("--npc-facing", "1");
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
  cliente.sprite.style.removeProperty("transform");
  cliente.sprite.style.setProperty("--npc-facing", "1");
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
    cliente.tempoEstado += deltaTime;

    if (cliente.tempoEstado >= NPC_CONFIG.tempoMaxAtePrateleira && cliente.tempoBloqueado > NPC_CONFIG.tempoMaxProcurandoCaminho) {
      forcarClienteParaCompra(cliente, "Escolhendo...");
      return;
    }

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
        liberarReservaCompraCliente(cliente);
        cliente.estado = "indo_fila";
        cliente.tempoEstado = 0;
        cliente.tempoFila = 0;
        const pontoFila = obterPontoFilaParaCliente(cliente);
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
    cliente.tempoEstado += deltaTime;

    if (cliente.tempoEstado >= NPC_CONFIG.tempoMaxAteFila) {
      forcarClienteParaFila(cliente, "Na fila");
      return;
    }

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
      alertarClienteNaFila(cliente);
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
  const maxLinhas = gameState.reputacao >= 5 ? 4 : 3;
  const linhasDesejadas = Math.max(1, Math.min(maxLinhas, 1 + Math.floor(Math.random() * maxLinhas)));
  const tentativas = linhasDesejadas + 3 + Math.floor(Math.random() * 3);

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

    if (linhas.length >= linhasDesejadas) break;
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

  const fatorPreco = typeof calcularFatorPrecoDemanda === "function"
    ? calcularFatorPrecoDemanda(produto, estoque)
    : Math.max(0.08, Math.min(1.85, produto.precoInicial / Math.max(1, estoque.precoVenda)));
  const preferido = perfil.preferencias.includes(produto.id) ? 2.4 : 1;

  return produto.demandaBase
    * preferido
    * fatorPreco
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

  const barato = produto.custo <= 7;
  const medio = produto.custo <= 14;
  let limiteDesejado = barato ? 4 : medio ? 3 : 2;

  if (gameState.reputacao >= 6 && Math.random() < 0.28) {
    limiteDesejado += 1;
  }

  if (Math.random() < 0.16) {
    limiteDesejado += 1;
  }

  const quantidade = 1 + Math.floor(Math.random() * Math.max(1, limiteDesejado));
  return Math.min(estoque.quantidade, quantidade);
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
function atenderClienteDaFila(aceitar, clienteId = null, trocoInformado = 0, opcoes = {}) {
  const cliente = obterClienteParaAtender(clienteId);

  if (!cliente) {
    return { ok: false, mensagem: "Esse cliente não está mais no caixa." };
  }

  const ignorarBalcao = Boolean(opcoes && opcoes.ignorarBalcao);

  if (!ignorarBalcao && typeof jogadorEstaNoPisoBalcao === "function" && !jogadorEstaNoPisoBalcao()) {
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
    cliente.atendidoPorAjudante = false;
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
  cliente.atendidoPorAjudante = false;
  npcSystem.totalVendasDia += resultado.receita;
  npcSystem.totalAtendidosDia += 1;
  criarPopupCliente(cliente.x, cliente.y, `+ ${formatarMoeda(resultado.receita)}`, "money");
  mandarClienteEmbora(cliente, `Troco ${formatarMoeda(cliente.carrinho.troco)}`);
  atualizarPosicoesFila();

  return {
    ok: true,
    mensagem: opcoes && opcoes.origem === "ajudante"
      ? `${cliente.perfil.nome} atendido por Tomas.`
      : `${cliente.perfil.nome} atendido. Troco: ${formatarMoeda(cliente.carrinho.troco)}.`
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
  liberarReservaCompraCliente(cliente);
  const rotaSaida = rotaClienteParaSaida(cliente);
  cliente.estado = "saindo";
  cliente.tempoFila = 0;
  cliente.emAtendimento = false;
  cliente.atendidoPorAjudante = false;
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
  liberarReservaCompraCliente(cliente);
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
  if (typeof modoAdminPausaNPCsAtiva === "function" && modoAdminPausaNPCsAtiva()) return;

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

  npcSystem.navegacao.reservasCompra = {};
  npcSystem.navegacao.reservasFila = {};

  npcSystem.clientes.forEach((cliente) => {
    if (cliente.el && cliente.el.isConnected) {
      cliente.el.remove();
    }
  });
  npcSystem.clientes = [];
}

window.registrarZonasNPC = registrarZonasNPC;
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
