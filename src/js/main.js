// SELECIONAR GERENTE

const botoesPersonagem = document.querySelectorAll(".character-option");
const personagemJogo = document.getElementById("player-character");

let personagemSelecionado = "male";

botoesPersonagem.forEach((botao) => {
  botao.addEventListener("click", () => {
    botoesPersonagem.forEach((item) => item.classList.remove("selected"));

    botao.classList.add("selected");
    personagemSelecionado = botao.dataset.character;

    personagemJogo.classList.remove("manager-male-idle", "manager-female-idle");

    if (personagemSelecionado === "male") {
      personagemJogo.classList.add("manager-male-idle");
    } else {
      personagemJogo.classList.add("manager-female-idle");
    }
  });
});


// CARDS INICIAIS

const telaMenu = document.getElementById("tela-menu")
const telaComoJogar = document.getElementById("tela-como-jogar")
const telaCreditos = document.getElementById("tela-creditos")
const telaJogo = document.getElementById("tela-jogo")

const btnIniciar = document.getElementById("btn-iniciar")
const btnComoJogar = document.getElementById("btn-como-jogar")
const btnCreditos = document.getElementById("btn-creditos")
const btnVoltarMenu = document.querySelectorAll(".btn-voltar-menu")

function mostrarTela(tela){
    const telas = document.querySelectorAll(".screen");

    telas.forEach((item) => {
        item.classList.remove("active")
    })

    tela.classList.add("active")
}

btnIniciar.addEventListener("click", () =>{
    mostrarTela(telaJogo)
})

btnComoJogar.addEventListener("click", () =>{
    mostrarTela(telaComoJogar)
})

btnCreditos.addEventListener("click", () =>{
    mostrarTela(telaCreditos)
})

btnVoltarMenu.forEach((botao) => {
    botao.addEventListener("click", () =>{
        mostrarTela(telaMenu)
    })
})