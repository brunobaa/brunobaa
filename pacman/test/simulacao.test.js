import assert from "node:assert/strict";
import { test } from "node:test";
import { lerGrade } from "../src/caminho.js";
import {
  DURACAO_DO_SUSTO,
  PASSOS_PISCANDO,
  alvoDoFantasma,
  casaDoFantasma,
  escolherPastilhas,
  simular,
} from "../src/simulacao.js";

// Semanas completas a partir de 2025-01-05 (domingo), sem contribuições.
function semanasVazias(quantidade) {
  return Array.from({ length: quantidade }, (_, semana) =>
    Array.from({ length: 7 }, (_, dia) => {
      const data = new Date(Date.UTC(2025, 0, 5 + semana * 7 + dia)).toISOString().slice(0, 10);
      return { data, quantidade: 0, nivel: 0 };
    }),
  );
}

// Um commit em cada domingo da semana 1 até "ate", para o Pac-Man andar em linha
// reta, e uma pastilha (um dia de nível 4) no domingo da semana "pastilha".
function linhaDeCommits(quantidadeDeSemanas, ate, pastilha) {
  const semanas = semanasVazias(quantidadeDeSemanas);
  for (let semana = 1; semana <= ate; semana++) {
    semanas[semana][0] = { ...semanas[semana][0], quantidade: 1, nivel: 1 };
  }
  if (pastilha !== undefined) semanas[pastilha][0] = { ...semanas[pastilha][0], quantidade: 5, nivel: 4 };
  return { semanas };
}

const pacman = { semana: 10, dia: 3 };
const paraDireita = { semana: 1, dia: 0 };

test("Blinky mira direto no Pac-Man", () => {
  assert.deepEqual(alvoDoFantasma("blinky", { pacman, direcaoDoPacman: paraDireita }), pacman);
});

test("Pinky mira 4 quadradinhos na frente do Pac-Man", () => {
  assert.deepEqual(alvoDoFantasma("pinky", { pacman, direcaoDoPacman: paraDireita }), { semana: 14, dia: 3 });
});

test("Inky espelha o Blinky em relação a 2 quadradinhos na frente do Pac-Man", () => {
  const blinky = { semana: 8, dia: 1 };
  // 2 na frente = (12, 3); espelhando (8, 1) em volta dele = (16, 5).
  assert.deepEqual(alvoDoFantasma("inky", { pacman, direcaoDoPacman: paraDireita, blinky }), { semana: 16, dia: 5 });
});

test("Clyde persegue de longe e foge para o canto quando chega perto", () => {
  const longe = { semana: 30, dia: 3 };
  const perto = { semana: 13, dia: 3 };
  assert.deepEqual(alvoDoFantasma("clyde", { pacman, direcaoDoPacman: paraDireita, fantasma: longe }), pacman);
  assert.deepEqual(alvoDoFantasma("clyde", { pacman, direcaoDoPacman: paraDireita, fantasma: perto }), {
    semana: 0,
    dia: 6,
  });
});

test("fantasmas ficam inativos na casa até a hora de entrar", () => {
  const { fantasmas } = simular(linhaDeCommits(30, 25));
  const pinky = fantasmas.find(({ nome }) => nome === "pinky");
  assert.deepEqual(pinky.estados.slice(0, 9), Array(9).fill("inativo"));
  assert.equal(pinky.estados[9], "normal");
  // A casa da Pinky é o sábado da primeira semana.
  assert.deepEqual(pinky.posicoes[9], { semana: 0, dia: 6 });
});

test("fantasmas andam no máximo um quadradinho por passo e só dentro da grade", () => {
  const { fantasmas } = simular(linhaDeCommits(30, 29));
  for (const { posicoes } of fantasmas) {
    for (let i = 1; i < posicoes.length; i++) {
      const andou = Math.abs(posicoes[i].semana - posicoes[i - 1].semana) + Math.abs(posicoes[i].dia - posicoes[i - 1].dia);
      assert.ok(andou <= 1);
      assert.ok(posicoes[i].semana >= 0 && posicoes[i].semana < 30 && posicoes[i].dia >= 0 && posicoes[i].dia < 7);
    }
  }
});

test("cada fantasma entra pela sua própria casa", () => {
  const { fantasmas } = simular(linhaDeCommits(31, 29));
  const entradas = Object.fromEntries(fantasmas.map(({ nome, posicoes, estados }) => [nome, posicoes[estados.indexOf("normal")]]));
  // Blinky no domingo da última semana, Pinky no sábado da primeira, Inky no
  // sábado da última e Clyde na quarta do meio da grade.
  assert.deepEqual(entradas, {
    blinky: { semana: 30, dia: 0 },
    pinky: { semana: 0, dia: 6 },
    inky: { semana: 30, dia: 6 },
    clyde: { semana: 15, dia: 3 },
  });
});

