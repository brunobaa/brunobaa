import assert from "node:assert/strict";
import { test } from "node:test";
import { DURACAO_DO_SUSTO, PASSOS_PISCANDO, alvoDoFantasma, escolherPastilhas, simular } from "../src/simulacao.js";

// Semanas completas a partir de 2025-01-05 (domingo), sem contribuições.
function semanasVazias(quantidade) {
  return Array.from({ length: quantidade }, (_, semana) =>
    Array.from({ length: 7 }, (_, dia) => {
      const data = new Date(Date.UTC(2025, 0, 5 + semana * 7 + dia)).toISOString().slice(0, 10);
      return { data, quantidade: 0, nivel: 0 };
    }),
  );
}

// Pac-Man andando em linha reta pelo domingo, da semana 0 até "ate".
function linhaReta(ate) {
  return Array.from({ length: ate + 1 }, (_, semana) => ({ semana, diaDaSemana: 0, come: false }));
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
  const { fantasmas } = simular({ semanas: semanasVazias(30) }, linhaReta(25));
  const pinky = fantasmas.find(({ nome }) => nome === "pinky");
  assert.deepEqual(pinky.estados.slice(0, 9), Array(9).fill("inativo"));
  assert.equal(pinky.estados[9], "normal");
  assert.deepEqual(pinky.posicoes[9], { semana: 0, dia: 0 });
});

test("fantasmas andam no máximo um quadradinho por passo e só dentro da grade", () => {
  const { fantasmas } = simular({ semanas: semanasVazias(30) }, linhaReta(29));
  for (const { posicoes } of fantasmas) {
    for (let i = 1; i < posicoes.length; i++) {
      const andou = Math.abs(posicoes[i].semana - posicoes[i - 1].semana) + Math.abs(posicoes[i].dia - posicoes[i - 1].dia);
      assert.ok(andou <= 1);
      assert.ok(posicoes[i].semana >= 0 && posicoes[i].semana < 30 && posicoes[i].dia >= 0 && posicoes[i].dia < 7);
    }
  }
});

test("Blinky vai atrás do Pac-Man", () => {
  const { fantasmas } = simular({ semanas: semanasVazias(30) }, linhaReta(29));
  const blinky = fantasmas.find(({ nome }) => nome === "blinky");
  // Ele entra no passo 5 e anda 3 de cada 4 passos sempre para a direita.
  assert.ok(blinky.posicoes.at(-1).semana > 15);
  assert.equal(blinky.posicoes.at(-1).dia, 0);
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
  const semanas = semanasVazias(50);
  semanas[10][0] = { ...semanas[10][0], quantidade: 5, nivel: 4 };
  const passos = linhaReta(45).map((passo) => ({ ...passo, come: passo.semana === 10 }));
  const { pastilhas, fantasmas } = simular({ semanas }, passos);
  const [blinky, pinky, inky] = fantasmas;

  assert.deepEqual(pastilhas, [{ semana: 10, dia: 0 }]);
  assert.equal(blinky.estados[9], "normal");
  for (const fantasma of [blinky, pinky]) {
    assert.deepEqual(fantasma.estados.slice(10, 10 + DURACAO_DO_SUSTO - PASSOS_PISCANDO), Array(20).fill("assustado"));
    assert.deepEqual(fantasma.estados.slice(30, 40), Array(PASSOS_PISCANDO).fill("piscando"));
    assert.equal(fantasma.estados[40], "normal");
  }
  // Inky só entra no passo 13, depois da pastilha, então não se assusta.
  assert.ok(inky.estados.every((estado) => estado === "inativo" || estado === "normal"));
});

test("fantasma assustado foge do Pac-Man", () => {
  const semanas = semanasVazias(50);
  semanas[10][0] = { ...semanas[10][0], quantidade: 5, nivel: 4 };
  const passos = linhaReta(45).map((passo) => ({ ...passo, come: passo.semana === 10 }));
  const blinky = simular({ semanas }, passos).fantasmas[0];
  const distancia = (i) => Math.abs(blinky.posicoes[i].semana - passos[i].semana) + Math.abs(blinky.posicoes[i].dia);
  assert.ok(distancia(30) > distancia(10));
});
