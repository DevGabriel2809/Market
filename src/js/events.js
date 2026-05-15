const sons = {
  porta: new Audio("src/assets/sounds/porta.mp3"),
  madeira: new Audio("src/assets/sounds/pisar_madeira.mp3"),
  pedra: new Audio("src/assets/sounds/pisar_pedra.mp3")
};

function tocarSom(nome) {
  if (!sons[nome]) return;

  sons[nome].currentTime = 0;
  sons[nome].play().catch(() => {});
}

function colisaoEntre(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

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

function encontrarAreaBalcao() {
  return window.mapaObjetos.find((obj) => {
    return obj.type === "piso_balcao" || obj.name === "piso_balcao" || obj.id === 249;
  });
}

function voltarMenu() {
  tocarSom("porta");
  if (typeof fecharModal === "function") {
    fecharModal();
  }
  mostrarTela(telaMenu);
}

function abrirEstoque() {
  if (typeof renderizarEstoque === "function" && typeof abrirModal === "function") {
    renderizarEstoque();
    abrirModal("stock-modal");
  }
}

function abrirCofre() {
  if (typeof abrirStatus === "function") {
    abrirStatus();
  }
}

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

function encontrarPortaBalcao() {
  return window.objetosInteracao.find((obj) => {
    return obj.name === "porta_balcao";
  });
}

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

function objetoTemInteracaoAutomatica(obj) {
  return [
    "porta_saida",
    "porta_balcao",
    "estoque",
    "cofre"
  ].includes(obj.name);
}

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
  if (e.key.toLowerCase() !== "e") return;

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
