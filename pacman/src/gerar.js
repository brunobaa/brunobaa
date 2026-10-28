import { mkdirSync, writeFileSync } from "node:fs";
import { gerarLinha } from "./linha.js";

const PASTA_SAIDA = new URL("../saida/", import.meta.url);

mkdirSync(PASTA_SAIDA, { recursive: true });
writeFileSync(new URL("linha.svg", PASTA_SAIDA), gerarLinha());
console.log("Gerado: saida/linha.svg");
