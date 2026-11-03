// Ferramentas para o Pac-Man achar o caminho na grade de contribuições.
// Ele só se move para cima, para baixo e para os lados, de um dia para o
// vizinho; quem decide para onde ele vai a cada passo é simulacao.js.

const DIRECOES = [
  [1, 0],
  [0, 1],
  [0, -1],
  [-1, 0],
];

// Os dias que existem na grade, os que têm contribuições (pelas chaves de
// chaveDe) e o primeiro dia, de onde o Pac-Man sai.
export function lerGrade(semanas) {
  const existe = new Set();
  const verdes = new Set();
  semanas.forEach((dias, semana) => {
    for (const dia of dias) {
      const chave = chaveDe(semana, diaDaSemanaDe(dia.data));
      existe.add(chave);
      if (dia.quantidade > 0) verdes.add(chave);
    }
  });
  return { existe, verdes, inicio: { semana: 0, diaDaSemana: diaDaSemanaDe(semanas[0][0].data) } };
}

// Busca em largura a partir da posição atual: o primeiro alvo encontrado é o
// mais próximo. Devolve as posições do caminho até ele, sem a posição atual, ou
// null se nenhum alvo estiver a até "distanciaMaxima" passos.
export function caminhoAteOMaisProximo(atual, alvos, existe, { distanciaMaxima = Infinity } = {}) {
  const anterior = new Map([[chaveDe(atual.semana, atual.diaDaSemana), null]]);
  const distancias = new Map([[chaveDe(atual.semana, atual.diaDaSemana), 0]]);
  const fila = [atual];

  for (let i = 0; i < fila.length; i++) {
    const posicao = fila[i];
    const chave = chaveDe(posicao.semana, posicao.diaDaSemana);

    if (alvos.has(chave)) {
      const trecho = [];
      for (let p = posicao; p !== atual; p = anterior.get(chaveDe(p.semana, p.diaDaSemana))) {
        trecho.unshift(p);
      }
      return trecho;
    }
    if (distancias.get(chave) >= distanciaMaxima) continue;

    for (const [deltaSemana, deltaDia] of DIRECOES) {
      const vizinho = { semana: posicao.semana + deltaSemana, diaDaSemana: posicao.diaDaSemana + deltaDia };
      const chaveVizinho = chaveDe(vizinho.semana, vizinho.diaDaSemana);
      if (existe.has(chaveVizinho) && !anterior.has(chaveVizinho)) {
        anterior.set(chaveVizinho, posicao);
        distancias.set(chaveVizinho, distancias.get(chave) + 1);
        fila.push(vizinho);
      }
    }
  }

  return null;
}

export function chaveDe(semana, diaDaSemana) {
  return `${semana},${diaDaSemana}`;
}

function diaDaSemanaDe(data) {
  return new Date(`${data}T00:00:00Z`).getUTCDay();
}
