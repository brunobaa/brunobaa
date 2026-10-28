import assert from "node:assert/strict";
import { test } from "node:test";
import { calcularCaminho } from "../src/caminho.js";

// Monta semanas completas de domingo a sábado a partir de 2025-01-05 (domingo),
// com contribuições só nos dias de "comVerde" ([semana, diaDaSemana]).
function semanasDeTeste(quantidadeDeSemanas, comVerde) {
  const verdes = new Set(comVerde.map(([semana, dia]) => `${semana},${dia}`));
  return Array.from({ length: quantidadeDeSemanas }, (_, semana) =>
    Array.from({ length: 7 }, (_, dia) => {
      const data = new Date(Date.UTC(2025, 0, 5 + semana * 7 + dia)).toISOString().slice(0, 10);
      return { data, quantidade: verdes.has(`${semana},${dia}`) ? 1 : 0, nivel: 0 };
    }),
  );
}

test("anda só um quadradinho por vez, sem diagonais", () => {
  const passos = calcularCaminho({ semanas: semanasDeTeste(10, [[3, 5], [8, 1], [0, 6]]) });
  for (let i = 1; i < passos.length; i++) {
    const distancia =
      Math.abs(passos[i].semana - passos[i - 1].semana) +
      Math.abs(passos[i].diaDaSemana - passos[i - 1].diaDaSemana);
    assert.equal(distancia, 1);
  }
});

test("come cada dia com contribuições uma única vez e termina no último", () => {
  const verdes = [[3, 5], [8, 1], [0, 6]];
  const passos = calcularCaminho({ semanas: semanasDeTeste(10, verdes) });
  const comidos = passos.filter((passo) => passo.come).map((passo) => [passo.semana, passo.diaDaSemana]);
  assert.deepEqual(comidos.sort(), verdes.sort());
  assert.equal(passos.at(-1).come, true);
});

test("vai primeiro ao verde mais próximo", () => {
  const passos = calcularCaminho({ semanas: semanasDeTeste(10, [[9, 0], [1, 0]]) });
  const comidos = passos.filter((passo) => passo.come).map((passo) => passo.semana);
  assert.deepEqual(comidos, [1, 9]);
  assert.equal(passos.length, 10);
});

test("não anda por dias que ainda não existem na última semana", () => {
  const semanas = semanasDeTeste(3, [[2, 2], [1, 6]]);
  semanas[2] = semanas[2].slice(0, 3);
  const passos = calcularCaminho({ semanas });
  assert.ok(passos.every((passo) => passo.semana < 2 || passo.diaDaSemana <= 2));
});

test("sem contribuições fica parado no primeiro dia", () => {
  const passos = calcularCaminho({ semanas: semanasDeTeste(2, []) });
  assert.deepEqual(passos, [{ semana: 0, diaDaSemana: 0, come: false }]);
});
