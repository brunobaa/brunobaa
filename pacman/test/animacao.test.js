import assert from "node:assert/strict";
import { test } from "node:test";
import { gerarAnimacao } from "../src/animacao.js";
import { simular } from "../src/simulacao.js";

// Duas semanas completas a partir de 2025-01-05 (domingo), com contribuições
// na segunda da primeira semana e na sexta da segunda.
const semanas = [0, 1].map((semana) =>
  Array.from({ length: 7 }, (_, dia) => {
    const data = new Date(Date.UTC(2025, 0, 5 + semana * 7 + dia)).toISOString().slice(0, 10);
    const quantidade = (semana === 0 && dia === 1) || (semana === 1 && dia === 5) ? 3 : 0;
    return { data, quantidade, nivel: quantidade ? 2 : 0 };
  }),
);

test("cada dia com contribuições ganha uma animação que apaga o verde", () => {
  const svg = gerarAnimacao({ semanas }, simular({ semanas }));
  const apagando = svg.match(/<animate attributeName="fill"[^>]*>/g);
  assert.equal(apagando.length, 2);
  for (const animacao of apagando) {
    assert.match(animacao, /values="#40c463;#ebedf0"/);
  }
});

test("os quadradinhos somem na ordem em que o Pac-Man passa", () => {
  const simulacao = simular({ semanas });
  const svg = gerarAnimacao({ semanas }, simulacao, { segundosPorPasso: 1, pausaNoFim: 2 });
  const momentos = [...svg.matchAll(/attributeName="fill"[^>]*keyTimes="0;([\d.]+)"\/>/g)].map(([, momento]) => Number(momento));
  // 6 passos de 1s + 2s de pausa = 8s: come no passo 1 (1/8) e no passo 6 (6/8).
  assert.deepEqual(momentos, [1 / 8, 6 / 8]);
});

test("o Pac-Man passa pelo centro de todos os quadradinhos do caminho", () => {
  const simulacao = simular({ semanas });
  const svg = gerarAnimacao({ semanas }, simulacao);
  // O Pac-Man é desenhado por último, depois dos fantasmas.
  const translate = movimentos(svg).at(-1);
  assert.equal(translate.length, simulacao.passos.length + 1);
  assert.equal(translate[0], "10 10");
});

// Quinze semanas sem contribuições, menos o último sábado: um caminho de 21
// passos, longo o bastante para os quatro fantasmas entrarem.
const semanasLongas = Array.from({ length: 15 }, (_, semana) =>
  Array.from({ length: 7 }, (_, dia) => {
    const data = new Date(Date.UTC(2025, 0, 5 + semana * 7 + dia)).toISOString().slice(0, 10);
    const quantidade = semana === 14 && dia === 6 ? 1 : 0;
    return { data, quantidade, nivel: quantidade ? 1 : 0 };
  }),
);

test("os quatro fantasmas aparecem e andam pela grade", () => {
  const simulacao = simular({ semanas: semanasLongas });
  const svg = gerarAnimacao({ semanas: semanasLongas }, simulacao);
  const [blinky, pinky, inky, clyde, pacman] = movimentos(svg);

  for (const fantasma of [blinky, pinky, inky, clyde]) {
    assert.equal(fantasma.length, pacman.length);
    assert.ok(new Set(fantasma).size > 1);
  }
  for (const nome of ["#ff0000", "#ffb8ff", "#00ffff", "#ffb852"]) {
    assert.ok(svg.includes(`fill="${nome}"`));
  }
});

test("fantasmas que não teriam onde andar não aparecem", () => {
  const simulacao = simular({ semanas });
  const svg = gerarAnimacao({ semanas }, simulacao);
  assert.equal(movimentos(svg).length, 2);
});

function movimentos(svg) {
  return [...svg.matchAll(/type="translate"[^>]*values="([^"]+)"/g)].map(([, valores]) => valores.split(";"));
}

test("no tema escuro usa as cores escuras do GitHub", () => {
  const svg = gerarAnimacao({ semanas }, simular({ semanas }), { tema: "escuro" });
  assert.ok(svg.includes('fill="#161b22"'));
  assert.ok(!svg.includes("#ebedf0"));
  assert.match(svg, /values="#006d32;#161b22"/);
});

test("o placar soma os commits comidos até chegar no total", () => {
  const simulacao = simular({ semanas });
  const svg = gerarAnimacao({ semanas }, simulacao, { segundosPorPasso: 1, pausaNoFim: 2 });
  const placar = [...svg.matchAll(/Commits comidos: (\d+)<animate[^>]*keyTimes="([^"]+)"/g)].map(([, total, keyTimes]) => [
    Number(total),
    keyTimes,
  ]);
  // Come 3 commits no passo 1 e mais 3 no passo 6, numa animação de 8s.
  assert.deepEqual(placar, [
    [0, "0;0.125"],
    [3, "0;0.125;0.75"],
    [6, "0;0.75"],
  ]);
});

test("se começa em cima de um dia verde, o placar já começa com ele", () => {
  const comVerdeNoInicio = semanas.map((dias, semana) =>
    dias.map((dia, i) => (semana === 0 && i === 0 ? { ...dia, quantidade: 2, nivel: 1 } : dia)),
  );
  const svg = gerarAnimacao({ semanas: comVerdeNoInicio }, simular({ semanas: comVerdeNoInicio }));
  const totais = [...svg.matchAll(/Commits comidos: (\d+)/g)].map(([, total]) => Number(total));
  assert.deepEqual(totais, [2, 5, 8]);
});

test("o placar conta os fantasmas comidos", () => {
  // Um commit em cada domingo até a semana 45 e uma pastilha na semana 30.
  const semanasComPastilha = Array.from({ length: 50 }, (_, semana) =>
    Array.from({ length: 7 }, (_, dia) => {
      const data = new Date(Date.UTC(2025, 0, 5 + semana * 7 + dia)).toISOString().slice(0, 10);
      if (dia !== 0 || semana < 1 || semana > 45) return { data, quantidade: 0, nivel: 0 };
      return semana === 30 ? { data, quantidade: 5, nivel: 4 } : { data, quantidade: 1, nivel: 1 };
    }),
  );
  const simulacao = simular({ semanas: semanasComPastilha });
  const comidos = simulacao.fantasmasComidos.length;
  assert.ok(comidos > 0);
  const svg = gerarAnimacao({ semanas: semanasComPastilha }, simulacao);
  assert.match(svg, /Fantasmas comidos: 1</);
  assert.match(svg, new RegExp(`Commits comidos: 49 · Fantasmas comidos: ${comidos}<`));
  assert.ok(!svg.includes(`Fantasmas comidos: ${comidos + 1}`));
  // A pastilha e o corpo azul do fantasma assustado aparecem na animação.
  assert.ok(svg.includes('r="6" fill="#ffb8ae"'));
  assert.ok(svg.includes('fill="#2121de" d="M0 28'));
});
