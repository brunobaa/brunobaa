import assert from "node:assert/strict";
import { test } from "node:test";
import { gerarAnimacao } from "../src/animacao.js";
import { calcularCaminho } from "../src/caminho.js";

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
  const svg = gerarAnimacao({ semanas }, calcularCaminho({ semanas }));
  const apagando = svg.match(/<animate attributeName="fill"[^>]*>/g);
  assert.equal(apagando.length, 2);
  for (const animacao of apagando) {
    assert.match(animacao, /values="#40c463;#ebedf0"/);
  }
});

test("os quadradinhos somem na ordem em que o Pac-Man passa", () => {
  const passos = calcularCaminho({ semanas });
  const svg = gerarAnimacao({ semanas }, passos, { segundosPorPasso: 1, pausaNoFim: 2 });
  const momentos = [...svg.matchAll(/attributeName="fill"[^>]*keyTimes="0;([\d.]+)"\/>/g)].map(([, momento]) => Number(momento));
  // 6 passos de 1s + 2s de pausa = 8s: come no passo 1 (1/8) e no passo 6 (6/8).
  assert.deepEqual(momentos, [1 / 8, 6 / 8]);
});

test("o Pac-Man passa pelo centro de todos os quadradinhos do caminho", () => {
  const passos = calcularCaminho({ semanas });
  const svg = gerarAnimacao({ semanas }, passos);
  // O Pac-Man é desenhado por último, depois dos fantasmas.
  const translate = movimentos(svg).at(-1);
  assert.equal(translate.length, passos.length + 1);
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

test("os quatro fantasmas seguem o rastro do Pac-Man, cada um mais atrás", () => {
  const passos = calcularCaminho({ semanas: semanasLongas });
  const svg = gerarAnimacao({ semanas: semanasLongas }, passos);
  const [blinky, pinky, inky, clyde, pacman] = movimentos(svg);

  for (const [fantasma, atraso] of [[blinky, 5], [pinky, 9], [inky, 13], [clyde, 17]]) {
    assert.deepEqual(fantasma.slice(atraso), pacman.slice(0, pacman.length - 1 - atraso).concat(fantasma.at(-1)));
  }
  for (const nome of ["#ff0000", "#ffb8ff", "#00ffff", "#ffb852"]) {
    assert.ok(svg.includes(`fill="${nome}"`));
  }
});

test("fantasmas que não teriam onde andar não aparecem", () => {
  const passos = calcularCaminho({ semanas });
  const svg = gerarAnimacao({ semanas }, passos);
  assert.equal(movimentos(svg).length, 2);
});

function movimentos(svg) {
  return [...svg.matchAll(/type="translate"[^>]*values="([^"]+)"/g)].map(([, valores]) => valores.split(";"));
}

test("no tema escuro usa as cores escuras do GitHub", () => {
  const svg = gerarAnimacao({ semanas }, calcularCaminho({ semanas }), { tema: "escuro" });
  assert.ok(svg.includes('fill="#161b22"'));
  assert.ok(!svg.includes("#ebedf0"));
  assert.match(svg, /values="#006d32;#161b22"/);
});
