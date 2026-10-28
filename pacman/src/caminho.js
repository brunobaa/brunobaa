// Calcula por onde o Pac-Man anda na grade de contribuições.
// Ele só se move para cima, para baixo e para os lados, de um dia para o
// vizinho, e sempre vai até o quadradinho verde mais próximo que ainda não comeu.

const DIRECOES = [
  [1, 0],
  [0, 1],
  [0, -1],
  [-1, 0],
];

// Devolve a lista de passos { semana, diaDaSemana, come }, começando no
// primeiro dia da grade. "come" é true no passo em que ele come um dia com
// contribuições.
export function calcularCaminho({ semanas }) {
  const existe = new Set();
  const verdes = new Set();
  semanas.forEach((dias, semana) => {
    for (const dia of dias) {
      const chave = chaveDe(semana, diaDaSemanaDe(dia.data));
      existe.add(chave);
      if (dia.quantidade > 0) verdes.add(chave);
    }
  });

  const inicio = { semana: 0, diaDaSemana: diaDaSemanaDe(semanas[0][0].data) };
  const passos = [{ ...inicio, come: verdes.delete(chaveDe(inicio.semana, inicio.diaDaSemana)) }];

  let atual = inicio;
  while (verdes.size > 0) {
    const trecho = caminhoAteOVerdeMaisProximo(atual, verdes, existe);
    for (const posicao of trecho) {
      passos.push({ ...posicao, come: verdes.delete(chaveDe(posicao.semana, posicao.diaDaSemana)) });
    }
    atual = trecho.at(-1);
  }

  return passos;
}

// Busca em largura a partir da posição atual: o primeiro verde encontrado é o
// mais próximo. Devolve as posições do caminho até ele, sem a posição atual.
function caminhoAteOVerdeMaisProximo(atual, verdes, existe) {
  const anterior = new Map([[chaveDe(atual.semana, atual.diaDaSemana), null]]);
  const fila = [atual];

  for (let i = 0; i < fila.length; i++) {
    const posicao = fila[i];
    const chave = chaveDe(posicao.semana, posicao.diaDaSemana);

    if (verdes.has(chave)) {
      const trecho = [];
      for (let p = posicao; p !== atual; p = anterior.get(chaveDe(p.semana, p.diaDaSemana))) {
        trecho.unshift(p);
      }
      return trecho;
    }

    for (const [deltaSemana, deltaDia] of DIRECOES) {
      const vizinho = { semana: posicao.semana + deltaSemana, diaDaSemana: posicao.diaDaSemana + deltaDia };
      const chaveVizinho = chaveDe(vizinho.semana, vizinho.diaDaSemana);
      if (existe.has(chaveVizinho) && !anterior.has(chaveVizinho)) {
        anterior.set(chaveVizinho, posicao);
        fila.push(vizinho);
      }
    }
  }

  throw new Error("Sobrou um dia com contribuições que o Pac-Man não consegue alcançar");
}

function diaDaSemanaDe(data) {
  return new Date(`${data}T00:00:00Z`).getUTCDay();
}

function chaveDe(semana, diaDaSemana) {
  return `${semana},${diaDaSemana}`;
}
