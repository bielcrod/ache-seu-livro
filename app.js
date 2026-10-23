let genreIndex = {};

// ===== Log de debug (só aparece se DEBUG_MODE = true) =====
const DEBUG_MODE = false;
function debugLog(...args) {
  if (DEBUG_MODE) console.log(...args);
}

// ===== Capas de livro: busca a capa correta na API do Open Library =====
const COVER_CACHE_KEY = 'acheSeuLivro_coverCache';
const PLACEHOLDER_COVER = 'assets/sem-capa.svg';

function getCoverCache() {
  try {
    return JSON.parse(localStorage.getItem(COVER_CACHE_KEY)) || {};
  } catch (e) {
    console.error('Erro ao ler cache de capas:', e);
    return {};
  }
}

function saveCoverToCache(bookId, url) {
  try {
    const cache = getCoverCache();
    cache[bookId] = url;
    localStorage.setItem(COVER_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Erro ao salvar cache de capas:', e);
  }
}

// Encontra um livro pelo id em qualquer uma das duas listas de livros
function findBookById(id) {
  const numId = Number(id);
  try {
    return booksDatabase.find(b => b.id === numId) || fallbackBooks.find(b => b.id === numId);
  } catch (e) {
    console.error('Erro ao procurar livro por id:', e);
    return null;
  }
}

// Busca a capa correta de um livro na API de busca do Open Library,
// usando cache em localStorage para não repetir a requisição.
async function fetchCorrectCover(book) {
  const cache = getCoverCache();
  if (cache[book.id]) return cache[book.id];

  try {
    const query = encodeURIComponent(`${book.title} ${book.author}`);
    const response = await fetch(`https://openlibrary.org/search.json?q=${query}&fields=cover_i&limit=1`);
    if (!response.ok) throw new Error(`Open Library respondeu ${response.status}`);

    const data = await response.json();
    const coverId = data.docs && data.docs[0] && data.docs[0].cover_i;
    const url = coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
      : (book.cover || PLACEHOLDER_COVER);

    saveCoverToCache(book.id, url);
    return url;
  } catch (e) {
    console.error(`Não foi possível buscar a capa de "${book.title}":`, e);
    return book.cover || PLACEHOLDER_COVER;
  }
}

// ===== Utilitários =====
const SITE_URL = 'https://bielcrod.github.io/ache-seu-livro/';

// Alguns campos dos livros às vezes são texto e às vezes lista ("EM" ou ["EF2", "EM"])
function asArray(value) {
  if (value === undefined || value === null || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

// Remove acentos e deixa minúsculo, pra busca achar "revolucao" em "Revolução"
function normalizeText(text) {
  return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function gradeLabel(book) {
  const labels = {
    pt: { EF1: '6°-7° ano', EF2: '8°-9° ano', EM: 'Ensino Médio' },
    es: { EF1: '6°-7° grado', EF2: '8°-9° grado', EM: 'Escuela secundaria' }
  };
  const lang = labels[state.currentLanguage] || labels.pt;
  const grades = asArray(book.grade);
  return grades.length ? grades.map(g => lang[g] || g).join(' / ') : lang.EM;
}

// Literatura portuguesa conta como "estrangeira" no quiz
function matchesType(book, type) {
  if (!type || type === 'qualquer') return true;
  if (type === 'estrangeira') return book.type !== 'brasileira';
  return book.type === type;
}

// ===== Listas salvas no navegador (favoritos e livros lidos) =====
const FAVORITES_KEY = 'acheSeuLivro_favorites';
const READ_KEY = 'acheSeuLivro_read';

function getIdList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    console.error('Erro ao ler lista salva:', e);
    return [];
  }
}

function toggleIdInList(key, bookId) {
  bookId = Number(bookId);
  try {
    let ids = getIdList(key);
    if (ids.includes(bookId)) {
      ids = ids.filter(id => id !== bookId);
    } else {
      ids.push(bookId);
    }
    localStorage.setItem(key, JSON.stringify(ids));
    return ids.includes(bookId);
  } catch (e) {
    console.error('Erro ao salvar lista:', e);
    return getIdList(key).includes(bookId);
  }
}

function getFavorites() {
  return getIdList(FAVORITES_KEY);
}

function isFavorite(bookId) {
  return getFavorites().includes(Number(bookId));
}

function toggleFavorite(bookId) {
  return toggleIdInList(FAVORITES_KEY, bookId);
}

function getReadBooks() {
  return getIdList(READ_KEY);
}

function isRead(bookId) {
  return getReadBooks().includes(Number(bookId));
}

function toggleRead(bookId) {
  return toggleIdInList(READ_KEY, bookId);
}

// Atualiza todos os corações do mesmo livro na tela (cards e modal)
function syncFavoriteButtons(bookId) {
  const fav = isFavorite(bookId);
  document.querySelectorAll(`.favorite-btn[data-book-id="${Number(bookId)}"]`).forEach(btn => {
    btn.classList.toggle('active', fav);
    btn.setAttribute('aria-label', fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
  });
}

function handleFavoriteClick(event, btn, bookId) {
  event.stopPropagation();
  toggleFavorite(bookId);
  syncFavoriteButtons(bookId);
  renderReadingProgress();
}

function favoriteButtonHtml(bookId) {
  const active = isFavorite(bookId) ? 'active' : '';
  return `<button class="favorite-btn ${active}" data-book-id="${bookId}"
            onclick="handleFavoriteClick(event, this, ${bookId})"
            aria-label="${active ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
            <i class="fas fa-heart"></i>
          </button>`;
}

// ===== Card de livro (usado no quiz, nos populares e na biblioteca) =====
function createBookCard(book, options = {}) {
  const pt = state.currentLanguage === 'pt';
  const card = document.createElement('div');
  card.className = 'book-card fade-in';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${pt ? 'Ver detalhes de' : 'Ver detalles de'} ${book.title}`);

  card.innerHTML = `
    <div class="book-cover loading">
      <img class="lazy" src="${PLACEHOLDER_COVER}"
           data-src="${escapeHtml(book.cover || PLACEHOLDER_COVER)}"
           data-book-id="${book.id}"
           alt="Capa do livro: ${escapeHtml(book.title)}"
           onerror="this.onerror=null;this.src='assets/sem-capa.svg'">
      ${favoriteButtonHtml(book.id)}
      ${isRead(book.id) ? `<span class="read-badge"><i class="fas fa-check"></i> ${pt ? 'Lido' : 'Leído'}</span>` : ''}
      ${options.match !== undefined ? `<span class="match-badge">${matchPercent(options.match)}%</span>` : ''}
    </div>
    <div class="book-info">
      <h4 class="book-title">${escapeHtml(book.title)}</h4>
      <p class="book-author">${escapeHtml(book.author)}</p>
      ${options.reason ? `<p class="book-reason">${escapeHtml(options.reason)}</p>` : ''}
      ${book.description && !options.hideDescription ? `<p class="book-description">${escapeHtml(book.description)}</p>` : ''}
      <div class="book-meta">
        <span>${gradeLabel(book)}</span>
        ${book.available
          ? `<span class="available-badge">${pt ? 'Disponível' : 'Disponible'}</span>`
          : `<span class="unavailable-badge">${pt ? 'Indisponível' : 'No disponible'}</span>`}
      </div>
    </div>
  `;

  const authorElement = card.querySelector('.book-author');
  if (authorsInfo[book.author]) {
    authorElement.classList.add('clickable');
    authorElement.addEventListener('click', (e) => {
      e.stopPropagation();
      showAuthorModal(book.author);
    });
  }

  card.addEventListener('click', () => showBookModal(book.id));
  card.addEventListener('keydown', (e) => {
    if (e.target === card && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      showBookModal(book.id);
    }
  });

  return card;
}

// ===== Detalhes do livro =====
function getSimilarBooks(book, limit = 4) {
  const genres = asArray(book.genres);
  const tags = asArray(book.tags);

  return booksDatabase
    .filter(other => other.id !== book.id)
    .map(other => {
      let score = asArray(other.genres).filter(g => genres.includes(g)).length * 2;
      score += asArray(other.tags).filter(t => tags.includes(t)).length;
      if (authorKey(other.author) === authorKey(book.author)) score += 1;
      return { book: other, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || (b.book.popularity || 0) - (a.book.popularity || 0))
    .slice(0, limit)
    .map(item => item.book);
}

function bookLink(book) {
  return `${SITE_URL}?livro=${book.id}`;
}

function showBookModal(bookId) {
  const book = findBookById(bookId);
  if (!book) return;
  const pt = state.currentLanguage === 'pt';
  const lang = genreTranslations[state.currentLanguage] || genreTranslations.pt;
  const read = isRead(book.id);

  elements.bookModalTitle.textContent = book.title;

  const genreChips = asArray(book.genres)
    .map(g => `<span class="genre-chip">${escapeHtml(lang[g] || g)}</span>`)
    .join('');

  const similar = getSimilarBooks(book);
  const similarHtml = similar.map(s => `
    <button class="similar-book" data-book-id="${s.id}">
      <img src="${escapeHtml(s.cover || PLACEHOLDER_COVER)}" data-book-id="${s.id}" alt=""
           onerror="this.onerror=null;this.src='assets/sem-capa.svg'">
      <span>${escapeHtml(s.title)}</span>
    </button>`).join('');

  elements.bookModalContent.innerHTML = `
    <div class="book-detail">
      <div class="book-detail-cover">
        <img src="${escapeHtml(book.cover || PLACEHOLDER_COVER)}" alt="Capa do livro: ${escapeHtml(book.title)}"
             onerror="this.onerror=null;this.src='assets/sem-capa.svg'">
      </div>
      <div class="book-detail-info">
        <p class="book-detail-author">${escapeHtml(book.author)}</p>
        <div class="book-meta">
          <span>${gradeLabel(book)}</span>
          ${book.available
            ? `<span class="available-badge">${pt ? 'Disponível no Leia SP' : 'Disponible en Leia SP'}</span>`
            : `<span class="unavailable-badge">${pt ? 'Indisponível no Leia SP' : 'No disponible en Leia SP'}</span>`}
        </div>
        <div class="genre-chips">${genreChips}</div>
        ${book.description ? `<p class="book-detail-description">${escapeHtml(book.description)}</p>` : ''}
      </div>
    </div>
    <div class="book-detail-actions">
      <button class="action-btn favorite-toggle ${isFavorite(book.id) ? 'active' : ''}" id="detailFavoriteBtn">
        <i class="fas fa-heart"></i> <span></span>
      </button>
      <button class="action-btn read-toggle ${read ? 'active' : ''}" id="detailReadBtn">
        <i class="fas fa-check"></i> <span></span>
      </button>
      <button class="action-btn" id="detailShareBtn">
        <i class="fas fa-share-alt"></i> ${pt ? 'Compartilhar' : 'Compartir'}
      </button>
    </div>
    ${similar.length ? `
      <h3 class="similar-title">${pt ? 'Se você gostar, leia também' : 'Si te gusta, lee también'}</h3>
      <div class="similar-books">${similarHtml}</div>` : ''}
  `;

  const favBtn = document.getElementById('detailFavoriteBtn');
  const readBtn = document.getElementById('detailReadBtn');
  const updateButtons = () => {
    const fav = isFavorite(book.id);
    const done = isRead(book.id);
    favBtn.classList.toggle('active', fav);
    favBtn.querySelector('span').textContent = fav
      ? (pt ? 'Favorito' : 'Favorito')
      : (pt ? 'Favoritar' : 'Agregar a favoritos');
    readBtn.classList.toggle('active', done);
    readBtn.querySelector('span').textContent = done
      ? (pt ? 'Já li' : 'Ya lo leí')
      : (pt ? 'Marcar como lido' : 'Marcar como leído');
  };
  updateButtons();

  favBtn.addEventListener('click', () => {
    toggleFavorite(book.id);
    syncFavoriteButtons(book.id);
    updateButtons();
    refreshAfterListChange();
  });
  readBtn.addEventListener('click', () => {
    toggleRead(book.id);
    updateButtons();
    refreshAfterListChange();
  });
  document.getElementById('detailShareBtn').addEventListener('click', () => shareBook(book));

  elements.bookModalContent.querySelectorAll('.similar-book').forEach(btn => {
    btn.addEventListener('click', () => showBookModal(btn.dataset.bookId));
  });

  // Corrige as capas (inclusive dos livros parecidos) pela Open Library
  elements.bookModalContent.querySelectorAll('img[data-book-id]').forEach(img => {
    const similarBook = findBookById(img.dataset.bookId);
    if (similarBook) fetchCorrectCover(similarBook).then(url => { if (url) img.src = url; });
  });
  fetchCorrectCover(book).then(url => {
    const cover = elements.bookModalContent.querySelector('.book-detail-cover img');
    if (url && cover) cover.src = url;
  });

  elements.bookModal.style.display = 'block';
  elements.bookModal.scrollTop = 0;
}

// Depois de favoritar/marcar como lido, atualiza o que estiver aberto
function refreshAfterListChange() {
  renderReadingProgress();
  if (state.currentScreen === 'library' && elements.libraryBooks.children.length > 0) {
    filterLibraryBooks();
  }
}

async function shareBook(book) {
  const pt = state.currentLanguage === 'pt';
  const url = bookLink(book);
  const text = pt
    ? `📚 Olha esse livro que achei no Ache seu Livro: "${book.title}", de ${book.author}.`
    : `📚 Mira este libro que encontré en Ache seu Livro: "${book.title}", de ${book.author}.`;

  if (navigator.share) {
    try {
      await navigator.share({ title: book.title, text, url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // a pessoa cancelou
    }
  }
  const copied = await copyText(`${text} ${url}`);
  alert(copied
    ? (pt ? 'Link do livro copiado!' : '¡Enlace del libro copiado!')
    : url);
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.error('Erro ao copiar com a área de transferência:', e);
  }
  try {
    const temp = document.createElement('textarea');
    temp.value = text;
    temp.setAttribute('readonly', '');
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    document.body.appendChild(temp);
    temp.select();
    const ok = document.execCommand('copy');
    temp.remove();
    return ok;
  } catch (e) {
    console.error('Erro ao copiar:', e);
    return false;
  }
}

// ===== Tela inicial: livro da semana e progresso de leitura =====
function getBookOfTheWeek() {
  const candidates = booksDatabase
    .filter(book => book.available && (book.popularity || 0) >= 7)
    .sort((a, b) => a.id - b.id);
  if (candidates.length === 0) return null;
  // Muda toda semana, e é o mesmo livro pra todo mundo na mesma semana
  const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return candidates[week % candidates.length];
}

function renderBookOfTheWeek() {
  const container = elements.bookOfWeek;
  if (!container) return;
  const book = getBookOfTheWeek();
  if (!book) {
    container.style.display = 'none';
    return;
  }

  container.innerHTML = `
    <img src="${escapeHtml(book.cover || PLACEHOLDER_COVER)}" alt="Capa do livro: ${escapeHtml(book.title)}"
         onerror="this.onerror=null;this.src='assets/sem-capa.svg'">
    <div class="book-of-week-info">
      <span class="book-of-week-label"><i class="fas fa-star"></i> Livro da semana</span>
      <h3>${escapeHtml(book.title)}</h3>
      <p>${escapeHtml(book.author)}</p>
      <span class="book-of-week-link">Ver detalhes <i class="fas fa-arrow-right"></i></span>
    </div>
  `;
  container.onclick = () => showBookModal(book.id);
  container.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      showBookModal(book.id);
    }
  };

  fetchCorrectCover(book).then(url => {
    const img = container.querySelector('img');
    if (url && img) img.src = url;
  });
}

function renderReadingProgress() {
  const container = elements.readingProgress;
  if (!container) return;
  const readCount = getReadBooks().filter(id => findBookById(id)).length;
  const favCount = getFavorites().filter(id => findBookById(id)).length;

  if (readCount === 0 && favCount === 0) {
    container.innerHTML = '<i class="fas fa-book-open"></i> Abra um livro e marque "Já li" para acompanhar suas leituras aqui.';
    return;
  }

  const parts = [];
  if (readCount > 0) parts.push(`<strong>${readCount}</strong> livro${readCount > 1 ? 's' : ''} lido${readCount > 1 ? 's' : ''}`);
  if (favCount > 0) parts.push(`<strong>${favCount}</strong> favorito${favCount > 1 ? 's' : ''}`);
  container.innerHTML = `<i class="fas fa-trophy"></i> Sua estante: ${parts.join(' · ')} — <a href="#" id="openMyListLink">ver minha lista</a>`;

  document.getElementById('openMyListLink').addEventListener('click', (e) => {
    e.preventDefault();
    showLibraryScreen();
    resetLibraryFilters();
    const option = document.getElementById(readCount > 0 ? 'readFilterOption' : 'favoritesFilterOption');
    if (option) {
      option.classList.add('selected');
      updateLibraryFilters();
    }
  });
}

const genreTranslations = {
  pt: {
    "drama": "drama", "comedia": "comédia", "autoajuda": "autoajuda", "psicologia": "psicologia",
    "poesia": "poesia", "classico": "clássico", "romance": "romance", "social": "social",
    "infantil": "infantil", "filosofia": "filosofia", "distopia": "distopia", "politica": "política",
    "aventura": "aventura", "humor": "humor", "realismo": "realismo", "conto": "conto",
    "existencialismo": "existencialismo", "naturalismo": "naturalismo", "indianismo": "indianismo",
    "gotico": "gótico", "teatro": "teatro", "tragedia": "tragédia", "satira": "sátira",
    "memoir": "memórias", "guerra": "guerra", "ficcao-cientifica": "ficção científica", "fantasia": "fantasia",
    "historico": "histórico", "biografia": "biografia", "tecnologia": "tecnologia", "ecologia": "ecologia",
    "matematica": "matemática", "fisica": "física", "medico": "médico", "jornalismo": "jornalismo",
    "quadrinhos": "quadrinhos", "educativo": "educativo", "cultura": "cultura", "mitologia": "mitologia",
    "pre-modernismo": "pré-modernismo", "modernismo": "modernismo", "barroco": "barroco",
    "parnasianismo": "parnasianismo", "romantismo": "romantismo",
    "psicologico": "psicológico", "ficcao": "ficção", "ciencia": "ciência", "esporte": "esporte",
    "regionalismo": "regionalismo", "historia": "história", "ensaio": "ensaio", "epico": "épico",
    "terror": "terror", "crime": "crime", "realismo-magico": "realismo mágico", "familiar": "família"
  },
  es: {
    "drama": "drama", "comedia": "comedia", "autoajuda": "autoayuda", "psicologia": "psicología",
    "poesia": "poesía", "classico": "clásico", "romance": "romance", "social": "social",
    "infantil": "infantil", "filosofia": "filosofía", "distopia": "distopía", "politica": "política",
    "aventura": "aventura", "humor": "humor", "realismo": "realismo", "conto": "cuento",
    "existencialismo": "existencialismo", "naturalismo": "naturalismo", "indianismo": "indianismo",
    "gotico": "gótico", "teatro": "teatro", "tragedia": "tragedia", "satira": "sátira",
    "memoir": "memorias", "guerra": "guerra", "ficcao-cientifica": "ciencia ficción", "fantasia": "fantasía",
    "historico": "histórico", "biografia": "biografía", "tecnologia": "tecnología", "ecologia": "ecología",
    "matematica": "matemáticas", "fisica": "física", "medico": "médico", "jornalismo": "periodismo",
    "quadrinhos": "cómics", "educativo": "educativo", "cultura": "cultura", "mitologia": "mitología",
    "pre-modernismo": "pre-modernismo", "modernismo": "modernismo", "barroco": "barroco",
    "parnasianismo": "parnasianismo", "romantismo": "romanticismo",
    "psicologico": "psicológico", "ficcao": "ficción", "ciencia": "ciencia", "esporte": "deporte",
    "regionalismo": "regionalismo", "historia": "historia", "ensaio": "ensayo", "epico": "épico",
    "terror": "terror", "crime": "crimen", "realismo-magico": "realismo mágico", "familiar": "familia"
  }
};

// ===== Quiz =====

// Grupos de gêneros mostrados no quiz. Cada grupo junta vários gêneros (e às vezes "vibes")
// dos dados, porque "romance" nos dados quer dizer "livro de ficção", não "história de amor".
const GENRE_GROUPS = {
  fantasia:  { genres: ['fantasia', 'mitologia', 'realismo-magico'] },
  misterio:  { genres: ['crime'], vibes: ['misterio'] },
  scifi:     { genres: ['ficcao-cientifica', 'distopia'] },
  aventura:  { genres: ['aventura', 'epico', 'guerra', 'esporte'], vibes: ['aventura'] },
  amor:      { vibes: ['romantico'] },
  drama:     { genres: ['drama', 'social', 'familiar', 'psicologico', 'ficcao'] },
  terror:    { genres: ['terror', 'gotico'], vibes: ['assustador'] },
  humor:     { genres: ['humor', 'comedia', 'satira'], vibes: ['engracado'] },
  classicos: { genres: ['classico', 'romantismo', 'modernismo', 'realismo', 'naturalismo', 'regionalismo', 'barroco', 'parnasianismo', 'pre-modernismo', 'tragedia'] },
  poesia:    { genres: ['poesia'] },
  teatro:    { genres: ['teatro', 'tragedia', 'comedia'] },
  reais:     { genres: ['biografia', 'memoir', 'historia', 'jornalismo', 'ciencia', 'educativo', 'cultura', 'ecologia', 'matematica', 'tecnologia', 'ensaio', 'filosofia'] },
  juvenil:   { genres: ['infantil', 'quadrinhos'] }
};

// Quando o livro ainda não tem "vibes", usa o campo antigo "mood"
const MOOD_TO_VIBE = {
  emocionar: 'emocionante', surpreender: 'misterio', intrigar: 'misterio', refletir: 'reflexivo',
  rir: 'engracado', divertir: 'engracado', aventura: 'aventura', acalmar: 'leve',
  assustar: 'assustador', perturbar: 'pesado', chocar: 'pesado', inspirar: 'inspirador'
};

function getBookVibes(book) {
  if (Array.isArray(book.vibes) && book.vibes.length > 0) return book.vibes;
  return Array.from(new Set(asArray(book.mood).map(m => MOOD_TO_VIBE[m]).filter(Boolean)));
}

function getBookGroups(book) {
  const genres = asArray(book.genres);
  const vibes = getBookVibes(book);
  return Object.keys(GENRE_GROUPS).filter(key => {
    const group = GENRE_GROUPS[key];
    return (group.genres || []).some(g => genres.includes(g)) ||
           (group.vibes || []).some(v => vibes.includes(v));
  });
}

// Textos que mudam com o idioma
const quizText = {
  pt: {
    groups: {
      fantasia: '🐉 Fantasia e magia', misterio: '🕵️ Mistério e crime', scifi: '🚀 Ficção científica e distopia',
      aventura: '🗺️ Aventura e ação', amor: '💘 Histórias de amor', drama: '🎭 Dramas da vida',
      terror: '👻 Terror', humor: '😂 Humor', classicos: '📜 Clássicos', poesia: '✒️ Poesia',
      teatro: '🎟️ Teatro', reais: '🌍 Histórias reais, ciência e ideias', juvenil: '🧸 Infantojuvenil e HQ'
    },
    vibes: {
      emocionante: 'emocionante', engracado: 'engraçado', assustador: 'assustador', misterio: 'cheio de mistério',
      reflexivo: 'que faz pensar', aventura: 'cheio de aventura', leve: 'leve', pesado: 'intenso',
      romantico: 'romântico', inspirador: 'inspirador'
    },
    lengths: { curto: 'curtinho', medio: 'de tamanho médio', longo: 'daqueles longos' },
    matchLabel: 'a sua cara',
    reasonGroup: 'É de',
    reasonVibe: 'É',
    reasonLiked: 'Parecido com',
    reasonLength: 'É',
    reasonAvailable: 'Disponível no Leia SP',
    topPick: 'Sua melhor combinação',
    details: 'Ver detalhes',
    pickBook: 'Escolha um livro da lista ou pule esta pergunta.',
    searchPlaceholder: 'Digite o nome de um livro ou autor…',
    chosen: 'Escolhido:',
    noMatch: 'Não achei esse livro aqui. Tudo bem, pode pular!',
    remove: 'trocar',
    optionalHint: 'Opcional: pode pular.',
    upTo: n => `Escolha até ${n}.`,
    limit: n => `Você pode escolher até ${n} opções.`,
    pleaseChoose: 'Por favor, selecione uma opção',
    seeResults: 'Ver meus livros',
    next: 'Próximo',
    question: (c, t) => `Pergunta ${c} de ${t}`
  },
  es: {
    groups: {
      fantasia: '🐉 Fantasía y magia', misterio: '🕵️ Misterio y crimen', scifi: '🚀 Ciencia ficción y distopía',
      aventura: '🗺️ Aventura y acción', amor: '💘 Historias de amor', drama: '🎭 Dramas de la vida',
      terror: '👻 Terror', humor: '😂 Humor', classicos: '📜 Clásicos', poesia: '✒️ Poesía',
      teatro: '🎟️ Teatro', reais: '🌍 Historias reales, ciencia e ideas', juvenil: '🧸 Infantil-juvenil y cómic'
    },
    vibes: {
      emocionante: 'emocionante', engracado: 'divertido', assustador: 'aterrador', misterio: 'lleno de misterio',
      reflexivo: 'que te hace pensar', aventura: 'lleno de aventura', leve: 'ligero', pesado: 'intenso',
      romantico: 'romántico', inspirador: 'inspirador'
    },
    lengths: { curto: 'cortito', medio: 'de tamaño medio', longo: 'de los largos' },
    matchLabel: 'tu estilo',
    reasonGroup: 'Es de',
    reasonVibe: 'Es',
    reasonLiked: 'Parecido a',
    reasonLength: 'Es',
    reasonAvailable: 'Disponible en Leia SP',
    topPick: 'Tu mejor combinación',
    details: 'Ver detalles',
    pickBook: 'Elige un libro de la lista o salta esta pregunta.',
    searchPlaceholder: 'Escribe el nombre de un libro o autor…',
    chosen: 'Elegido:',
    noMatch: 'No encontré ese libro aquí. ¡Puedes saltar esta pregunta!',
    remove: 'cambiar',
    optionalHint: 'Opcional: puedes saltarla.',
    upTo: n => `Elige hasta ${n}.`,
    limit: n => `Puedes elegir hasta ${n} opciones.`,
    pleaseChoose: 'Por favor, seleccione una opción',
    seeResults: 'Ver mis libros',
    next: 'Siguiente',
    question: (c, t) => `Pregunta ${c} de ${t}`
  }
};

function t() {
  return quizText[state.currentLanguage] || quizText.pt;
}

// Perguntas do quiz em português e espanhol (mesma ordem e mesmas chaves nos dois idiomas)
const quizQuestions = {
  pt: [
    {
      id: 1, key: 'grade',
      question: '🎒 Em que série você está?',
      options: [
        { value: 'EF1', label: '6° ou 7° ano' },
        { value: 'EF2', label: '8° ou 9° ano' },
        { value: 'EM', label: 'Ensino Médio' },
        { value: 'EM', label: 'Professor(a) / Outro' }
      ]
    },
    {
      id: 2, key: 'groups', multiple: true, maxSelections: 3,
      question: '📚 Que tipo de história te chama?',
      options: Object.keys(GENRE_GROUPS).map(key => ({ value: key, label: quizText.pt.groups[key] }))
    },
    {
      id: 3, key: 'vibes', multiple: true, maxSelections: 3,
      question: '✨ Como você quer se sentir lendo?',
      options: [
        { value: 'emocionante', label: '😢 Emocionado(a)' },
        { value: 'engracado', label: '😂 Rindo alto' },
        { value: 'misterio', label: '🕵️ Curioso(a) pra saber o final' },
        { value: 'aventura', label: '🏹 Na adrenalina' },
        { value: 'romantico', label: '💘 Apaixonado(a)' },
        { value: 'reflexivo', label: '🤔 Pensando na vida' },
        { value: 'leve', label: '🌿 Leve e tranquilo(a)' },
        { value: 'inspirador', label: '💪 Inspirado(a)' },
        { value: 'assustador', label: '😱 Com medo' },
        { value: 'pesado', label: '🤯 Impactado(a), pode ser pesado' }
      ]
    },
    {
      id: 4, key: 'liked', type: 'book-search', optional: true,
      question: '❤️ Qual livro você já leu e amou?'
    },
    {
      id: 5, key: 'length',
      question: '⏱️ Qual tamanho de livro combina com você?',
      options: [
        { value: 'curto', label: '📖 Curtinho, leio aos poucos' },
        { value: 'medio', label: '📚 Médio, tranquilo' },
        { value: 'longo', label: '🧱 Pode ser um tijolão!' },
        { value: 'qualquer', label: '🤷 Tanto faz' }
      ]
    },
    {
      id: 6, key: 'type',
      question: '🌎 Prefere autores do Brasil ou de fora?',
      options: [
        { value: 'brasileira', label: '🇧🇷 Do Brasil' },
        { value: 'estrangeira', label: '🌐 De fora (inclui Portugal)' },
        { value: 'qualquer', label: '📖 Tanto faz' }
      ]
    },
    {
      id: 7, key: 'avoid', multiple: true, optional: true,
      question: '🚫 Tem algo que você NÃO quer de jeito nenhum?',
      options: [
        { value: 'terror', label: '👻 Terror' },
        { value: 'pesado', label: '🌧️ Histórias pesadas ou tristes' },
        { value: 'amor', label: '💔 Romance (história de amor)' },
        { value: 'poesia', label: '✒️ Poesia' },
        { value: 'teatro', label: '🎟️ Teatro' },
        { value: 'longo', label: '🧱 Livros longos' },
        { value: 'classicos', label: '📜 Clássicos antigos' }
      ]
    }
  ],
  es: [
    {
      id: 1, key: 'grade',
      question: '🎒 ¿En qué grado estás?',
      options: [
        { value: 'EF1', label: '6° o 7° grado' },
        { value: 'EF2', label: '8° o 9° grado' },
        { value: 'EM', label: 'Escuela secundaria' },
        { value: 'EM', label: 'Profesor(a) / Otro' }
      ]
    },
    {
      id: 2, key: 'groups', multiple: true, maxSelections: 3,
      question: '📚 ¿Qué tipo de historia te llama?',
      options: Object.keys(GENRE_GROUPS).map(key => ({ value: key, label: quizText.es.groups[key] }))
    },
    {
      id: 3, key: 'vibes', multiple: true, maxSelections: 3,
      question: '✨ ¿Cómo quieres sentirte al leer?',
      options: [
        { value: 'emocionante', label: '😢 Emocionado(a)' },
        { value: 'engracado', label: '😂 Riéndome fuerte' },
        { value: 'misterio', label: '🕵️ Curioso(a) por saber el final' },
        { value: 'aventura', label: '🏹 Con adrenalina' },
        { value: 'romantico', label: '💘 Enamorado(a)' },
        { value: 'reflexivo', label: '🤔 Pensando en la vida' },
        { value: 'leve', label: '🌿 Ligero y tranquilo' },
        { value: 'inspirador', label: '💪 Inspirado(a)' },
        { value: 'assustador', label: '😱 Con miedo' },
        { value: 'pesado', label: '🤯 Impactado(a), puede ser intenso' }
      ]
    },
    {
      id: 4, key: 'liked', type: 'book-search', optional: true,
      question: '❤️ ¿Qué libro ya leíste y te encantó?'
    },
    {
      id: 5, key: 'length',
      question: '⏱️ ¿Qué tamaño de libro va contigo?',
      options: [
        { value: 'curto', label: '📖 Cortito, leo de a poco' },
        { value: 'medio', label: '📚 Mediano, tranquilo' },
        { value: 'longo', label: '🧱 ¡Puede ser un ladrillo!' },
        { value: 'qualquer', label: '🤷 Me da igual' }
      ]
    },
    {
      id: 6, key: 'type',
      question: '🌎 ¿Prefieres autores de Brasil o de fuera?',
      options: [
        { value: 'brasileira', label: '🇧🇷 De Brasil' },
        { value: 'estrangeira', label: '🌐 De fuera (incluye Portugal)' },
        { value: 'qualquer', label: '📖 Me da igual' }
      ]
    },
    {
      id: 7, key: 'avoid', multiple: true, optional: true,
      question: '🚫 ¿Hay algo que NO quieres de ninguna manera?',
      options: [
        { value: 'terror', label: '👻 Terror' },
        { value: 'pesado', label: '🌧️ Historias pesadas o tristes' },
        { value: 'amor', label: '💔 Romance (historia de amor)' },
        { value: 'poesia', label: '✒️ Poesía' },
        { value: 'teatro', label: '🎟️ Teatro' },
        { value: 'longo', label: '🧱 Libros largos' },
        { value: 'classicos', label: '📜 Clásicos antiguos' }
      ]
    }
  ]
};

// Livros para vestibular com descrições completas
const vestibularBooks = {
   fuvest: [
{
  title: "Opúsculo Humanitário",
  author: "Nísia Floresta",
  description: "Publicado em 1853, este ensaio é uma defesa apaixonada pelos direitos das mulheres e pela educação feminina. Nísia Floresta critica a desigualdade de gênero na sociedade brasileira do século XIX, argumentando que a emancipação intelectual das mulheres é essencial para o progresso nacional."
},
{
  title: "Nebulosas",
  author: "Narcisa Amália",
  description: "Considerada uma das primeiras poetisas brasileiras a ganhar destaque, Narcisa Amália publicou 'Nebulosas' em 1872. A obra reúne poemas de tom lírico e melancólico, explorando temas como solidão, amor não correspondido e a condição da mulher na sociedade oitocentista."
},
{
  title: "Memórias de Martha",
  author: "Júlia Lopes de Almeida",
  description: "Romance publicado em 1899 que narra a vida de Martha, uma mulher que reflete sobre suas escolhas e a sociedade que a cerca. A obra aborda temas como casamento, independência feminina e moral burguesa, com uma escrita que antecipa preocupações modernistas."
},
{
  title: "Caminho de pedras",
  author: "Rachel de Queiroz",
  description: "Publicado em 1937, este romance acompanha a vida de uma professora idealista no interior do Nordeste. A obra retrata as dificuldades enfrentadas pelas mulheres que buscavam autonomia em uma sociedade conservadora, mesclando crítica social e um olhar sensível sobre a condição feminina."
},
{
  title: "O Cristo Cigano",
  author: "Sophia de Mello Breyner Andresen",
  description: "Poema narrativo publicado em 1961, que reconta a Paixão de Cristo sob a perspectiva de um cigano marginalizado. A obra reflete sobre temas como injustiça social, exclusão e redenção, com a linguagem lírica e profunda característica da autora."
},
{
  title: "As meninas",
  author: "Lygia Fagundes Telles",
  description: "Romance publicado em 1973, durante a ditadura militar, que acompanha a vida de três jovens universitárias com personalidades distintas. A obra mistura realidade e alucinação, abordando temas como repressão política, sexualidade e busca por identidade."
},
{
  title: "Balada de amor ao vento",
  author: "Paulina Chiziane",
  description: "Primeiro romance publicado por uma mulher em Moçambique (1990), narra a história de amor e desilusão de uma jovem em meio a tradições e conflitos sociais. A obra combina elementos da oralidade africana com uma crítica às estruturas patriarcais."
},
{
  title: "Canção para ninar menino grande",
  author: "Conceição Evaristo",
  description: "Publicado em 2018, este romance aborda a violência urbana e o luto materno a partir da história de um jovem negro assassinado. A narrativa mescla poesia e prosa, explorando memória, dor e resistência na periferia brasileira."
},
{
  title: "A visão das plantas",
  author: "Djaimilia Pereira de Almeida",
  description: "Romance de 2019 que acompanha um imigrante angolano em Lisboa, refletindo sobre colonialismo, pertencimento e envelhecimento. A autora constrói uma narrativa sensível sobre identidades fragmentadas e a relação entre memória e espaço."
}
],
  comvest: [ 
   {
  title: "Casa Velha",
  author: "Machado de Assis",
  description: "Publicado em 1885, este romance de Machado de Assis explora temas como moralidade, hipocrisia social e relações familiares. A história gira em torno de uma casa que simboliza as tensões entre tradição e mudança, com personagens marcados por segredos e conflitos de interesse."
},
{
  title: "Vida e Morte de M.J. Gonzaga de Sá",
  author: "Lima Barreto",
  description: "Romance de 1919 que narra a vida de um burocrata carioca, misturando autobiografia e crítica social. Lima Barreto satiriza a elite brasileira e o sistema político da época, enquanto reflete sobre solidão, alienação e a busca por significado em uma sociedade desigual."
},
{
  title: "Morangos Mofados (contos escolhidos)",
  author: "Caio Fernando Abreu",
  description: "Coletânea de contos publicada em 1982, que retrata a angústia e o desamparo da geração pós-ditadura. Com uma prosa poética e fragmentada, Caio Fernando Abreu aborda temas como solidão urbana, sexualidade, AIDS e a busca por conexão humana em um mundo cada vez mais hostil."
},
{
  title: "Niketche - Uma História de Poligamia",
  author: "Paulina Chiziane",
  description: "Romance moçambicano de 2002 que descreve a trajetória de uma mulher que descobre que seu marido tem várias outras esposas. A obra questiona tradições patriarcais e colonialistas, explorando amor, traição e resistência feminina em uma narrativa que mistura realismo e oralidade africana."
},
{
  title: "Prosas seguidas de odes mínimas",
  author: "José Paulo Paes",
  description: "Coletânea de poemas e prosas poéticas que exploram o cotidiano com sensibilidade e humor. O autor trabalha com linguagem simples mas profundamente poética, abordando temas como a passagem do tempo e as pequenas alegrias da vida."
},
{
  title: "A vida não é útil",
  author: "Ailton Krenak",
  description: "Livro de ensaios publicado em 2020, no qual o líder indígena e pensador critica a visão ocidental de progresso e desenvolvimento. Krenak propõe uma reflexão sobre a relação entre humanos e natureza, defendendo uma vida menos utilitarista e mais integrada ao cosmos."
},
{
  title: "Olhos d'água",
  author: "Conceição Evaristo",
  description: "Coletânea de contos que abordam a realidade da população negra no Brasil, especialmente das mulheres. A autora explora temas como racismo, violência e resistência, com uma escrita potente e cheia de humanidade."
},
{
  title: "No seu pescoço",
  author: "Chimamanda Ngozi Adichie",
  description: "Coletânea de contos publicada em 2017, que retrata a vida de mulheres nigerianas em diferentes contextos — tanto na África quanto na diáspora. Adichie aborda temas como imigração, identidade cultural, sexismo e racismo, com uma narrativa afiada e emocionante."
}
 ],
  enem: [ 
   {
          title: "O Cortiço",
          author: "Aluísio Azevedo",
          description: "Principal obra do Naturalismo brasileiro, que retrata a vida nos cortiços do Rio de Janeiro no século XIX. O romance mostra como o ambiente influencia os personagens, abordando temas como determinismo social, luxúria e ganância."
        },
        {
          title: "Vidas Secas",
          author: "Graciliano Ramos",
          description: "Romance que retrata a vida difícil de uma família de retirantes no Nordeste brasileiro. A obra mostra a luta pela sobrevivência em meio à seca e à pobreza, com uma linguagem seca e objetiva que reflete o ambiente hostil."
        },
        {
          title: "Memórias Póstumas de Brás Cubas",
          author: "Machado de Assis",
          description: "Romance inovador narrado por um defunto autor, que critica a sociedade brasileira do século XIX com ironia fina. A obra marca o início do Realismo no Brasil e questiona valores como hipocrisia social e o sentido da existência."
        },
        {
          title: "Dom Casmurro",
          author: "Machado de Assis",
          description: "Clássico da literatura brasileira que narra a história de Bentinho e Capitu, explorando temas como ciúme, ambiguidade e a natureza da verdade. A obra é famosa por seu narrador não confiável e por deixar em aberto a questão da traição."
        },
        {
          title: "A Hora da Estrela",
          author: "Clarice Lispector",
          description: "Último romance da autora, que conta a história de Macabéa, uma datilógrafa alagoana que vive no Rio de Janeiro. A obra explora temas como a solidão, a insignificância humana e a busca por identidade."
        },
        {
          title: "Capitães da Areia",
          author: "Jorge Amado",
          description: "Romance que retrata a vida de um grupo de meninos de rua em Salvador nos anos 1930. A obra mostra a dura realidade desses jovens, mas também sua solidariedade e desejo de liberdade, com forte crítica social."
        },
        {
          title: "A Moreninha",
          author: "Joaquim Manuel de Macedo",
          description: "Primeiro romance romântico brasileiro, publicado em 1844. Conta a história de amor entre Augusto e Carolina (a Moreninha), com elementos típicos do Romantismo como amor à primeira vista e final feliz."
        },
        {
          title: "O Primo Basílio",
          author: "José Maria Eça de Queirós",
          description: "Romance realista português que critica a burguesia lisboeta do século XIX. A história centra-se no adultério de Luísa e nas consequências de seus atos, mostrando a hipocrisia da sociedade da época."
        },
        {
          title: "Grande Sertão: Veredas",
          author: "João Guimarães Rosa",
          description: "Obra-prima da literatura brasileira que reinventa a linguagem para contar a história de Riobaldo, um ex-jagunço que relembra sua vida no sertão. O livro aborda temas universais como amor, amizade, pacto com o diabo e a busca pelo sentido da vida."
        },
        {
          title: "O Tempo e o Vento",
          author: "Erico Verissimo",
          description: "Trilogia épica que conta a história do Rio Grande do Sul e do Brasil através das gerações da família Terra Cambará. A obra mistura ficção e história, mostrando a formação da identidade gaúcha e brasileira."
        }
]
};

// Informações sobre autores
const authorsInfo = {
  "Machado de Assis": {
    image: "https://upload.wikimedia.org/wikipedia/commons/8/8c/Machado_de_Assis_1905.jpg",
    bio: "Joaquim Maria Machado de Assis (1839-1908) foi um escritor brasileiro, considerado o maior nome da literatura nacional. Fundador da Academia Brasileira de Letras, suas obras como 'Dom Casmurro' e 'Memórias Póstumas de Brás Cubas' são clássicos da literatura mundial."
  },
  "Clarice Lispector": {
    image: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Clarice_Lispector_%281965%29_01.jpg",
    bio: "Clarice Lispector (1920-1977) foi uma escritora e jornalista brasileira nascida na Ucrânia. Conhecida por seu estilo introspectivo e inovador, é autora de obras como 'A Hora da Estrela' e 'Perto do Coração Selvagem'."
  },
  // ... outros autores
};

const elements = {
  homeScreen: document.getElementById('home-screen'),
  statsScreen: document.getElementById('stats-screen'),
  quizScreen: document.getElementById('quiz-screen'),
  resultScreen: document.getElementById('result-screen'),
  libraryScreen: document.getElementById('library-screen'),
  questionText: document.getElementById('questionText'),
  questionHint: document.getElementById('questionHint'),
  optionsContainer: document.getElementById('optionsContainer'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  questionIndicator: document.getElementById('questionIndicator'),
  resultTitle: document.getElementById('resultTitle'),
  resultEyebrow: document.getElementById('resultEyebrow'),
  topPick: document.getElementById('topPick'),
  resultsGrid: document.getElementById('resultsGrid'),
  moreResultsTitle: document.getElementById('moreResultsTitle'),
  onlyAvailableToggle: document.getElementById('onlyAvailableToggle'),
  onlyAvailableLabel: document.getElementById('onlyAvailableLabel'),
  vestibularBtn: document.getElementById('vestibularBtn'),
  homeVestibularBtn: document.getElementById('homeVestibularBtn'),
  shareBtn: document.getElementById('shareBtn'),
  restartBtn: document.getElementById('restartBtn'),
  vestibularModal: document.getElementById('vestibularModal'),
  fallbackBooks: document.getElementById('fallbackBooks'),
  fallbackBooksList: document.getElementById('fallbackBooksList'),
  exploreBtn: document.getElementById('exploreBtn'),
  startQuizBtn: document.getElementById('startQuizBtn'),
  libraryBtn: document.getElementById('libraryBtn'),
  backToHomeBtn: document.getElementById('backToHomeBtn'),
  startFromStatsBtn: document.getElementById('startFromStatsBtn'),
  backToHomeFromResults: document.getElementById('backToHomeFromResults'),
  backToHomeFromLibrary: document.getElementById('backToHomeFromLibrary'),
  moreBooksBtn: document.getElementById('moreBooksBtn'),
  topBooksList: document.querySelector('.top-books'),
  shareModal: document.getElementById('shareModal'),
  shareableLink: document.getElementById('shareableLink'),
  shareMessage: document.getElementById('shareMessage'),
  qrCodeContainer: document.getElementById('qrCodeContainer'),
  breadcrumbs: document.getElementById('breadcrumbs'),
  brandLink: document.getElementById('brandLink'),
  loadingResults: document.getElementById('loadingResults'),
  resultsContent: document.getElementById('resultsContent'),
  authorModal: document.getElementById('authorModal'),
  authorModalContent: document.getElementById('authorModalContent'),
  librarySearch: document.getElementById('librarySearch'),
  genreFilters: document.getElementById('genreFilters'),
  libraryBooks: document.getElementById('libraryBooks'),
  resultsCount: document.getElementById('resultsCount'),
  pagination: document.getElementById('pagination'),
  bookModal: document.getElementById('bookModal'),
  bookModalTitle: document.getElementById('bookModalTitle'),
  bookModalContent: document.getElementById('bookModalContent'),
  bookOfWeek: document.getElementById('bookOfWeek'),
  readingProgress: document.getElementById('readingProgress'),
  nativeShareBtn: document.getElementById('nativeShareBtn')
};

// Estado da aplicação
const state = {
  currentLanguage: 'pt',
  currentQuestion: 0,
  answers: {},
  answerOption: {},
  recommendations: [],
  lastFilters: null,
  displayedBooksCount: 8,
  lastRecommendedBook: null,
  currentScreen: 'home'
};

// Função para pré-processar os dados (executar uma vez no carregamento)
function preprocessData() {
  // Criar índice de gêneros para busca mais rápida
  booksDatabase.forEach((book, index) => {
    if (book.genres) {
      asArray(book.genres).forEach(genre => {
        if (!genreIndex[genre]) genreIndex[genre] = [];
        genreIndex[genre].push(index);
      });
    }
  });
  
  debugLog("Dados pré-processados para otimização");
}

// Inicialização
function init() {
  try {
    setupEventListeners();
  } catch (e) {
    console.error('Erro ao configurar os botões da página:', e);
  }

  try {
    updateBreadcrumbs();
  } catch (e) {
    console.error('Erro ao atualizar navegação:', e);
  }

  try {
    preprocessData(); // Adicionar esta linha para pré-processar os dados
  } catch (e) {
    console.error('Erro ao pré-processar os dados dos livros:', e);
  }

  try {
    renderBookOfTheWeek();
    renderReadingProgress();
  } catch (e) {
    console.error('Erro ao montar a tela inicial:', e);
  }

  // Link compartilhado de um livro: ?livro=123 abre os detalhes dele
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('livro')) {
      showBookModal(urlParams.get('livro'));
    }
  } catch (e) {
    console.error('Erro ao ler parâmetros da URL:', e);
  }

  // Permite instalar o site no celular e abrir sem internet
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(e => {
      console.error('Erro ao registrar o service worker:', e);
    });
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Botões da tela inicial
  elements.exploreBtn.addEventListener('click', showStatsScreen);
  elements.startQuizBtn.addEventListener('click', () => {
    state.currentLanguage = 'pt'; // Padrão para português
    startQuiz();
  });
  elements.libraryBtn.addEventListener('click', showLibraryScreen);
  
  elements.brandLink.addEventListener('click', goToHomeScreen);
  elements.homeVestibularBtn.addEventListener('click', showVestibularModal);

  // Quiz em espanhol
  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentLanguage = btn.dataset.lang;
      startQuiz();
    });
  });
  
  // Navegação do quiz
  elements.nextBtn.addEventListener('click', goToNextQuestion);
  elements.prevBtn.addEventListener('click', goToPreviousQuestion);
  
  // Botões de resultado
  elements.vestibularBtn.addEventListener('click', showVestibularModal);
  elements.shareBtn.addEventListener('click', showShareModal);
  elements.restartBtn.addEventListener('click', restartQuiz);
  elements.backToHomeFromResults.addEventListener('click', goToHomeScreen);
  elements.backToHomeFromLibrary.addEventListener('click', goToHomeScreen);
  
  // Botão de mais recomendações e filtro "só Leia SP"
  elements.moreBooksBtn.addEventListener('click', loadMoreBooks);
  elements.onlyAvailableToggle.addEventListener('change', () => {
    state.displayedBooksCount = 8;
    renderResults();
  });
  
  // Navegação da tela de estatísticas
  elements.backToHomeBtn.addEventListener('click', goToHomeScreen);
  elements.startFromStatsBtn.addEventListener('click', () => {
    state.currentLanguage = 'pt';
    startQuiz();
  });
  
  // Fechar modais
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
    });
  });
  
  // Fechar modal ao clicar fora
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });

  // Fechar modal com a tecla Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
      });
    }
  });

  // Abas do modal de vestibular (configuradas uma vez só)
  setupVestibularTabs();

  // Botão de compartilhar do próprio celular (só aparece se o navegador suportar)
  if (elements.nativeShareBtn) {
    if (navigator.share) {
      elements.nativeShareBtn.style.display = 'flex';
      elements.nativeShareBtn.addEventListener('click', async () => {
        try {
          await navigator.share({
            title: 'Ache seu livro',
            text: elements.shareMessage.value,
            url: generateShareableLink()
          });
        } catch (e) {
          if (e.name !== 'AbortError') console.error('Erro ao compartilhar:', e);
        }
      });
    } else {
      elements.nativeShareBtn.style.display = 'none';
    }
  }

  // Lazy loading para imagens
  setupLazyLoading();
}

// Configurar filtros da biblioteca
function setupLibraryEventListeners() {
  // Event listeners para filtros de gênero
  elements.genreFilters.querySelectorAll('.filter-option').forEach(option => {
    option.addEventListener('click', function() {
      this.classList.toggle('selected');
      updateLibraryFilters();
    });
  });
  
  // Event listeners para disponibilidade
  document.querySelectorAll('.filter-option[data-availability]').forEach(option => {
    option.addEventListener('click', function() {
      document.querySelectorAll('.filter-option[data-availability]').forEach(opt => {
        opt.classList.remove('selected');
      });
      this.classList.add('selected');
      updateLibraryFilters();
    });
  });
  
  // Event listeners para faixa etária
  document.querySelectorAll('.filter-option[data-grade]').forEach(option => {
    option.addEventListener('click', function() {
      document.querySelectorAll('.filter-option[data-grade]').forEach(opt => {
        opt.classList.remove('selected');
      });
      this.classList.add('selected');
      updateLibraryFilters();
    });
  });
  
  // Event listeners para filtros de favoritos e de livros lidos
  ['favoritesFilterOption', 'readFilterOption'].forEach(id => {
    const option = document.getElementById(id);
    if (option) {
      option.addEventListener('click', function() {
        this.classList.toggle('selected');
        updateLibraryFilters();
      });
    }
  });

  // Event listeners para ordenação
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.sort-btn').forEach(b => {
        b.classList.remove('active');
      });
      this.classList.add('active');
      updateLibraryFilters();
    });
  });
  
  // Event listener para busca
  elements.librarySearch.addEventListener('input', debounce(function() {
    updateLibraryFilters();
  }, 300));
}





// Configurar lazy loading para imagens
function setupLazyLoading() {
  const lazyImages = [].slice.call(document.querySelectorAll("img.lazy"));

  function loadImage(lazyImage) {
    lazyImage.src = lazyImage.dataset.src;

    // Remove classe de loading do container
    lazyImage.parentElement.classList.remove("loading");

    // Adiciona classe quando carregar
    lazyImage.onload = function() {
      lazyImage.classList.add("loaded");
    };

    // Fallback para erro
    lazyImage.onerror = function() {
      this.src = PLACEHOLDER_COVER;
      this.parentElement.classList.remove("loading");
    };

    // Busca a capa correta na API do Open Library em segundo plano
    // (o ID salvo no books-data.js às vezes aponta pra capa errada)
    try {
      const bookId = lazyImage.dataset.bookId;
      if (bookId) {
        const book = findBookById(bookId);
        if (book) {
          fetchCorrectCover(book).then(correctUrl => {
            if (correctUrl && correctUrl !== lazyImage.src) {
              lazyImage.src = correctUrl;
            }
          });
        }
      }
    } catch (e) {
      console.error('Erro ao tentar corrigir capa:', e);
    }
  }

  if ("IntersectionObserver" in window) {
    let lazyImageObserver = new IntersectionObserver(function(entries, observer) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          loadImage(entry.target);
          lazyImageObserver.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: "100px", // Carrega 100px antes de entrar na viewport
      threshold: 0.01
    });

    lazyImages.forEach(function(lazyImage) {
      lazyImageObserver.observe(lazyImage);
    });
  } else {
    // Fallback para navegadores sem IntersectionObserver
    lazyImages.forEach(loadImage);
  }
}

// Atualizar breadcrumbs
function updateBreadcrumbs() {
  elements.breadcrumbs.innerHTML = '';
  
  // Sempre começa com Home
  const homeCrumb = document.createElement('a');
  homeCrumb.href = '#';
  homeCrumb.textContent = 'Início';
  homeCrumb.addEventListener('click', goToHomeScreen);
  elements.breadcrumbs.appendChild(homeCrumb);
  
  // Adiciona outras páginas conforme a navegação
  // (com appendChild: usar innerHTML += apagava o clique do link "Home")
  const screenNames = {
    stats: 'Mais amados',
    quiz: 'Quiz',
    results: 'Resultados',
    library: 'Biblioteca'
  };
  const name = screenNames[state.currentScreen];
  if (name) {
    const separator = document.createElement('span');
    separator.textContent = ' > ';
    elements.breadcrumbs.appendChild(separator);
    const crumb = document.createElement('span');
    crumb.textContent = name;
    elements.breadcrumbs.appendChild(crumb);
  }
}

// Navegação entre telas
function goToHomeScreen(e) {
  if (e && e.preventDefault) e.preventDefault();
  document.querySelector('.screen.active').classList.remove('active');
  elements.homeScreen.classList.add('active');
  state.currentLanguage = 'pt';
  state.currentScreen = 'home';
  updateBreadcrumbs();
  renderReadingProgress();
}

function showStatsScreen() {
  document.querySelector('.screen.active').classList.remove('active');
  elements.statsScreen.classList.add('active');
  updateStatsScreen();
  state.currentScreen = 'stats';
  updateBreadcrumbs();
}


// Atualizar tela de estatísticas
function updateStatsScreen() {
  // 1. Gerar gráfico de gêneros mais populares
  generateGenreChart();
  
  // 2. Mostrar livros mais populares
  displayTopBooks();
}

// Gerar gráfico de gêneros
let genreChartInstance = null;

function generateGenreChart() {
  const ctx = document.createElement('canvas');
  ctx.id = 'genreChart';
  document.querySelector('.stats-chart').innerHTML = '';
  document.querySelector('.stats-chart').appendChild(ctx);
  
  // Contar ocorrências de cada gênero
  const genreCounts = {};
  booksDatabase.forEach(book => {
    if (book.genres) {
      asArray(book.genres).forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + (book.popularity || 5);
      });
    }
  });
  
  // Ordenar e pegar os top 5
  const sortedGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const labels = sortedGenres.map(([genre]) => genreTranslations[state.currentLanguage][genre] || genre);
  const data = sortedGenres.map(([_, count]) => count);
  
  // Destruir gráfico anterior se existir
  // (não dá pra usar window.genreChart: o navegador já usa esse nome pro <canvas id="genreChart">)
  if (genreChartInstance) {
    genreChartInstance.destroy();
  }
  
  genreChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: state.currentLanguage === 'pt' ? 'Popularidade' : 'Popularidad',
        data: data,
        backgroundColor: [
          'rgba(75, 192, 192, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

// Mostrar livros mais populares - VERSÃO CORRIGIDA
function displayTopBooks() {
  elements.topBooksList.innerHTML = '';
  
  // Ordenar livros por popularidade
  const topBooks = [...booksDatabase]
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 10);
  
  topBooks.forEach(book => {
    elements.topBooksList.appendChild(createBookCard(book));
  });
  
  // Configurar lazy loading para as novas imagens
  setupLazyLoading();
}

// Começar o quiz
function startQuiz() {
  document.querySelector('.screen.active').classList.remove('active');
  elements.quizScreen.classList.add('active');
  state.currentQuestion = 0;
  state.answers = {};
  loadQuestion(state.currentQuestion);
  state.currentScreen = 'quiz';
  updateBreadcrumbs();
  window.scrollTo(0, 0);
}

function getQuestions() {
  return quizQuestions[state.currentLanguage] || quizQuestions.pt;
}

// A pergunta já foi respondida o suficiente para seguir?
function isAnswered(question) {
  const answer = state.answers[question.key];
  if (question.optional) return true;
  if (question.multiple) return Array.isArray(answer) && answer.length > 0;
  return answer !== undefined && answer !== null && answer !== '';
}

function updateNavButtons(index) {
  const questions = getQuestions();
  const question = questions[index];
  const isLast = index === questions.length - 1;
  elements.prevBtn.disabled = index === 0;
  elements.nextBtn.disabled = !isAnswered(question);
  elements.nextBtn.innerHTML = isLast
    ? `${t().seeResults} <i class="fas fa-book-open"></i>`
    : `${t().next} <i class="fas fa-arrow-right"></i>`;
}

// Carregar pergunta
function loadQuestion(index) {
  const questions = getQuestions();
  const question = questions[index];

  updateProgress(index + 1, questions.length);
  updateQuestionIndicator(index, questions.length);

  elements.questionText.textContent = question.question;
  const hints = [];
  if (question.maxSelections) hints.push(t().upTo(question.maxSelections));
  if (question.optional) hints.push(t().optionalHint);
  elements.questionHint.textContent = hints.join(' ');
  elements.optionsContainer.innerHTML = '';
  elements.optionsContainer.className = 'options';

  if (question.type === 'book-search') {
    renderBookSearchQuestion(question, index);
  } else {
    renderOptionsQuestion(question, index);
  }

  updateNavButtons(index);
}

function renderOptionsQuestion(question, index) {
  const questions = getQuestions();
  elements.optionsContainer.classList.add(question.options.length > 5 ? 'options-grid' : 'options-list');

  question.options.forEach((option, optionIndex) => {
    const optionElement = document.createElement('div');
    optionElement.className = 'option';
    optionElement.dataset.value = option.value;

    const input = document.createElement('input');
    input.type = question.multiple ? 'checkbox' : 'radio';
    input.name = `answer-${question.id}`;
    input.id = `option-${question.id}-${optionIndex}`;
    input.value = option.value;

    // Marcar se já foi respondido (no "Professor/Outro" o valor repete, então guarda qual opção foi clicada)
    const answer = state.answers[question.key];
    if (question.multiple) {
      input.checked = Array.isArray(answer) && answer.includes(option.value);
    } else {
      input.checked = answer === option.value && state.answerOption?.[question.key] === optionIndex;
    }
    if (input.checked) optionElement.classList.add('selected');

    const label = document.createElement('label');
    label.htmlFor = input.id;
    label.textContent = option.label;

    optionElement.appendChild(input);
    optionElement.appendChild(label);

    optionElement.addEventListener('click', (e) => {
      // Clique direto na caixinha: o navegador já marcou/desmarcou sozinho.
      // Clique no texto ou no cartão: impede o clique duplicado do <label> e alterna aqui.
      const clickedInput = e.target === input;
      if (!clickedInput) e.preventDefault();

      if (question.multiple) {
        if (!clickedInput) input.checked = !input.checked;

        // Respeita o limite ("Escolha até 3")
        if (input.checked && question.maxSelections) {
          const checkedCount = elements.optionsContainer.querySelectorAll('input:checked').length;
          if (checkedCount > question.maxSelections) {
            input.checked = false;
            alert(t().limit(question.maxSelections));
            return;
          }
        }

        optionElement.classList.toggle('selected', input.checked);
        state.answers[question.key] = Array.from(
          elements.optionsContainer.querySelectorAll('input:checked')
        ).map(el => el.value);
      } else {
        elements.optionsContainer.querySelectorAll('input').forEach(other => { other.checked = false; });
        elements.optionsContainer.querySelectorAll('.option').forEach(other => other.classList.remove('selected'));
        input.checked = true;
        optionElement.classList.add('selected');
        state.answers[question.key] = option.value;
        state.answerOption = { ...(state.answerOption || {}), [question.key]: optionIndex };
      }

      updateQuestionIndicator(index, questions.length);
      updateNavButtons(index);
    });

    elements.optionsContainer.appendChild(optionElement);
  });
}

// Pergunta "Qual livro você já leu e amou?": busca na lista de livros
function renderBookSearchQuestion(question, index) {
  const wrapper = document.createElement('div');
  wrapper.className = 'book-search';

  const chosenId = state.answers[question.key];
  const chosenBook = chosenId ? findBookById(chosenId) : null;

  if (chosenBook) {
    wrapper.innerHTML = `
      <div class="book-search-chosen">
        <img src="${escapeHtml(chosenBook.cover || PLACEHOLDER_COVER)}" alt="" onerror="this.onerror=null;this.src='assets/sem-capa.svg'">
        <div>
          <small>${t().chosen}</small>
          <strong>${escapeHtml(chosenBook.title)}</strong>
          <span>${escapeHtml(chosenBook.author)}</span>
        </div>
        <button type="button" class="btn btn-ghost btn-small" id="clearLikedBtn">${t().remove}</button>
      </div>`;
    elements.optionsContainer.appendChild(wrapper);
    document.getElementById('clearLikedBtn').addEventListener('click', () => {
      delete state.answers[question.key];
      loadQuestion(index);
    });
    return;
  }

  wrapper.innerHTML = `
    <div class="search-container">
      <i class="fas fa-search"></i>
      <input type="search" id="likedBookSearch" autocomplete="off" placeholder="${escapeHtml(t().searchPlaceholder)}" aria-label="${escapeHtml(t().searchPlaceholder)}">
    </div>
    <p class="book-search-help">${t().pickBook}</p>
    <div class="book-search-results" id="likedBookResults"></div>`;
  elements.optionsContainer.appendChild(wrapper);

  const input = document.getElementById('likedBookSearch');
  const results = document.getElementById('likedBookResults');

  const render = () => {
    const term = normalizeText(input.value.trim());
    results.innerHTML = '';
    if (term.length < 2) return;

    const matches = booksDatabase
      .filter(book => normalizeText(book.title).includes(term) || normalizeText(book.author).includes(term))
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 6);

    if (matches.length === 0) {
      results.innerHTML = `<p class="book-search-empty">${t().noMatch}</p>`;
      return;
    }

    matches.forEach(book => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'book-search-item';
      item.innerHTML = `<strong>${escapeHtml(book.title)}</strong><span>${escapeHtml(book.author)}</span>`;
      item.addEventListener('click', () => {
        state.answers[question.key] = book.id;
        loadQuestion(index);
      });
      results.appendChild(item);
    });
  };

  input.addEventListener('input', debounce(render, 150));
  setTimeout(() => input.focus({ preventScroll: true }), 50);
}

// Atualizar indicador de perguntas
function updateQuestionIndicator(currentIndex, totalQuestions) {
  const questions = getQuestions();
  elements.questionIndicator.innerHTML = '';

  for (let i = 0; i < totalQuestions; i++) {
    const dot = document.createElement('div');
    dot.className = 'question-dot';

    const answer = state.answers[questions[i].key];
    const hasAnswer = Array.isArray(answer) ? answer.length > 0 : answer !== undefined;
    if (i === currentIndex) {
      dot.classList.add('active');
    } else if (hasAnswer) {
      dot.classList.add('answered');
    }

    elements.questionIndicator.appendChild(dot);
  }
}

// Atualizar barra de progresso
function updateProgress(current, total) {
  elements.progressBar.style.width = `${(current / total) * 100}%`;
  elements.progressText.textContent = t().question(current, total);
}

// Navegação
function goToNextQuestion() {
  const questions = getQuestions();
  const question = questions[state.currentQuestion];

  if (!isAnswered(question)) {
    alert(t().pleaseChoose);
    return;
  }

  if (state.currentQuestion < questions.length - 1) {
    state.currentQuestion++;
    loadQuestion(state.currentQuestion);
    elements.quizScreen.scrollIntoView({ block: 'start' });
  } else {
    showResults();
  }
}

function goToPreviousQuestion() {
  if (state.currentQuestion > 0) {
    state.currentQuestion--;
    loadQuestion(state.currentQuestion);
  }
}

// ===== Sistema de recomendação =====
//
// Cada livro ganha pontos em partes (o máximo de cada parte está em SCORE_MAX):
//  - tipo de história (grupos) e sensação (vibes) são as partes que mais pesam;
//  - "livro que você amou" puxa livros parecidos com ele;
//  - tamanho e série ajustam;
//  - popularidade e Leia SP só desempatam.
// O que a pessoa disse que NÃO quer, livros que ela já marcou como lidos e livros fora da série saem da lista.
const SCORE_MAX = { groups: 30, vibes: 25, liked: 25, length: 8, grade: 8, popularity: 3, available: 1 };

const LENGTH_ORDER = ['curto', 'medio', 'longo'];
const GRADE_ORDER = ['EF1', 'EF2', 'EM'];

// "J.K. Rowling" e "J. K. Rowling" são a mesma pessoa
function authorKey(author) {
  return normalizeText(author).replace(/[^a-z0-9]/g, '');
}

function jaccard(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let common = 0;
  setA.forEach(item => { if (setB.has(item)) common++; });
  return common / (setA.size + setB.size - common);
}

// Quão parecidos dois livros são (0 a 1)
function bookSimilarity(a, b) {
  return 0.35 * jaccard(getBookGroups(a), getBookGroups(b)) +
         0.35 * jaccard(getBookVibes(a), getBookVibes(b)) +
         0.15 * jaccard(asArray(a.genres), asArray(b.genres)) +
         0.15 * (authorKey(a.author) === authorKey(b.author) ? 1 : 0);
}

// Número estável a partir de um texto (pra desempatar sem ser sempre na mesma ordem)
function stableHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function isAvoided(book, avoid) {
  if (!avoid || avoid.length === 0) return false;
  const groups = getBookGroups(book);
  const vibes = getBookVibes(book);
  const genres = asArray(book.genres);
  return avoid.some(item => {
    switch (item) {
      case 'terror': return groups.includes('terror');
      case 'pesado': return vibes.includes('pesado') || vibes.includes('assustador');
      case 'amor': return vibes.includes('romantico');
      case 'poesia': return genres.includes('poesia');
      case 'teatro': return genres.includes('teatro') || genres.includes('tragedia');
      case 'longo': return book.tamanho === 'longo';
      case 'classicos': return groups.includes('classicos') && asArray(book.time).includes('passado');
      default: return false;
    }
  });
}

function fitsGrade(book, grade) {
  const grades = asArray(book.grade);
  if (!grade || grades.length === 0) return true;
  // 6°-7° ano não recebe livro só de Ensino Médio
  if (grade === 'EF1') return !grades.every(g => g === 'EM');
  return true;
}

function scoreBook(book, filters) {
  const parts = {};
  const max = {};
  const bookGroups = getBookGroups(book);
  const bookVibes = getBookVibes(book);

  if (filters.groups.length > 0) {
    const matched = filters.groups.filter(g => bookGroups.includes(g));
    parts.groups = SCORE_MAX.groups * (matched.length / filters.groups.length);
    max.groups = SCORE_MAX.groups;
  }

  if (filters.vibes.length > 0) {
    const matched = filters.vibes.filter(v => bookVibes.includes(v));
    parts.vibes = SCORE_MAX.vibes * (matched.length / filters.vibes.length);
    max.vibes = SCORE_MAX.vibes;
  }

  if (filters.likedBook) {
    parts.liked = SCORE_MAX.liked * bookSimilarity(book, filters.likedBook);
    max.liked = SCORE_MAX.liked;
  }

  if (filters.length && filters.length !== 'qualquer') {
    const wanted = LENGTH_ORDER.indexOf(filters.length);
    const actual = LENGTH_ORDER.indexOf(book.tamanho);
    if (actual === -1) parts.length = SCORE_MAX.length * 0.5; // tamanho desconhecido: meio-termo
    else if (actual === wanted) parts.length = SCORE_MAX.length;
    else if (Math.abs(actual - wanted) === 1) parts.length = SCORE_MAX.length * 0.4;
    else parts.length = 0;
    max.length = SCORE_MAX.length;
  }

  if (filters.grade) {
    const grades = asArray(book.grade);
    const wanted = GRADE_ORDER.indexOf(filters.grade);
    const distance = grades.length === 0
      ? 1
      : Math.min(...grades.map(g => Math.abs(GRADE_ORDER.indexOf(g) - wanted)));
    parts.grade = distance === 0 ? SCORE_MAX.grade : distance === 1 ? SCORE_MAX.grade * 0.5 : 0;
    max.grade = SCORE_MAX.grade;
  }

  parts.popularity = SCORE_MAX.popularity * ((book.popularity || 5) / 10);
  max.popularity = SCORE_MAX.popularity;
  parts.available = book.available ? SCORE_MAX.available : 0;
  max.available = SCORE_MAX.available;

  const score = Object.values(parts).reduce((sum, value) => sum + value, 0);
  const maxScore = Object.values(max).reduce((sum, value) => sum + value, 0);
  return { score, match: maxScore > 0 ? score / maxScore : 0, parts };
}

function getRecommendationReasons(book, filters) {
  const text = t();
  const reasons = [];
  const bookGroups = getBookGroups(book);
  const bookVibes = getBookVibes(book);

  const groups = filters.groups.filter(g => bookGroups.includes(g));
  if (groups.length > 0) {
    reasons.push(`${text.reasonGroup} ${groups.map(g => text.groups[g].replace(/^\S+\s/, '').toLowerCase()).join(' + ')}`);
  }

  const vibes = filters.vibes.filter(v => bookVibes.includes(v));
  if (vibes.length > 0) {
    reasons.push(`${text.reasonVibe} ${vibes.map(v => text.vibes[v]).join(', ')}`);
  }

  if (filters.likedBook && bookSimilarity(book, filters.likedBook) >= 0.35) {
    reasons.push(`${text.reasonLiked} "${filters.likedBook.title}"`);
  }

  if (filters.length && filters.length !== 'qualquer' && book.tamanho === filters.length) {
    reasons.push(`${text.reasonLength} ${text.lengths[book.tamanho]}`);
  }

  if (book.available) reasons.push(text.reasonAvailable);
  return reasons;
}

// Reordena para não vir uma lista só do mesmo autor ou do mesmo tipo de livro
function diversify(scored, limit) {
  const pool = [...scored];
  const picked = [];
  const authorCount = {};
  const groupCount = {};

  while (pool.length > 0 && picked.length < limit) {
    let bestIndex = 0;
    let bestValue = -Infinity;
    pool.forEach((item, i) => {
      const sameAuthor = authorCount[authorKey(item.book.author)] || 0;
      const groups = getBookGroups(item.book);
      const sameGroups = groups.length ? Math.min(...groups.map(g => groupCount[g] || 0)) : 0;
      const value = item.score - sameAuthor * 10 - sameGroups * 0.8;
      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    });
    const [item] = pool.splice(bestIndex, 1);
    picked.push(item);
    authorCount[authorKey(item.book.author)] = (authorCount[authorKey(item.book.author)] || 0) + 1;
    getBookGroups(item.book).forEach(g => { groupCount[g] = (groupCount[g] || 0) + 1; });
  }
  return picked;
}

function buildFilters() {
  const answers = state.answers;
  return {
    grade: answers.grade,
    groups: asArray(answers.groups),
    vibes: asArray(answers.vibes),
    likedBook: answers.liked ? findBookById(answers.liked) : null,
    length: answers.length,
    type: answers.type || 'qualquer',
    avoid: asArray(answers.avoid)
  };
}

function getRecommendedBooks(filters) {
  const readIds = getReadBooks();
  const seedKey = JSON.stringify(filters, (key, value) => key === 'likedBook' ? (value && value.id) : value);

  const candidatesFor = (options) => booksDatabase.filter(book =>
    (!filters.likedBook || book.id !== filters.likedBook.id) &&
    !readIds.includes(book.id) &&
    !isAvoided(book, filters.avoid) &&
    fitsGrade(book, filters.grade) &&
    (options.ignoreType || matchesType(book, filters.type))
  );

  let candidates = candidatesFor({});
  // Se sobrar pouca coisa, aceita autores de qualquer lugar (mas nunca o que a pessoa disse que NÃO quer)
  if (candidates.length < 8) {
    const extra = candidatesFor({ ignoreType: true }).filter(book => !candidates.includes(book));
    candidates = candidates.concat(extra);
  }

  const scored = candidates.map(book => {
    const result = scoreBook(book, filters);
    // Desempate mínimo e estável (muda conforme as respostas)
    result.score += stableHash(`${seedKey}#${book.id}`) * 0.01;
    return { book, ...result };
  }).sort((a, b) => b.score - a.score);

  return diversify(scored, 60);
}

// Mostrar resultados
function showResults() {
  document.querySelector('.screen.active').classList.remove('active');
  elements.resultScreen.classList.add('active');
  state.currentScreen = 'results';
  updateBreadcrumbs();
  window.scrollTo(0, 0);

  elements.loadingResults.style.display = 'block';
  elements.resultsContent.style.display = 'none';

  setTimeout(() => {
    try {
      const filters = buildFilters();
      state.lastFilters = filters;
      state.recommendations = getRecommendedBooks(filters);
      state.displayedBooksCount = 8;
      state.lastRecommendedBook = state.recommendations[0] ? state.recommendations[0].book : null;

      const pt = state.currentLanguage === 'pt';
      elements.resultTitle.textContent = pt ? 'Livros recomendados para você' : 'Libros recomendados para ti';
      elements.resultEyebrow.textContent = pt ? 'Garimpamos a estante pra você' : 'Buscamos en la estantería para ti';
      elements.moreResultsTitle.textContent = pt ? 'Mais livros com a sua cara' : 'Más libros con tu estilo';
      elements.onlyAvailableLabel.textContent = pt ? 'Só os do Leia SP' : 'Solo los de Leia SP';
      elements.onlyAvailableToggle.checked = false;

      renderResults();
    } catch (error) {
      console.error('Erro ao calcular recomendações do quiz:', error);
      elements.resultTitle.textContent = state.currentLanguage === 'pt'
        ? 'Ops! Algo deu errado ao gerar suas recomendações.'
        : '¡Ups! Algo salió mal al generar tus recomendaciones.';
      elements.topPick.innerHTML = '';
      elements.resultsGrid.innerHTML = '';
      elements.fallbackBooks.style.display = 'block';
      displayBooks(fallbackBooks, elements.fallbackBooksList);
    }

    elements.loadingResults.style.display = 'none';
    elements.resultsContent.style.display = 'block';
  }, 250);
}

function renderResults() {
  const filters = state.lastFilters;
  const onlyAvailable = elements.onlyAvailableToggle.checked;
  const list = (state.recommendations || []).filter(item => !onlyAvailable || item.book.available);

  if (list.length === 0) {
    elements.topPick.innerHTML = '';
    elements.resultsGrid.innerHTML = '';
    elements.fallbackBooks.style.display = 'block';
    const fallbackMessage = elements.fallbackBooks.querySelector('.no-books-message');
    if (fallbackMessage) {
      fallbackMessage.textContent = state.currentLanguage === 'pt'
        ? 'Não encontramos livros que se encaixem perfeitamente no seu gosto, mas aqui estão algumas excelentes recomendações para qualquer leitor:'
        : 'No encontramos libros que se ajusten perfectamente a tus gustos, pero aquí hay algunas excelentes recomendaciones para cualquier lector:';
    }
    displayBooks(fallbackBooks, elements.fallbackBooksList);
    elements.moreBooksBtn.style.display = 'none';
    return;
  }

  elements.fallbackBooks.style.display = 'none';
  renderTopPick(list[0], filters);

  const rest = list.slice(1, 1 + state.displayedBooksCount);
  elements.resultsGrid.innerHTML = '';
  rest.forEach(item => {
    const reasons = getRecommendationReasons(item.book, filters);
    elements.resultsGrid.appendChild(createBookCard(item.book, {
      reason: reasons[0],
      hideDescription: true
    }));
  });
  setupLazyLoading();

  elements.moreBooksBtn.style.display = list.length > 1 + state.displayedBooksCount ? 'flex' : 'none';
}

function matchPercent(match) {
  return Math.max(1, Math.min(99, Math.round(match * 100)));
}

function renderTopPick(item, filters) {
  const book = item.book;
  const text = t();
  const reasons = getRecommendationReasons(book, filters);

  elements.topPick.innerHTML = `
    <div class="top-pick-cover">
      <img src="${escapeHtml(book.cover || PLACEHOLDER_COVER)}" alt="Capa do livro: ${escapeHtml(book.title)}"
           onerror="this.onerror=null;this.src='assets/sem-capa.svg'">
      <span class="match-stamp"><strong>${matchPercent(item.match)}%</strong>${escapeHtml(text.matchLabel)}</span>
    </div>
    <div class="top-pick-info">
      <p class="eyebrow">${escapeHtml(text.topPick)}</p>
      <h3>${escapeHtml(book.title)}</h3>
      <p class="top-pick-author">${escapeHtml(book.author)}</p>
      <ul class="reason-list">${reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
      ${book.description ? `<p class="top-pick-description">${escapeHtml(book.description)}</p>` : ''}
      <div class="top-pick-actions">
        <button class="btn btn-primary" id="topPickDetailsBtn"><i class="fas fa-book-open"></i> ${escapeHtml(text.details)}</button>
        ${favoriteButtonHtml(book.id)}
      </div>
    </div>
  `;

  document.getElementById('topPickDetailsBtn').addEventListener('click', () => showBookModal(book.id));
  fetchCorrectCover(book).then(url => {
    const img = elements.topPick.querySelector('.top-pick-cover img');
    if (url && img) img.src = url;
  });
}

// Carregar mais livros
function loadMoreBooks() {
  state.displayedBooksCount += 8;
  renderResults();
}

// Exibir livros na tela
function displayBooks(books, container) {
  container.innerHTML = '';

  if (books.length === 0) {
    container.innerHTML = '<p class="no-books">' +
      (state.currentLanguage === 'pt' ? 'Nenhum livro encontrado' : 'No se encontraron libros') +
      '</p>';
    return;
  }

  books.forEach(book => {
    container.appendChild(createBookCard(book));
  });

  // Ativa o lazy loading para as novas imagens
  setupLazyLoading();
}

// Mostrar modal de autor
function showAuthorModal(authorName) {
  const author = authorsInfo[authorName];
  if (!author) return;
  
  elements.authorModalContent.innerHTML = `
    <div class="author-info">
      <img src="${author.image}" alt="${authorName}" class="author-image">
      <div class="author-details">
        <h3 class="author-name">${authorName}</h3>
        <p class="author-bio">${author.bio}</p>
      </div>
    </div>
  `;
  
  elements.authorModal.style.display = 'block';
}

// Mostrar modal de livros para vestibular
function showVestibularModal() {
  elements.vestibularModal.style.display = 'block';
  
  // Preencher com os livros
  fillVestibularList('fuvest');
  fillVestibularList('comvest');
  fillVestibularList('enem');
}

// Avisos de cada aba: as listas mudam de um ano pro outro
const vestibularNotes = {
  fuvest: 'As leituras obrigatórias mudam com o tempo. Confira sempre a lista oficial no site da <a href="https://www.fuvest.br" target="_blank" rel="noopener">Fuvest</a>.',
  comvest: 'As leituras obrigatórias mudam com o tempo. Confira sempre a lista oficial no site da <a href="https://www.comvest.unicamp.br" target="_blank" rel="noopener">Comvest</a>.',
  enem: 'O ENEM não tem lista oficial de leituras obrigatórias. Estes são clássicos que costumam ajudar na prova.'
};

function fillVestibularList(type) {
  const container = document.getElementById(type);
  container.innerHTML = '';

  if (vestibularNotes[type]) {
    const note = document.createElement('p');
    note.className = 'vestibular-note';
    note.innerHTML = `<i class="fas fa-info-circle"></i> ${vestibularNotes[type]}`;
    container.appendChild(note);
  }

  const books = vestibularBooks[type];
  const list = document.createElement('ul');
  list.className = 'vestibular-list';
  
  books.forEach(book => {
    const item = document.createElement('li');
    item.innerHTML = `
      <strong>${book.title}</strong> - ${book.author}<br>
      <p class="book-description">${book.description}</p>
    `;
    list.appendChild(item);
  });
  
  container.appendChild(list);
}

function setupVestibularTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remover classe active de todas as tabs
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // Adicionar classe active à tab clicada
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });
}

