// ======================================================
// DOCUMENTAÇÃO DO ARQUIVO: static-npc-system.js
// ======================================================
// Controla NPCs parados que dão dicas ao jogador.
// Nesta v25, as dicas não aparecem todas de uma vez: cada NPC libera no máximo
// 3 dicas por dia, uma por vez. Depois que o jogador lê uma dica, o marcador
// some e a próxima dica daquele NPC surge após um tempo aleatório entre 40s e 3min.
//
// Como ajustar:
// - STATIC_NPC_DEFS altera posição, nome, título e visual de cada NPC fixo.
// - STATIC_NPC_DAILY_TIPS guarda as dicas dos 30 dias; edite o texto do dia e NPC desejado.
// - STATIC_NPC_TIP_UNLOCK_MIN_MS/MAX_MS controla o intervalo de liberação.
// - STATIC_NPC_INTERACTION_DISTANCE muda a distância para apertar E/falar.
// - criarHitboxNpcEstatico() define a área sólida desses NPCs no mapa.
// ======================================================

window.staticNpcSystem = {
  inicializado: false,
  npcs: [],
  npcProximoId: null,
  dialogoAtivo: null,
  promptEl: null,
  ultimoDiaSincronizado: null,
  posicoesToken: null
};

const STATIC_NPC_INTERACTION_DISTANCE = 112;
const STATIC_NPC_TIPS_PER_DAY = 3;
const STATIC_NPC_TIP_UNLOCK_MIN_MS = 40000;
const STATIC_NPC_TIP_UNLOCK_MAX_MS = 180000;

const STATIC_NPC_COLLISION = {
  largura: 40,
  altura: 28,
  margemPlayer: 2
};

function zIndexProfundidadeNpcEstatico(y, ajuste = 0) {
  if (typeof window.calcularZIndexProfundidadeMapa === "function") {
    return window.calcularZIndexProfundidadeMapa(y, ajuste);
  }

  return String(1000 + Math.round(Number(y) || 0) + ajuste);
}

const STATIC_NPC_DEFS = [
  {
    "nome": "Runa",
    "titulo": "contadora errante",
    "classe": "npc-runa",
    "x": 700,
    "y": 385,
    "id": "runa"
  },
  {
    "nome": "Cedro",
    "titulo": "almoxarife velho",
    "classe": "npc-cedro",
    "x": 570,
    "y": 1000,
    "id": "cedro"
  },
  {
    "nome": "Mira",
    "titulo": "olheira da feira",
    "classe": "npc-mira",
    "x": 1010,
    "y": 900,
    "id": "mira"
  },
  {
    "nome": "Borin",
    "titulo": "fiscal do caixa",
    "classe": "npc-borin",
    "x": 1770,
    "y": 720,
    "id": "borin"
  },
  {
    "nome": "Sibil",
    "titulo": "mensageira discreta",
    "classe": "npc-sibil",
    "x": 1310,
    "y": 1020,
    "id": "sibil"
  }
];

