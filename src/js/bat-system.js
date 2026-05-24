// ====================================================== 
// DOCUMENTAÇÃO DO ARQUIVO: bat-system.js
// ======================================================
// Objetivo:
// - Criar vida no cenário com poucos morcegos pixel art, sem poluir a tela.
// - O sprite continua sendo o <div class="bat"></div> com box-shadow/keyframes do CSS anexado.
// - Este JS só cria a camada, controla quando aparecem e move o wrapper .bat-flight.
//
// Como ajustar:
// - BAT_CONFIG.quantidadeIntroGame: quantos morcegos passam ao entrar no mapa.
// - BAT_CONFIG.quantidadeAmbienteMin/Max: quantos passam nas ondas aleatórias.
// - BAT_CONFIG.intervaloAmbienteMin/Max: intervalo entre ondas.
// - BAT_CONFIG.duracaoMin/Max: velocidade do voo; maior = mais lento.
// - BAT_CONFIG.escalaMin/Max: tamanho visual do sprite. Na v30 os morcegos foram aumentados para ficarem bem visíveis no mapa.
//
// Importante:
// - A camada é movida para dentro de #market-scene quando o mapa está ativo.
//   Isso garante que o z-index fique acima do mapa, mas abaixo da HUD.
// ======================================================

(function inicializarModuloMorcegos() {
  const BAT_CONFIG = {
    quantidadeIntroGame: 3,
    quantidadeAmbienteMin: 1,
    quantidadeAmbienteMax: 1,
    intervaloAmbienteMin: 24000,
    intervaloAmbienteMax: 42000,
    duracaoMin: 18000,
    duracaoMax: 28000,
    escalaMin: 0.8,
    escalaMax: 1.15
  };

  const batState = {
    layer: null,
    timerAmbiente: null
  };

  /**

   * @doc-func numeroAleatorioBat

   * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.

   * Parâmetros: min, max.

   * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;

   * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.

   */

  function numeroAleatorioBat(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**

   * @doc-func inteiroAleatorioBat

   * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.

   * Parâmetros: min, max.

   * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;

   * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.

   */

  function inteiroAleatorioBat(min, max) {
    return Math.floor(numeroAleatorioBat(min, max + 1));
  }

  /**

   * @doc-func obterTelaAtivaMorcegos

   * O que faz: lê e retorna dados sem alterar o jogo; ajuste quando a origem ou o filtro desses dados mudar.

   * Parâmetros: sem parâmetros diretos.

   * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;

   * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.

   */

  function obterTelaAtivaMorcegos() {
    return document.querySelector(".screen.active");
  }

  /**

   * @doc-func garantirCamadaMorcegos

   * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.

   * Parâmetros: sem parâmetros diretos.

   * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;

   * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.

   */

  function garantirCamadaMorcegos() {
    if (batState.layer && batState.layer.isConnected) {
      return batState.layer;
    }

    batState.layer = document.getElementById("bat-layer");

    if (!batState.layer) {
      batState.layer = document.createElement("div");
      batState.layer.id = "bat-layer";
      batState.layer.className = "bat-layer";
      batState.layer.setAttribute("aria-hidden", "true");
    }

    if (!batState.layer.parentElement) {
      document.body.appendChild(batState.layer);
    }

    return batState.layer;
  }

  /**

   * @doc-func moverCamadaParaLugarCerto

   * O que faz: controla deslocamento no mapa; altere velocidade, colisão ou rotas com cautela.

   * Parâmetros: layer, noJogo.

   * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;

   * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.

   */

  function moverCamadaParaLugarCerto(layer, noJogo) {
    const marketScene = document.getElementById("market-scene");
    const alvo = noJogo && marketScene ? marketScene : document.body;

    if (layer.parentElement !== alvo) {
      alvo.appendChild(layer);
    }
  }

  /**

   * @doc-func sincronizarCamadaMorcegos

   * O que faz: mantém DOM e estado interno iguais; chame depois de mudar dados que afetam a tela.

   * Parâmetros: sem parâmetros diretos.

   * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;

   * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.

   */

  function sincronizarCamadaMorcegos() {
    const layer = garantirCamadaMorcegos();
    const telaAtiva = obterTelaAtivaMorcegos();
    const noJogo = Boolean(telaAtiva && telaAtiva.id === "tela-jogo");

    moverCamadaParaLugarCerto(layer, noJogo);

    // Nesta versão, os morcegos aparecem somente no mapa.
    layer.classList.toggle("active", noJogo);
    layer.classList.toggle("game-mode", noJogo);
    layer.classList.toggle("menu-mode", !noJogo);

    return { layer, noJogo };
  }

  /**

   * @doc-func criarMorcego

   * O que faz: cria elementos ou dados novos; mude aqui quando quiser alterar estrutura, classe CSS ou valores iniciais.

   * Parâmetros: { intro = false, direcao = null, atraso = 0 } = {}.

   * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;

   * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.

   */

  function criarMorcego({ intro = false, direcao = null, atraso = 0 } = {}) {
    const { layer, noJogo } = sincronizarCamadaMorcegos();
    if (!noJogo) return null;

    const voo = document.createElement("div");
    voo.className = "bat-flight";

    const sprite = document.createElement("div");
    sprite.className = "bat";
    voo.appendChild(sprite);

    const vaiParaDireita = direcao ? direcao === "right" : Math.random() > 0.5;
    const duracao = intro
      ? numeroAleatorioBat(15000, 22000)
      : numeroAleatorioBat(BAT_CONFIG.duracaoMin, BAT_CONFIG.duracaoMax);

    voo.style.setProperty("--bat-start-x", vaiParaDireita ? "-14vw" : "114vw");
    voo.style.setProperty("--bat-end-x", vaiParaDireita ? "114vw" : "-14vw");
    voo.style.setProperty("--bat-y", `${numeroAleatorioBat(10, 52).toFixed(2)}vh`);
    voo.style.setProperty("--bat-drift", `${numeroAleatorioBat(-34, 46).toFixed(1)}px`);
    voo.style.setProperty("--bat-scale", `${numeroAleatorioBat(BAT_CONFIG.escalaMin, BAT_CONFIG.escalaMax).toFixed(2)}`);
    voo.style.setProperty("--bat-duration", `${duracao.toFixed(0)}ms`);
    voo.style.setProperty("--bat-delay", `${atraso.toFixed(0)}ms`);
    voo.style.setProperty("--bat-opacity", "1");
    voo.style.setProperty("--bat-rotate-start", `${numeroAleatorioBat(-4, 2).toFixed(1)}deg`);
    voo.style.setProperty("--bat-rotate-mid", `${numeroAleatorioBat(-2, 4).toFixed(1)}deg`);
    voo.style.setProperty("--bat-rotate-end", `${numeroAleatorioBat(-4, 2).toFixed(1)}deg`);

    // O pixel art base olha para a esquerda. Quando voa para a direita, espelhamos o sprite.
    // Assim o morcego sempre olha para o lado para onde está se movendo.
    if (vaiParaDireita) {
      voo.classList.add("reverse");
    }

    voo.addEventListener("animationend", () => voo.remove(), { once: true });
    layer.appendChild(voo);
    return voo;
  }

  /**

   * @doc-func spawnBatWave

   * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.

   * Parâmetros: { quantidade = 1, intro = false } = {}.

   * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;

   * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.

   */

  function spawnBatWave({ quantidade = 1, intro = false } = {}) {
    const { noJogo } = sincronizarCamadaMorcegos();
    if (!noJogo) return;

    for (let i = 0; i < quantidade; i += 1) {
      criarMorcego({
        intro,
        direcao: i % 2 === 0 ? "right" : "left",
        atraso: intro ? i * 900 : i * 1200
      });
    }
  }

  /**

   * @doc-func dispararIntroMorcegos

   * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.

   * Parâmetros: modo = "game".

   * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;

   * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.

   */

  function dispararIntroMorcegos(modo = "game") {
    if (modo !== "game") return;

    // Pequeno atraso para esperar a tela do mapa ficar ativa e a camada ser anexada em #market-scene.
    window.setTimeout(() => {
      spawnBatWave({
        quantidade: BAT_CONFIG.quantidadeIntroGame,
        intro: true
      });
    }, 250);
  }

  /**

   * @doc-func agendarOndasAmbiente

   * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.

   * Parâmetros: sem parâmetros diretos.

   * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;

   * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.

   */

  function agendarOndasAmbiente() {
    window.clearTimeout(batState.timerAmbiente);

    const atraso = numeroAleatorioBat(
      BAT_CONFIG.intervaloAmbienteMin,
      BAT_CONFIG.intervaloAmbienteMax
    );

    batState.timerAmbiente = window.setTimeout(() => {
      const { noJogo } = sincronizarCamadaMorcegos();

      if (noJogo) {
        spawnBatWave({
          quantidade: inteiroAleatorioBat(
            BAT_CONFIG.quantidadeAmbienteMin,
            BAT_CONFIG.quantidadeAmbienteMax
          ),
          intro: false
        });
      }

      agendarOndasAmbiente();
    }, atraso);
  }

  /**

   * @doc-func inicializarMorcegos

   * O que faz: organiza uma parte específica da lógica; leia as variáveis usadas dentro dela antes de editar.

   * Parâmetros: sem parâmetros diretos.

   * Como editar: mantenha o nome se outros arquivos chamam esta função pelo escopo global;

   * altere primeiro os valores/configurações próximos dela antes de mudar a estrutura inteira.

   */

  function inicializarMorcegos() {
    sincronizarCamadaMorcegos();
    agendarOndasAmbiente();
  }

  window.sincronizarCamadaMorcegos = sincronizarCamadaMorcegos;
  window.spawnBatWave = spawnBatWave;
  window.dispararIntroMorcegos = dispararIntroMorcegos;
  window.criarMorcegoDebug = criarMorcego;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarMorcegos, { once: true });
  } else {
    inicializarMorcegos();
  }
})();
