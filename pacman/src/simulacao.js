import { caminhoAteOMaisProximo, chaveDe, lerGrade } from "./caminho.js";

// Simula a partida passo a passo: o Pac-Man comendo os dias com contribuições
// e os fantasmas com a personalidade do jogo original, que decidem a cada
// cruzamento para onde ir escolhendo o vizinho que fica mais perto do alvo.

// Ordem de desempate do jogo original: cima, esquerda, baixo, direita.
const DIRECOES = [
  { semana: 0, dia: -1 },
  { semana: -1, dia: 0 },
  { semana: 0, dia: 1 },
  { semana: 1, dia: 0 },
];

// Cada fantasma entra pela casa (o primeiro dia da grade) alguns passos depois
// do Pac-Man começar a andar.
export const FANTASMAS = [
  { nome: "blinky", atraso: 5 },
  { nome: "pinky", atraso: 9 },
  { nome: "inky", atraso: 13 },
  { nome: "clyde", atraso: 17 },
];

// As pastilhas de poder ficam nos dias mais fortes do ano: até 4 dias do nível
// mais alto, os de mais commits primeiro.
const MAXIMO_DE_PASTILHAS = 4;
// Quantos passos o susto dura e em quantos dos últimos o fantasma pisca.
export const DURACAO_DO_SUSTO = 30;
export const PASSOS_PISCANDO = 10;
// O Pac-Man só larga o caminho para perseguir fantasmas assustados até essa
// distância, e a partida tem um limite de passos para nunca ficar infinita.
const DISTANCIA_DE_PERSEGUICAO = 12;
const LIMITE_DE_PASSOS = 2000;

// Os fantasmas andam um pouco mais devagar que o Pac-Man: ficam parados em um
// a cada quatro passos, senão o Blinky o alcançaria na primeira volta.
// Assustados, andam só em metade dos passos.
function andaNestePasso(passo, assustado) {
  return assustado ? passo % 2 === 0 : passo % 4 !== 3;
}

export function escolherPastilhas({ semanas }) {
  return semanas
    .flatMap((dias, semana) => dias.map((dia) => ({ semana, dia: diaDaSemanaDe(dia.data), ...dia })))
    .filter(({ nivel }) => nivel === 4)
    .sort((a, b) => b.quantidade - a.quantidade || a.data.localeCompare(b.data))
    .slice(0, MAXIMO_DE_PASTILHAS)
    .map(({ semana, dia }) => ({ semana, dia }));
}

// Para onde cada fantasma quer ir, como no jogo original:
// - Blinky persegue o Pac-Man direto;
// - Pinky mira 4 quadradinhos na frente do Pac-Man, para cortar o caminho;
// - Inky mira o ponto 2 quadradinhos na frente do Pac-Man espelhado em
//   relação ao Blinky, então os dois acabam cercando o Pac-Man;
// - Clyde persegue o Pac-Man quando está longe, mas foge para o canto dele
//   (sábado da primeira semana) quando chega a menos de 8 quadradinhos.
export function alvoDoFantasma(nome, { pacman, direcaoDoPacman, blinky, fantasma }) {
  const naFrente = (quadradinhos) => ({
    semana: pacman.semana + direcaoDoPacman.semana * quadradinhos,
    dia: pacman.dia + direcaoDoPacman.dia * quadradinhos,
  });

  switch (nome) {
    case "blinky":
      return pacman;
    case "pinky":
      return naFrente(4);
    case "inky": {
      const meio = naFrente(2);
      return { semana: 2 * meio.semana - blinky.semana, dia: 2 * meio.dia - blinky.dia };
    }
    case "clyde":
      return distancia2(fantasma, pacman) > 8 * 8 ? pacman : { semana: 0, dia: 6 };
  }
}

