Esse projeto foi desenvolvido com o objetivo de estimular o interesse pela leitura em minha escola, Casimiro de Abreu.

This project was developed with the aim of stimulating interest in reading at my school, Casimiro de Abreu.

## O que o site faz

- **Quiz de recomendação** (português e espanhol) com 8 perguntas: série, tipo de história, como quer se sentir, um livro que amou (pode ser um livro que não está no site), tamanho, dificuldade da escrita, autores do Brasil ou de fora e o que NÃO quer.
- **Resultados honestos**: cada livro mostra se é "a sua cara", "boa aposta" ou "vale tentar". Quando o acervo tem pouca coisa para as respostas, o site avisa e oferece afrouxar a busca.
- **👍 / 👎 nas sugestões**: "não é pra mim" tira o livro e parecidos perdem força; "curti" puxa parecidos.
- **Me mostra outros**: troca as sugestões por outras que ainda não apareceram.
- **Card para os Stories**: gera uma imagem vertical com o livro recomendado para postar.
- **Surpreenda-me**: abre um livro bem avaliado ao acaso.
- **Conquistas de leitura** a partir dos livros marcados como "Já li".
- **Biblioteca** com busca (com ou sem acento), filtros por gênero, Leia SP, série, favoritos e livros lidos.
- **Detalhes de cada livro** com livros parecidos e **link direto**: `https://bielcrod.github.io/ache-seu-livro/?livro=ID`.
- **Livro da semana**, **instalável no celular** (PWA) e abre sem internet depois da primeira visita.

Favoritos, livros lidos, 👍/👎 e conquistas ficam salvos só no navegador de cada pessoa.

## Como funciona a recomendação

Cada livro ganha pontos (veja `SCORE_MAX` no `app.js`):

| Parte | Máximo |
|---|---|
| Tipo de história (basta bater em 2 das escolhas) | 30 |
| Como quer se sentir (basta bater em 2) | 25 |
| Parecido com o livro que a pessoa amou | 25 |
| Tamanho | 15 |
| Dificuldade da escrita | 10 |
| Série | 8 |
| Popularidade + Leia SP (só desempate) | 4 |

A porcentagem é a pontuação dividida pelo máximo das perguntas respondidas. Faixas: **a sua cara** a partir de 72%, **boa aposta** a partir de 55%, **vale tentar** abaixo disso. Só entram na lista principal livros com pelo menos 45% e que tenham algo do que foi pedido; o resto vai para "Outras sugestões".

Saem da lista: o que a pessoa disse que NÃO quer, livros já lidos, livros com 👎, livros só de Ensino Médio para 6°-7° ano, livros só de 6°-7° para Ensino Médio (a não ser que peça infantojuvenil) e livros ilustrados para crianças pequenas (`quiz: false`). Para 6°-7° ano, livro pesado que não foi pedido fica em "Outras sugestões". Por fim, a lista é reorganizada para não repetir o mesmo autor.

## Como adicionar um livro

Adicione um objeto no `booksDatabase` em `books-data.js` com um `id` novo. Use gêneros **sem acento** (ex.: `"ficcao-cientifica"`, `"historico"`).

Preencha também:
- `tamanho`: `"curto"`, `"medio"` ou `"longo"`;
- `leitura`: `"facil"`, `"media"` ou `"desafiadora"` (dificuldade da escrita);
- `vibes`: como o livro faz a pessoa se sentir. Use uma ou mais destas: `emocionante`, `engracado`, `assustador`, `misterio`, `reflexivo`, `aventura`, `leve`, `pesado`, `romantico`, `inspirador`;
- `available`: `true` (está no Leia SP), `false` (não está) ou `null` (ainda não conferido);
- `tituloOriginal` (opcional): título em outra língua, usado para achar a capa;
- `quiz: false` (opcional): o livro aparece na biblioteca, mas não no quiz.

Se não souber a capa, deixe `cover: ""`: o site busca a capa automaticamente na Open Library.

Ao mudar arquivos do site, troque a versão em `CACHE_NAME` no `sw.js` (ex.: `v3` → `v4`).

## Para conferir

- Os 50 livros adicionados em novembro de 2026 estão com `available: null`: confira no Leia SP e troque para `true` ou `false`.
- `popularity` dos livros novos é uma estimativa.
- Alguns títulos continuam em inglês porque não tenho certeza do nome da edição brasileira (ex.: *Love Medicine*, *The Power Broker*, *Where the Sidewalk Ends*).
