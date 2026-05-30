// ======================================================
// DOCUMENTACAO DO ARQUIVO: audio-system.js
// ======================================================
// Controla trilha sonora de menu, jogo e missoes, com volume persistente,
// legenda de faixa e troca suave entre musicas.
// ======================================================

const MUSIC_SETTINGS_KEY = "reino-dos-custos-music-settings-v1";
const MUSIC_BASE_PATH = "src/assets/sounds/tracksounds/";
const MUSIC_MISSIONS_PATH = `${MUSIC_BASE_PATH}missions_soundtracks/`;
const MUSIC_DEFAULT_VOLUME = 0.34;
const MUSIC_FADE_MS = 950;
const MUSIC_NOTICE_MS = 4200;

const MUSIC_MENU_TRACK = {
  id: "three_coins_oak",
  title: "Three Coins on the Oak",
  src: `${MUSIC_BASE_PATH}Three_Coins_on_the_Oak.mp3`,
  context: "menu"
};

const MUSIC_GAME_TRACKS = [
  {
    id: "hearth_last_ember",
    title: "The Hearth's Last Ember",
    src: `${MUSIC_BASE_PATH}The_Hearth_s_Last_Ember.mp3`,
    context: "game"
  },
  {
    id: "anvil_grain",
    title: "Anvil and Grain",
    src: `${MUSIC_BASE_PATH}Anvil_and_Grain.mp3`,
    context: "game"
  },
  {
    id: "boots_floorboards",
    title: "Boots on the Floorboards",
    src: `${MUSIC_BASE_PATH}Boots_on_the_Floorboards.mp3`,
    context: "game"
  }
];

const MUSIC_FALLBACK_MISSION_FILES = [
  "Pack_Your_Rations.mp3",
  "Three_Coins_on_the_Table.mp3"
];

const musicState = {
  inicializado: false,
  desbloqueado: false,
  contexto: "menu",
  contextoAntesMissao: "game",
  indiceJogo: -1,
  faixaAtual: null,
  audio: null,
  fadeTimer: null,
  noticeTimer: null,
  caption: null,
  missionTracks: [],
  settings: {
    enabled: true,
    volume: MUSIC_DEFAULT_VOLUME
  }
};

function tituloMusicaPorArquivo(nomeArquivo) {
  const base = decodeURIComponent(String(nomeArquivo || ""))
    .replace(/\.[a-z0-9]+$/i, "");

  const titulos = {
    Pack_Your_Rations: "Pack Your Rations",
    Three_Coins_on_the_Table: "Three Coins on the Table",
    Three_Coins_on_the_Oak: "Three Coins on the Oak",
    The_Hearth_s_Last_Ember: "The Hearth's Last Ember",
    Anvil_and_Grain: "Anvil and Grain",
    Boots_on_the_Floorboards: "Boots on the Floorboards"
  };

  return titulos[base] || base.replace(/_s_/g, "'s ").replace(/_/g, " ");
}

function criarFaixaMissao(nomeArquivo) {
  const arquivo = decodeURIComponent(String(nomeArquivo || "").split("/").pop() || "");
  return {
    id: `mission_${arquivo.replace(/\.[a-z0-9]+$/i, "").toLowerCase()}`,
    title: tituloMusicaPorArquivo(arquivo),
    src: `${MUSIC_MISSIONS_PATH}${encodeURIComponent(arquivo)}`,
    context: "mission"
  };
}

function carregarConfiguracoesMusica() {
  try {
    const salvo = JSON.parse(localStorage.getItem(MUSIC_SETTINGS_KEY) || "{}");
    musicState.settings.enabled = salvo.enabled !== false;
    musicState.settings.volume = Number.isFinite(Number(salvo.volume))
      ? Math.min(1, Math.max(0, Number(salvo.volume)))
      : MUSIC_DEFAULT_VOLUME;
  } catch (erro) {
    musicState.settings.enabled = true;
    musicState.settings.volume = MUSIC_DEFAULT_VOLUME;
  }
}

function salvarConfiguracoesMusica() {
  localStorage.setItem(MUSIC_SETTINGS_KEY, JSON.stringify(musicState.settings));
}

function obterVolumeMusica() {
  return musicState.settings.enabled ? musicState.settings.volume : 0;
}

