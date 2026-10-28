import { readFileSync } from "node:fs";

const PASTA_SPRITES = new URL("../sprites/", import.meta.url);

// Lê um sprite de sprites/ e devolve o <svg> dele pronto para ser colocado
// dentro de outro SVG, na posição e no tamanho pedidos.
export function carregarSprite(nome, { x = 0, y = 0, tamanho }) {
  const svg = readFileSync(new URL(`${nome}.svg`, PASTA_SPRITES), "utf-8")
    .replace(/<!--[\s\S]*?-->\s*/g, "")
    .trim();

  return svg.replace(
    /<svg([^>]*?)\swidth="[^"]*"\sheight="[^"]*"/,
    `<svg$1 x="${x}" y="${y}" width="${tamanho}" height="${tamanho}"`,
  );
}
