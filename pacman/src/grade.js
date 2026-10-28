// Desenha o gráfico de contribuições como no GitHub: uma coluna por semana,
// uma linha por dia (domingo em cima) e a cor do quadradinho pelo nível.

export const TAMANHO_CELULA = 10;
export const ESPACO_CELULA = 3;
export const MARGEM = 5;

const PASSO = TAMANHO_CELULA + ESPACO_CELULA;

// Cores do tema claro do GitHub, do nível 0 (sem contribuições) ao 4.
const CORES = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

// Canto superior esquerdo do quadradinho de um dia, a partir da semana
// (coluna) e do dia da semana (linha, 0 = domingo).
export function posicaoDaCelula(semana, diaDaSemana) {
  return {
    x: MARGEM + semana * PASSO,
    y: MARGEM + diaDaSemana * PASSO,
  };
}

export function gerarGrade({ semanas }) {
  const largura = MARGEM * 2 + semanas.length * PASSO - ESPACO_CELULA;
  const altura = MARGEM * 2 + 7 * PASSO - ESPACO_CELULA;

  const celulas = semanas.flatMap((dias, semana) =>
    dias.map((dia) => {
      const diaDaSemana = new Date(`${dia.data}T00:00:00Z`).getUTCDay();
      const { x, y } = posicaoDaCelula(semana, diaDaSemana);
      return `<rect x="${x}" y="${y}" width="${TAMANHO_CELULA}" height="${TAMANHO_CELULA}" rx="2" fill="${CORES[dia.nivel]}"><title>${dia.data}: ${dia.quantidade}</title></rect>`;
    }),
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}">
  ${celulas.join("\n  ")}
</svg>
`;
}
