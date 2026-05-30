// ======================================================
// DOCUMENTAÇÃO DO ARQUIVO: gameState.js
// ======================================================
// Guarda o estado principal da campanha: caixa, dia, estoque, reputação, ajudante, missões e fim de jogo. Ajuste valores iniciais no objeto gameState.
// ======================================================

const GAME_SAVE_KEY = "reino-dos-custos-save-v1";

const gameState = {
  nomeJogador: "",
  personagem: "male",
  dia: 1,
  diaMaximo: 7,
  caixa: 2000,
  aluguel: 150,
  energia: 50,
  custoAjudante: 120,
  reputacao: 0,
  experiencia: 0,
  clientela: 1,
  ajudanteContratado: false,
  ajudanteDesbloqueado: false,
  // @doc-state sprintDesbloqueado libera a corrida do gerente segurando Ctrl.
  // O valor começa falso e vira true quando a missão inicial de mobilidade é concluída.
  sprintDesbloqueado: false,
  descontoFornecedor: 0,
  faseDia: "preparacao",
  duracaoExpedienteMs: 300000,
  // @doc-state duracaoPreparacaoMs define o tempo real da preparação antes da abertura automática.
  // 150000 ms = 2 minutos e 30 segundos; aumente/diminua para balancear o preparo.
  duracaoPreparacaoMs: 150000,
  // @doc-state tempoPreparacaoDecorridoMs acumula quanto tempo real o jogador já ficou se preparando no dia atual.
  tempoPreparacaoDecorridoMs: 0,
  // @doc-state preparacaoAvisoMostrado evita abrir várias vezes a janela de início automático do expediente.
  preparacaoAvisoMostrado: false,
  tempoDiaDecorridoMs: 0,
  diaEmAndamento: false,
  diaProntoParaEncerrar: false,
  diaEncerradoNotificado: false,
  relatorioEmAndamento: null,
  historico: [],
  estoque: {},
  quests: {
    concluidas: [],
    tentativas: {},
    falhas: {},
    cooldowns: {}
  },
  ultimoRelatorio: null,
  fimDeJogo: null,
  // @doc-state staticNpcTips guarda quais dicas dos NPCs fixos já foram lidas no dia atual.
  // Edite/limpe este campo se quiser reiniciar o ciclo de dicas sem resetar a partida inteira.
  staticNpcTips: null
};

/**
 * @doc-func resetarPartida
 * O que faz: volta dados/visuais para o estado inicial; inclua novos campos aqui quando criar novos sistemas.
 * Parâmetros: nome, personagem.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function resetarPartida(nome, personagem) {
  gameState.nomeJogador = nome || "";
  gameState.personagem = personagem || "male";
  gameState.dia = 1;
  gameState.caixa = 2000;
  gameState.aluguel = 150;
  gameState.energia = 50;
  gameState.custoAjudante = 120;
  gameState.reputacao = 0;
  gameState.experiencia = 0;
  gameState.clientela = 1;
  gameState.ajudanteContratado = false;
  gameState.ajudanteDesbloqueado = false;
  gameState.sprintDesbloqueado = false;
  gameState.descontoFornecedor = 0;
  gameState.faseDia = "preparacao";
  gameState.duracaoExpedienteMs = 300000;
  gameState.duracaoPreparacaoMs = 150000;
  gameState.tempoPreparacaoDecorridoMs = 0;
  gameState.preparacaoAvisoMostrado = false;
  gameState.tempoDiaDecorridoMs = 0;
  gameState.diaEmAndamento = false;
  gameState.diaProntoParaEncerrar = false;
  gameState.diaEncerradoNotificado = false;
  gameState.relatorioEmAndamento = null;
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
  gameState.staticNpcTips = null;

  if (typeof resetarDicasNPCsEstaticosDoDia === "function") {
    resetarDicasNPCsEstaticosDoDia();
  }

  if (typeof inicializarEstoque === "function") {
    inicializarEstoque();
  }

  if (typeof iniciarNovoDia === "function") {
    iniciarNovoDia();
  }
}
