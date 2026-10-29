import { CORES, TAMANHO_CELULA, gerarGrade, posicaoDaCelula } from "./grade.js";
import { carregarSprite } from "./sprites.js";

const TAMANHO_PACMAN = 13;

// Ângulo do Pac-Man (o sprite olha para a direita) conforme a direção do passo.
const ANGULOS = {
  "1,0": 0,
  "0,1": 90,
  "-1,0": 180,
  "0,-1": 270,
};

// Gera o SVG com o Pac-Man percorrendo o caminho na grade de contribuições.
// Cada quadradinho verde fica cinza no instante em que ele o come; no fim a
// animação para um pouco e recomeça do zero.
export function gerarAnimacao(contribuicoes, passos, { segundosPorPasso = 0.15, pausaNoFim = 2 } = {}) {
  const tempoAndando = (passos.length - 1) * segundosPorPasso;
  const duracao = tempoAndando + pausaNoFim;
  // Momento (de 0 a 1 na animação toda) em que o Pac-Man chega em cada passo.
  const momentos = passos.map((_, i) => (i * segundosPorPasso) / duracao);

  const comidoEm = new Map(
    passos.flatMap((passo, i) => (passo.come ? [[`${passo.semana},${passo.diaDaSemana}`, momentos[i]]] : [])),
  );

  const conteudoDaCelula = (semana, diaDaSemana, dia) => {
    const momento = comidoEm.get(`${semana},${diaDaSemana}`);
    if (momento === undefined) return "";
    return `<animate attributeName="fill" dur="${duracao}s" repeatCount="indefinite" calcMode="discrete" values="${CORES[dia.nivel]};${CORES[0]}" keyTimes="0;${formatar(momento)}"/>`;
  };

  const centros = passos.map((passo) => {
    const { x, y } = posicaoDaCelula(passo.semana, passo.diaDaSemana);
    return `${x + TAMANHO_CELULA / 2} ${y + TAMANHO_CELULA / 2}`;
  });
  const angulos = passos.map((passo, i) => {
    if (i === 0) return 0;
    const anterior = passos[i - 1];
    return ANGULOS[`${passo.semana - anterior.semana},${passo.diaDaSemana - anterior.diaDaSemana}`];
  });
  // O último valor se repete no fim para o Pac-Man ficar parado durante a pausa.
  const keyTimes = [...momentos, 1].map(formatar).join(";");

  const pacman = `<g>
    <animateTransform attributeName="transform" type="translate" dur="${duracao}s" repeatCount="indefinite" values="${[...centros, centros.at(-1)].join(";")}" keyTimes="${keyTimes}"/>
    <g>
      <animateTransform attributeName="transform" type="rotate" dur="${duracao}s" repeatCount="indefinite" calcMode="discrete" values="${[...angulos, angulos.at(-1)].join(";")}" keyTimes="${keyTimes}"/>
      ${carregarSprite("pacman", { x: -TAMANHO_PACMAN / 2, y: -TAMANHO_PACMAN / 2, tamanho: TAMANHO_PACMAN })}
    </g>
  </g>`;

  return gerarGrade(contribuicoes, { conteudoDaCelula, conteudoExtra: pacman });
}

function formatar(numero) {
  return Number(numero.toFixed(4)).toString();
}
