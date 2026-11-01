# 🟡 Pac-Man no gráfico de contribuições

Ideia: um Pac-Man percorrendo o gráfico de contribuições do GitHub, comendo os commits, com fantasminhas andando atrás dele. Feito aos poucos, um passo por dia útil.

## Etapas

- [x] Sprites prontos em `sprites/`: Pac-Man, morte do Pac-Man, os quatro fantasmas, fantasma assustado, piscando e só os olhos, ponto e pastilha
- [x] Pac-Man andando em linha reta e comendo os pontos (`npm run gerar` → `saida/linha.svg`)
- [x] Buscar o gráfico de contribuições pela API do GitHub (`saida/contribuicoes.json`)
- [x] Desenhar a grade de contribuições (7 x 53 quadradinhos) (`saida/grade.svg`)
- [x] Calcular o caminho do Pac-Man pela grade (`src/caminho.js`, testes com `npm test`)
- [x] Fazer os quadradinhos sumirem quando forem comidos (`src/animacao.js` → `saida/pacman.svg`)
- [x] Fantasmas seguindo o Pac-Man (cada um alguns passos atrás, no rastro dele)
- [x] Versão para tema escuro (`saida/pacman-escuro.svg`, escolhida pelo README conforme o tema)
- [x] GitHub Action gerando a animação todo dia (`.github/workflows/pacman.yml`, publica no branch `output`)
- [x] Trocar a prévia do README pela animação final (imagens do branch `output`)

## Como rodar

Precisa do Node 18 ou mais novo, sem dependências para instalar.

```bash
npm test
npm run gerar          # usa o dono do repositório ou brunobaa
npm run gerar -- outro # gera para outro usuário
```

Os SVGs saem em `saida/`, que fica fora do git. Com `GITHUB_TOKEN` a busca usa a API GraphQL; sem token, lê a página pública de contribuições.
No GitHub, o workflow `.github/workflows/pacman.yml` faz isso todo dia e publica os SVGs no branch `output`, que é de onde o README do perfil carrega a animação.
