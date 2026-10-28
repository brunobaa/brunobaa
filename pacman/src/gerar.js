import { mkdirSync, writeFileSync } from "node:fs";
import { buscarContribuicoes } from "./contribuicoes.js";
import { gerarLinha } from "./linha.js";

const PASTA_SAIDA = new URL("../saida/", import.meta.url);
const usuario = process.argv[2] ?? process.env.GITHUB_REPOSITORY_OWNER ?? "brunobaa";

mkdirSync(PASTA_SAIDA, { recursive: true });

writeFileSync(new URL("linha.svg", PASTA_SAIDA), gerarLinha());
console.log("Gerado: saida/linha.svg");

const contribuicoes = await buscarContribuicoes(usuario);
writeFileSync(new URL("contribuicoes.json", PASTA_SAIDA), JSON.stringify(contribuicoes, null, 2));
console.log(
  `Gerado: saida/contribuicoes.json (${usuario}: ${contribuicoes.total} contribuições em ${contribuicoes.semanas.length} semanas)`,
);
