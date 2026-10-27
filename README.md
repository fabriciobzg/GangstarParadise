# PokéHub

Base de dados de Pokémon no estilo FUTBIN / eFootball Hub, toda em português.

- **Base de dados**: 1269 Pokémon e formas (Megas, regionais, alternativas) em cartas estilo Ultimate Team, com overall de 40 a 99, função em batalha e os seis status base. Filtros por nome, habilidade, tipo, geração e categoria.
- **Página de cada Pokémon**: status com percentil, fraquezas e resistências, contra quais tipos o STAB é super efetivo, counters (quem ganha dele), de quem ele ganha, linha evolutiva e formas.
- **Rankings por tipo**: os melhores de cada tipo e os Pokémon que mais vencem aquele tipo.
- **Tier list** (S a D), **tabela de tipos** com calculadora de fraquezas, **comparador** lado a lado e **montador de time** com análise de fraquezas e sugestões.

## Como funciona o overall

1. Um simulador 1v1 coloca cada Pokémon contra todas as evoluções finais não lendárias (nível 50, IV 31, sem EVs). Cada lado usa seu melhor golpe STAB de 80 de poder (ou cobertura neutra), físico ou especial, e o mais rápido ataca primeiro.
2. O overall junta o percentil do total de status base com o percentil de vitórias nesse simulador e distribui o resultado de 40 a 99.

Os mesmos duelos geram as listas de counters e de "melhor contra".

## Rodar

É um site estático, sem build. Abra `site/index.html` no navegador ou sirva a pasta:

```sh
python3 -m http.server -d site 8000
```

Para publicar no GitHub Pages, aponte o Pages para a pasta `site/`.

## Atualizar os dados

`site/data.js` é gerado a partir dos CSVs da [PokéAPI](https://github.com/PokeAPI/pokeapi):

```sh
python3 tools/build_data.py /tmp/pokeapi-csv   # baixa os CSVs que faltarem nessa pasta
```

Sprites vêm do repositório [PokeAPI/sprites](https://github.com/PokeAPI/sprites). Pokémon é marca de Nintendo, Game Freak e The Pokémon Company; este é um projeto de fã sem afiliação.