// Mostrar modal de compartilhamento
function showShareModal() {
  elements.shareModal.style.display = 'block';
  
  // Gerar QR Code
  const shareUrl = generateShareableLink();
  document.getElementById('shareableLink').value = shareUrl;
  
  // Atualizar mensagem com o livro recomendado
  const shareMessage = document.getElementById('shareMessage');
  if (state.lastRecommendedBook) {
    shareMessage.value = state.currentLanguage === 'pt' 
      ? `📚 O quiz recomendou "${state.lastRecommendedBook.title}" para mim! Faça o teste e descubra seu próximo livro favorito: ${shareUrl}`
      : `📚 ¡El quiz recomendó "${state.lastRecommendedBook.title}" para mí! Haz la prueba y descubre tu próximo libro favorito: ${shareUrl}`;
  } else {
    shareMessage.value = state.currentLanguage === 'pt' 
      ? `📚 Descubra seu próximo livro favorito com este quiz de recomendação: ${shareUrl}`
      : `📚 Descubre tu próximo libro favorito con este quiz de recomendación: ${shareUrl}`;
  }
  
  // Gerar QR Code
  try {
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    qrCodeContainer.innerHTML = '';
    const qrCanvas = document.createElement('canvas');
    qrCodeContainer.appendChild(qrCanvas);
    QRCode.toCanvas(qrCanvas, shareUrl, { width: 200 }, (error) => {
      if (error) console.error('Erro ao gerar QR Code:', error);
    });
  } catch (e) {
    console.error('Erro ao gerar QR Code (biblioteca indisponível?):', e);
  }
}

