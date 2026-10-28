// Busca o gráfico de contribuições de um usuário do GitHub.
// Com GITHUB_TOKEN usa a API GraphQL; sem token lê a página pública do perfil,
// para dar para rodar localmente sem configurar nada.

const NIVEIS = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const CONSULTA = `
  query ($usuario: String!) {
    user(login: $usuario) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

// Devolve { usuario, total, semanas }, onde cada semana é uma lista de dias
// { data, quantidade, nivel } de domingo a sábado e nivel vai de 0 a 4.
export async function buscarContribuicoes(usuario, token = process.env.GITHUB_TOKEN) {
  const semanas = token
    ? await buscarPelaApi(usuario, token)
    : await buscarPelaPagina(usuario);

  const total = semanas.flat().reduce((soma, dia) => soma + dia.quantidade, 0);
  return { usuario, total, semanas };
}

async function buscarPelaApi(usuario, token) {
  const resposta = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: CONSULTA, variables: { usuario } }),
  });
  if (!resposta.ok) {
    throw new Error(`API do GitHub respondeu ${resposta.status}`);
  }

  const { data, errors } = await resposta.json();
  if (errors) {
    throw new Error(errors.map((erro) => erro.message).join("; "));
  }

  return data.user.contributionsCollection.contributionCalendar.weeks.map((semana) =>
    semana.contributionDays.map((dia) => ({
      data: dia.date,
      quantidade: dia.contributionCount,
      nivel: NIVEIS[dia.contributionLevel],
    })),
  );
}

async function buscarPelaPagina(usuario) {
  const resposta = await fetch(`https://github.com/users/${usuario}/contributions`);
  if (!resposta.ok) {
    throw new Error(`Página de contribuições respondeu ${resposta.status}`);
  }
  const html = await resposta.text();

  // Cada dia é um <td> com id "contribution-day-component-<diaDaSemana>-<semana>"
  // e a quantidade vem no <tool-tip> ligado a esse id.
  const quantidades = new Map();
  for (const [, id, texto] of html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const numero = texto.match(/^(\d+) contributions?/);
    quantidades.set(id, numero ? Number(numero[1]) : 0);
  }

  const semanas = [];
  for (const [td] of html.matchAll(/<td[^>]*ContributionCalendar-day[^>]*>/g)) {
    const data = td.match(/data-date="([^"]+)"/)?.[1];
    const id = td.match(/id="([^"]+)"/)?.[1];
    const nivel = Number(td.match(/data-level="(\d)"/)?.[1] ?? 0);
    if (!data || !id) continue;

    const [, diaDaSemana, semana] = id.match(/-(\d+)-(\d+)$/).map(Number);
    semanas[semana] ??= [];
    semanas[semana][diaDaSemana] = { data, quantidade: quantidades.get(id) ?? 0, nivel };
  }

  return semanas.map((semana) => semana.filter(Boolean));
}
