import { TAMANHO_CELULA, TEMAS, gerarGrade, posicaoDaCelula } from "./grade.js";
import { carregarSprite } from "./sprites.js";

const TAMANHO_PACMAN = 13;
const TAMANHO_FANTASMA = 12;

// Os fantasmas seguem o rastro do Pac-Man, cada um alguns passos atrás.
const FANTASMAS = [
  { nome: "blinky", atraso: 5 },
  { nome: "pinky", atraso: 9 },
  { nome: "inky", atraso: 13 },
  { nome: "clyde", atraso: 17 },
];

// Ângulo do Pac-Man (o sprite olha para a direita) conforme a direção do passo.
const ANGULOS = {
  "1,0": 0,
  "0,1": 90,
  "-1,0": 180,
  "0,-1": 270,
};

// Gera o SVG com o Pac-Man percorrendo o caminho na grade de contribuições.
// Cada quadradinho verde fica cinza no instante em que ele o come, os quatro
// fantasmas vêm atrás dele e no fim a animação para um pouco e recomeça do zero.
export function gerarAnimacao(
  contribuicoes,
  passos,
  { tema = "claro", segundosPorPasso = 0.15, pausaNoFim = 2 } = {},
) {
  const cores = TEMAS[tema];
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
    return `<animate attributeName="fill" dur="${duracao}s" repeatCount="indefinite" calcMode="discrete" values="${cores[dia.nivel]};${cores[0]}" keyTimes="0;${formatar(momento)}"/>`;
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

  // Cada fantasma aparece no primeiro dia quando o Pac-Man já andou "atraso"
  // passos e daí em diante pisa exatamente onde ele pisou, sempre atrás dele.
  const fantasmas = FANTASMAS.filter(({ atraso }) => atraso < passos.length).map(({ nome, atraso }) => {
    const rastro = centros.map((_, i) => centros[Math.max(0, i - atraso)]);
    return `<g opacity="0">
    <animate attributeName="opacity" dur="${duracao}s" repeatCount="indefinite" calcMode="discrete" values="0;1" keyTimes="0;${formatar(momentos[atraso])}"/>
    <animateTransform attributeName="transform" type="translate" dur="${duracao}s" repeatCount="indefinite" values="${[...rastro, rastro.at(-1)].join(";")}" keyTimes="${keyTimes}"/>
    ${carregarSprite(`fantasma-${nome}`, { x: -TAMANHO_FANTASMA / 2, y: -TAMANHO_FANTASMA / 2, tamanho: TAMANHO_FANTASMA })}
  </g>`;
  });

  return gerarGrade(contribuicoes, { tema, conteudoDaCelula, conteudoExtra: [...fantasmas, pacman].join("\n  ") });
}

function formatar(numero) {
  return Number(numero.toFixed(4)).toString();
}