// Devolve os passos do Pac-Man ({ semana, diaDaSemana, come }, com "come" true
// quando ele come um dia com contribuições), as pastilhas, os fantasmas comidos
// ({ passo, nome }) e, para cada fantasma que chegou a entrar, a posição
// { semana, dia } e o estado em cada passo do Pac-Man. O
// estado é "inativo" antes de ele entrar, "normal", "assustado" e depois
// "piscando" quando o Pac-Man come uma pastilha, e "olhos" depois de comido.
export function simular(contribuicoes) {
  const { existe, verdes, inicio } = lerGrade(contribuicoes.semanas);
  const pastilhas = escolherPastilhas(contribuicoes);
  const ehPastilha = new Set(pastilhas.map(chaveDaPosicao));
  const casa = { semana: inicio.semana, dia: inicio.diaDaSemana };
  let sustoAte = -1;
  const fantasmasComidos = [];

  const fantasmas = FANTASMAS.map(({ nome, atraso }) => ({
    nome,
    atraso,
    posicao: casa,
    direcao: { semana: 0, dia: 0 },
    estado: "inativo",
    assustado: false,
    posicoes: [],
    estados: [],
  }));

  // O Pac-Man vai de verde em verde pelo caminho mais curto, como antes, mas
  // larga o caminho para perseguir um fantasma assustado que esteja perto. Se
  // os verdes acabam no meio de uma perseguição, a partida continua até ela acabar.
  const passos = [{ ...inicio, come: verdes.delete(chaveDe(inicio.semana, inicio.diaDaSemana)) }];
  atualizarFantasmas(0);
  let plano = [];
  while (passos.length < LIMITE_DE_PASSOS) {
    const atual = passos.at(-1);
    const assustados = new Set(
      fantasmas.filter((fantasma) => fantasma.assustado).map((fantasma) => chaveDaPosicao(fantasma.posicao)),
    );
    const perseguicao = caminhoAteOMaisProximo(atual, assustados, existe, { distanciaMaxima: DISTANCIA_DE_PERSEGUICAO });

    let proximo;
    if (perseguicao?.length) {
      proximo = perseguicao[0];
      plano = [];
    } else if (verdes.size > 0) {
      if (plano.length === 0) plano = caminhoAteOMaisProximo(atual, verdes, existe);
      if (!plano) throw new Error("Sobrou um dia com contribuições que o Pac-Man não consegue alcançar");
      proximo = plano.shift();
    } else {
      break;
    }

    passos.push({ ...proximo, come: verdes.delete(chaveDe(proximo.semana, proximo.diaDaSemana)) });
    atualizarFantasmas(passos.length - 1);
  }

  return {
    passos,
    pastilhas,
    fantasmasComidos,
    fantasmas: fantasmas
      .filter(({ estados }) => estados.some((estado) => estado !== "inativo"))
      .map(({ nome, posicoes, estados }) => ({ nome, posicoes, estados })),
  };

  function atualizarFantasmas(passo) {
    const pacman = { semana: passos[passo].semana, dia: passos[passo].diaDaSemana };
    const anterior = passo > 0 ? { semana: passos[passo - 1].semana, dia: passos[passo - 1].diaDaSemana } : pacman;
    const andou = { semana: pacman.semana - anterior.semana, dia: pacman.dia - anterior.dia };
    const direcaoDoPacman = andou.semana || andou.dia ? andou : { semana: 1, dia: 0 };
    const blinky = fantasmas.find((fantasma) => fantasma.nome === "blinky")?.posicao ?? casa;

    // Comer uma pastilha assusta quem já está na grade, e eles dão meia-volta.
    if (passos[passo].come && ehPastilha.has(chaveDaPosicao(pacman))) {
      sustoAte = passo + DURACAO_DO_SUSTO;
      for (const fantasma of fantasmas) {
        if (fantasma.estado !== "normal") continue;
        fantasma.assustado = true;
        fantasma.direcao = { semana: -fantasma.direcao.semana, dia: -fantasma.direcao.dia };
      }
    }
    if (passo >= sustoAte) {
      for (const fantasma of fantasmas) fantasma.assustado = false;
    }

    for (const fantasma of fantasmas) {
      const ondeEstava = fantasma.posicao;
      if (passo === fantasma.atraso) {
        fantasma.estado = "normal";
      } else if (fantasma.estado === "olhos") {
        // Os olhos voltam para casa sem parar e lá o fantasma renasce normal.
        mover(fantasma, casa, existe);
        if (chaveDaPosicao(fantasma.posicao) === chaveDaPosicao(casa)) fantasma.estado = "normal";
      } else if (fantasma.estado === "normal" && andaNestePasso(passo, fantasma.assustado)) {
        if (fantasma.assustado) {
          mover(fantasma, pacman, existe, { fugir: true });
        } else {
          const alvo = alvoDoFantasma(fantasma.nome, { pacman, direcaoDoPacman, blinky, fantasma: fantasma.posicao });
          mover(fantasma, alvo, existe);
        }
      }

      // O Pac-Man come o fantasma assustado se os dois caem no mesmo quadradinho
      // ou se cruzam no meio do caminho trocando de lugar.
      const mesmoLugar = chaveDaPosicao(fantasma.posicao) === chaveDaPosicao(pacman);
      const cruzaram =
        chaveDaPosicao(fantasma.posicao) === chaveDaPosicao(anterior) &&
        chaveDaPosicao(ondeEstava) === chaveDaPosicao(pacman);
      if (fantasma.assustado && (mesmoLugar || cruzaram)) {
        fantasma.estado = "olhos";
        fantasma.assustado = false;
        fantasmasComidos.push({ passo, nome: fantasma.nome });
      }

      fantasma.posicoes.push(fantasma.posicao);
      fantasma.estados.push(estadoVisivel(fantasma, sustoAte - passo));
    }
  }
}

function estadoVisivel(fantasma, passosDeSustoRestantes) {
  if (!fantasma.assustado) return fantasma.estado;
  return passosDeSustoRestantes <= PASSOS_PISCANDO ? "piscando" : "assustado";
}

// Anda um quadradinho para o vizinho mais perto do alvo, ou mais longe dele
// quando está fugindo. Como no jogo, o fantasma não dá meia-volta, a não ser
// que não tenha outra saída.
function mover(fantasma, alvo, existe, { fugir = false } = {}) {
  const vizinhos = DIRECOES.map((direcao) => ({
    direcao,
    posicao: { semana: fantasma.posicao.semana + direcao.semana, dia: fantasma.posicao.dia + direcao.dia },
  })).filter(({ posicao }) => existe.has(chaveDaPosicao(posicao)));

  const semVoltar = vizinhos.filter(
    ({ direcao }) => direcao.semana !== -fantasma.direcao.semana || direcao.dia !== -fantasma.direcao.dia,
  );
  const opcoes = semVoltar.length > 0 ? semVoltar : vizinhos;
  if (opcoes.length === 0) return;

  const sinal = fugir ? -1 : 1;
  const escolhido = opcoes.reduce((melhor, opcao) =>
    sinal * distancia2(opcao.posicao, alvo) < sinal * distancia2(melhor.posicao, alvo) ? opcao : melhor,
  );
  fantasma.posicao = escolhido.posicao;
  fantasma.direcao = escolhido.direcao;
}

function distancia2(a, b) {
  return (a.semana - b.semana) ** 2 + (a.dia - b.dia) ** 2;
}

function diaDaSemanaDe(data) {
  return new Date(`${data}T00:00:00Z`).getUTCDay();
}

function chaveDaPosicao({ semana, dia }) {
  return `${semana},${dia}`;
}
