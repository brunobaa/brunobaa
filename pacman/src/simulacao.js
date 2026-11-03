// Simula os fantasmas passo a passo enquanto o Pac-Man segue o caminho dele.
// Cada fantasma tem a personalidade do jogo original e decide a cada cruzamento
// para onde ir, escolhendo o vizinho que fica mais perto do alvo dele.

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

// Os fantasmas andam um pouco mais devagar que o Pac-Man: ficam parados em um
// a cada quatro passos, senão o Blinky o alcançaria na primeira volta.
function andaNestePasso(passo) {
  return passo % 4 !== 3;
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

// Devolve, para cada fantasma, a posição { semana, dia } e o estado em cada
// passo do Pac-Man. O estado é "inativo" antes de ele entrar e "normal" depois.
export function simular({ semanas }, passos) {
  const existe = new Set(
    semanas.flatMap((dias, semana) => dias.map((dia) => chaveDe({ semana, dia: diaDaSemanaDe(dia.data) }))),
  );
  const pacmanEm = passos.map((passo) => ({ semana: passo.semana, dia: passo.diaDaSemana }));
  const casa = pacmanEm[0];

  const fantasmas = FANTASMAS.filter(({ atraso }) => atraso < passos.length).map(({ nome, atraso }) => ({
    nome,
    atraso,
    posicao: casa,
    direcao: { semana: 0, dia: 0 },
    estado: "inativo",
    posicoes: [],
    estados: [],
  }));

  pacmanEm.forEach((pacman, passo) => {
    const anterior = pacmanEm[passo - 1] ?? pacman;
    const andou = { semana: pacman.semana - anterior.semana, dia: pacman.dia - anterior.dia };
    const direcaoDoPacman = andou.semana || andou.dia ? andou : { semana: 1, dia: 0 };
    const blinky = fantasmas.find((fantasma) => fantasma.nome === "blinky")?.posicao ?? casa;

    for (const fantasma of fantasmas) {
      if (passo === fantasma.atraso) {
        fantasma.estado = "normal";
      } else if (fantasma.estado === "normal" && andaNestePasso(passo)) {
        const alvo = alvoDoFantasma(fantasma.nome, { pacman, direcaoDoPacman, blinky, fantasma: fantasma.posicao });
        mover(fantasma, alvo, existe);
      }
      fantasma.posicoes.push(fantasma.posicao);
      fantasma.estados.push(fantasma.estado);
    }
  });

  return { fantasmas: fantasmas.map(({ nome, posicoes, estados }) => ({ nome, posicoes, estados })) };
}

// Anda um quadradinho para o vizinho mais perto do alvo. Como no jogo, o
// fantasma não dá meia-volta, a não ser que não tenha outra saída.
function mover(fantasma, alvo, existe) {
  const vizinhos = DIRECOES.map((direcao) => ({
    direcao,
    posicao: { semana: fantasma.posicao.semana + direcao.semana, dia: fantasma.posicao.dia + direcao.dia },
  })).filter(({ posicao }) => existe.has(chaveDe(posicao)));

  const semVoltar = vizinhos.filter(
    ({ direcao }) => direcao.semana !== -fantasma.direcao.semana || direcao.dia !== -fantasma.direcao.dia,
  );
  const opcoes = semVoltar.length > 0 ? semVoltar : vizinhos;
  if (opcoes.length === 0) return;

  const escolhido = opcoes.reduce((melhor, opcao) =>
    distancia2(opcao.posicao, alvo) < distancia2(melhor.posicao, alvo) ? opcao : melhor,
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

function chaveDe({ semana, dia }) {
  return `${semana},${dia}`;
}
