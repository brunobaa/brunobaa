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
  const momentos = [...svg.matchAll(/keyTimes="0;([\d.]+)"\/>/g)].map(([, momento]) => Number(momento));
  // 6 passos de 1s + 2s de pausa = 8s: come no passo 1 (1/8) e no passo 6 (6/8).
  assert.deepEqual(momentos, [1 / 8, 6 / 8]);
});

test("o Pac-Man passa pelo centro de todos os quadradinhos do caminho", () => {
  const passos = calcularCaminho({ semanas });
  const svg = gerarAnimacao({ semanas }, passos);
  const translate = svg.match(/type="translate"[^>]*values="([^"]+)"/)[1].split(";");
  assert.equal(translate.length, passos.length + 1);
  assert.equal(translate[0], "10 10");
});