// Gerar link compartilhável
function generateShareableLink() {
  return SITE_URL;
}

// Copiar link para área de transferência
async function copyLink() {
  const copied = await copyText(document.getElementById('shareableLink').value);

  alert(copied
    ? (state.currentLanguage === 'pt' ? 'Link copiado para a área de transferência!' : '¡Enlace copiado al portapapeles!')
    : (state.currentLanguage === 'pt' ? 'Não deu para copiar. Selecione o link e copie manualmente.' : 'No se pudo copiar. Selecciona el enlace y cópialo manualmente.'));
}

// Compartilhar no WhatsApp
function shareOnWhatsApp() {
  const shareUrl = generateShareableLink();
  const bookTitle = state.lastRecommendedBook ? `"${state.lastRecommendedBook.title}"` : "um livro incrível";
  
  const message = state.currentLanguage === 'pt' 
    ? `📚 O quiz recomendou ${bookTitle} para mim! Faça o teste e descubra seu próximo livro favorito: ${shareUrl}`
    : `📚 ¡El quiz recomendó ${bookTitle} para mí! Haz la prueba y descubre tu próximo libro favorito: ${shareUrl}`;
  
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

// Compartilhar no Twitter
function shareOnTwitter() {
  const shareUrl = generateShareableLink();
  const bookTitle = state.lastRecommendedBook ? `"${state.lastRecommendedBook.title}"` : "um livro incrível";
  
  const message = state.currentLanguage === 'pt' 
    ? `📚 Descobri ${bookTitle} com este quiz de recomendações literárias! Faça você também: ${shareUrl}`
    : `📚 ¡Descubrí ${bookTitle} con este quiz de recomendaciones literarias! Pruébalo tú también: ${shareUrl}`;
  
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, '_blank');
}

