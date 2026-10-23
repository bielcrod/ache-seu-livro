Esse projeto foi desenvolvido com o objetivo de estimular o interesse pela leitura em minha escola, Casimiro de Abreu.

This project was developed with the aim of stimulating interest in reading at my school, Casimiro de Abreu.

## O que o site faz

- **Quiz de recomendação** (português e espanhol) com 7 perguntas: série, tipo de história, como quer se sentir, um livro que amou, tamanho, autores do Brasil ou de fora e o que NÃO quer.
- **Biblioteca** com busca (funciona com ou sem acento), filtros por gênero, disponibilidade, série, favoritos e livros já lidos.
- **Detalhes de cada livro**: sinopse, gêneros, botões de favoritar e "Já li", compartilhar e sugestões de livros parecidos.
- **Link direto para um livro**: `https://bielcrod.github.io/ache-seu-livro/?livro=ID`.
- **Livro da semana** e contador de leituras na tela inicial.
- **Instalável no celular** (PWA) e abre mesmo sem internet depois da primeira visita.

Favoritos e livros lidos ficam salvos só no navegador de cada pessoa.

## Como funciona a recomendação

Cada livro ganha pontos (veja `SCORE_MAX` no `app.js`): tipo de história (30), sensação (25), parecido com o livro que a pessoa amou (25), tamanho (8), série (8) e um pouquinho de popularidade e disponibilidade no Leia SP para desempatar. Saem da lista: o que a pessoa disse que NÃO quer, livros que ela já marcou como lidos e livros só de Ensino Médio para 6°-7° ano. Por fim, a lista é reorganizada para não repetir o mesmo autor.

## Como adicionar um livro

Adicione um objeto no `booksDatabase` em `books-data.js` com um `id` novo. Use gêneros **sem acento** (ex.: `"ficcao-cientifica"`, `"historico"`).

Preencha também:
- `tamanho`: `"curto"`, `"medio"` ou `"longo"`;
- `vibes`: como o livro faz a pessoa se sentir. Use uma ou mais destas: `emocionante`, `engracado`, `assustador`, `misterio`, `reflexivo`, `aventura`, `leve`, `pesado`, `romantico`, `inspirador`. Se não souber a capa, deixe `cover: ""`: o site busca a capa automaticamente na Open Library.

Ao mudar arquivos do site, troque a versão em `CACHE_NAME` no `sw.js` (ex.: `v1` → `v2`).
