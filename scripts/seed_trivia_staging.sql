-- =========================================================================
-- FILM BLOOPERS HUB - SEED CURIOSITÀ PER AMBIENTE DI STAGING (10 TRIVIA)
-- Da eseguire nell'SQL Editor di Supabase Staging DOPO aver eseguito
-- lo script scripts/create_movie_trivia_table.sql
-- =========================================================================

INSERT INTO public.movie_trivia (film_id, categoria, titolo, descrizione, fonte, approvato, inserito_da, provenienza, likes, ordine)
VALUES
-- --- FILM: LE IENE (ID: 145) ---
(
  145,
  'Aneddoti dal set',
  'Il budget ridotto e i vestiti personali degli attori',
  'Il budget iniziale per i costumi era così limitato che molti attori recitarono indossando i propri abiti personali. L''iconico completo nero di Steve Buscemi (Mr. Pink) era in realtà un suo vecchio vestito acquistato per poche decine di dollari.',
  'Commento audio di Quentin Tarantino',
  true,
  'IA Archivista',
  'ia',
  14,
  1
),
(
  145,
  'Casting & Scelte',
  'Michael Madsen e la scena del ballo improvvisata',
  'Michael Madsen (Mr. Blonde) era estremamente riluttante all''idea di ballare durante la celebre sequenza della tortura con la canzone "Stuck in the Middle with You". Non aveva provato alcun passo di danza prima del ciak e improvvisò ogni singolo movimento sul momento.',
  'Intervista Rolling Stone',
  true,
  'IA Archivista',
  'ia',
  27,
  2
),
(
  145,
  'Curiosità & Retroscena',
  'L''origine misteriosa del titolo "Reservoir Dogs"',
  'Tarantino ha spiegato che il titolo nacque quando lavorava come commesso in una videoteca: faticando a pronunciare il titolo del film francese "Au revoir les enfants", lo definiva scherzosamente "that reservoir movie", fondendolo poi con "Straw Dogs" di Sam Peckinpah.',
  'Biografia Quentin Tarantino',
  true,
  'IA Archivista',
  'ia',
  19,
  3
),
(
  145,
  'Segreti di produzione',
  'L''ambulanza finta fuori dal capannone',
  'Per risparmiare sui permessi di sicurezza durante le riprese a Los Angeles con sangue finto e spari a salve, la troupe tenne un paramedico con una finta autoambulanza parcheggiata fuori dal magazzino per intervenire in caso di incidenti reali con le pistole.',
  'Making of Le Iene',
  true,
  'IA Archivista',
  'ia',
  8,
  4
),
(
  145,
  'Citazioni & Easter Egg',
  'Il legame segreto con Pulp Fiction',
  'Il personaggio di Michael Madsen si chiama Vic Vega, ed è ufficialmente il fratello di Vincent Vega (John Travolta in Pulp Fiction). Tarantino aveva inizialmente accarezzato l''idea di girare un prequel dedicato ai due fratelli intitolato "The Vega Brothers".',
  'Intervista Variety',
  true,
  'IA Archivista',
  'ia',
  35,
  5
),

-- --- FILM: LO SQUALO 3 (ID: 143) ---
(
  143,
  'Effetti speciali & Trucco',
  'Il 3D pionieristico ma problematico',
  'Il film fu girato con la tecnologia ArriVision 3D stereoscopica a colori. A causa delle lenti polarizzate e della rifrazione dell''acqua, le cineprese dovettero essere alloggiate in giganteschi scafandri stagni riscaldati per evitare che il vapore acqueo appannasse gli obiettivi.',
  'American Cinematographer 1983',
  true,
  'IA Archivista',
  'ia',
  5,
  1
),
(
  143,
  'Curiosità & Retroscena',
  'Da commedia parodistica a sequel drammatico',
  'In origine il terzo capitolo doveva intitolarsi "Jaws 3, People 0" ed essere una parodia diretta prodotta dal team di National Lampoon. Lo studio Universal decise solo all''ultimo di abbandonare la commedia per tornare a una formula horror/thriller.',
  'Documentario The Shark is Still Working',
  true,
  'IA Archivista',
  'ia',
  12,
  2
),
(
  143,
  'Aneddoti dal set',
  'Lo squalo animatronico guasto nel parco acquatico',
  'Durante le riprese al SeaWorld in Florida, il modello meccanico principale dello squalo da 10 metri rimase incastrato sul fondale della laguna artificiale per oltre tre giorni a causa della sabbia che intasò i pistoni idraulici.',
  'Orlando Sentinel Archives',
  true,
  'IA Archivista',
  'ia',
  9,
  3
),

-- --- FILM: ...ALTRIMENTI CI ARRABBIAMO! (ID: 149) ---
(
  149,
  'Aneddoti dal set',
  'La gara di birra e salsicce era reale',
  'Per la celebre sequenza iniziale al luna park della sfida a "birra e salsicce", Bud Spencer e Terence Hill mangiarono davvero decine di würstel autentici durante i vari ciak, rifiutando le controfigure per rendere la scena più spontanea e divertente.',
  'Autobiografia Bud Spencer',
  true,
  'IA Archivista',
  'ia',
  42,
  1
),
(
  149,
  'Citazioni & Easter Egg',
  'Il coro dei pompieri e il leggendario brano degli Oliver Onions',
  'L''iconica canzone "Dune Buggy" degli Oliver Onions (fratelli De Angelis) scalò le classifiche europee del 1974. La scena del coro dei pompieri fu interamente coreografata con cantanti lirici professionisti che faticavano a trattenere le risate davanti alle smorfie di Terence Hill.',
  'Note di copertina colonna sonora originale',
  true,
  'IA Archivista',
  'ia',
  38,
  2
);