// Compartilhar no Facebook
function shareOnFacebook() {
  const shareUrl = generateShareableLink();
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
}

// Compartilhar no Instagram
function shareOnInstagram() {
  alert(state.currentLanguage === 'pt' 
    ? 'Copie o link e compartilhe diretamente no Instagram!' 
    : '¡Copia el enlace y comparte directamente en Instagram!');
  copyLink();
}

// Reiniciar quiz
function restartQuiz() {
  startQuiz();
}

// Iniciar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', init);

const libraryState = {
  currentPage: 1,
  itemsPerPage: 12,
  totalPages: 1,
  filters: {
    search: '',
    genres: [],
    availability: 'all',
    grade: 'all',
    sort: 'popularity'
  }
};

// Inicialização da biblioteca
function initLibrary() {
  // Preencher filtros de gênero
  const allGenres = Array.from(new Set(booksDatabase.flatMap(book => asArray(book.genres))))
    .sort((a, b) => (genreTranslations.pt[a] || a).localeCompare(genreTranslations.pt[b] || b));
  
  elements.genreFilters.innerHTML = '';
  allGenres.forEach(genre => {
    const option = document.createElement('div');
    option.className = 'filter-option';
    option.dataset.genre = genre;
    option.textContent = genreTranslations.pt[genre] || genre;
    elements.genreFilters.appendChild(option);
  });
  
  // Configurar event listeners
  setupLibraryEventListeners();
  
  // Atualizar filtros iniciais
  updateLibraryFilters();
}
// Debounce para busca
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Atualizar filtros
function updateLibraryFilters() {
  debugLog("Atualizando filtros...");
  
  // Obter filtros selecionados
  libraryState.filters.search = normalizeText(elements.librarySearch.value.trim());
  
  // CORREÇÃO COMPLETA: Obter gêneros selecionados
  libraryState.filters.genres = [];
  const genreOptions = elements.genreFilters.querySelectorAll('.filter-option');
  
  genreOptions.forEach(option => {
    if (option.classList.contains('selected') && option.dataset.genre) {
      libraryState.filters.genres.push(option.dataset.genre);
    }
  });
  
  debugLog("Gêneros selecionados:", libraryState.filters.genres);
  
  // Obter disponibilidade selecionada
  const availabilityOptions = document.querySelectorAll('.filter-option[data-availability]');
  libraryState.filters.availability = 'all';
  
  availabilityOptions.forEach(option => {
    if (option.classList.contains('selected') && option.dataset.availability) {
      libraryState.filters.availability = option.dataset.availability;
    }
  });
  
  // Obter faixa etária selecionada
  const gradeOptions = document.querySelectorAll('.filter-option[data-grade]');
  libraryState.filters.grade = 'all';
  
  gradeOptions.forEach(option => {
    if (option.classList.contains('selected') && option.dataset.grade) {
      libraryState.filters.grade = option.dataset.grade;
    }
  });
  
  // Obter filtro de favoritos
  const favoritesFilterOption = document.getElementById('favoritesFilterOption');
  libraryState.filters.favoritesOnly = !!(favoritesFilterOption && favoritesFilterOption.classList.contains('selected'));
  const readFilterOption = document.getElementById('readFilterOption');
  libraryState.filters.readOnly = !!(readFilterOption && readFilterOption.classList.contains('selected'));

  // Obter ordenação selecionada
  const sortOptions = document.querySelectorAll('.sort-btn');
  libraryState.filters.sort = 'popularity';
  
  sortOptions.forEach(option => {
    if (option.classList.contains('active') && option.dataset.sort) {
      libraryState.filters.sort = option.dataset.sort;
    }
  });
  
  debugLog("Filtros aplicados:", libraryState.filters);
  
  // Resetar para a primeira página
  libraryState.currentPage = 1;
  
  // Atualizar resultados
  filterLibraryBooks();
}

