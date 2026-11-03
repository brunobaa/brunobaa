import { ALTURA_GRADE, MARGEM, TAMANHO_CELULA, TEMAS, gerarGrade, posicaoDaCelula } from "./grade.js";
import { simular } from "./simulacao.js";
import { carregarSprite } from "./sprites.js";

const TAMANHO_PACMAN = 13;
const TAMANHO_FANTASMA = 12;
const ALTURA_PLACAR = 18;

// Cor do texto do placar, a mesma dos textos secundários do GitHub em cada tema.
const COR_PLACAR = {
  claro: "#57606a",
  escuro: "#8b949e",
};

// Sprite de cada estado do fantasma; "inativo" não desenha nada.
const SPRITE_DO_ESTADO = {
  normal: (nome) => `fantasma-${nome}`,
  assustado: () => "fantasma-assustado",
  piscando: () => "fantasma-piscando",
  olhos: () => "fantasma-olhos",
};

// Ângulo do Pac-Man (o sprite olha para a direita) conforme a direção do passo.
const ANGULOS = {
  "1,0": 0,
  "0,1": 90,
  "-1,0": 180,
  "0,-1": 270,
};

// Gera o SVG com o Pac-Man percorrendo o caminho na grade de contribuições.
// Cada quadradinho verde fica cinza no instante em que ele o come, os quatro
// fantasmas andam pela grade com a personalidade de cada um e no fim a animação
// para um pouco e recomeça do zero.
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

  // Os fantasmas andam conforme a simulação. Cada estado tem o seu sprite, e só
  // o sprite do estado atual fica visível em cada passo.
  const simulacao = simular(contribuicoes, passos);
  const fantasmas = simulacao.fantasmas.map(({ nome, posicoes, estados }) => {
    const centrosDoFantasma = posicoes.map(({ semana, dia }) => {
      const { x, y } = posicaoDaCelula(semana, dia);
      return `${x + TAMANHO_CELULA / 2} ${y + TAMANHO_CELULA / 2}`;
    });
    const camadas = Object.entries(SPRITE_DO_ESTADO)
      .filter(([estado]) => estados.includes(estado))
      .map(([estado, sprite]) => {
        const visivel = estados.map((atual) => (atual === estado ? 1 : 0));
        return `<g opacity="${visivel[0]}">
      ${animarDiscreto("opacity", visivel, momentos, duracao)}
      ${carregarSprite(sprite(nome), { x: -TAMANHO_FANTASMA / 2, y: -TAMANHO_FANTASMA / 2, tamanho: TAMANHO_FANTASMA })}
    </g>`;
      });
    return `<g>
    <animateTransform attributeName="transform" type="translate" dur="${duracao}s" repeatCount="indefinite" values="${[...centrosDoFantasma, centrosDoFantasma.at(-1)].join(";")}" keyTimes="${keyTimes}"/>
    ${camadas.join("\n    ")}
  </g>`;
  });

  const placar = gerarPlacar(contribuicoes, passos, momentos, { duracao, cor: COR_PLACAR[tema] });

  return gerarGrade(contribuicoes, {
    tema,
    conteudoDaCelula,
    conteudoExtra: [...fantasmas, pacman, placar].join("\n  "),
    alturaExtra: ALTURA_PLACAR,
  });
}

// Placar embaixo da grade com quantos commits o Pac-Man já comeu. SVG não deixa
// animar o texto em si, então cada total é um <text> que só aparece entre o
// momento em que ele é alcançado e o momento da próxima mordida.
function gerarPlacar({ semanas }, passos, momentos, { duracao, cor }) {
  const quantidades = new Map(
    semanas.flatMap((dias, semana) =>
      dias.map((dia) => [`${semana},${new Date(`${dia.data}T00:00:00Z`).getUTCDay()}`, dia.quantidade]),
    ),
  );

  const totais = [{ total: 0, momento: 0 }];
  passos.forEach((passo, i) => {
    if (!passo.come) return;
    const comidos = totais.at(-1).total + quantidades.get(`${passo.semana},${passo.diaDaSemana}`);
    // Se ele já começa em cima de um dia verde, o placar começa com esse total.
    if (momentos[i] === 0) totais[0].total = comidos;
    else totais.push({ total: comidos, momento: momentos[i] });
  });

  const y = ALTURA_GRADE + ALTURA_PLACAR / 2 + 2;
  return totais
    .map(({ total, momento }, i) => {
      const proximo = totais[i + 1]?.momento;
      const animacao =
        proximo === undefined
          ? `values="0;1" keyTimes="0;${formatar(momento)}"`
          : momento === 0
            ? `values="1;0" keyTimes="0;${formatar(proximo)}"`
            : `values="0;1;0" keyTimes="0;${formatar(momento)};${formatar(proximo)}"`;
      return `<text x="${MARGEM}" y="${y}" font-family="-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="11" fill="${cor}" opacity="${momento === 0 ? 1 : 0}">Commits comidos: ${total}<animate attributeName="opacity" dur="${duracao}s" repeatCount="indefinite" calcMode="discrete" ${animacao}/></text>`;
    })
    .join("\n  ");
}

// <animate> discreto que só guarda os passos em que o valor muda.
function animarDiscreto(atributo, valoresPorPasso, momentos, duracao) {
  const mudancas = valoresPorPasso.flatMap((valor, i) =>
    i === 0 || valor !== valoresPorPasso[i - 1] ? [{ valor, momento: momentos[i] }] : [],
  );
  return `<animate attributeName="${atributo}" dur="${duracao}s" repeatCount="indefinite" calcMode="discrete" values="${mudancas.map(({ valor }) => valor).join(";")}" keyTimes="${mudancas.map(({ momento }) => formatar(momento)).join(";")}"/>`;
}

function formatar(numero) {
  return Number(numero.toFixed(4)).toString();
}
