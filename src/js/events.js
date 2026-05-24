// ======================================================
// DOCUMENTAÇÃO DO ARQUIVO: events.js
// ======================================================
// Controla sons, interação com objetos do mapa, balcão, estoque, cofre e tecla E. Ajuste ações de objetos em interagir().
// ======================================================

const sons = {
  porta: new Audio("src/assets/sounds/porta.mp3"),
  madeira: new Audio("src/assets/sounds/pisar_madeira.mp3"),
  pedra: new Audio("src/assets/sounds/pisar_pedra.mp3")
};

/**
 * @doc-func tocarSom
 * O que faz: toca efeitos sonoros; ajuste nome do som ou tratamento de erro aqui.
 * Parâmetros: nome.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function tocarSom(nome) {
  if (!sons[nome]) return;

  sons[nome].currentTime = 0;
  sons[nome].play().catch(() => {});
}

/**
 * @doc-func colisaoEntre
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: a, b.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function colisaoEntre(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * @doc-func getObjetoInteracao
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function getObjetoInteracao() {
  const playerBox = {
    x: window.player.x,
    y: window.player.y,
    width: window.player.width,
    height: window.player.height
  };

  return window.objetosInteracao.find((obj) => {
    return colisaoEntre(playerBox, obj);
  });
}

/**
 * @doc-func getTipoChao
 * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function getTipoChao() {
  const peDoPlayer = {
    x: playerX,
    y: playerY
  };

  const piso = window.objetosChao.find((chao) => {
    return (
      peDoPlayer.x >= chao.x &&
      peDoPlayer.x <= chao.x + chao.width &&
      peDoPlayer.y >= chao.y &&
      peDoPlayer.y <= chao.y + chao.height
    );
  });

  if (!piso) return null;

  return piso.name || piso.type || null;
}

let dentroDoBalcao = false;
let areaBalcao = null;
let ultimaInteracaoAutomatica = null;

/**
 * @doc-func encontrarAreaBalcao
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function encontrarAreaBalcao() {
  return window.mapaObjetos.find((obj) => {
    return obj.type === "piso_balcao" || obj.name === "piso_balcao" || obj.id === 249;
  });
}

/**
 * @doc-func voltarMenu
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function voltarMenu() {
  tocarSom("porta");
  if (typeof fecharModal === "function") {
    fecharModal();
  }
  mostrarTela(telaMenu);
}

/**
 * @doc-func abrirEstoque
 * O que faz: abre uma tela/modal/fluxo; edite textos e chamadas caso o comportamento de abertura mude.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function abrirEstoque() {
  if (typeof renderizarEstoque === "function" && typeof abrirModal === "function") {
    renderizarEstoque();
    abrirModal("stock-modal");
  }
}

/**
 * @doc-func abrirCofre
 * O que faz: abre uma tela/modal/fluxo; edite textos e chamadas caso o comportamento de abertura mude.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function abrirCofre() {
  if (typeof existeClienteAguardando === "function" && existeClienteAguardando() && typeof abrirCheckout === "function") {
    if (!jogadorEstaNoPisoBalcao()) {
      mostrarToast("Entre no balcao para atender clientes.");
      return;
    }

    abrirCheckout();
    return;
  }

  if (typeof abrirStatus === "function") {
    abrirStatus();
  }
}

/**
 * @doc-func jogadorEstaNoPisoBalcao
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function jogadorEstaNoPisoBalcao() {
  areaBalcao = encontrarAreaBalcao();

  if (!areaBalcao) return false;

  const peX = window.player.x + window.player.width / 2;
  const peY = window.player.y + window.player.height;

  return (
    peX >= areaBalcao.x &&
    peX <= areaBalcao.x + areaBalcao.width &&
    peY >= areaBalcao.y &&
    peY <= areaBalcao.y + areaBalcao.height
  );
}

window.jogadorEstaNoPisoBalcao = jogadorEstaNoPisoBalcao;

/**
 * @doc-func encontrarPortaBalcao
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function encontrarPortaBalcao() {
  return window.objetosInteracao.find((obj) => {
    return obj.name === "porta_balcao";
  });
}

/**
 * @doc-func entrarNoBalcao
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function entrarNoBalcao() {
  areaBalcao = encontrarAreaBalcao();

  if (!areaBalcao) {
    console.warn("Área do balcão não encontrada.");
    return;
  }

  tocarSom("porta");

  window.player.x = areaBalcao.x + 80;
  window.player.y = areaBalcao.y + areaBalcao.height - 40;

  dentroDoBalcao = true;
}

/**
 * @doc-func sairDoBalcao
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function sairDoBalcao() {
  const portaBalcao = encontrarPortaBalcao();

  if (!portaBalcao) {
    console.warn("Porta do balcão não encontrada.");
    return;
  }

  tocarSom("porta");

  window.player.x = portaBalcao.x;
  window.player.y = portaBalcao.y + portaBalcao.height + 40;

  dentroDoBalcao = false;
}

/**
 * @doc-func interagir
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: obj.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function interagir(obj) {
  if (!obj) return;

  switch (obj.name) {
    case "porta_saida":
      voltarMenu();
      break;

    case "porta_balcao":
      tocarSom("porta");
      entrarNoBalcao();
      break;

    case "estoque":
      abrirEstoque();
      break;

    case "cofre":
      abrirCofre();
      break;

    default:
      console.log("Interação sem ação definida:", obj.name);
      break;
  }
}

/**
 * @doc-func objetoTemInteracaoAutomatica
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: obj.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function objetoTemInteracaoAutomatica(obj) {
  return [
    "porta_saida",
    "porta_balcao",
    "estoque",
    "cofre"
  ].includes(obj.name);
}

/**
 * @doc-func processarInteracaoAutomatica
 * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.
 * Parâmetros: sem parâmetros diretos.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function processarInteracaoAutomatica() {
  if (typeof modalEstaAberto === "function" && modalEstaAberto()) return;

  const obj = getObjetoInteracao();

  if (!obj || !objetoTemInteracaoAutomatica(obj)) {
    ultimaInteracaoAutomatica = null;
    return;
  }

  const chaveInteracao = `${obj.id}-${obj.name}`;
  if (ultimaInteracaoAutomatica === chaveInteracao) return;

  ultimaInteracaoAutomatica = chaveInteracao;
  interagir(obj);
}

window.addEventListener("keydown", (e) => {
  // Alguns eventos sintéticos/de navegador podem chegar sem event.key.
  // Sem esta proteção, um keydown inválido quebrava o listener e atrapalhava o WASD.
  const tecla = e && typeof e.key === "string" ? e.key.toLowerCase() : "";
  if (tecla !== "e") return;

  if (
    !(typeof modalEstaAberto === "function" && modalEstaAberto())
    && typeof lidarTeclaInteracaoNpcEstatico === "function"
    && lidarTeclaInteracaoNpcEstatico()
  ) {
    return;
  }

  // Se estiver dentro do piso_balcao, o E sempre serve para sair.
  // Não depende de encostar no objeto balcao.
  if (jogadorEstaNoPisoBalcao()) {
    sairDoBalcao();
    return;
  }

  const obj = getObjetoInteracao();
  interagir(obj);
});

let tempoPasso = 0;

/**
 * @doc-func atualizarSomPasso
 * O que faz: sincroniza estado e visual; edite com cuidado porque costuma rodar várias vezes durante o jogo.
 * Parâmetros: deltaTime.
 * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;
 * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.
 */
function atualizarSomPasso(deltaTime) {
  tempoPasso += deltaTime;

  if (tempoPasso < 400) return;

  const tipo = getTipoChao();

  if (tipo === "madeira") {
    tocarSom("madeira");
    tempoPasso = 0;
  }

  if (tipo === "pedra") {
    tocarSom("pedra");
    tempoPasso = 0;
  }
}
