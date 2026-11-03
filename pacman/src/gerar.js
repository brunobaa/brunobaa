import { mkdirSync, writeFileSync } from "node:fs";
import { gerarAnimacao } from "./animacao.js";
import { buscarContribuicoes } from "./contribuicoes.js";
import { gerarGrade } from "./grade.js";
import { gerarLinha } from "./linha.js";
import { simular } from "./simulacao.js";

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

writeFileSync(new URL("grade.svg", PASTA_SAIDA), gerarGrade(contribuicoes));
writeFileSync(new URL("grade-escuro.svg", PASTA_SAIDA), gerarGrade(contribuicoes, { tema: "escuro" }));
console.log("Gerado: saida/grade.svg e saida/grade-escuro.svg");

const simulacao = simular(contribuicoes);
console.log(
  `Partida: ${simulacao.passos.length} passos, comendo ${simulacao.passos.filter((passo) => passo.come).length} dias com contribuições, ${simulacao.pastilhas.length} pastilhas e ${simulacao.fantasmasComidos.length} fantasmas`,
);

writeFileSync(new URL("pacman.svg", PASTA_SAIDA), gerarAnimacao(contribuicoes, simulacao));
writeFileSync(new URL("pacman-escuro.svg", PASTA_SAIDA), gerarAnimacao(contribuicoes, simulacao, { tema: "escuro" }));
console.log("Gerado: saida/pacman.svg e saida/pacman-escuro.svg");
