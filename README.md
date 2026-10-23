Esse projeto foi desenvolvido com o objetivo de estimular o interesse pela leitura em minha escola, Casimiro de Abreu.

This project was developed with the aim of stimulating interest in reading at my school, Casimiro de Abreu.

## O que o site faz

- **Quiz de recomendação** (português e espanhol) com 5 perguntas: série, tipo de literatura, gêneros, experiência e época.
- **Biblioteca** com busca (funciona com ou sem acento), filtros por gênero, disponibilidade, série, favoritos e livros já lidos.
- **Detalhes de cada livro**: sinopse, gêneros, botões de favoritar e "Já li", compartilhar e sugestões de livros parecidos.
- **Link direto para um livro**: `https://bielcrod.github.io/ache-seu-livro/?livro=ID`.
- **Livro da semana** e contador de leituras na tela inicial.
- **Instalável no celular** (PWA) e abre mesmo sem internet depois da primeira visita.

Favoritos e livros lidos ficam salvos só no navegador de cada pessoa.

## Como adicionar um livro

Adicione um objeto no `booksDatabase` em `books-data.js` com um `id` novo. Use gêneros **sem acento** (ex.: `"ficcao-cientifica"`, `"historico"`). Se não souber a capa, deixe `cover: ""`: o site busca a capa automaticamente na Open Library.

Ao mudar arquivos do site, troque a versão em `CACHE_NAME` no `sw.js` (ex.: `v1` → `v2`).
