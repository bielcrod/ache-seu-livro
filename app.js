    // Extrair todos os gêneros únicos do banco de dados
 let precomputedScores = {};
let genreIndex = {};
let lastFilters = null;
let cachedResults = null;

// Extrair todos os gêneros únicos do banco de dados
const allGenres = Array.from(new Set(
  booksDatabase.flatMap(book => book.genres || [])
    .concat(fallbackBooks.flatMap(book => book.genres || []))
)).filter(Boolean);

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
    "parnasianismo": "parnasianismo", "romantismo": "romantismo"
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
    "parnasianismo": "parnasianismo", "romantismo": "romanticismo"
  }
};

// Perguntas do quiz em português e espanhol
const quizQuestions = {
  pt: [
    {
      id: 1,
      question: "📚 Qual sua série?",
      options: [
        { value: "EF1", label: "6° ou 7° ano" },
        { value: "EF2", label: "8° ou 9° ano" },
        { value: "EM", label: "Ensino Médio" },
        { value: "EM", label: "Professor/Outro" }
      ],
      filterKey: "grade",
      weight: 15 // Peso maior para esta pergunta
    },
    {
      id: 2,
      question: "🌎 Qual tipo de literatura prefere?",
      options: [
        { value: "brasileira", label: "🇧🇷 Brasileira" },
        { value: "estrangeira", label: "🌐 Estrangeira" },
        { value: "qualquer", label: "📖 Qualquer uma" }
      ],
      filterKey: "type",
      weight: 15
    },
    {
      id: 3,
      question: "📖 Quais gêneros você mais gosta? (Selecione até 4)",
      options: allGenres.map(genre => ({
        value: genre,
        label: genreTranslations.pt[genre] || genre
      })),
      filterKey: "genres",
      multiple: true,
      weight: 30 // Maior peso para gêneros
    },
    {
      id: 4,
      question: "📖 Que tipo de experiência você busca? (Selecione até 3)",
      options: [
        { value: "emocionar", label: "😢 Emoção/Drama" },
        { value: "surpreender", label: "😲 Mistério/Suspense" },
        { value: "refletir", label: "🤔 Reflexão" },
        { value: "rir", label: "😂 Comédia" },
        { value: "aventura", label: "🏹 Ação/Aventura" },
        { value: "acalmar", label: "🌿 Leve/Relaxante" },
        { value: "assustar", label: "😨 Terror" },
        { value: "perturbar", label: "🤯 Intenso/Pesado" },
        { value: "divertir", label: "😊 Entretenimento" },
        { value: "inspirar", label: "🧠 Superação" }
      ],
      filterKey: "mood",
      multiple: true,
      weight: 30
    },
    {
      id: 5,
      question: "⏳ Prefere histórias que se passam no:",
      options: [
        { value: "presente", label: "📅 Presente" },
        { value: "passado", label: "🏺 Passado" },
        { value: "futuro", label: "🚀 Futuro" },
        { value: "todos", label: "🌈 Qualquer época" }
      ],
      filterKey: "time",
      weight: 10 // Menor peso para esta pergunta
    }
  ],
  es: [
   {
      id: 1,
      question: "📚 ¿Cuál es tu grado escolar?",
      options: [
        { value: "EF1", label: "6° o 7° grado" },
        { value: "EF2", label: "8° o 9° grado" },
        { value: "EM", label: "Escuela secundaria" },
        { value: "EM", label: "Profesor/Otro" }
      ],
      filterKey: "grade"
    },
    {
      id: 2,
      question: "🌎 ¿Qué tipo de literatura prefieres?",
      options: [
        { value: "brasileira", label: "🇧🇷 Brasileña" },
        { value: "estrangeira", label: "🌐 Extranjera" },
        { value:  "qualquer", label: "📖 Cualquiera" }
      ],
      filterKey: "type"
    },
    {
      id: 3,
      question: "📖 ¿Qué géneros te gustan más? (Selecciona hasta 4)",
      options: allGenres.map(genre => ({
        value: genre,
        label: genreTranslations.es[genre] || genre
      })),
      filterKey: "genres",
      multiple: true
    },
    {
      id: 4,
      question: "📖 ¿Qué tipo de experiencia buscas? (Selecciona hasta 3)",
      options: [
        { value: "emocionar", label: "😢 Emoción/Drama" },
        { value: "surpreender", label: "😲 Misterio/Suspenso" },
        { value: "refletir", label: "🤔 Reflexión" },
        { value: "rir", label: "😂 Comedia" },
        { value: "aventura", label: "🏹 Acción/Aventura" },
        { value: "acalmar", label: "🌿 Lectura ligera" },
        { value: "assustar", label: "😨 Terror" },
        { value: "perturbar", label: "🤯 Intenso" },
        { value: "divertir", label: "😊 Entretenimiento" },
        { value: "inspirar", label: "🧠 Superación" }
      ],
      filterKey: "mood",
      multiple: true
    },
    {
      id: 5,
      question: "⏳ ¿Prefieres historias que ocurren en el:",
      options: [
        { value: "presente", label: "📅 Presente" },
        { value: "passado", label: "🏺 Pasado" },
        { value: "futuro", label: "🚀 Futuro" },
        { value: "todos", label: "🌈 Cualquier época" }
      ],
      filterKey: "time"
    }
  ]
};