const STATIC_NPC_DAILY_TIPS = {
  "runa": {
    "1": [
      "Dia 1: comece com preços próximos ao inicial; pão e maçã giram melhor quando não assustam o cliente.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "2": [
      "Dia 2: teste aumentos pequenos, de 1 ou 2 moedas, e observe se a fila continua comprando.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "3": [
      "Dia 3: produto perecível parado vira custo invisível; margem alta não compensa descarte constante.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "4": [
      "Dia 4: use o relatório para comparar receita e lucro; vender muito com lucro baixo pede ajuste de preço.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "5": [
      "Dia 5: a partir daqui o movimento cresce; preço alto demais derruba a chance de cada cliente comprar.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "6": [
      "Dia 6: se conseguir desconto de fornecedor, não transforme tudo em lucro: repasse um pouco para vender mais.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "7": [
      "Dia 7: alimentos baratos carregam reputação; deixe pelo menos um item acessível todos os dias.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "8": [
      "Dia 8: queijo e carne aceitam margem maior, mas estoque caro prende caixa que poderia abastecer básicos.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "9": [
      "Dia 9: não aumente todos os preços ao mesmo tempo; mude um grupo por dia para entender o efeito.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "10": [
      "Dia 10: quando houver evento de demanda, suba pouco e aproveite volume; exagero mata o bônus do evento.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "11": [
      "Dia 11: poção simples vende menos, então cada unidade precisa margem boa sem ficar impossível de comprar.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "12": [
      "Dia 12: produto premium pede caixa de segurança; não coloque especiaria cara se faltar pão e maçã.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "13": [
      "Dia 13: reputação aumenta fluxo; fluxo maior permite margem menor com lucro total maior.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "14": [
      "Dia 14: no meio da campanha, compare custo fixo com lucro líquido, não só com receita bruta.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "15": [
      "Dia 15: se a clientela subiu, preços muito baixos podem desperdiçar caixa; revise os líderes de venda.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "16": [
      "Dia 16: ajudante melhora movimento, mas custo diário entra na conta; preços precisam pagar esse extra.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "17": [
      "Dia 17: quando o caixa passa de 3000, proteja margem nos itens caros e deixe os baratos puxarem fila.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "18": [
      "Dia 18: se o relatório mostrar muitos itens vendidos e pouco lucro, há preço baixo demais ou custo alto demais.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "19": [
      "Dia 19: reajuste depois de missões que dão desconto: fornecedor barato muda o preço ideal.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "20": [
      "Dia 20: estoque máximo cheio com preço alto é sinal de demanda travada; baixe um pouco antes de comprar mais.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "21": [
      "Dia 21: em dias de chuva, preço baixo nos básicos salva movimento e evita prateleira parada.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "22": [
      "Dia 22: se o cliente desiste na fila, preço perfeito não importa; lucro também depende de atendimento.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "23": [
      "Dia 23: antes do fechamento, evite comprar perecível caro; amanhã pode vir evento ruim.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "24": [
      "Dia 24: missões com custo em estoque podem valer mais que venda comum quando dão reputação ou desconto.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "25": [
      "Dia 25: produto caro deve pagar o risco: poção e especiaria não podem ter margem de pão.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "26": [
      "Dia 26: mantenha pão ou maçã como isca de movimento; eles aumentam chance de carrinhos pequenos.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "27": [
      "Dia 27: na reta final, pare de testar mudanças grandes; preserve o que o relatório provou funcionar.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "28": [
      "Dia 28: não compre estoque só porque sobrou caixa; margem vem de vender, não de encher prateleira.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "29": [
      "Dia 29: se estiver perto da meta, reduza risco: básicos estáveis e poucos premium bem precificados.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ],
    "30": [
      "Dia 30: no último dia, preço agressivo só vale se você tiver estoque e fila para transformar demanda em caixa.",
      "Compare preço atual com preço inicial: o sistema pesa demanda pelo preço relativo, então aumento grande reduz a chance de compra.",
      "Edite os preços antes de abrir o expediente; durante o movimento, foque em atender e ler o relatório final."
    ]
  },
  "cedro": {
    "1": [
      "Dia 1: abasteça primeiro pão, maçã e vela; eles têm demanda constante e custam pouco para repor.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "2": [
      "Dia 2: não gaste todo o caixa em carne; ticket alto é bom, mas giro baixo pode travar seu dinheiro.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "3": [
      "Dia 3: perecível precisa medida: compre o que vende hoje, não o que parece bonito no estoque.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "4": [
      "Dia 4: use estoque máximo como limite, não como meta; prateleira cheia demais esconde caixa parado.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "5": [
      "Dia 5: dia 5 libera caminhos de divulgação; guarde produto suficiente para missões e vendas.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "6": [
      "Dia 6: desconto permanente vale muito; quando aparecer rota de fornecedor, prepare reputação e caixa.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "7": [
      "Dia 7: se maçã e pão acabam cedo, o mercado perde carrinhos pequenos e reputação indireta.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "8": [
      "Dia 8: queijo ajuda entrega da taverna; mantenha reserva se pretende fazer missões repetíveis.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "9": [
      "Dia 9: velas não estragam, então são ótimo colchão quando você não sabe o evento de amanhã.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "10": [
      "Dia 10: evento de alimento pede estoque antes da abertura; depois que o expediente começa, o cliente não espera sua compra.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "11": [
      "Dia 11: poções têm estoque máximo baixo; compre poucas e observe se realmente saem.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "12": [
      "Dia 12: especiaria só compensa com caixa folgado; se bloquear básicos, vira armadilha de luxo.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "13": [
      "Dia 13: quando reputação cresce, aumente o estoque mínimo de itens baratos para não perder fluxo.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "14": [
      "Dia 14: revise perdidosTotal dos produtos: perda por falta de estoque é venda que você nunca viu.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "15": [
      "Dia 15: midgame pede equilíbrio: 40% básicos, 35% margem média e 25% especiais é um ponto seguro.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "16": [
      "Dia 16: se contratar ajudante, prepare estoque maior; mais clientes sem mercadoria só aumentam frustração.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "17": [
      "Dia 17: antes de missão cara, deixe um fundo para repor pão e maçã após pagar o custo.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "18": [
      "Dia 18: não deixe perecível parado após evento forte; amanhã a demanda pode voltar ao normal.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "19": [
      "Dia 19: estoque de vela protege dias ruins porque não estraga e ainda vende em evento de noite escura.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "20": [
      "Dia 20: carne e queijo são bons quando o caixa já aguenta reposição sem zerar os básicos.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "21": [
      "Dia 21: em dia fraco, segure compra grande e use o estoque que já está pago.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "22": [
      "Dia 22: fila longa sem estoque é duplo prejuízo: cliente espera e ainda sai sem comprar.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "23": [
      "Dia 23: fim do dia é hora de olhar quantidade restante, não de comprar no impulso.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "24": [
      "Dia 24: cooldown de missão significa planejar estoque com antecedência; não espere o botão voltar.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "25": [
      "Dia 25: produto premium precisa giro observado por relatório; se não vendeu ontem, compre menos hoje.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "26": [
      "Dia 26: estoque barato alto ajuda estabilidade, mas respeite o limite para não prender todo o caixa.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "27": [
      "Dia 27: reta final pede estoque confiável, não apostas enormes em um único produto.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "28": [
      "Dia 28: se o caixa está curto, venda o que há antes de comprar perecível novo.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "29": [
      "Dia 29: prepare o último sprint com básicos cheios e especiais só na quantidade que costuma vender.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ],
    "30": [
      "Dia 30: no dia 30, sobrar estoque não paga aluguel; compre pensando no que sai ainda hoje.",
      "Antes de abrir, olhe quantidade, custo unitário e perecibilidade; essas três coisas decidem o tamanho seguro da compra.",
      "Se um produto falta com frequência, aumente compra aos poucos; se sobra por dias, reduza preço ou pare de repor."
    ]
  },
  "mira": {
    "1": [
      "Dia 1: missão não é enfeite: reputação e experiência aumentam movimento e chance de sucesso depois.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "2": [
      "Dia 2: entrega da taverna usa pão e queijo; só aceite se a venda normal do dia não ficar sem estoque.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "3": [
      "Dia 3: ajuda na colheita é boa para recompor maçã e pão sem gastar caixa direto.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "4": [
      "Dia 4: auditoria libera depois de dias jogados; reduzir energia melhora todo relatório futuro.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "5": [
      "Dia 5: mutirão aparece no dia 5 e aumenta clientela; vale quando você já tem estoque para receber mais gente.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "6": [
      "Dia 6: rota com o moleiro exige reputação; construa isso cedo para baratear compras pelo resto da campanha.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "7": [
      "Dia 7: falha de missão ainda dá experiência em alguns casos; nem toda perda é inútil.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "8": [
      "Dia 8: missão repetível tem cooldown; alterne taverna, colheita e mutirão para não depender de uma só.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "9": [
      "Dia 9: contrato dos mercadores pede fornecedor negociado, reputação e caixa; planeje antes de clicar.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "10": [
      "Dia 10: evento do dia muda demanda; leia o texto antes de decidir qual missão ou estoque priorizar.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "11": [
      "Dia 11: desbloquear especiaria muda o jogo, mas só depois que a base do mercado estiver estável.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "12": [
      "Dia 12: se a missão custa caixa, compare com o lucro médio dos últimos relatórios.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "13": [
      "Dia 13: reputação mínima trava missões fortes; atender bem também é progresso de missão indireto.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "14": [
      "Dia 14: experiência aumenta chance de sucesso; falhar cedo pode preparar vitória mais tarde.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "15": [
      "Dia 15: midgame é hora de transformar reputação em desbloqueios, não só acumular dinheiro parado.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "16": [
      "Dia 16: treinar ajudante exige contrato dos mercadores; faça a sequência de pré-requisitos com calma.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "17": [
      "Dia 17: se desbloqueou ajudante, ainda precisa pagar contratação; não gaste tudo no mesmo dia.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "18": [
      "Dia 18: missões que dão desconto ou clientela valem mais quanto mais cedo forem feitas.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "19": [
      "Dia 19: quando o caixa está negativo em tendência, priorize auditoria e fornecedor antes de luxo.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "20": [
      "Dia 20: não use missão para fugir de estoque ruim; arrume compra e preço junto.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "21": [
      "Dia 21: eventos ruins são bons dias para missões de gestão, pois venda direta tende a render menos.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "22": [
      "Dia 22: fila cheia mostra que movimento existe; agora missões de atendimento e ajudante viram prioridade.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "23": [
      "Dia 23: perto do fim, missão longa só compensa se o benefício ainda terá dias para pagar.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "24": [
      "Dia 24: cooldown restante deve guiar seu calendário; planeje o estoque do dia em que a missão volta.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "25": [
      "Dia 25: contrato premium é poderoso, mas falhar nele machuca caixa e reputação; entre com margem de segurança.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "26": [
      "Dia 26: a missão certa no dia certo vale mais que venda aleatória; combine evento, estoque e recompensa.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "27": [
      "Dia 27: se faltam poucos dias, escolha missões que dão caixa imediato ou destravam vendas rápidas.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "28": [
      "Dia 28: não persiga reputação se a meta final é dinheiro agora; reputação precisa tempo para virar lucro.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "29": [
      "Dia 29: final de campanha pede foco: só aceite risco se o prêmio ajudar antes do dia 30 acabar.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ],
    "30": [
      "Dia 30: último dia não é dia de desbloqueio tardio; venda, atenda e use o que já conquistou.",
      "Olhe requisitos antes do custo: dia mínimo, reputação, caixa e missão anterior bloqueiam muita coisa.",
      "Uma missão boa deve resolver um gargalo: falta de caixa, falta de estoque, pouca clientela ou custo alto."
    ]
  },
  "borin": {
    "1": [
      "Dia 1: cliente só vira receita depois do troco certo; balcão lento transforma demanda em desistência.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "2": [
      "Dia 2: treine troco com valores pequenos: entregar 20 para compra de 17 pede 3, não chute.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "3": [
      "Dia 3: tempo no balcão agora tem limite; cliente esperando 40 segundos desiste e vai embora.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "4": [
      "Dia 4: quando errar troco, corrija rápido; o cliente em atendimento para o relógio da fila, mas segura o caixa.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "5": [
      "Dia 5: se houver muita fila, venda barata também ajuda porque compras simples são atendidas mais rápido.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "6": [
      "Dia 6: não recuse compra por pressa; recusar conta como cliente perdido e reduz o ganho do dia.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "7": [
      "Dia 7: posicione-se no piso do balcão antes de chamar atendimento para evitar perder segundos.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "8": [
      "Dia 8: fila grande pede estoque fácil e preço claro; cliente confuso fica caro em tempo.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "9": [
      "Dia 9: se a loja enche, não abra painéis demais durante expediente; cada segundo sem atender vira risco.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "10": [
      "Dia 10: evento de alta demanda aumenta fila; prepare mentalmente o troco antes de clicar no cliente.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "11": [
      "Dia 11: clientes podem entregar cédula grande para compra pequena; use o total e o valor entregue, não o instinto.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "12": [
      "Dia 12: se o estoque acaba no atendimento, a venda falha; confira estoque antes de abrir o dia.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "13": [
      "Dia 13: boa reputação traz mais gente; sem balcão rápido, reputação vira engarrafamento.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "14": [
      "Dia 14: ajudante é caro, mas fila perdida também custa; compare perdidos do relatório com o custo diário.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "15": [
      "Dia 15: midgame exige caixa organizado: mantenha foco em um cliente por vez.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "16": [
      "Dia 16: quando o ajudante estiver desbloqueado, contrate se a fila estoura antes do fim do expediente.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "17": [
      "Dia 17: 40 segundos parece muito, mas passa rápido com painel aberto; atenda antes de mexer em estoque.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "18": [
      "Dia 18: troco errado não perde venda de imediato, mas trava atendimento; corrija e siga.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "19": [
      "Dia 19: se muitos cansam da fila, reduza lotação indireta: menos spawn não, mais atendimento e ajudante.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "20": [
      "Dia 20: venda premium tem troco maior; confira duas vezes porque erro em valor alto dói mais.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "21": [
      "Dia 21: em dia fraco, cada cliente importa; não deixe ninguém desistir por distração.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "22": [
      "Dia 22: quando duas compras aparecem juntas, resolva a que já está em atendimento para liberar fila.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "23": [
      "Dia 23: fechou expediente, novas compras param; quem sobrou precisa sair sem bagunçar o fluxo.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "24": [
      "Dia 24: relatório de perdidos mostra gargalo de atendimento; use ele para decidir ajudante.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "25": [
      "Dia 25: quanto maior o carrinho, maior o risco de troco; respire e calcule pela diferença.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "26": [
      "Dia 26: se a meta está próxima, perder cliente por 40 segundos é perder dia; balcão vira prioridade máxima.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "27": [
      "Dia 27: reta final: deixe painéis fechados durante movimento e só abra relatório ao fim.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "28": [
      "Dia 28: não tente atender fora do balcão; o jogo bloqueia e você perde ritmo.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "29": [
      "Dia 29: últimos dias pedem disciplina: preço e estoque antes, caixa durante, relatório depois.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ],
    "30": [
      "Dia 30: no dia 30, cada troco correto é caixa imediato; fila parada não conta na meta.",
      "A paciência do balcão é fixa em 40 segundos; se a bolha mostra fila, largue ajustes e vá atender.",
      "Use a diferença: valor entregue menos total da compra. Essa conta simples evita erro e mantém reputação prática."
    ]
  },
  "sibil": {
    "1": [
      "Dia 1: seu objetivo é sobreviver 30 dias e juntar caixa; cada decisão precisa pagar antes do fim.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "2": [
      "Dia 2: não confunda receita com lucro: aluguel, energia e ajudante entram no fechamento.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "3": [
      "Dia 3: primeira semana é fundação: reputação, estoque básico e preço estável importam mais que luxo.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "4": [
      "Dia 4: relatório é bússola; se não olhar, você joga no escuro.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "5": [
      "Dia 5: quando liberar mutirão, só use se conseguir atender o movimento extra.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "6": [
      "Dia 6: desconto fornecedor cedo muda a campanha inteira; prioridade alta se os requisitos encaixarem.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "7": [
      "Dia 7: não cresça tudo de uma vez: estoque, preço, missão e equipe precisam avançar juntos.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "8": [
      "Dia 8: se o caixa cair, corte risco antes de cortar básicos; mercado vazio não se recupera rápido.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "9": [
      "Dia 9: teste uma hipótese por dia: preço, estoque, missão ou atendimento.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "10": [
      "Dia 10: evento bom é chance de acelerar; evento ruim é chance de organizar e não perder caixa.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "11": [
      "Dia 11: produto especial dá salto, mas só se a operação básica não estiver quebrada.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "12": [
      "Dia 12: reputação é motor; caixa é combustível. Ficar sem qualquer um trava a loja.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "13": [
      "Dia 13: meio de campanha pede metas: caixa de segurança, reputação para contrato e fila controlada.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "14": [
      "Dia 14: não contrate ajudante por impulso; contrate quando a fila perdida passa do custo.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "15": [
      "Dia 15: se a clientela subiu, abasteça antes de comemorar; mais gente compra mais e acaba estoque.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "16": [
      "Dia 16: ajudante contratado aumenta custo fixo, então mantenha volume suficiente para pagar.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "17": [
      "Dia 17: economia boa é repetição: compre certo, precifique, atenda, leia relatório.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "18": [
      "Dia 18: quando um sistema falha, não mexa em todos; identifique se faltou cliente, estoque, margem ou atendimento.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "19": [
      "Dia 19: reserve caixa para eventos ruins; reparo urgente e chuva podem quebrar plano agressivo.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "20": [
      "Dia 20: estoque cheio de item errado é dívida disfarçada; gire ou pare de repor.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "21": [
      "Dia 21: se lucro líquido cresce por três dias, mantenha estratégia; não invente risco sem necessidade.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "22": [
      "Dia 22: se a fila cresce junto com perdidos, o gargalo é atendimento, não preço.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "23": [
      "Dia 23: no fim da campanha, benefícios permanentes valem menos; prefira ganho imediato.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "24": [
      "Dia 24: cooldown e dia mínimo fazem calendário; pense dois dias à frente.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "25": [
      "Dia 25: produtos premium devem acelerar caixa, não virar vitrine parada.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "26": [
      "Dia 26: última semana: proteja a meta, não a vaidade do estoque perfeito.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "27": [
      "Dia 27: se ainda está longe da meta, combine mutirão, desconto e premium com cuidado.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "28": [
      "Dia 28: se está perto da meta, venda o seguro: básicos, velas e itens que já provaram saída.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "29": [
      "Dia 29: penúltimo dia é ajuste fino: compre só para a demanda provável do fim.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ],
    "30": [
      "Dia 30: último dia é execução: sem compras enormes, sem missão tardia, sem cliente esperando no balcão.",
      "Pergunte sempre qual gargalo está doendo hoje: movimento, estoque, margem, atendimento ou custo fixo.",
      "Quanto menos dias restam, mais cada melhoria precisa virar dinheiro rápido; benefícios lentos perdem valor."
    ]
  }
};

// Pontos de reserva para quando o mapa ainda não carregou npc_zones.
// Eles são usados só como fallback; com lane_* no Tiled, o sorteio prefere áreas de chão marcadas no mapa.
const STATIC_NPC_FALLBACK_POSITIONS = [
  { x: 650, y: 390 },
  { x: 570, y: 1010 },
  { x: 1010, y: 900 },
  { x: 1770, y: 720 },
  { x: 1310, y: 1020 },
  { x: 760, y: 910 },
  { x: 1160, y: 920 },
  { x: 1510, y: 760 },
  { x: 1880, y: 1170 },
  { x: 980, y: 1160 }
];

function centroObjetoNpcEstatico(objeto) {
  return {
    x: Number(objeto.x || 0) + Number(objeto.width || 0) / 2,
    y: Number(objeto.y || 0) + Number(objeto.height || 0) / 2
  };
}

function numeroAleatorioNpcEstatico(min, max) {
  return Math.random() * (max - min) + min;
}

function pontoAleatorioDentroObjetoNpcEstatico(objeto, margem = 18) {
  const largura = Math.max(1, Number(objeto.width || 1));
  const altura = Math.max(1, Number(objeto.height || 1));
  const ajusteX = Math.min(margem, largura / 3);
  const ajusteY = Math.min(margem, altura / 3);
  return {
    x: Number(objeto.x || 0) + numeroAleatorioNpcEstatico(ajusteX, Math.max(ajusteX, largura - ajusteX)),
    y: Number(objeto.y || 0) + numeroAleatorioNpcEstatico(ajusteY, Math.max(ajusteY, altura - ajusteY))
  };
}

function obterDoorEntryNpcEstatico() {
  const zonas = Array.isArray(window.objetosNpcZones) ? window.objetosNpcZones : [];
  return zonas.find((objeto) => String(objeto.name || "") === "door_entry") || null;
}

function pontoDentroDoorEntryNpcEstatico(ponto, margem = 72) {
  const door = obterDoorEntryNpcEstatico();
  if (!door) return false;
  return ponto.x >= Number(door.x || 0) - margem
    && ponto.x <= Number(door.x || 0) + Number(door.width || 0) + margem
    && ponto.y >= Number(door.y || 0) - margem
    && ponto.y <= Number(door.y || 0) + Number(door.height || 0) + margem;
}

function obterZonasPosicaoNPCsEstaticos() {
  const zonas = Array.isArray(window.objetosNpcZones) ? window.objetosNpcZones : [];
  const lanes = zonas.filter((objeto) => String(objeto.name || "").startsWith("lane_"));

  // Preferimos lane_* porque elas representam chão livre. buy_* e queue_* ficam reservadas para clientes.
  return lanes.length ? lanes : [];
}

function caixaDoNpcEstaticoNoPonto(ponto, margem = 8) {
  return {
    x: ponto.x - STATIC_NPC_COLLISION.largura / 2 - margem,
    y: ponto.y - STATIC_NPC_COLLISION.altura / 2 - margem,
    width: STATIC_NPC_COLLISION.largura + margem * 2,
    height: STATIC_NPC_COLLISION.altura + margem * 2
  };
}

function pontoLivreParaNpcEstatico(ponto, ocupadas = []) {
  if (!ponto) return false;
  if (ponto.x < 96 || ponto.x > 2140 || ponto.y < 120 || ponto.y > 1660) return false;
  if (pontoDentroDoorEntryNpcEstatico(ponto, 72)) return false;
  if (typeof retangulosColidem !== "function") return true;

  const caixa = caixaDoNpcEstaticoNoPonto(ponto, 10);
  const colisoresMapa = Array.isArray(window.objetosColisao) ? window.objetosColisao : [];

  if (colisoresMapa.some((obj) => retangulosColidem(caixa, obj))) return false;
  if (ocupadas.some((obj) => retangulosColidem(caixa, obj))) return false;

  if (window.player) {
    const caixaPlayer = {
      x: window.player.x,
      y: window.player.y,
      width: window.player.width,
      height: window.player.height
    };
    if (retangulosColidem(caixa, caixaPlayer)) return false;
  }

  return true;
}

function sortearPontoNpcEstatico(ocupadas = []) {
  const zonas = obterZonasPosicaoNPCsEstaticos();

  for (let tentativa = 0; tentativa < 140; tentativa += 1) {
    const zona = zonas.length ? zonas[Math.floor(Math.random() * zonas.length)] : null;
    const ponto = zona
      ? pontoAleatorioDentroObjetoNpcEstatico(zona, 22)
      : { ...STATIC_NPC_FALLBACK_POSITIONS[Math.floor(Math.random() * STATIC_NPC_FALLBACK_POSITIONS.length)] };

    if (pontoLivreParaNpcEstatico(ponto, ocupadas)) return ponto;
  }

  for (const base of STATIC_NPC_FALLBACK_POSITIONS.sort(() => Math.random() - 0.5)) {
    const ponto = {
      x: base.x + numeroAleatorioNpcEstatico(-28, 28),
      y: base.y + numeroAleatorioNpcEstatico(-22, 22)
    };
    if (pontoLivreParaNpcEstatico(ponto, ocupadas)) return ponto;
  }

  return { x: 700 + numeroAleatorioNpcEstatico(-50, 50), y: 900 + numeroAleatorioNpcEstatico(-40, 40) };
}

function aplicarPosicaoNpcEstatico(npc, ponto) {
  npc.x = ponto.x;
  npc.y = ponto.y;

  if (npc.el) {
    npc.el.style.left = `${npc.x}px`;
    npc.el.style.top = `${npc.y}px`;
    npc.el.style.zIndex = zIndexProfundidadeNpcEstatico(npc.y);
  }
}

function reposicionarNPCsEstaticos(motivo = "manual") {
  if (!staticNpcSystem.inicializado || !Array.isArray(staticNpcSystem.npcs)) return false;

  const ocupadas = [];
  staticNpcSystem.npcs.forEach((npc) => {
    const ponto = sortearPontoNpcEstatico(ocupadas);
    aplicarPosicaoNpcEstatico(npc, ponto);
    ocupadas.push(caixaDoNpcEstaticoNoPonto(ponto, 38));
  });

  staticNpcSystem.posicoesToken = `${motivo}:${typeof gameState !== "undefined" ? gameState.dia : 0}:${Date.now()}:${Math.random()}`;
  atualizarMarcadoresDicasNPCsEstaticos();
  atualizarPromptNpcEstatico(null);
  return true;
}

/**
 * @doc-func tempoAtualDicasEstaticas
 * O que faz: devolve um relógio em milissegundos usado para liberar próximas dicas.
 * Como editar: use Date.now() se quiser que o tempo continue contando mesmo com a aba fechada.
 */
function tempoAtualDicasEstaticas() {
  return Date.now();
}

/**
 * @doc-func sortearTempoProximaDicaNpcEstatico
 * O que faz: sorteia o intervalo entre uma dica lida e a próxima dica disponível.
 * Como editar: altere STATIC_NPC_TIP_UNLOCK_MIN_MS/MAX_MS para mudar a faixa global.
 */
function sortearTempoProximaDicaNpcEstatico() {
  return Math.round(STATIC_NPC_TIP_UNLOCK_MIN_MS + Math.random() * (STATIC_NPC_TIP_UNLOCK_MAX_MS - STATIC_NPC_TIP_UNLOCK_MIN_MS));
}

/**
 * @doc-func obterDiaDicasNpcEstatico
 * O que faz: limita o dia usado nas dicas entre 1 e 30, evitando erro no fim da campanha.
 * Como editar: se a campanha crescer, aumente gameState.diaMaximo e adicione dicas novas.
 */
function obterDiaDicasNpcEstatico() {
  const diaAtual = typeof gameState !== "undefined" ? Number(gameState.dia || 1) : 1;
  return Math.max(1, Math.min(30, Math.round(diaAtual)));
}

/**
 * @doc-func criarEstadoPadraoDicaNpc
 * O que faz: cria o controle diário de dicas para um NPC específico.
 * Como editar: mude liberadas para 0 se quiser que nem a primeira dica apareça ao começar o dia.
 */
function criarEstadoPadraoDicaNpc() {
  return {
    lidas: 0,
    liberadas: 1,
    proximoDesbloqueioEm: null
  };
}

/**
 * @doc-func garantirEstadoDicasNPCsEstaticos
 * O que faz: garante que gameState tenha um estado de dicas válido para o dia atual.
 * Como editar: adicione novos campos aqui se criar conquistas, histórico ou recompensa por dica.
 */
function garantirEstadoDicasNPCsEstaticos() {
  if (typeof gameState === "undefined") {
    return { dia: obterDiaDicasNpcEstatico(), npcs: {} };
  }

  const diaAtual = obterDiaDicasNpcEstatico();

  if (!gameState.staticNpcTips || gameState.staticNpcTips.dia !== diaAtual) {
    gameState.staticNpcTips = {
      dia: diaAtual,
      npcs: {}
    };
  }

  if (!gameState.staticNpcTips.npcs || typeof gameState.staticNpcTips.npcs !== "object") {
    gameState.staticNpcTips.npcs = {};
  }

  STATIC_NPC_DEFS.forEach((def) => {
    if (!gameState.staticNpcTips.npcs[def.id]) {
      gameState.staticNpcTips.npcs[def.id] = criarEstadoPadraoDicaNpc();
    }

    const estado = gameState.staticNpcTips.npcs[def.id];
    estado.lidas = Math.max(0, Math.min(STATIC_NPC_TIPS_PER_DAY, Number(estado.lidas || 0)));
    estado.liberadas = Math.max(1, Math.min(STATIC_NPC_TIPS_PER_DAY, Number(estado.liberadas || 1)));

    if (estado.liberadas < estado.lidas) {
      estado.liberadas = estado.lidas;
    }

    if (estado.lidas >= STATIC_NPC_TIPS_PER_DAY) {
      estado.liberadas = STATIC_NPC_TIPS_PER_DAY;
      estado.proximoDesbloqueioEm = null;
    }
  });

  return gameState.staticNpcTips;
}

/**
 * @doc-func obterEstadoDicaNpcEstatico
 * O que faz: retorna o estado salvo de um NPC, criando se ainda não existir.
 * Como editar: mantenha o id igual ao STATIC_NPC_DEFS para não perder progresso salvo.
 */
function obterEstadoDicaNpcEstatico(npcId) {
  const estadoGeral = garantirEstadoDicasNPCsEstaticos();
  if (!estadoGeral.npcs[npcId]) {
    estadoGeral.npcs[npcId] = criarEstadoPadraoDicaNpc();
  }
  return estadoGeral.npcs[npcId];
}

/**
 * @doc-func obterDicasNpcEstaticoNoDia
 * O que faz: pega as três dicas do NPC para o dia atual.
 * Como editar: edite STATIC_NPC_DAILY_TIPS[npcId][dia] para trocar o conteúdo mostrado.
 */
function obterDicasNpcEstaticoNoDia(npc) {
  const dia = String(obterDiaDicasNpcEstatico());
  const lista = STATIC_NPC_DAILY_TIPS[npc.id] && STATIC_NPC_DAILY_TIPS[npc.id][dia];

  if (Array.isArray(lista) && lista.length) {
    return lista.slice(0, STATIC_NPC_TIPS_PER_DAY);
  }

  return [
    "Observe preço, estoque e fila antes de abrir o expediente.",
    "Leia o relatório ao fechar o dia para descobrir seu gargalo.",
    "A melhor decisão é a que transforma caixa em lucro antes do dia 30."
  ];
}

/**
 * @doc-func atualizarLiberacaoDicasNPCsEstaticos
 * O que faz: libera a próxima dica quando o tempo sorteado termina.
 * Como editar: altere a condição para liberar só durante expediente ou só na preparação, se desejar.
 */
function atualizarLiberacaoDicasNPCsEstaticos() {
  const estadoGeral = garantirEstadoDicasNPCsEstaticos();
  const agora = tempoAtualDicasEstaticas();

  Object.entries(estadoGeral.npcs).forEach(([npcId, estado]) => {
    if (estado.lidas >= STATIC_NPC_TIPS_PER_DAY) return;
    if (estado.liberadas > estado.lidas) return;
    if (!estado.proximoDesbloqueioEm) return;

    if (agora >= estado.proximoDesbloqueioEm) {
      estado.liberadas = Math.min(STATIC_NPC_TIPS_PER_DAY, estado.lidas + 1);
      estado.proximoDesbloqueioEm = null;
    }
  });
}

/**
 * @doc-func agendarProximaDicaNpcEstatico
 * O que faz: agenda a próxima dica de um NPC depois que o jogador leu a atual.
 * Como editar: para debug, reduza o intervalo sorteado aqui temporariamente.
 */
function agendarProximaDicaNpcEstatico(npcId) {
  const estado = obterEstadoDicaNpcEstatico(npcId);

  if (estado.lidas >= STATIC_NPC_TIPS_PER_DAY) {
    estado.proximoDesbloqueioEm = null;
    return;
  }

  estado.proximoDesbloqueioEm = tempoAtualDicasEstaticas() + sortearTempoProximaDicaNpcEstatico();
}

/**
 * @doc-func obterIndiceDicaDisponivelNpcEstatico
 * O que faz: descobre qual dica pode ser lida agora, ou -1 se não houver dica nova.
 * Como editar: o fluxo atual usa lidas como índice da próxima dica; não mude sem ajustar marcarDicaAtualComoLida.
 */
function obterIndiceDicaDisponivelNpcEstatico(npc) {
  const estado = obterEstadoDicaNpcEstatico(npc.id);
  const dicas = obterDicasNpcEstaticoNoDia(npc);

  if (estado.lidas >= Math.min(STATIC_NPC_TIPS_PER_DAY, dicas.length)) return -1;
  if (estado.liberadas <= estado.lidas) return -1;

  return estado.lidas;
}

/**
 * @doc-func npcEstaticoTemDicaDisponivel
 * O que faz: indica se o marcador de exclamação e o prompt de fala devem aparecer.
 * Como editar: retorne true sempre se quiser que NPCs possam repetir dicas antigas.
 */
function npcEstaticoTemDicaDisponivel(npc) {
  return obterIndiceDicaDisponivelNpcEstatico(npc) >= 0;
}

/**
 * @doc-func marcarDicaAtualComoLida
 * O que faz: registra a leitura da dica atual, esconde o popup e agenda a próxima.
 * Como editar: chame salvarJogo() aqui se quiser autosave após cada dica lida.
 */
function marcarDicaAtualComoLida(npc) {
  if (!npc) return false;

  const estado = obterEstadoDicaNpcEstatico(npc.id);
  const indice = obterIndiceDicaDisponivelNpcEstatico(npc);

  if (indice < 0) return false;

  estado.lidas = Math.max(estado.lidas, indice + 1);
  estado.liberadas = Math.max(estado.liberadas, estado.lidas);

  if (estado.lidas < STATIC_NPC_TIPS_PER_DAY) {
    agendarProximaDicaNpcEstatico(npc.id);
  } else {
    estado.proximoDesbloqueioEm = null;
  }

  return true;
}

/**
 * @doc-func resetarDicasNPCsEstaticosDoDia
 * O que faz: reinicia dicas quando começa um novo dia de campanha.
 * Como editar: se quiser manter dicas não lidas de dias anteriores, não resete gameState.staticNpcTips aqui.
 */
function resetarDicasNPCsEstaticosDoDia() {
  if (typeof gameState === "undefined") return;
  gameState.staticNpcTips = {
    dia: obterDiaDicasNpcEstatico(),
    npcs: {}
  };
  garantirEstadoDicasNPCsEstaticos();
  staticNpcSystem.ultimoDiaSincronizado = gameState.staticNpcTips.dia;

  if (staticNpcSystem.inicializado) {
    reposicionarNPCsEstaticos("novo_dia");
  }
}

/**
 * @doc-func inicializarNPCsEstaticos
 * O que faz: cria sprites, nomes, marcadores e caixas de fala dos NPCs fixos no mapa.
 * Como editar: adicione novos NPCs em STATIC_NPC_DEFS e também em STATIC_NPC_DAILY_TIPS.
 */
function inicializarNPCsEstaticos() {
  if (staticNpcSystem.inicializado) return;

  const world = document.getElementById("world");
  if (!world) return;

  garantirEstadoDicasNPCsEstaticos();

  staticNpcSystem.npcs = STATIC_NPC_DEFS.map((definicao) => {
    const el = document.createElement("div");
    el.className = `static-npc ${definicao.classe}`;
    el.dataset.staticNpcId = definicao.id;
    el.style.left = `${definicao.x}px`;
    el.style.top = `${definicao.y}px`;
    el.style.zIndex = zIndexProfundidadeNpcEstatico(definicao.y);

    const nome = document.createElement("div");
    nome.className = "static-npc-name";
    nome.textContent = definicao.nome;

    const sombra = document.createElement("div");
    sombra.className = "static-npc-shadow";

    const sprite = document.createElement("div");
    sprite.className = "static-npc-sprite customer-idle";

    const marker = document.createElement("div");
    marker.className = "static-npc-marker hidden";
    marker.textContent = "!";

    const chat = document.createElement("div");
    chat.className = "static-npc-chat hidden";

    el.appendChild(marker);
    el.appendChild(sombra);
    el.appendChild(nome);
    el.appendChild(sprite);
    el.appendChild(chat);
    world.appendChild(el);

    el.addEventListener("click", (event) => {
      if (event.target.closest(".static-npc-chat")) return;
      abrirDialogoNpcEstatico(definicao.id);
    });

    return {
      ...definicao,
      el,
      marker,
      chat
    };
  });

  staticNpcSystem.promptEl = document.createElement("div");
  staticNpcSystem.promptEl.className = "static-npc-prompt hidden";
  staticNpcSystem.promptEl.innerHTML = '<strong>E</strong><span>Ler dica</span>';
  world.appendChild(staticNpcSystem.promptEl);

  staticNpcSystem.inicializado = true;
  reposicionarNPCsEstaticos("primeiro_carregamento");
}

/**
 * @doc-func calcularDistanciaDoPlayerNpc
 * O que faz: calcula distância entre o pé do jogador e o ponto do NPC.
 * Como editar: aumente STATIC_NPC_INTERACTION_DISTANCE para falar de mais longe.
 */
function calcularDistanciaDoPlayerNpc(npc) {
  if (!window.player) return Infinity;

  const playerXCentro = window.player.x + window.player.width / 2;
  const playerPe = window.player.y + window.player.height;
  const dx = npc.x - playerXCentro;
  const dy = npc.y - playerPe;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * @doc-func criarHitboxNpcEstatico
 * O que faz: cria a hitbox de colisão física do NPC parado.
 * Como editar: altere STATIC_NPC_COLLISION para mudar largura, altura ou margem.
 */
function criarHitboxNpcEstatico(npc, margem = 0) {
  return {
    x: npc.x - STATIC_NPC_COLLISION.largura / 2 - margem,
    y: npc.y - STATIC_NPC_COLLISION.altura / 2 - margem,
    width: STATIC_NPC_COLLISION.largura + margem * 2,
    height: STATIC_NPC_COLLISION.altura + margem * 2,
    tipo: "npc-estatico",
    id: npc.id
  };
}

/**
 * @doc-func obterCaixasColisaoNPCsEstaticos
 * O que faz: exporta as hitboxes dos NPCs fixos para o player respeitar colisão.
 * Como editar: remova a margem se quiser colisão mais permissiva.
 */
function obterCaixasColisaoNPCsEstaticos() {
  if (!staticNpcSystem.inicializado) return [];

  return staticNpcSystem.npcs
    .filter((npc) => npc.el && npc.el.isConnected)
    .map((npc) => criarHitboxNpcEstatico(npc, STATIC_NPC_COLLISION.margemPlayer));
}

/**
 * @doc-func atualizarMarcadoresDicasNPCsEstaticos
 * O que faz: mostra ou esconde a exclamação de cada NPC conforme a dica disponível.
 * Como editar: troque a classe hidden por outra animação se quiser aviso mais discreto.
 */
function atualizarMarcadoresDicasNPCsEstaticos() {
  staticNpcSystem.npcs.forEach((npc) => {
    if (!npc.marker) return;
    const mostrar = npcEstaticoTemDicaDisponivel(npc) && !staticNpcSystem.dialogoAtivo;
    npc.marker.classList.toggle("hidden", !mostrar);
  });
}

/**
 * @doc-func obterNpcEstaticoProximo
 * O que faz: encontra o NPC com dica nova mais próximo do jogador.
 * Como editar: remova o filtro npcEstaticoTemDicaDisponivel se quiser conversar mesmo sem dica nova.
 */
function obterNpcEstaticoProximo() {
  if (!staticNpcSystem.inicializado) return null;

  let maisProximo = null;
  let menorDistancia = STATIC_NPC_INTERACTION_DISTANCE;

  staticNpcSystem.npcs.forEach((npc) => {
    if (!npcEstaticoTemDicaDisponivel(npc)) return;

    const distancia = calcularDistanciaDoPlayerNpc(npc);
    if (distancia <= menorDistancia) {
      maisProximo = npc;
      menorDistancia = distancia;
    }
  });

  return maisProximo;
}

/**
 * @doc-func atualizarPromptNpcEstatico
 * O que faz: posiciona o prompt "E Ler dica" acima do NPC mais próximo.
 * Como editar: altere o top ou texto do prompt se mudar a escala dos sprites.
 */
function atualizarPromptNpcEstatico(npc) {
  const prompt = staticNpcSystem.promptEl;
  if (!prompt) return;

  if (!npc || staticNpcSystem.dialogoAtivo || !npcEstaticoTemDicaDisponivel(npc)) {
    prompt.classList.add("hidden");
    return;
  }

  prompt.style.left = `${npc.x}px`;
  prompt.style.top = `${npc.y - 136}px`;
  prompt.style.zIndex = zIndexProfundidadeNpcEstatico(npc.y, 40);
  prompt.classList.remove("hidden");
}

/**
 * @doc-func sincronizarDiaDicasNPCsEstaticos
 * O que faz: percebe troca de dia e reseta o ciclo diário de dicas se necessário.
 * Como editar: se quiser carregar dicas acumuladas, substitua o reset por migração parcial.
 */
function sincronizarDiaDicasNPCsEstaticos() {
  if (typeof gameState === "undefined") return;

  const diaAtual = obterDiaDicasNpcEstatico();
  if (staticNpcSystem.ultimoDiaSincronizado === null) {
    staticNpcSystem.ultimoDiaSincronizado = diaAtual;
  }

  if (!gameState.staticNpcTips || gameState.staticNpcTips.dia !== diaAtual) {
    resetarDicasNPCsEstaticosDoDia();
  }

  staticNpcSystem.ultimoDiaSincronizado = diaAtual;
}

/**
 * @doc-func atualizarNPCsEstaticos
 * O que faz: roda todo frame para liberar dicas, atualizar marcador, prompt e fechar diálogo distante.
 * Como editar: mantenha leve; esta função roda junto com o loop do jogo.
 */
function atualizarNPCsEstaticos() {
  inicializarNPCsEstaticos();
  if (!staticNpcSystem.inicializado) return;

  sincronizarDiaDicasNPCsEstaticos();
  atualizarLiberacaoDicasNPCsEstaticos();
  atualizarMarcadoresDicasNPCsEstaticos();

  const proximo = obterNpcEstaticoProximo();
  staticNpcSystem.npcProximoId = proximo ? proximo.id : null;
  atualizarPromptNpcEstatico(proximo);

  if (staticNpcSystem.dialogoAtivo) {
    const npc = staticNpcSystem.npcs.find((item) => item.id === staticNpcSystem.dialogoAtivo.npcId);
    if (!npc || calcularDistanciaDoPlayerNpc(npc) > STATIC_NPC_INTERACTION_DISTANCE + 46) {
      fecharDialogoNpcEstatico(false);
    }
  }
}

/**
 * @doc-func renderizarDialogoNpcEstatico
 * O que faz: monta a caixa de fala com uma única dica liberada.
 * Como editar: altere HTML, botão ou contador aqui.
 */
function renderizarDialogoNpcEstatico(npc, indiceDica) {
  if (!npc || !npc.chat) return;

  const dicas = obterDicasNpcEstaticoNoDia(npc);
  const fala = dicas[indiceDica] || dicas[0];
  const estado = obterEstadoDicaNpcEstatico(npc.id);

  npc.chat.innerHTML = `
    <div class="static-chat-heading">
      <span>${npc.titulo}</span>
      <strong>${npc.nome}</strong>
    </div>
    <p>${fala}</p>
    <div class="static-chat-footer">
      <span>Dica ${indiceDica + 1}/${STATIC_NPC_TIPS_PER_DAY} do dia ${obterDiaDicasNpcEstatico()}</span>
      <button type="button" data-static-npc-next>Entendi</button>
    </div>
  `;

  const botao = npc.chat.querySelector("[data-static-npc-next]");
  if (botao) {
    botao.addEventListener("click", (event) => {
      event.stopPropagation();
      avancarDialogoNpcEstatico();
    });
  }

  npc.chat.classList.remove("hidden");
}

/**
 * @doc-func abrirDialogoNpcEstatico
 * O que faz: abre a dica disponível do NPC; se não há dica nova, não abre nada.
 * Como editar: chame mostrarToast aqui se quiser avisar que a próxima dica ainda não liberou.
 */
function abrirDialogoNpcEstatico(npcId = null) {
  inicializarNPCsEstaticos();
  sincronizarDiaDicasNPCsEstaticos();
  atualizarLiberacaoDicasNPCsEstaticos();

  const npc = npcId
    ? staticNpcSystem.npcs.find((item) => item.id === npcId)
    : obterNpcEstaticoProximo();

  if (!npc) return false;

  if (calcularDistanciaDoPlayerNpc(npc) > STATIC_NPC_INTERACTION_DISTANCE + 32) {
    return false;
  }

  const indiceDica = obterIndiceDicaDisponivelNpcEstatico(npc);
  if (indiceDica < 0) return false;

  fecharDialogoNpcEstatico(false);
  staticNpcSystem.dialogoAtivo = { npcId: npc.id, indiceDica };
  atualizarPromptNpcEstatico(null);
  atualizarMarcadoresDicasNPCsEstaticos();
  renderizarDialogoNpcEstatico(npc, indiceDica);
  return true;
}

/**
 * @doc-func avancarDialogoNpcEstatico
 * O que faz: confirma leitura da dica atual, fecha diálogo e agenda a próxima dica se existir.
 * Como editar: se quiser várias páginas por dica, implemente antes de marcar como lida.
 */
function avancarDialogoNpcEstatico() {
  const ativo = staticNpcSystem.dialogoAtivo;
  if (!ativo) return false;

  const npc = staticNpcSystem.npcs.find((item) => item.id === ativo.npcId);
  if (!npc) {
    fecharDialogoNpcEstatico(false);
    return true;
  }

  marcarDicaAtualComoLida(npc);
  fecharDialogoNpcEstatico(false);
  atualizarLiberacaoDicasNPCsEstaticos();
  atualizarMarcadoresDicasNPCsEstaticos();
  atualizarPromptNpcEstatico(obterNpcEstaticoProximo());
  return true;
}

/**
 * @doc-func fecharDialogoNpcEstatico
 * O que faz: esconde todas as caixas de fala sem necessariamente marcar dica como lida.
 * Como editar: use marcarComoLida=true apenas se fechar também significar leitura confirmada.
 */
function fecharDialogoNpcEstatico(marcarComoLida = false) {
  if (marcarComoLida && staticNpcSystem.dialogoAtivo) {
    const npc = staticNpcSystem.npcs.find((item) => item.id === staticNpcSystem.dialogoAtivo.npcId);
    marcarDicaAtualComoLida(npc);
  }

  staticNpcSystem.npcs.forEach((npc) => {
    if (npc.chat) {
      npc.chat.classList.add("hidden");
    }
  });

  staticNpcSystem.dialogoAtivo = null;
  return true;
}

/**
 * @doc-func lidarTeclaInteracaoNpcEstatico
 * O que faz: E abre uma dica nova ou confirma a dica já aberta.
 * Como editar: troque a tecla no events.js; aqui só tratamos o resultado da interação.
 */
function lidarTeclaInteracaoNpcEstatico() {
  if (staticNpcSystem.dialogoAtivo) {
    return avancarDialogoNpcEstatico();
  }

  return abrirDialogoNpcEstatico();
}

window.inicializarNPCsEstaticos = inicializarNPCsEstaticos;
window.atualizarNPCsEstaticos = atualizarNPCsEstaticos;
window.abrirDialogoNpcEstatico = abrirDialogoNpcEstatico;
window.fecharDialogoNpcEstatico = fecharDialogoNpcEstatico;
window.lidarTeclaInteracaoNpcEstatico = lidarTeclaInteracaoNpcEstatico;
window.obterCaixasColisaoNPCsEstaticos = obterCaixasColisaoNPCsEstaticos;
window.resetarDicasNPCsEstaticosDoDia = resetarDicasNPCsEstaticosDoDia;
window.garantirEstadoDicasNPCsEstaticos = garantirEstadoDicasNPCsEstaticos;
window.reposicionarNPCsEstaticos = reposicionarNPCsEstaticos;