function criarElementoLegendaMusica() {
  if (musicState.caption && musicState.caption.isConnected) {
    return musicState.caption;
  }

  const caption = document.createElement("div");
  caption.id = "music-caption";
  caption.className = "music-caption";
  caption.setAttribute("aria-live", "polite");
  document.body.appendChild(caption);
  musicState.caption = caption;
  return caption;
}

function mostrarLegendaMusica(faixa) {
  if (!faixa || !musicState.settings.enabled) return;

  const caption = criarElementoLegendaMusica();
  caption.innerHTML = `
    <span>Trilha sonora</span>
    <strong>${faixa.title}</strong>
  `;
  caption.classList.add("visible");

  window.clearTimeout(musicState.noticeTimer);
  musicState.noticeTimer = window.setTimeout(() => {
    caption.classList.remove("visible");
  }, MUSIC_NOTICE_MS);
}

function aplicarVolumeMusica(imediato = false) {
  if (!musicState.audio) return;

  if (imediato) {
    musicState.audio.volume = obterVolumeMusica();
  }
}

function pararFadeMusica() {
  if (musicState.fadeTimer) {
    window.clearInterval(musicState.fadeTimer);
    musicState.fadeTimer = null;
  }
}

function animarVolumeMusica(de, para, duracao, aoFinal) {
  pararFadeMusica();

  const audio = musicState.audio;
  if (!audio) return;

  const inicio = performance.now();
  audio.volume = Math.min(1, Math.max(0, de));

  musicState.fadeTimer = window.setInterval(() => {
    const progresso = Math.min(1, (performance.now() - inicio) / duracao);
    audio.volume = de + (para - de) * progresso;

    if (progresso >= 1) {
      pararFadeMusica();
      audio.volume = Math.min(1, Math.max(0, para));
      if (typeof aoFinal === "function") aoFinal();
    }
  }, 40);
}

function tentarTocarAudioAtual() {
  if (!musicState.audio || !musicState.settings.enabled || !musicState.faixaAtual) return;

  musicState.audio.play()
    .then(() => {
      musicState.desbloqueado = true;
    })
    .catch(() => {
      musicState.desbloqueado = false;
    });
}

function selecionarProximaFaixaJogo() {
  if (!MUSIC_GAME_TRACKS.length) return null;
  if (MUSIC_GAME_TRACKS.length === 1) return MUSIC_GAME_TRACKS[0];

  let proximo = Math.floor(Math.random() * MUSIC_GAME_TRACKS.length);
  if (proximo === musicState.indiceJogo) {
    proximo = (proximo + 1) % MUSIC_GAME_TRACKS.length;
  }
  musicState.indiceJogo = proximo;
  return MUSIC_GAME_TRACKS[proximo];
}

function selecionarFaixaMissao() {
  const faixas = musicState.missionTracks.length
    ? musicState.missionTracks
    : MUSIC_FALLBACK_MISSION_FILES.map(criarFaixaMissao);

  return faixas[Math.floor(Math.random() * faixas.length)] || null;
}

function trocarFaixaMusica(faixa, opcoes = {}) {
  if (!faixa || !musicState.audio) return;

  const mesmaFaixa = musicState.faixaAtual && musicState.faixaAtual.src === faixa.src;
  if (mesmaFaixa && !opcoes.force) {
    tentarTocarAudioAtual();
    return;
  }

  musicState.faixaAtual = faixa;
  document.body.dataset.musicContext = faixa.context || musicState.contexto;

  const iniciarNovaFaixa = () => {
    musicState.audio.src = faixa.src;
    musicState.audio.currentTime = 0;
    musicState.audio.loop = faixa.context === "menu" || faixa.context === "mission";
    musicState.audio.volume = 0;
    tentarTocarAudioAtual();

    if (musicState.settings.enabled) {
      animarVolumeMusica(0, obterVolumeMusica(), MUSIC_FADE_MS);
      mostrarLegendaMusica(faixa);
    }
  };

  if (musicState.audio.src && !musicState.audio.paused && !opcoes.imediato) {
    animarVolumeMusica(musicState.audio.volume, 0, MUSIC_FADE_MS, iniciarNovaFaixa);
    return;
  }

  iniciarNovaFaixa();
}

