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