function filterLibraryBooks() {
  try {
    filterLibraryBooksUnsafe();
  } catch (e) {
    console.error('Erro ao filtrar a biblioteca:', e);
    if (elements.resultsCount) elements.resultsCount.textContent = 'Não foi possível carregar os livros. Tente recarregar a página.';
    if (elements.libraryBooks) elements.libraryBooks.innerHTML = '';
  }
}

function filterLibraryBooksUnsafe() {
  debugLog("Filtrando livros com:", libraryState.filters);
  
  let filtered = [...booksDatabase];
  
  // Aplicar filtro de busca
  if (libraryState.filters.search) {
    const searchTerm = libraryState.filters.search;
    filtered = filtered.filter(book => 
      normalizeText(book.title).includes(searchTerm) ||
      normalizeText(book.author).includes(searchTerm) ||
      normalizeText(book.description).includes(searchTerm)
    );
  }
  
  // CORREÇÃO COMPLETA: Aplicar filtro de gênero
  if (libraryState.filters.genres && libraryState.filters.genres.length > 0) {
    filtered = filtered.filter(book => {
      // Verifica se o livro tem PELO MENOS UM dos gêneros selecionados
      return asArray(book.genres).some(bookGenre => 
        libraryState.filters.genres.includes(bookGenre)
      );
    });
  }
  
  // Aplicar filtro de favoritos
  if (libraryState.filters.favoritesOnly) {
    const favs = getFavorites();
    filtered = filtered.filter(book => favs.includes(book.id));
  }

  // Aplicar filtro de livros lidos
  if (libraryState.filters.readOnly) {
    const readIds = getReadBooks();
    filtered = filtered.filter(book => readIds.includes(book.id));
  }

  // Aplicar filtro de disponibilidade
  if (libraryState.filters.availability !== 'all') {
    filtered = filtered.filter(book => 
      libraryState.filters.availability === 'available' ? book.available : !book.available
    );
  }
  
  // Aplicar filtro de faixa etária
  if (libraryState.filters.grade !== 'all') {
    filtered = filtered.filter(book => asArray(book.grade).includes(libraryState.filters.grade));
  }
  
  // Aplicar ordenação
  switch (libraryState.filters.sort) {
    case 'title':
      filtered.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
      break;
    case 'author':
      filtered.sort((a, b) => a.author.localeCompare(b.author, 'pt-BR'));
      break;
    case 'popularity':
    default:
      filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      break;
  }
  
  debugLog("Livros filtrados:", filtered.length);
  
  // Calcular paginação
  libraryState.totalPages = Math.ceil(filtered.length / libraryState.itemsPerPage);
  
  // Obter livros para a página atual
  const startIndex = (libraryState.currentPage - 1) * libraryState.itemsPerPage;
  const endIndex = startIndex + libraryState.itemsPerPage;
  const paginatedBooks = filtered.slice(startIndex, endIndex);
  
  // Atualizar contador de resultados
  elements.resultsCount.textContent = filtered.length === 1 ? '1 livro encontrado' : `${filtered.length} livros encontrados`;
  
  // Exibir livros
  displayLibraryBooks(paginatedBooks);
  
  // Atualizar paginação
  updatePagination();
}