// Livros para vestibular com descrições completas
const vestibularBooks = {
   fuvest: [
{
  title: "Opúsculo Humanitário",
  author: "Nísia Floresta",
  description: "Publicado em 1853, este ensaio é uma defesa apaixonada pelos direitos das mulheres e pela educação feminina. Nísia Floresta critica a desigualdade de gênero na sociedade brasileira do século XIX, argumentando que a emancipación intelectual das mulheres é essencial para o progresso nacional."
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
  description: "Publicado em 2018, este romance aborda a violência urbana e o luto materno a partir da história de um jovem negro assassinado. A narrativa mescla poesia e prosa, explorando memória, dolor e resistência na periferia brasileira."
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
  quizForm: document.getElementById('quizForm'),
  questionText: document.getElementById('questionText'),
  optionsContainer: document.getElementById('optionsContainer'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  progressBar: document.getElementById('progressBar'),
  progressText: document.getElementById('progressText'),
  questionIndicator: document.getElementById('questionIndicator'),
  resultTitle: document.getElementById('resultTitle'),
  availableBooks: document.getElementById('availableBooks'),
  unavailableBooks: document.getElementById('unavailableBooks'),
  vestibularBtn: document.getElementById('vestibularBtn'),
  shareBtn: document.getElementById('shareBtn'),
  restartBtn: document.getElementById('restartBtn'),
  vestibularModal: document.getElementById('vestibularModal'),
  closeModal: document.querySelectorAll('.close-modal'),
  langButtons: document.querySelectorAll('.lang-btn'),
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
  homeBreadcrumb: document.getElementById('homeBreadcrumb'),
  loadingResults: document.getElementById('loadingResults'),
  resultsContent: document.getElementById('resultsContent'),
  authorModal: document.getElementById('authorModal'),
  authorModalContent: document.getElementById('authorModalContent'),
  librarySearch: document.getElementById('librarySearch'),
  genreFilters: document.getElementById('genreFilters'),
  libraryBooks: document.getElementById('libraryBooks'),
  resultsCount: document.getElementById('resultsCount'),
  pagination: document.getElementById('pagination')
};

// Estado da aplicação
const state = {
  currentLanguage: 'pt',
  currentQuestion: 0,
  answers: [],
  filteredBooks: [],
  displayedBooksCount: 6,
  lastRecommendedBook: null,
  currentScreen: 'home',
  breadcrumbs: {
    home: { name: 'Home', element: elements.homeBreadcrumb }
  },
};

// Função para pré-processar os dados (executar uma vez no carregamento)
function preprocessData() {
  // Criar índice de gêneros para busca mais rápida
  booksDatabase.forEach((book, index) => {
    if (book.genres) {
      book.genres.forEach(genre => {
        if (!genreIndex[genre]) genreIndex[genre] = [];
        genreIndex[genre].push(index);
      });
    }
  });
  
  console.log("Dados pré-processados para otimização");
}

// Inicialização
function init() {
  setupEventListeners();
  loadRandomBackground();
  updateBreadcrumbs();
  preprocessData(); // Adicionar esta linha para pré-processar os dados
  
  // Verificar se há parâmetros na URL para compartilhamento
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('source') && urlParams.get('source') === 'shared') {
    // Pode adicionar lógica especial para quando o usuário vem de um link compartilhado
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
  
  // Botões de idioma
  document.querySelectorAll('.home-btn[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentLanguage = btn.dataset.lang;
      if (document.getElementById('stats-screen').classList.contains('active')) {
        updateStatsScreen();
      } else {
        startQuiz();
      }
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
  
  // Botão de mais recomendações
  elements.moreBooksBtn.addEventListener('click', loadMoreBooks);
  
  // Navegação da tela de estatísticas
  elements.backToHomeBtn.addEventListener('click', goToHomeScreen);
  elements.startFromStatsBtn.addEventListener('click', () => {
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

  if ("IntersectionObserver" in window) {
    let lazyImageObserver = new IntersectionObserver(function(entries, observer) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          let lazyImage = entry.target;
          lazyImage.src = lazyImage.dataset.src;
          
          // Remove classe de loading do container
          lazyImage.parentElement.classList.remove("loading");
          
          // Adiciona classe quando carregar
          lazyImage.onload = function() {
            lazyImage.classList.add("loaded");
          };
          
          // Fallback para erro
          lazyImage.onerror = function() {
            this.src = 'https://via.placeholder.com/150x200?text=Sem+Capa';
            this.parentElement.classList.remove("loading");
          };
          
          lazyImageObserver.unobserve(lazyImage);
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
    lazyImages.forEach(function(lazyImage) {
      lazyImage.src = lazyImage.dataset.src;
      lazyImage.onerror = function() {
        this.src = 'https://via.placeholder.com/150x200?text=Sem+Capa';
      };
    });
  }
}

// Atualizar breadcrumbs
function updateBreadcrumbs() {
  elements.breadcrumbs.innerHTML = '';
  
  // Sempre começa com Home
  const homeCrumb = document.createElement('a');
  homeCrumb.href = '#';
  homeCrumb.textContent = 'Home';
  homeCrumb.addEventListener('click', goToHomeScreen);
  elements.breadcrumbs.appendChild(homeCrumb);
  
  // Adiciona outras páginas conforme a navegação
  if (state.currentScreen === 'stats') {
    elements.breadcrumbs.innerHTML += ' <span>></span> ';
    const statsCrumb = document.createElement('span');
    statsCrumb.textContent = 'Livros Populares';
    elements.breadcrumbs.appendChild(statsCrumb);
  } else if (state.currentScreen === 'quiz') {
    elements.breadcrumbs.innerHTML += ' <span>></span> ';
    const quizCrumb = document.createElement('span');
    quizCrumb.textContent = 'Quiz';
    elements.breadcrumbs.appendChild(quizCrumb);
  } else if (state.currentScreen === 'results') {
    elements.breadcrumbs.innerHTML += ' <span>></span> ';
    const resultsCrumb = document.createElement('span');
    resultsCrumb.textContent = 'Resultados';
    elements.breadcrumbs.appendChild(resultsCrumb);
  } else if (state.currentScreen === 'library') {
    elements.breadcrumbs.innerHTML += ' <span>></span> ';
    const libraryCrumb = document.createElement('span');
    libraryCrumb.textContent = 'Biblioteca';
    elements.breadcrumbs.appendChild(libraryCrumb);
  }
}

// Navegação entre telas
function goToHomeScreen() {
  document.querySelector('.screen.active').classList.remove('active');
  elements.homeScreen.classList.add('active');
  loadRandomBackground();
  state.currentScreen = 'home';
  updateBreadcrumbs();
}

function showStatsScreen() {
  elements.homeScreen.classList.remove('active');
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
function generateGenreChart() {
  const ctx = document.createElement('canvas');
  ctx.id = 'genreChart';
  document.querySelector('.stats-chart').innerHTML = '';
  document.querySelector('.stats-chart').appendChild(ctx);
  
  // Contar ocorrências de cada gênero
  const genreCounts = {};
  booksDatabase.forEach(book => {
    if (book.genres) {
      book.genres.forEach(genre => {
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
  if (window.genreChart) {
    window.genreChart.destroy();
  }
  
  window.genreChart = new Chart(ctx, {
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
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card fade-in';
    
    bookCard.innerHTML = `
      <div class="book-cover loading">
        <img class="lazy" 
             data-src="${book.cover || 'https://via.placeholder.com/150x200?text=Sem+Capa'}" 
             alt="Capa do livro: ${book.title}"
             onerror="this.onerror=null;this.src='https://via.placeholder.com/150x200?text=Sem+Capa'">
      </div>
      <div class="book-info">
        <h4 class="book-title">${book.title}</h4>
        <p class="book-author">${book.author}</p>
        ${book.description ? `<p class="book-description">${book.description}</p>` : ''}
        <div class="book-meta">
          <span>${book.grade === 'EF1' ? '6°-7° ano' : book.grade === 'EF2' ? '8°-9° ano' : 'Ensino Médio'}</span>
          ${book.available ? '<span class="available-badge">Disponível</span>' : '<span class="unavailable-badge">Indisponível</span>'}
        </div>
      </div>
    `;
    
    elements.topBooksList.appendChild(bookCard);
  });
  
  // Configurar lazy loading para as novas imagens
  setupLazyLoading();
}

// Começar o quiz
function startQuiz() {
  document.querySelector('.screen.active').classList.remove('active');
  elements.quizScreen.classList.add('active');
  state.currentQuestion = 0;
  state.answers = [];
  loadQuestion(state.currentQuestion);
  state.currentScreen = 'quiz';
  updateBreadcrumbs();
}

// Carregar pergunta
function loadQuestion(index) {
  const questions = quizQuestions[state.currentLanguage];
  const question = questions[index];
  
  // Atualizar progresso
  updateProgress(index + 1, questions.length);
  
  // Atualizar indicador de perguntas
  updateQuestionIndicator(index, questions.length);
  
  // Exibir pergunta
  elements.questionText.textContent = question.question;
  elements.optionsContainer.innerHTML = '';
  
  // Adicionar opções
  question.options.forEach(option => {
    const optionElement = document.createElement('div');
    optionElement.className = 'option';
    optionElement.dataset.value = option.value;
    
    const input = document.createElement('input');
    input.type = question.multiple ? 'checkbox' : 'radio';
    input.name = question.multiple ? `answer-${question.id}` : 'answer';
    input.id = `option-${option.value}-${question.id}`;
    input.value = option.value;
    
    // Marcar se já foi respondido
    if (state.answers[index]) {
      if (question.multiple) {
        input.checked = state.answers[index].includes(option.value);
      } else {
        input.checked = state.answers[index] === option.value;
      }
      
      // Adicionar classe selected se estiver marcado
      if (input.checked) {
        optionElement.classList.add('selected');
      }
    }
    
    const label = document.createElement('label');
    label.htmlFor = `option-${option.value}-${question.id}`;
    label.textContent = option.label;
    
    optionElement.appendChild(input);
    optionElement.appendChild(label);
    
    // Event listener para o elemento de opção inteiro
    optionElement.addEventListener('click', (e) => {
      // Se for questão de múltipla escolha (checkbox)
      if (question.multiple) {
        input.checked = !input.checked; // Alterna o estado
        
        // Atualiza a seleção visual
        if (input.checked) {
          optionElement.classList.add('selected');
        } else {
          optionElement.classList.remove('selected');
        }
        
        // Atualiza o estado das respostas
        const selectedOptions = Array.from(
          document.querySelectorAll(`input[name="answer-${question.id}"]:checked`)
        ).map(el => el.value);
        
        state.answers[index] = selectedOptions;
      } 
      // Se for questão de única escolha (radio)
      else {
        // Remove a seleção de todas as outras opções
        document.querySelectorAll(`input[name="answer"]`).forEach(otherInput => {
          otherInput.checked = false;
        });
        document.querySelectorAll('.option').forEach(otherOption => {
          otherOption.classList.remove('selected');
        });
        
        // Seleciona a opção atual
        input.checked = true;
        optionElement.classList.add('selected');
        state.answers[index] = option.value;
      }
      
      // Atualizar indicador de perguntas
      updateQuestionIndicator(index, questions.length);
      
      // Atualizar estado do botão próximo
      elements.nextBtn.disabled = !state.answers[index] || 
        (question.multiple && state.answers[index].length === 0);
    });
    
    elements.optionsContainer.appendChild(optionElement);
  });
  
  // Atualizar botões de navegação
  elements.prevBtn.disabled = index === 0;
  elements.nextBtn.disabled = !state.answers[index] || 
    (question.multiple && state.answers[index].length === 0);
}

function updateOptionSelection(questionIndex) {
  const questions = quizQuestions[state.currentLanguage];
  const question = questions[questionIndex];
  const options = elements.optionsContainer.querySelectorAll('.option');
  
  options.forEach(option => {
    const input = option.querySelector('input');
    const value = option.dataset.value;
    
    if (question.multiple) {
      // Para múltipla escolha
      if (state.answers[questionIndex] && state.answers[questionIndex].includes(value)) {
        option.classList.add('selected');
        input.checked = true;
      } else {
        option.classList.remove('selected');
        input.checked = false;
      }
    } else {
      // Para única escolha
      if (state.answers[questionIndex] === value) {
        option.classList.add('selected');
        input.checked = true;
      } else {
        option.classList.remove('selected');
        input.checked = false;
      }
    }
  });
}

// Atualizar indicador de perguntas
function updateQuestionIndicator(currentIndex, totalQuestions) {
  elements.questionIndicator.innerHTML = '';
  
  for (let i = 0; i < totalQuestions; i++) {
    const dot = document.createElement('div');
    dot.className = 'question-dot';
    
    if (i === currentIndex) {
      dot.classList.add('active');
    } else if (state.answers[i]) {
      dot.classList.add('answered');
    }
    
    elements.questionIndicator.appendChild(dot);
  }
}

// Atualizar barra de progresso
function updateProgress(current, total) {
  const percentage = (current / total) * 100;
  elements.progressBar.style.width = `${percentage}%`;
  elements.progressText.textContent = state.currentLanguage === 'pt' 
    ? `Pergunta ${current} de ${total}` 
    : `Pregunta ${current} de ${total}`;
}

// Navegação
function goToNextQuestion() {
  const questions = quizQuestions[state.currentLanguage];
  const currentQuestion = questions[state.currentQuestion];
  
  if (!state.answers[state.currentQuestion] || 
      (currentQuestion.multiple && state.answers[state.currentQuestion].length === 0)) {
    alert(state.currentLanguage === 'pt' 
      ? 'Por favor, selecione uma opção' 
      : 'Por favor, seleccione una opción');
    return;
  }
  
  if (state.currentQuestion < questions.length - 1) {
    state.currentQuestion++;
    loadQuestion(state.currentQuestion);
  } else {
    showResults();
  }
}

function goToPreviousQuestion() {
  if (state.currentQuestion > 0) {
    state.currentQuestion--;
    loadQuestion(state.currentQuestion);
    
    // Atualiza a seleção visual para a pergunta anterior
    updateOptionSelection(state.currentQuestion);
  }
}


// Sistema de recomendação melhorado
function calculateBookScore(book, filters) {
  let score = 0;
  const questions = quizQuestions[state.currentLanguage];

  // 1. Gênero literário (maior peso)
  if (filters.genres?.length > 0 && book.genres) {
    // Priorizar livros que combinam com múltiplos gêneros selecionados
    const matchingGenres = book.genres.filter(g => filters.genres.includes(g));
    const genreWeight = questions.find(q => q.filterKey === 'genres').weight;
    
    // Pontuar mais se combinar com vários gêneros
    score += (matchingGenres.length / filters.genres.length) * genreWeight;
    
    // Bônus adicional se combinar com pelo menos 2 gêneros
    if (matchingGenres.length >= 2) {
      score += 10;
    }
  }

  // 2. Faixa etária (peso médio)
  if (book.grade === filters.grade) {
    const gradeWeight = questions.find(q => q.filterKey === 'grade').weight;
    score += gradeWeight; // Match exato
  } else if (
    (filters.grade === 'EF2' && book.grade === 'EF1') ||
    (filters.grade === 'EM' && book.grade === 'EF2')
  ) {
    score += 10; // Faixa próxima
  }

  // 3. Compatibilidade com humor (peso médio)
  if (filters.mood?.length > 0 && book.mood) {
    const moodWeight = questions.find(q => q.filterKey === 'mood').weight;
    const moodMatch = filters.mood.some(selectedMood => 
      Array.isArray(book.mood) 
        ? book.mood.includes(selectedMood)
        : book.mood === selectedMood
    );
    if (moodMatch) score += moodWeight;
  }

  // 4. Tipo de literatura (menor peso)
  if (filters.type !== 'qualquer' && book.type === filters.type) {
    const typeWeight = questions.find(q => q.filterKey === 'type').weight;
    score += typeWeight; // Match exato
  }

  // 5. Popularidade (pequeno bônus)
  score += (book.popularity || 5) * 0.1; // Converte 1-10 para 0.5-5

  // 6. Disponibilidade (Bônus absoluto)
  if (book.available) score += 1;

  return score;
}

// Obter motivo da recomendação
function getRecommendationReason(book, filters) {
  const reasons = [];
  const questions = quizQuestions[state.currentLanguage];
  
  // Gênero
  if (filters.genres?.length > 0 && book.genres) {
    const matchingGenres = book.genres.filter(g => filters.genres.includes(g));
    if (matchingGenres.length > 0) {
      const genreLabels = matchingGenres.map(g => genreTranslations[state.currentLanguage][g] || g);
      reasons.push(`combina com seu gosto por ${genreLabels.join(', ')}`);
    }
  }
  
  // Faixa etária
  if (book.grade === filters.grade) {
    reasons.push(`indicado para sua faixa etária`);
  }
  
  // Humor/experiência
  if (filters.mood?.length > 0 && book.mood) {
    const matchingMoods = Array.isArray(book.mood) 
      ? book.mood.filter(m => filters.mood.includes(m))
      : filters.mood.includes(book.mood) ? [book.mood] : [];
    
    if (matchingMoods.length > 0) {
      const moodTranslations = {
        "emocionar": "emocionante",
        "surpreender": "surpreendente",
        "refletir": "reflexivo",
        "rir": "divertido",
        "aventura": "aventureiro",
        "acalmar": "calmante",
        "assustar": "assustador",
        "perturbar": "intenso",
        "divertir": "divertido",
        "inspirar": "inspirador"
      };
      
      const moodLabels = matchingMoods.map(m => moodTranslations[m] || m);
      reasons.push(`oferece uma experiência ${moodLabels.join(' e ')}`);
    }
  }
  
  // Tipo de literatura
  if (filters.type !== 'qualquer' && book.type === filters.type) {
    reasons.push(`do tipo ${filters.type === 'brasileira' ? 'literatura brasileira' : 'literatura estrangeira'}`);
  }
  
  // Se não encontrou razões específicas, usar uma mensagem genérica
  if (reasons.length === 0) {
    return state.currentLanguage === 'pt' 
      ? 'Recomendado com base em livros populares' 
      : 'Recomendado basado en libros populares';
  }
  
  // Formatar a mensagem final
  let message = state.currentLanguage === 'pt' ? 'Recomendado porque ' : 'Recomendado porque ';
  if (reasons.length === 1) {
    message += reasons[0];
  } else {
    message += reasons.slice(0, -1).join(', ') + ' e ' + reasons[reasons.length - 1];
  }
  
  return message;
}

// FUNÇÃO OTIMIZADA - Substitui a versão anterior
function getRecommendedBooks(filters) {
  // Verificar se podemos usar resultados em cache
  if (lastFilters && cachedResults && JSON.stringify(lastFilters) === JSON.stringify(filters)) {
    return cachedResults;
  }
  
  lastFilters = {...filters};
  
  // 1. Filtro inicial usando índices para melhor performance
  let candidateIndexes = new Set();
  
  // Filtro por gênero (se especificado) - uso do índice
  if (filters.genres && filters.genres.length > 0) {
    filters.genres.forEach(genre => {
      if (genreIndex[genre]) {
        genreIndex[genre].forEach(idx => candidateIndexes.add(idx));
      }
    });
  } else {
    // Se não há filtro de gênero, considerar todos os livros inicialmente
    booksDatabase.forEach((_, idx) => candidateIndexes.add(idx));
  }
  
  // Converter Set para array
  let candidates = Array.from(candidateIndexes).map(idx => booksDatabase[idx]);
  
  // 2. Aplicar outros filtros de forma eficiente
  candidates = candidates.filter(book => {
    // Filtro de faixa etária
    if (filters.grade === 'EF1' && book.grade === 'EM') return false;
    
    // Filtro de tipo de literatura
    if (filters.type !== 'qualquer' && book.type !== filters.type) return false;
    
    return true;
  });

  // 3. Calcular scores apenas para os candidatos (não para todos os livros)
  candidates.forEach(book => {
    // Usar cache de scores se disponível
    const cacheKey = `${book.id}_${JSON.stringify(filters)}`;
    
    if (!precomputedScores[cacheKey]) {
      book.relevanceScore = calculateBookScore(book, filters);
      precomputedScores[cacheKey] = book.relevanceScore;
    } else {
      book.relevanceScore = precomputedScores[cacheKey];
    }
    
    book.recommendationReason = getRecommendationReason(book, filters);
  });

  // 4. Ordenar por score (decrescente)
  const sortedCandidates = candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Armazenar em cache
  cachedResults = sortedCandidates;
  
  return sortedCandidates;
}

function getFallbackRecommendations(filters) {
  // 1. Tenta relaxar os filtros gradualmente
  const relaxedFilters = {...filters, type: 'qualquer', mood: ['emocionar', 'divertir'], time: 'todos'};
  let fallbacks = getRecommendedBooks(relaxedFilters);
  
  // 2. Se ainda vazio, pega os mais populares do perfil demográfico
  if (fallbacks.length < 5) {
    fallbacks = booksDatabase
      .filter(book => book.grade === filters.grade || !filters.grade)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 8);
  }
  
  return fallbacks;
}

// Mostrar resultados - VERSÃO OTIMIZADA
function showResults() {
  document.querySelector('.screen.active').classList.remove('active');
  elements.resultScreen.classList.add('active');
  state.currentScreen = 'results';
  updateBreadcrumbs();
  
  // Mostrar loader enquanto processa
  elements.loadingResults.style.display = 'block';
  elements.resultsContent.style.display = 'none';
  
  // Usar setTimeout para não travar a UI
  setTimeout(() => {
    // Filtrar livros com base nas respostas
    const questions = quizQuestions[state.currentLanguage];
    const filters = {
      grade: state.answers[0],
      type: state.answers[1],
      genres: state.answers[2] || [],
      mood: state.answers[3],
      time: state.answers[4]
    };

    // Usar Promise para processamento assíncrono
    new Promise((resolve) => {
      // Obter recomendações principais
      const filteredBooks = getRecommendedBooks(filters);
      resolve(filteredBooks);
    }).then(filteredBooks => {
      state.filteredBooks = filteredBooks;
      state.displayedBooksCount = 6;
      
      // Se poucos resultados, complementa com fallback
      if (state.filteredBooks.length < 6) {
        const fallbacks = getFallbackRecommendations(filters)
          .filter(fb => !state.filteredBooks.some(b => b.id === fb.id));
        
        state.filteredBooks = [...state.filteredBooks, ...fallbacks];
      }
      
      // Armazenar o último livro recomendado para compartilhamento
      if (state.filteredBooks.length > 0) {
        state.lastRecommendedBook = state.filteredBooks[0];
      }
      
      // Exibir livros disponíveis
      const availableBooks = state.filteredBooks.filter(book => book.available);
      displayBooks(availableBooks.slice(0, state.displayedBooksCount), elements.availableBooks, true);
      
      // Exibir livros não disponíveis
      const unavailableBooks = state.filteredBooks.filter(book => !book.available);
      displayBooks(unavailableBooks.slice(0, state.displayedBooksCount), elements.unavailableBooks, false);
      
      // Mostrar fallback se não houver livros
      if (availableBooks.length === 0 && unavailableBooks.length === 0) {
        elements.fallbackBooks.style.display = 'block';
        
        // Atualizar a mensagem de fallback de acordo com o idioma
        const fallbackMessage = elements.fallbackBooks.querySelector('.no-books-message');
        if (fallbackMessage) {
          fallbackMessage.textContent = state.currentLanguage === 'pt' 
            ? 'Não encontramos livros que se encaixem perfeitamente no seu gosto, mas aqui estão algumas excelentes recomendações para qualquer leitor:' 
            : 'No encontramos libros que se ajusten perfectamente a tus gustos, pero aquí hay algunas excelentes recomendaciones para cualquier lector:';
        }
        
        displayBooks(fallbackBooks, elements.fallbackBooksList, true);
      } else {
        elements.fallbackBooks.style.display = 'none';
      }
      
      // Mostrar botão "Mais recomendações" se houver mais livros
      if (state.filteredBooks.length > state.displayedBooksCount) {
        elements.moreBooksBtn.style.display = 'block';
      } else {
        elements.moreBooksBtn.style.display = 'none';
      }
      
      // Atualizar título principal
      elements.resultTitle.textContent = state.currentLanguage === 'pt' 
        ? 'Livros recomendados para você' 
        : 'Libros recomendados para ti';
      
      // Esconder loader e mostrar conteúdo
      elements.loadingResults.style.display = 'none';
      elements.resultsContent.style.display = 'block';
    });
  }, 100);
}

// Carregar mais livros
function loadMoreBooks() {
  state.displayedBooksCount += 6;
  
  // Exibir livros disponíveis
  const availableBooks = state.filteredBooks.filter(book => book.available);
  displayBooks(availableBooks.slice(0, state.displayedBooksCount), elements.availableBooks, true);
  
  // Exibir livros não disponíveis
  const unavailableBooks = state.filteredBooks.filter(book => !book.available);
  displayBooks(unavailableBooks.slice(0, state.displayedBooksCount), elements.unavailableBooks, false);
  
  // Esconder botão se não houver mais livros
  if (state.filteredBooks.length <= state.displayedBooksCount) {
    elements.moreBooksBtn.style.display = 'none';
  }
}

// Exibir livros na tela
function displayBooks(books, container, isAvailable) {
  container.innerHTML = '';
  
  if (books.length === 0) {
    container.innerHTML = '<p class="no-books">' + 
      (state.currentLanguage === 'pt' ? 'Nenhum livro encontrado' : 'No se encontraron libros') + 
      '</p>';
    return;
  }
  
  books.forEach(book => {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card fade-in';
    
    bookCard.innerHTML = `
      <div class="book-cover loading">
        <img class="lazy" 
             data-src="${book.cover || 'https://via.placeholder.com/150x200?text=Sem+Capa'}" 
             alt="Capa do livro: ${book.title}"
             onerror="this.onerror=null;this.src='https://via.placeholder.com/150x200?text=Sem+Capa'">
      </div>
      <div class="book-info">
        <h4 class="book-title">${book.title}</h4>
        <p class="book-author">${book.author}</p>
        ${book.recommendationReason ? `<p class="book-reason">${book.recommendationReason}</p>` : ''}
        ${book.description ? `<p class="book-description">${book.description}</p>` : ''}
        <div class="book-meta">
          <span>${book.grade === 'EF1' ? (state.currentLanguage === 'pt' ? '6°-7° ano' : '6°-7° grado') : 
            book.grade === 'EF2' ? (state.currentLanguage === 'pt' ? '8°-9° ano' : '8°-9° grado') : 
            (state.currentLanguage === 'pt' ? 'Ensino Médio' : 'Escuela secundaria')}</span>
          ${isAvailable ? '<span class="available-badge">' + (state.currentLanguage === 'pt' ? 'Disponível' : 'Disponible') + '</span>' : 
           '<span class="unavailable-badge">' + (state.currentLanguage === 'pt' ? 'Indisponível' : 'No disponible') + '</span>'}
        </div>
      </div>
    `;
    
    // Adiciona evento de clique para informações do autor (se existir)
    const authorElement = bookCard.querySelector('.book-author');
    if (authorElement && authorsInfo[book.author]) {
      authorElement.style.cursor = 'pointer';
      authorElement.addEventListener('click', (e) => {
        e.preventDefault();
        showAuthorModal(book.author);
      });
    }
    
    container.appendChild(bookCard);
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
  
  // Configurar tabs
  setupVestibularTabs();
}

function fillVestibularList(type) {
  const container = document.getElementById(type);
  container.innerHTML = '';
  
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
  const qrCodeContainer = document.getElementById('qrCodeContainer');
  qrCodeContainer.innerHTML = '';
  QRCode.toCanvas(qrCodeContainer, shareUrl, { width: 200 }, (error) => {
    if (error) console.error('Erro ao gerar QR Code:', error);
  });
}

// Gerar link compartilhável
function generateShareableLink() {
  return "https://bielcrod.github.io/ache-seu-livro/";
}

// Copiar link para área de transferência
function copyLink() {
  const shareUrl = document.getElementById('shareableLink');
  shareUrl.select();
  document.execCommand('copy');
  
  alert(state.currentLanguage === 'pt' 
    ? 'Link copiado para a área de transferência!' 
    : '¡Enlace copiado al portapapeles!');
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
  state.currentQuestion = 0;
  state.answers = [];
  document.querySelector('.screen.active').classList.remove('active');
  elements.quizScreen.classList.add('active');
  loadQuestion(state.currentQuestion);
  state.currentScreen = 'quiz';
  updateBreadcrumbs();
}

// Carregar background aleatório
function loadRandomBackground() {
  const backgrounds = [
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
    'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'
  ];
  
  const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
  document.getElementById('background').style.backgroundImage = `url(${randomBg})`;
}

// Iniciar aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', init);

function toggleGenres() {
  const hiddenGenres = document.querySelectorAll('.hidden-genre');
  const btn = document.getElementById('toggleGenresBtn');
  let allVisible = true;
  
 hiddenGenres.forEach(genre => {
    if (!genre.classList.contains('visible')) {
      allVisible = false;
    }
  });
  
  if (allVisible) {
    // Esconder todos
    hiddenGenres.forEach(genre => {
      genre.classList.remove('visible');
    });
    btn.innerHTML = '<i class="fas fa-plus"></i> Ver mais gêneros';
  } else {
    // Mostrar todos
    hiddenGenres.forEach(genre => {
      genre.classList.add('visible');
    });
    btn.innerHTML = '<i class="fas fa-minus"></i> Ver menos';
  }
}

document.getElementById('toggleGenresBtn').addEventListener('click', toggleGenres);
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
  const allGenres = Array.from(new Set(booksDatabase.flatMap(book => book.genres || [])))
    .sort();
  
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
  console.log("Atualizando filtros...");
  
  // Obter filtros selecionados
  libraryState.filters.search = elements.librarySearch.value.toLowerCase();
  
  // CORREÇÃO COMPLETA: Obter gêneros selecionados
  libraryState.filters.genres = [];
  const genreOptions = elements.genreFilters.querySelectorAll('.filter-option');
  
  genreOptions.forEach(option => {
    if (option.classList.contains('selected') && option.dataset.genre) {
      libraryState.filters.genres.push(option.dataset.genre);
    }
  });
  
  console.log("Gêneros selecionados:", libraryState.filters.genres);
  
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
  
  // Obter ordenação selecionada
  const sortOptions = document.querySelectorAll('.sort-btn');
  libraryState.filters.sort = 'popularity';
  
  sortOptions.forEach(option => {
    if (option.classList.contains('active') && option.dataset.sort) {
      libraryState.filters.sort = option.dataset.sort;
    }
  });
  
  console.log("Filtros aplicados:", libraryState.filters);
  
  // Resetar para a primeira página
  libraryState.currentPage = 1;
  
  // Atualizar resultados
  filterLibraryBooks();
}

function filterLibraryBooks() {
  console.log("Filtrando livros com:", libraryState.filters);
  
  let filtered = [...booksDatabase];
  
  // Aplicar filtro de busca
  if (libraryState.filters.search) {
    const searchTerm = libraryState.filters.search;
    filtered = filtered.filter(book => 
      book.title.toLowerCase().includes(searchTerm) ||
      book.author.toLowerCase().includes(searchTerm) ||
      (book.description && book.description.toLowerCase().includes(searchTerm))
    );
  }
  
  // CORREÇÃO COMPLETA: Aplicar filtro de gênero
  if (libraryState.filters.genres && libraryState.filters.genres.length > 0) {
    filtered = filtered.filter(book => {
      if (!book.genres || !Array.isArray(book.genres)) return false;
      
      // Verifica se o livro tem PELO MENOS UM dos gêneros selecionados
      return book.genres.some(bookGenre => 
        libraryState.filters.genres.includes(bookGenre)
      );
    });
  }
  
  // Aplicar filtro de disponibilidade
  if (libraryState.filters.availability !== 'all') {
    filtered = filtered.filter(book => 
      libraryState.filters.availability === 'available' ? book.available : !book.available
    );
  }
  
  // Aplicar filtro de faixa etária
  if (libraryState.filters.grade !== 'all') {
    filtered = filtered.filter(book => {
      if (Array.isArray(book.grade)) {
        return book.grade.includes(libraryState.filters.grade);
      }
      return book.grade === libraryState.filters.grade;
    });
  }
  
  // Aplicar ordenação
  switch (libraryState.filters.sort) {
    case 'title':
      filtered.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'author':
      filtered.sort((a, b) => a.author.localeCompare(b.author));
      break;
    case 'popularity':
    default:
      filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      break;
  }
  
  console.log("Livros filtrados:", filtered.length);
  
  // Calcular paginação
  libraryState.totalPages = Math.ceil(filtered.length / libraryState.itemsPerPage);
  
  // Obter livros para a página atual
  const startIndex = (libraryState.currentPage - 1) * libraryState.itemsPerPage;
  const endIndex = startIndex + libraryState.itemsPerPage;
  const paginatedBooks = filtered.slice(startIndex, endIndex);
  
  // Atualizar contador de resultados
  elements.resultsCount.textContent = `${filtered.length} livro(s) encontrado(s)`;
  
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
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card fade-in';
    
    bookCard.innerHTML = `
      <div class="book-cover loading">
        <img class="lazy" 
             data-src="${book.cover || 'https://via.placeholder.com/150x200?text=Sem+Capa'}" 
             alt="Capa do livro: ${book.title}"
             onerror="this.onerror=null;this.src='https://via.placeholder.com/150x200?text=Sem+Capa'">
      </div>
      <div class="book-info">
        <h4 class="book-title">${book.title}</h4>
        <p class="book-author">${book.author}</p>
        ${book.description ? `<p class="book-description">${book.description}</p>` : ''}
        <div class="book-meta">
          <span>${book.grade === 'EF1' ? '6°-7° ano' : book.grade === 'EF2' ? '8°-9° ano' : 'Ensino Médio'}</span>
          ${book.available ? '<span class="available-badge">Disponível</span>' : '<span class="unavailable-badge">Indisponível</span>'}
        </div>
      </div>
    `;
    
    elements.libraryBooks.appendChild(bookCard);
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
    });
    elements.pagination.appendChild(nextBtn);
  }
}

// Resetar filtros
function resetLibraryFilters() {
  elements.librarySearch.value = '';
  
  elements.genreFilters.querySelectorAll('.filter-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  
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