test("a casa na última semana pela metade usa a semana anterior", () => {
  const semanas = semanasVazias(10);
  semanas[9] = semanas[9].slice(0, 3);
  const { existe } = lerGrade(semanas);
  assert.deepEqual(casaDoFantasma({ semana: 1, dia: 6 }, semanas, existe), { semana: 8, dia: 6 });
  assert.deepEqual(casaDoFantasma({ semana: 1, dia: 0 }, semanas, existe), { semana: 9, dia: 0 });
});

test("Blinky sai da casa dele e vai na direção do Pac-Man", () => {
  const { passos, fantasmas } = simular(linhaDeCommits(30, 29));
  const blinky = fantasmas.find(({ nome }) => nome === "blinky");
  const distancia = (i) =>
    Math.abs(blinky.posicoes[i].semana - passos[i].semana) + Math.abs(blinky.posicoes[i].dia - passos[i].diaDaSemana);
  assert.ok(distancia(12) < distancia(5));
});

test("pastilhas ficam nos até 4 dias de nível 4 com mais commits", () => {
  const semanas = semanasVazias(10);
  const fortes = [
    [1, 2, 9],
    [3, 4, 20],
    [5, 1, 9],
    [6, 6, 12],
    [8, 3, 30],
  ];
  for (const [semana, dia, quantidade] of fortes) semanas[semana][dia] = { ...semanas[semana][dia], quantidade, nivel: 4 };
  semanas[9][0] = { ...semanas[9][0], quantidade: 50, nivel: 3 };

  assert.deepEqual(escolherPastilhas({ semanas }), [
    { semana: 8, dia: 3 },
    { semana: 3, dia: 4 },
    { semana: 6, dia: 6 },
    { semana: 1, dia: 2 },
  ]);
});

test("comer uma pastilha assusta quem está na grade, que depois pisca e volta ao normal", () => {
  // Sem perseguição, nenhum fantasma é comido e dá para ver o susto inteiro.
  const { passos, pastilhas, fantasmas } = simular(linhaDeCommits(100, 95, 60), { distanciaDePerseguicao: 0 });
  const [blinky, pinky, inky, clyde] = fantasmas;

  assert.deepEqual(pastilhas, [{ semana: 60, dia: 0 }]);
  assert.ok(passos[60].come && passos[60].semana === 60);
  assert.equal(blinky.estados[59], "normal");
  for (const fantasma of [blinky, pinky, inky, clyde]) {
    const sustoNormal = DURACAO_DO_SUSTO - PASSOS_PISCANDO;
    assert.deepEqual(fantasma.estados.slice(60, 60 + sustoNormal), Array(sustoNormal).fill("assustado"));
    assert.deepEqual(fantasma.estados.slice(80, 90), Array(PASSOS_PISCANDO).fill("piscando"));
    assert.equal(fantasma.estados[90], "normal");
  }
});

test("fantasma assustado foge do Pac-Man", () => {
  const { passos, fantasmas } = simular(linhaDeCommits(100, 95, 60), { distanciaDePerseguicao: 0 });
  const blinky = fantasmas[0];
  const distancia = (i) =>
    Math.abs(blinky.posicoes[i].semana - passos[i].semana) + Math.abs(blinky.posicoes[i].dia - passos[i].diaDaSemana);
  assert.ok(distancia(80) > distancia(60));
});

test("Pac-Man persegue e come os fantasmas assustados que estão perto", () => {
  const { passos, fantasmasComidos, fantasmas } = simular(linhaDeCommits(50, 45, 30));
  assert.ok(fantasmasComidos.length > 0);

  for (const { passo, nome } of fantasmasComidos) {
    const fantasma = fantasmas.find((candidato) => candidato.nome === nome);
    // No passo em que é comido, ele está no mesmo lugar do Pac-Man ou cruzou com ele.
    const distancia =
      Math.abs(fantasma.posicoes[passo].semana - passos[passo].semana) +
      Math.abs(fantasma.posicoes[passo].dia - passos[passo].diaDaSemana);
    assert.ok(distancia <= 1);
    assert.equal(fantasma.estados[passo], "olhos");

    // Os olhos voltam para a casa dele e lá o fantasma renasce normal.
    const renasce = fantasma.estados.indexOf("normal", passo);
    assert.ok(renasce > passo);
    assert.deepEqual(fantasma.posicoes[renasce], fantasma.posicoes[fantasma.estados.indexOf("normal")]);
    assert.ok(fantasma.estados.slice(passo, renasce).every((estado) => estado === "olhos"));
  }
  // O Pac-Man ainda come todos os commits depois de perseguir os fantasmas.
  assert.equal(passos.filter((passo) => passo.come).length, 45);
});