// Exibir livros
function displayLibraryBooks(books) {
  elements.libraryBooks.innerHTML = '';
  
  if (books.length === 0) {
    elements.libraryBooks.innerHTML = `
      <div class="no-books">
        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 15px; color: #ccc;"></i>
        <p>Nenhum livro encontrado com os filtros selecionados.</p>
        <button class="action-btn" onclick="resetLibraryFilters()" style="margin-top: 15px;">
          <i class="fas fa-redo"></i> Limpar Filtros
        </button>
      </div>
    `;
    return;
  }
  
  books.forEach(book => {
    elements.libraryBooks.appendChild(createBookCard(book));
  });
  
  setupLazyLoading();
}

// Paginação
function updatePagination() {
  elements.pagination.innerHTML = '';
  
  if (libraryState.totalPages <= 1) return;
  
  if (libraryState.currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.addEventListener('click', () => {
      libraryState.currentPage--;
      filterLibraryBooks();
      scrollToLibraryResults();
    });
    elements.pagination.appendChild(prevBtn);
  }
  
  const startPage = Math.max(1, libraryState.currentPage - 2);
  const endPage = Math.min(libraryState.totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `pagination-btn ${i === libraryState.currentPage ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => {
      libraryState.currentPage = i;
      filterLibraryBooks();
      scrollToLibraryResults();
    });
    elements.pagination.appendChild(pageBtn);
  }
  
  if (libraryState.currentPage < libraryState.totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.addEventListener('click', () => {
      libraryState.currentPage++;
      filterLibraryBooks();
      scrollToLibraryResults();
    });
    elements.pagination.appendChild(nextBtn);
  }
}

function scrollToLibraryResults() {
  const target = elements.resultsCount;
  if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Resetar filtros
function resetLibraryFilters() {
  elements.librarySearch.value = '';
  
  // Desmarca tudo antes (antes ficavam duas opções marcadas ao mesmo tempo)
  document.querySelectorAll('#library-screen .filter-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
  
  document.querySelector('.filter-option[data-availability="all"]').classList.add('selected');
  document.querySelector('.filter-option[data-grade="all"]').classList.add('selected');
  document.querySelector('.sort-btn[data-sort="popularity"]').classList.add('active');
  
  updateLibraryFilters();
}

// Mostrar biblioteca
function showLibraryScreen() {
  document.querySelector('.screen.active').classList.remove('active');
  elements.libraryScreen.classList.add('active');
  state.currentScreen = 'library';
  updateBreadcrumbs();
  
  if (elements.libraryBooks.children.length === 0) {
    initLibrary();
  }
}