function tocarContextoMusical(contexto, opcoes = {}) {
  inicializarSistemaAudio();

  if (contexto !== "mission") {
    musicState.contexto = contexto;
  }

  document.body.dataset.musicContext = contexto;

  if (!musicState.settings.enabled) {
    if (musicState.audio) musicState.audio.pause();
    return;
  }

  if (contexto === "menu") {
    trocarFaixaMusica(MUSIC_MENU_TRACK, opcoes);
    return;
  }

  if (contexto === "game") {
    trocarFaixaMusica(selecionarProximaFaixaJogo(), opcoes);
  }
}

function iniciarMusicaMissao() {
  inicializarSistemaAudio();
  musicState.contextoAntesMissao = musicState.contexto === "mission" ? "game" : musicState.contexto;
  musicState.contexto = "mission";
  trocarFaixaMusica(selecionarFaixaMissao(), { force: true });
}

function encerrarMusicaMissao() {
  const retorno = musicState.contextoAntesMissao === "menu" ? "menu" : "game";
  musicState.contexto = retorno;
  tocarContextoMusical(retorno, { force: true });
}

function lidarFimMusica() {
  if (musicState.contexto === "game") {
    tocarContextoMusical("game", { force: true, imediato: true });
  }
}

async function descobrirMusicasDeMissao() {
  const conhecidas = MUSIC_FALLBACK_MISSION_FILES.map(criarFaixaMissao);

  try {
    const resposta = await fetch(MUSIC_MISSIONS_PATH, { cache: "no-store" });
    if (!resposta.ok) {
      musicState.missionTracks = conhecidas;
      return;
    }

    const html = await resposta.text();
    const encontrados = Array.from(html.matchAll(/href=["']([^"']+\.mp3)["']/gi))
      .map((match) => decodeURIComponent(match[1].split("/").pop()))
      .filter(Boolean);

    const unicos = Array.from(new Set([...MUSIC_FALLBACK_MISSION_FILES, ...encontrados]));
    musicState.missionTracks = unicos.map(criarFaixaMissao);
  } catch (erro) {
    musicState.missionTracks = conhecidas;
  }
}

function desbloquearAudioPorInteracao() {
  if (musicState.desbloqueado) return;
  tentarTocarAudioAtual();
}

function inicializarSistemaAudio() {
  if (musicState.inicializado) return;

  carregarConfiguracoesMusica();

  musicState.audio = new Audio();
  musicState.audio.preload = "auto";
  musicState.audio.volume = obterVolumeMusica();
  musicState.audio.addEventListener("ended", lidarFimMusica);

  document.addEventListener("pointerdown", desbloquearAudioPorInteracao, { passive: true });
  document.addEventListener("keydown", desbloquearAudioPorInteracao);

  descobrirMusicasDeMissao();
  musicState.inicializado = true;
}

function obterConfiguracoesMusica() {
  inicializarSistemaAudio();
  return {
    enabled: musicState.settings.enabled,
    volume: musicState.settings.volume,
    currentTrack: musicState.faixaAtual ? musicState.faixaAtual.title : "Nenhuma faixa",
    context: musicState.contexto
  };
}

function definirMusicaAtiva(ativo) {
  inicializarSistemaAudio();
  musicState.settings.enabled = Boolean(ativo);
  salvarConfiguracoesMusica();

  if (musicState.settings.enabled) {
    aplicarVolumeMusica(true);
    tocarContextoMusical(musicState.contexto || "menu", { force: true });
  } else if (musicState.audio) {
    pararFadeMusica();
    musicState.audio.pause();
  }
}

function definirVolumeMusica(volume) {
  inicializarSistemaAudio();
  musicState.settings.volume = Math.min(1, Math.max(0, Number(volume) || 0));
  salvarConfiguracoesMusica();
  aplicarVolumeMusica(true);
}

window.inicializarSistemaAudio = inicializarSistemaAudio;
window.trocarContextoMusical = tocarContextoMusical;
window.iniciarMusicaMissao = iniciarMusicaMissao;
window.encerrarMusicaMissao = encerrarMusicaMissao;
window.obterConfiguracoesMusica = obterConfiguracoesMusica;
window.definirMusicaAtiva = definirMusicaAtiva;
window.definirVolumeMusica = definirVolumeMusica;
