import { carregarSprite } from "./sprites.js";

const TAMANHO_PACMAN = 40;
const TAMANHO_PONTO = 10;

// Gera um SVG com o Pac-Man atravessando uma fileira de pontos em linha reta.
// Cada ponto some no instante em que a boca do Pac-Man chega nele.
export function gerarLinha({ pontos = 8, espaco = 40, duracao = 4 } = {}) {
  const altura = TAMANHO_PACMAN + 10;
  const meio = altura / 2;
  const inicioPontos = TAMANHO_PACMAN + espaco;
  const largura = inicioPontos + pontos * espaco;
  const distancia = largura - TAMANHO_PACMAN;

  const desenhoPontos = Array.from({ length: pontos }, (_, i) => {
    const centro = inicioPontos + i * espaco;
    // Momento (de 0 a 1) em que a frente do Pac-Man alcança o ponto.
    const comido = (centro - TAMANHO_PACMAN) / distancia;
    return `<g opacity="1">
    <animate attributeName="opacity" dur="${duracao}s" repeatCount="indefinite" calcMode="discrete" values="1;0" keyTimes="0;${comido.toFixed(3)}"/>
    ${carregarSprite("ponto", { x: centro - TAMANHO_PONTO / 2, y: meio - TAMANHO_PONTO / 2, tamanho: TAMANHO_PONTO })}
  </g>`;
  });

  const pacman = `<g>
    <animateTransform attributeName="transform" type="translate" from="0 0" to="${distancia} 0" dur="${duracao}s" repeatCount="indefinite"/>
    ${carregarSprite("pacman", { x: 0, y: meio - TAMANHO_PACMAN / 2, tamanho: TAMANHO_PACMAN })}
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}" width="${largura}" height="${altura}">
  ${desenhoPontos.join("\n  ")}
  ${pacman}
</svg>
`;
}
