const GAME_SAVE_KEY = "reino-dos-custos-save-v1";

const gameState = {
  nomeJogador: "",
  personagem: "male",
  dia: 1,
  diaMaximo: 30,
  caixa: 2000,
  aluguel: 150,
  energia: 50,
  funcionarios: 100,
  reputacao: 0,
  experiencia: 0,
  clientela: 1,
  ajudanteContratado: false,
  ajudanteDesbloqueado: false,
  descontoFornecedor: 0,
  historico: [],
  estoque: {},
  quests: {
    concluidas: [],
    tentativas: {},
    falhas: {},
    cooldowns: {}
  },
  ultimoRelatorio: null,
  fimDeJogo: null
};

function resetarPartida(nome, personagem) {
  gameState.nomeJogador = nome || "";
  gameState.personagem = personagem || "male";
  gameState.dia = 1;
  gameState.caixa = 2000;
  gameState.aluguel = 150;
  gameState.energia = 50;
  gameState.funcionarios = 100;
  gameState.reputacao = 0;
  gameState.experiencia = 0;
  gameState.clientela = 1;
  gameState.ajudanteContratado = false;
  gameState.ajudanteDesbloqueado = false;
  gameState.descontoFornecedor = 0;
  gameState.historico = [];
  gameState.estoque = {};
  gameState.quests = {
    concluidas: [],
    tentativas: {},
    falhas: {},
    cooldowns: {}
  };
  gameState.ultimoRelatorio = null;
  gameState.fimDeJogo = null;

  if (typeof inicializarEstoque === "function") {
    inicializarEstoque();
  }
}
