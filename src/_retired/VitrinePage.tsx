import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { getFuturoshock, getMuseumObjects, subscribeContent, type FuturoshockWork, type MuseumObject } from './data';
import { HALLS, type HallId } from './museum/halls';

/* Собственный чанк: three и fiber весят больше самой страницы, а нужны только
   на пустой коллекции. Пока объектов нет, зал занимает само здание. */
const MuseumModel = lazy(() => import('./museum/MuseumModel').then((m) => ({ default: m.MuseumModel })));

const MUSEUM_COPY = {
  EN: {
    museumLabel: 'EPRIS MUSEUM',
    firstSelection: 'Collection opening',
    intro: 'A living collection of works by Ukrainian artists, designers and architects, in Ukraine and across the diaspora.',
    emptyDescription: 'The collection is being prepared by the editorial team. Every object will enter with its author, place, material and the context that makes it matter.',
    emptyFoot: 'Collection records are published by the editorial team.',
    imagePending: 'Image archive in preparation',
    modelLabel: 'Three-dimensional model of the EPRIS Museum building',
    modelHint: 'Drag to turn the model',
    modelFallback: 'The browser stopped drawing the model. The building is still here.',
    modelRetry: 'Show the model again',
    openLabel: 'Open the space',
    closeLabel: 'Close the space',
    insideLabel: 'Inside the EPRIS Museum building: atrium, balconies and the ramp',
    legend: { court: 'Court', collection: 'Collection', practice: 'Practice', archive: 'Archive', study: 'Study', auditorium: 'Auditorium', workshop: 'Workshop', terrace: 'Terrace' },
    enterHall: 'Enter the hall',
    leaveHall: 'Step outside',
    insideHall: 'You are inside',
    hallsLabel: 'Halls',
    hallsHint: 'Choose a volume to enter',
    allHalls: 'All halls',
    accessOpen: 'Open',
    accessPassport: 'By EPRIS passport',
    lockedHint: 'Opens with an EPRIS passport',
    lockedNote: 'This hall opens with an EPRIS passport. Passports are issued as the collection opens.',
    emptyHall: 'Nothing is installed here yet. The first objects arrive with the collection.',
    partialHall: 'The first pieces are in place. Their records are still being written.',
    hallCopy: {
      court: 'The sunken court in front of the building: screenings, talks and the work that does not fit indoors.',
      collection: 'The permanent collection of Ukrainian practice, held at the lowest and quietest level.',
      practice: 'Changing shows: work in progress, studio material, things still being argued about.',
      archive: 'Drawings, drafts, correspondence and everything a finished object leaves behind.',
      study: 'The reading room inside the blind shaft: one desk, one window, the whole archive within reach.',
      auditorium: 'The drum beside the building: lectures, screenings and arguments that need a room of their own.',
      workshop: 'Low sheds under a sawtooth roof, where the collection is repaired, framed and prepared.',
      terrace: 'The open floor on the roof: a pergola, three planters and the city over the parapet.',
    },
    collectionIntro: 'An evolving museum of Ukrainian practice. Each object belongs to a broader story of making, place and cultural memory.',
    object: 'Object',
    objectDossier: 'Object dossier',
    creator: 'Creator',
    place: 'Place',
    date: 'Date',
    material: 'Material',
    dimensions: 'Dimensions',
    catalogueNumber: 'Catalogue no.',
    pending: 'Editorial note pending',
    readContext: 'Read EPRIS research',
    archive: 'Collection archive',
    objects: 'objects',
    objectCount: 'in collection',
    openObject: 'Open object',
  },
  RU: {
    museumLabel: 'EPRIS MUSEUM',
    firstSelection: 'Открытие коллекции',
    intro: 'Живая коллекция работ украинских художников, дизайнеров и архитекторов в Украине и в диаспоре.',
    emptyDescription: 'Коллекцию готовит редакция. Каждый объект войдёт в неё с автором, местом, материалом и контекстом, который делает его важным.',
    emptyFoot: 'Записи коллекции публикует редакция.',
    imagePending: 'Изображение готовится для архива',
    modelLabel: 'Трёхмерная модель здания EPRIS Museum',
    modelHint: 'Потяните, чтобы повернуть макет',
    modelFallback: 'Браузер перестал рисовать макет. Здание никуда не делось.',
    modelRetry: 'Показать макет снова',
    openLabel: 'Открыть пространство',
    closeLabel: 'Закрыть пространство',
    insideLabel: 'Внутри здания EPRIS Museum: атриум, балконы и пандус',
    legend: { court: 'Двор', collection: 'Коллекция', practice: 'Практика', archive: 'Архив', study: 'Кабинет', auditorium: 'Лекторий', workshop: 'Мастерские', terrace: 'Терраса' },
    enterHall: 'Войти в зал',
    leaveHall: 'Выйти наружу',
    insideHall: 'Вы внутри',
    hallsLabel: 'Залы',
    hallsHint: 'Выберите объём, чтобы войти',
    allHalls: 'Все залы',
    accessOpen: 'Открыт',
    accessPassport: 'По паспорту EPRIS',
    lockedHint: 'Открывается по паспорту EPRIS',
    lockedNote: 'Этот зал открывается по паспорту EPRIS. Паспорта выдаются по мере открытия коллекции.',
    emptyHall: 'Здесь пока ничего не смонтировано. Первые объекты приходят вместе с коллекцией.',
    partialHall: 'Первые вещи уже стоят. Их паспорта ещё пишутся.',
    hallCopy: {
      court: 'Опущенный двор перед зданием: показы, разговоры и то, что не помещается внутрь.',
      collection: 'Постоянная коллекция украинской практики на нижнем, самом тихом ярусе.',
      practice: 'Сменные выставки: работа в процессе, материал мастерской, вещи, о которых ещё спорят.',
      archive: 'Чертежи, черновики, переписка и всё, что остаётся после законченного объекта.',
      study: 'Читальня внутри глухого ствола: один стол, одно окно, весь архив под рукой.',
      auditorium: 'Барабан рядом со зданием: лекции, показы и споры, которым нужна отдельная комната.',
      workshop: 'Низкие цеха под пилой фонарей, где коллекцию чинят, оформляют и готовят к залу.',
      terrace: 'Открытый ярус на кровле: пергола, три кадки и город за парапетом.',
    },
    collectionIntro: 'Развивающийся музей украинской практики. Каждый объект связан с историей создания, местом и культурной памятью.',
    object: 'Объект',
    objectDossier: 'Паспорт объекта',
    creator: 'Автор',
    place: 'Место',
    date: 'Дата',
    material: 'Материал',
    dimensions: 'Габариты',
    catalogueNumber: 'Каталожный номер',
    pending: 'Редакционная заметка готовится',
    readContext: 'Открыть исследование EPRIS',
    archive: 'Архив коллекции',
    objects: 'объектов',
    objectCount: 'в коллекции',
    openObject: 'Открыть объект',
  },
  UA: {
    museumLabel: 'EPRIS MUSEUM',
    firstSelection: 'Відкриття колекції',
    intro: 'Жива колекція робіт українських митців, дизайнерів і архітекторів в Україні та діаспорі.',
    emptyDescription: 'Колекцію готує редакція. Кожен об’єкт увійде до неї з автором, місцем, матеріалом і контекстом, який робить його важливим.',
    emptyFoot: 'Записи колекції публікує редакція.',
    imagePending: 'Зображення готується для архіву',
    modelLabel: 'Тривимірна модель будівлі EPRIS Museum',
    modelHint: 'Потягніть, щоб обернути макет',
    modelFallback: 'Браузер перестав малювати макет. Будівля нікуди не поділася.',
    modelRetry: 'Показати макет знову',
    openLabel: 'Відкрити простір',
    closeLabel: 'Закрити простір',
    insideLabel: 'Усередині будівлі EPRIS Museum: атріум, балкони та пандус',
    legend: { court: 'Двір', collection: 'Колекція', practice: 'Практика', archive: 'Архів', study: 'Кабінет', auditorium: 'Лекторій', workshop: 'Майстерні', terrace: 'Тераса' },
    enterHall: 'Увійти до залу',
    leaveHall: 'Вийти назовні',
    insideHall: 'Ви всередині',
    hallsLabel: 'Зали',
    hallsHint: 'Оберіть об’єм, щоб увійти',
    allHalls: 'Усі зали',
    accessOpen: 'Відкритий',
    accessPassport: 'За паспортом EPRIS',
    lockedHint: 'Відкривається за паспортом EPRIS',
    lockedNote: 'Цей зал відкривається за паспортом EPRIS. Паспорти видають у міру відкриття колекції.',
    emptyHall: 'Тут ще нічого не змонтовано. Перші обʼєкти приходять разом із колекцією.',
    partialHall: 'Перші речі вже стоять. Їхні паспорти ще пишуться.',
    hallCopy: {
      court: 'Опущений двір перед будівлею: покази, розмови і те, що не вміщається всередині.',
      collection: 'Постійна колекція української практики на нижньому, найтихішому ярусі.',
      practice: 'Змінні виставки: робота в процесі, матеріал майстерні, речі, про які ще сперечаються.',
      archive: 'Креслення, чернетки, листування і все, що лишається після завершеного обʼєкта.',
      study: 'Читальня всередині глухого стовбура: один стіл, одне вікно, увесь архів під рукою.',
      auditorium: 'Барабан поруч із будівлею: лекції, покази й суперечки, яким потрібна окрема кімната.',
      workshop: 'Низькі цехи під пилою ліхтарів, де колекцію лагодять, оформлюють і готують до залу.',
      terrace: 'Відкритий ярус на покрівлі: пергола, три кадки і місто за парапетом.',
    },
    collectionIntro: 'Музей української практики, що розвивається. Кожен об’єкт пов’язаний з історією створення, місцем і культурною пам’яттю.',
    object: 'Об’єкт',
    objectDossier: 'Паспорт об’єкта',
    creator: 'Автор',
    place: 'Місце',
    date: 'Дата',
    material: 'Матеріал',
    dimensions: 'Габарити',
    catalogueNumber: 'Каталожний номер',
    pending: 'Редакційна нотатка готується',
    readContext: 'Відкрити дослідження EPRIS',
    archive: 'Архів колекції',
    objects: 'об’єктів',
    objectCount: 'у колекції',
    openObject: 'Відкрити об’єкт',
  },
  TR: {
    museumLabel: 'EPRIS MÜZESİ',
    firstSelection: 'Koleksiyonun açılışı',
    intro: 'Ukraynalı sanatçıların, tasarımcıların ve mimarların yapıtlarından oluşan yaşayan bir koleksiyon: hem Ukrayna’da hem diasporada.',
    emptyDescription: 'Koleksiyonu yayın kurulu hazırlıyor. Her nesne yazarı, yeri, malzemesi ve onu önemli kılan bağlamıyla birlikte girecek.',
    emptyFoot: 'Koleksiyon kayıtlarını yayın kurulu yayımlar.',
    imagePending: 'Görsel arşivi hazırlanıyor',
    modelLabel: 'EPRIS Müzesi binasının üç boyutlu maketi',
    modelHint: 'Maketi çevirmek için sürükleyin',
    modelFallback: 'Tarayıcı maketi çizmeyi bıraktı. Bina hâlâ burada.',
    modelRetry: 'Maketi yeniden göster',
    openLabel: 'Mekânı aç',
    closeLabel: 'Mekânı kapat',
    insideLabel: 'EPRIS Müzesi binasının içi: salonlar, galeriler ve merdiven kovası',
    legend: { court: 'Avlu', collection: 'Koleksiyon', practice: 'Pratik', archive: 'Arşiv', study: 'Okuma odası', auditorium: 'Konferans salonu', workshop: 'Atölye', terrace: 'Teras' },
    enterHall: 'Salona gir',
    leaveHall: 'Dışarı çık',
    insideHall: 'İçeridesiniz',
    hallsLabel: 'Salonlar',
    hallsHint: 'Girmek için bir hacim seçin',
    allHalls: 'Tüm salonlar',
    accessOpen: 'Açık',
    accessPassport: 'EPRIS pasaportuyla',
    lockedHint: 'EPRIS pasaportuyla açılır',
    lockedNote: 'Bu salon EPRIS pasaportuyla açılır. Pasaportlar koleksiyon açıldıkça veriliyor.',
    emptyHall: 'Burada henüz hiçbir şey kurulmadı. İlk nesneler koleksiyonla birlikte gelecek.',
    partialHall: 'İlk yapıtlar yerinde. Künyeleri hâlâ yazılıyor.',
    hallCopy: {
      court: 'Binanın önündeki çukur avlu: gösterimler, söyleşiler ve içeriye sığmayan işler.',
      collection: 'Ukrayna pratiğinin kalıcı koleksiyonu, en alttaki ve en sessiz katta.',
      practice: 'Değişen sergiler: süren işler, atölye malzemesi, hâlâ tartışılan şeyler.',
      archive: 'Çizimler, taslaklar, yazışmalar ve bitmiş bir nesnenin geride bıraktığı her şey.',
      study: 'Sağır kulenin içindeki okuma odası: bir masa, bir pencere, elinizin altında bütün arşiv.',
      auditorium: 'Binanın yanındaki silindir: dersler, gösterimler ve kendi odasını hak eden tartışmalar.',
      workshop: 'Testere çatının altındaki alçak atölyeler: koleksiyon burada onarılır, çerçevelenir ve hazırlanır.',
      terrace: 'Çatıdaki açık kat: bir pergola, üç saksı ve korkuluğun ardında şehir.',
    },
    collectionIntro: 'Ukrayna pratiğinin gelişen bir müzesi. Her nesne yapma, yer ve kültürel bellek üzerine daha geniş bir hikâyeye aittir.',
    object: 'Nesne',
    objectDossier: 'Nesne dosyası',
    creator: 'Yaratıcı',
    place: 'Yer',
    date: 'Tarih',
    material: 'Malzeme',
    dimensions: 'Ölçüler',
    catalogueNumber: 'Katalog no.',
    pending: 'Editör notu hazırlanıyor',
    readContext: 'EPRIS araştırmasını okuyun',
    archive: 'Koleksiyon arşivi',
    objects: 'nesne',
    objectCount: 'koleksiyonda',
    openObject: 'Nesneyi aç',
  },
  IT: {
    museumLabel: 'MUSEO EPRIS',
    firstSelection: 'Apertura della collezione',
    intro: 'Una collezione viva di opere di artisti, designer e architetti ucraini, in Ucraina e nella diaspora.',
    emptyDescription: 'La collezione è in preparazione a cura della redazione. Ogni oggetto entrerà con il suo autore, il luogo, il materiale e il contesto che lo rende importante.',
    emptyFoot: 'Le schede della collezione sono pubblicate dalla redazione.',
    imagePending: 'Archivio delle immagini in preparazione',
    modelLabel: 'Modello tridimensionale dell’edificio del Museo EPRIS',
    modelHint: 'Trascinare per girare il modello',
    modelFallback: 'Il browser ha smesso di disegnare il modello. L\'edificio è ancora qui.',
    modelRetry: 'Mostra di nuovo il modello',
    openLabel: 'Aprire lo spazio',
    closeLabel: 'Chiudere lo spazio',
    insideLabel: 'Dentro l’edificio del Museo EPRIS: sale, gallerie e il vano scala',
    legend: { court: 'Corte', collection: 'Collezione', practice: 'Pratica', archive: 'Archivio', study: 'Sala lettura', auditorium: 'Auditorium', workshop: 'Officine', terrace: 'Terrazza' },
    enterHall: 'Entrare nella sala',
    leaveHall: 'Uscire',
    insideHall: 'Siete dentro',
    hallsLabel: 'Sale',
    hallsHint: 'Scegliere un volume per entrare',
    allHalls: 'Tutte le sale',
    accessOpen: 'Aperta',
    accessPassport: 'Con passaporto EPRIS',
    lockedHint: 'Si apre con un passaporto EPRIS',
    lockedNote: 'Questa sala si apre con un passaporto EPRIS. I passaporti vengono rilasciati man mano che la collezione apre.',
    emptyHall: 'Qui non è ancora allestito nulla. I primi oggetti arrivano con la collezione.',
    partialHall: 'I primi pezzi sono al loro posto. Le schede si stanno ancora scrivendo.',
    hallCopy: {
      court: 'La corte ribassata davanti all’edificio: proiezioni, incontri e il lavoro che dentro non ci sta.',
      collection: 'La collezione permanente della pratica ucraina, al livello più basso e più silenzioso.',
      practice: 'Mostre che cambiano: lavoro in corso, materiale di studio, cose ancora in discussione.',
      archive: 'Disegni, bozze, corrispondenza e tutto ciò che un oggetto finito lascia dietro di sé.',
      study: 'La sala di lettura dentro il fusto cieco: un tavolo, una finestra, tutto l’archivio a portata di mano.',
      auditorium: 'Il tamburo accanto all\'edificio: lezioni, proiezioni e discussioni che meritano una stanza propria.',
      workshop: 'Officine basse sotto i lucernari a shed, dove la collezione si ripara, si incornicia e si prepara.',
      terrace: 'Il piano aperto sul tetto: una pergola, tre fioriere e la città oltre il parapetto.',
    },
    collectionIntro: 'Un museo in divenire della pratica ucraina. Ogni oggetto appartiene a una storia più ampia di fare, luogo e memoria culturale.',
    object: 'Oggetto',
    objectDossier: 'Scheda dell’oggetto',
    creator: 'Autore',
    place: 'Luogo',
    date: 'Data',
    material: 'Materiale',
    dimensions: 'Dimensioni',
    catalogueNumber: 'N. di catalogo',
    pending: 'Nota redazionale in preparazione',
    readContext: 'Leggere la ricerca EPRIS',
    archive: 'Archivio della collezione',
    objects: 'oggetti',
    objectCount: 'in collezione',
    openObject: 'Aprire l’oggetto',
  },
  ES: {
    museumLabel: 'MUSEO EPRIS',
    firstSelection: 'Apertura de la colección',
    intro: 'Una colección viva de obras de artistas, diseñadores y arquitectos ucranianos, en Ucrania y en la diáspora.',
    emptyDescription: 'La redacción está preparando la colección. Cada objeto entrará con su autor, su lugar, su material y el contexto que lo hace importante.',
    emptyFoot: 'Las fichas de la colección las publica la redacción.',
    imagePending: 'Archivo de imágenes en preparación',
    modelLabel: 'Maqueta tridimensional del edificio del Museo EPRIS',
    modelHint: 'Arrastre para girar la maqueta',
    modelFallback: 'El navegador dejó de dibujar la maqueta. El edificio sigue aquí.',
    modelRetry: 'Mostrar la maqueta de nuevo',
    openLabel: 'Abrir el espacio',
    closeLabel: 'Cerrar el espacio',
    insideLabel: 'Dentro del edificio del Museo EPRIS: salas, galerías y la caja de escaleras',
    legend: { court: 'Patio', collection: 'Colección', practice: 'Práctica', archive: 'Archivo', study: 'Sala de lectura', auditorium: 'Auditorio', workshop: 'Talleres', terrace: 'Terraza' },
    enterHall: 'Entrar en la sala',
    leaveHall: 'Salir fuera',
    insideHall: 'Está dentro',
    hallsLabel: 'Salas',
    hallsHint: 'Elija un volumen para entrar',
    allHalls: 'Todas las salas',
    accessOpen: 'Abierta',
    accessPassport: 'Con pasaporte EPRIS',
    lockedHint: 'Se abre con un pasaporte EPRIS',
    lockedNote: 'Esta sala se abre con un pasaporte EPRIS. Los pasaportes se entregan a medida que abre la colección.',
    emptyHall: 'Aquí todavía no hay nada montado. Los primeros objetos llegan con la colección.',
    partialHall: 'Las primeras piezas ya están montadas. Sus fichas aún se están escribiendo.',
    hallCopy: {
      court: 'El patio hundido frente al edificio: proyecciones, conversaciones y el trabajo que no cabe dentro.',
      collection: 'La colección permanente de la práctica ucraniana, en el nivel más bajo y más silencioso.',
      practice: 'Exposiciones que cambian: trabajo en curso, material de taller, cosas que aún se discuten.',
      archive: 'Planos, borradores, correspondencia y todo lo que un objeto terminado deja detrás.',
      study: 'La sala de lectura dentro del fuste ciego: una mesa, una ventana, todo el archivo al alcance.',
      auditorium: 'El tambor junto al edificio: conferencias, proyecciones y discusiones que piden su propia sala.',
      workshop: 'Talleres bajos bajo la cubierta en diente de sierra, donde la colección se repara, se enmarca y se prepara.',
      terrace: 'La planta abierta en la cubierta: una pérgola, tres jardineras y la ciudad tras el pretil.',
    },
    collectionIntro: 'Un museo en formación de la práctica ucraniana. Cada objeto pertenece a una historia más amplia de hacer, lugar y memoria cultural.',
    object: 'Objeto',
    objectDossier: 'Ficha del objeto',
    creator: 'Autor',
    place: 'Lugar',
    date: 'Fecha',
    material: 'Material',
    dimensions: 'Dimensiones',
    catalogueNumber: 'N.º de catálogo',
    pending: 'Nota editorial en preparación',
    readContext: 'Leer la investigación de EPRIS',
    archive: 'Archivo de la colección',
    objects: 'objetos',
    objectCount: 'en la colección',
    openObject: 'Abrir el objeto',
  },
  DE: {
    museumLabel: 'EPRIS MUSEUM',
    firstSelection: 'Eröffnung der Sammlung',
    intro: 'Eine lebendige Sammlung von Arbeiten ukrainischer Künstler, Designer und Architekten in der Ukraine und in der Diaspora.',
    emptyDescription: 'Die Sammlung wird von der Redaktion vorbereitet. Jedes Objekt erscheint mit Autor, Ort, Material und dem Kontext, der es bedeutsam macht.',
    emptyFoot: 'Sammlungseinträge werden von der Redaktion veröffentlicht.',
    imagePending: 'Bildarchiv wird vorbereitet',
    modelLabel: 'Dreidimensionales Modell des EPRIS-Museumsgebäudes',
    modelHint: 'Ziehen, um das Modell zu drehen',
    modelFallback: 'Der Browser zeichnet das Modell nicht mehr. Das Gebäude ist weiterhin da.',
    modelRetry: 'Modell erneut anzeigen',
    openLabel: 'Raum öffnen',
    closeLabel: 'Raum schließen',
    insideLabel: 'Im Inneren des EPRIS-Museums: Atrium, Galerien und Rampe',
    legend: { court: 'Hof', collection: 'Sammlung', practice: 'Praxis', archive: 'Archiv', study: 'Lesesaal', auditorium: 'Auditorium', workshop: 'Werkstätten', terrace: 'Terrasse' },
    enterHall: 'Den Saal betreten',
    leaveHall: 'Nach draußen',
    insideHall: 'Sie sind drinnen',
    hallsLabel: 'Säle',
    hallsHint: 'Ein Volumen wählen, um einzutreten',
    allHalls: 'Alle Säle',
    accessOpen: 'Offen',
    accessPassport: 'Mit EPRIS-Pass',
    lockedHint: 'Öffnet sich mit einem EPRIS-Pass',
    lockedNote: 'Dieser Saal öffnet sich mit einem EPRIS-Pass. Die Pässe werden mit der Eröffnung der Sammlung ausgegeben.',
    emptyHall: 'Hier ist noch nichts eingerichtet. Die ersten Objekte kommen mit der Sammlung.',
    partialHall: 'Die ersten Stücke stehen. Ihre Katalogblätter entstehen noch.',
    hallCopy: {
      court: 'Der abgesenkte Hof vor dem Haus: Vorführungen, Gespräche und alles, was drinnen keinen Platz hat.',
      collection: 'Die ständige Sammlung ukrainischer Praxis auf der untersten, ruhigsten Ebene.',
      practice: 'Wechselnde Ausstellungen: Arbeit im Werden, Material aus dem Atelier, Umstrittenes.',
      archive: 'Zeichnungen, Entwürfe, Korrespondenz und alles, was ein fertiges Objekt zurücklässt.',
      study: 'Der Lesesaal im blinden Schacht: ein Tisch, ein Fenster, das ganze Archiv in Reichweite.',
      auditorium: 'Der Zylinder neben dem Haus: Vorträge, Vorführungen und Streitgespräche, die einen eigenen Raum brauchen.',
      workshop: 'Niedrige Werkstätten unter dem Sheddach, wo die Sammlung repariert, gerahmt und vorbereitet wird.',
      terrace: 'Die offene Ebene auf dem Dach: eine Pergola, drei Kübel und die Stadt hinter der Brüstung.',
    },
    collectionIntro: 'Ein wachsendes Museum ukrainischer Praxis. Jedes Objekt gehört zu einer Geschichte von Herstellung, Ort und kulturellem Gedächtnis.',
    object: 'Objekt',
    objectDossier: 'Objektdossier',
    creator: 'Autor',
    place: 'Ort',
    date: 'Datum',
    material: 'Material',
    dimensions: 'Maße',
    catalogueNumber: 'Katalognummer',
    pending: 'Redaktionelle Notiz folgt',
    readContext: 'EPRIS-Recherche lesen',
    archive: 'Sammlungsarchiv',
    objects: 'Objekte',
    objectCount: 'in der Sammlung',
    openObject: 'Objekt öffnen',
  },
} as const;

type MuseumCopy = (typeof MUSEUM_COPY)[keyof typeof MUSEUM_COPY];

function getMuseumCopy(lang: string): MuseumCopy {
  return MUSEUM_COPY[lang as keyof typeof MUSEUM_COPY] || MUSEUM_COPY.EN;
}

function orderWorks(works: FuturoshockWork[]) {
  return [...works].sort((a, b) => {
    const aPosition = a.shelfSlot ?? Number.MAX_SAFE_INTEGER;
    const bPosition = b.shelfSlot ?? Number.MAX_SAFE_INTEGER;
    if (aPosition !== bPosition) return aPosition - bPosition;
    return String(b.updatedAt || b.publishAt || '').localeCompare(String(a.updatedAt || a.publishAt || ''));
  });
}

function WorkImage({ work, copy, priority = false }: { work: FuturoshockWork; copy: MuseumCopy; priority?: boolean }) {
  if (!work.imageUrl) {
    return (
      <div className="flex h-full min-h-[20rem] items-end bg-[#efefeb] p-5 text-[var(--c-accent)] sm:p-8" role="img" aria-label={`Image for ${work.title} is being prepared`}>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.55)]">{copy.imagePending}</span>
      </div>
    );
  }

  return <img src={work.imageUrl} alt={`${work.title} by ${work.author}`} loading={priority ? 'eager' : 'lazy'} className="h-full w-full object-cover" />;
}

function workLine(work: FuturoshockWork) {
  return [work.author, work.location, work.year].filter(Boolean).join(' · ');
}

function catalogueNumber(work: FuturoshockWork, index: number) {
  const year = String(work.year || '').match(/\d{4}/)?.[0] || '2026';
  const position = String(work.shelfSlot || index + 1).padStart(3, '0');
  return `EPRIS ${year}.${position}`;
}

function HallPanel({ copy, hall, onClear, entered, onEnter, onLeave, items, onOpenObject }: {
  copy: MuseumCopy;
  hall: HallId;
  onClear: () => void;
  entered: boolean;
  onEnter: () => void;
  onLeave: () => void;
  items: MuseumObject[];
  onOpenObject: (id: string) => void;
}) {
  const meta = HALLS.find((item) => item.id === hall);
  const locked = meta?.access === 'passport';
  return (
    <div className="flex flex-col gap-5 p-5 sm:p-8 lg:p-12">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{copy.hallsLabel}</p>
        <button
          type="button"
          onClick={onClear}
          className="min-h-11 font-mono text-[9px] uppercase tracking-[0.16em] underline decoration-1 underline-offset-4 transition hover:opacity-60"
        >
          {copy.allHalls}
        </button>
      </div>
      <h2 className="font-display text-[clamp(2.4rem,5vw,3.8rem)] leading-[0.9] tracking-[-0.03em]">{copy.legend[hall]}</h2>
      <p className="max-w-[34rem] text-[15px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.76)]">{copy.hallCopy[hall]}</p>
      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">
        {locked ? copy.accessPassport : copy.accessOpen}
      </p>
      {/* Замок объявлен, но не заперт: паспортов ещё нет, и делать вид, что
          дверь заперта, значило бы обещать механику, которой нет. */}
      <p className="border-t border-[rgb(var(--c-accent-rgb)_/_0.28)] pt-4 text-[14px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.62)]">
        {locked ? copy.lockedNote : WORKS_INSTALLED.has(hall) ? copy.partialHall : copy.emptyHall}
      </p>
      {/* Список того, что стоит в зале. По самим вещам кликают в комнате, но
          мышью попасть в предмет в глубине зала трудно, а с клавиатуры —
          никак. Список делает то же самое и заодно говорит, что здесь есть,
          не заходя внутрь. */}
      {items.length > 0 && (
        <ul className="border-t border-[rgb(var(--c-accent-rgb)_/_0.28)]">
          {items.map((item) => (
            <li key={item.id} className="border-b border-[rgb(var(--c-accent-rgb)_/_0.18)]">
              <button
                type="button"
                onClick={() => onOpenObject(item.id)}
                className="flex min-h-12 w-full items-baseline justify-between gap-4 py-2 text-left transition hover:opacity-60"
              >
                <span className="text-[15px]">{item.title || copy.object}</span>
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.45)]">
                  {[item.author, item.year].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Зал — это место, а не абзац: отсюда в него входят. */}
      <button
        type="button"
        onClick={entered ? onLeave : onEnter}
        className="inline-flex min-h-11 items-center justify-center self-start border border-[var(--c-accent)] px-5 font-mono text-[9px] uppercase tracking-[0.16em] transition hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)]"
      >
        {entered ? copy.leaveHall : copy.enterHall}
      </button>
    </div>
  );
}

/* Залы, в которых уже что-то стоит. Список короткий и лежит рядом с текстом
   намеренно: строчка «здесь пока ничего не смонтировано» под залом с
   работами — это ровно то враньё, ради которого текст и правят. Сам состав
   залов с работами задан в Interior.tsx. */
const WORKS_INSTALLED = new Set<HallId>(['collection', 'practice']);

/* КАРТОЧКА ПРЕДМЕТА В ЗАЛЕ.
 *
 * Ровно те поля, что заполняет редакция, и ни одного придуманного: пустое
 * поле не показывается вовсе, потому что «Автор: —» в музее читается как
 * утверждение, что автор неизвестен, а не что паспорт ещё не дописан. */
function ObjectPanel({ copy, item, onClose }: { copy: MuseumCopy; item: MuseumObject; onClose: () => void }) {
  const rows: [string, string | undefined][] = [
    [copy.creator, item.author],
    [copy.date, item.year],
    [copy.material, item.material],
    [copy.dimensions, item.dimensions],
  ];

  return (
    <div className="flex flex-col gap-6 p-5 sm:p-8 lg:p-12">
      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{copy.objectDossier}</p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] underline underline-offset-4 transition hover:opacity-60"
        >
          {copy.allHalls}
        </button>
      </div>
      <h2 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[0.95] tracking-[-0.03em]">{item.title || copy.object}</h2>
      {item.imageUrl && (
        <img src={item.imageUrl} alt={item.title || copy.object} className="max-h-64 w-full object-cover" loading="lazy" />
      )}
      <dl className="border-t border-[rgb(var(--c-accent-rgb)_/_0.28)]">
        {rows.filter(([, value]) => value).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-6 border-b border-[rgb(var(--c-accent-rgb)_/_0.18)] py-3">
            <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.5)]">{label}</dt>
            <dd className="text-right text-[14px]">{value}</dd>
          </div>
        ))}
      </dl>
      {item.note && <p className="max-w-[34rem] text-[15px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.78)]">{item.note}</p>}
      {item.link && (
        <a
          href={item.link}
          className="inline-flex min-h-11 items-center gap-2 self-start border border-[var(--c-accent)] px-5 font-mono text-[9px] uppercase tracking-[0.16em] transition hover:bg-[var(--c-accent)] hover:text-[var(--c-bg)]"
        >
          {copy.readContext}
          <ArrowUpRight className="h-3 w-3" strokeWidth={1.5} />
        </a>
      )}
    </div>
  );
}

function EmptyVitrine({ copy, hall, onHall, objects }: { copy: MuseumCopy; hall: HallId | null; onHall: (id: HallId | null) => void; objects: MuseumObject[] }) {
  const [entered, setEntered] = useState(false);
  /* Паспорт предмета редакция уже заполняла, но прочитать его было негде:
     вещь стояла в зале молча. Клик по вещи открывает её карточку в колонке
     справа — там же, где стоит описание самого зала. */
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const shown = objects.find((item) => item.id === selectedObject) || null;

  /* Нажать «войти» и остаться смотреть на абзац — это и есть «нажимаю, а где
     комната». После входа страница подводит к самому залу. */
  const enterHall = () => {
    setEntered(true);
    requestAnimationFrame(() => {
      stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  /* Вышли из зала — вышли и из комнаты: состояние не должно пережить смену
     зала, иначе следующий зал открывается уже изнутри чужой комнаты. */
  useEffect(() => { setEntered(false); setSelectedObject(null); }, [hall]);
  /* Пустая коллекция больше не объясняется абзацами о том, что её готовят.
     Вместо описания стоит здание: макет крутится сам и поворачивается мышью,
     а заголовок лежит поверх него, как подпись на архитектурном планшете.

     Объёмы здания кликабельны: выбранный зал занимает правую колонку и
     оказывается в адресе, поэтому на зал можно дать ссылку. */
  return (
    <section aria-labelledby="vitrine-title" className="grid flex-1 lg:grid-cols-[minmax(0,1.18fr)_minmax(22rem,.82fr)]">
      {/* Подложка под холстом: макет стоял на ровной белой плоскости, и кадр
          выглядел не композицией, а вырезом. Мягкий радиальный переход даёт
          свет за зданием и уводит углы в тень. */}
      <div
        ref={stageRef}
        className="relative min-h-[28rem] overflow-hidden border-b border-[rgb(var(--c-accent-rgb)_/_0.9)] sm:min-h-[34rem] lg:min-h-[42rem] lg:border-b-0 lg:border-r"
        style={{
          background:
            'radial-gradient(120% 85% at 50% 32%, #f6f2ec 0%, #ece6dd 46%, #ddd5ca 100%)',
        }}
      >
        <Suspense fallback={<div className="absolute inset-0 bg-[#e9e6e1]" />}>
          <MuseumModel
            label={copy.modelLabel}
            objects={objects}
            onSelectObject={setSelectedObject}
            fallbackLabel={copy.modelFallback}
            retryLabel={copy.modelRetry}
            openLabel={copy.openLabel}
            closeLabel={copy.closeLabel}
            leaveLabel={copy.leaveHall}
            insideLabel={copy.insideLabel}
            labels={copy.legend}
            lockedHint={copy.lockedHint}
            selectedHall={hall}
            onSelectHall={onHall}
            entered={entered}
            onEnter={enterHall}
            onLeave={() => setEntered(false)}
          />
        </Suspense>
        {/* Внутри зала заголовок во всю ширину лежит поперёк комнаты: снаружи
            это подпись на планшете, изнутри — надпись на стене. */}
        {/* Подложка под заголовком: он лежит поверх макета, а макет бывает
            и светлым, и тёмным в одном и том же месте кадра. */}
        {/* Выбран зал — камера подходит к зданию, и подписи объёмов уезжают
            вниз кадра, прямо на слово «Museum» и на надпись над ним. Титул
            принадлежит внешнему виду: как только зал выбран, его имя уже
            стоит в колонке справа, и спорить двум заголовкам незачем. */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--c-bg)] via-[rgb(var(--c-bg-rgb)_/_0.55)] to-transparent transition-opacity duration-500 sm:h-48 ${entered || hall ? 'opacity-0' : 'opacity-100'}`}
        />
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 p-5 transition-opacity duration-500 sm:p-8 lg:p-12 ${entered || hall ? 'opacity-0' : 'opacity-100'}`}>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{copy.firstSelection}</p>
          <h1 id="vitrine-title" className="mt-5 max-w-[7ch] font-display text-[clamp(4rem,9vw,8.5rem)] leading-[0.83] tracking-[-0.05em]">Museum</h1>
        </div>
        {entered && (
          /* Светлый текст поверх светлой стены зала не читался: подпись
             получает свою плашку, как и остальные надписи над холстом. */
          <p className="pointer-events-none absolute left-4 top-4 flex min-h-9 items-center border border-[rgb(var(--c-accent-rgb)_/_0.45)] bg-[rgb(var(--c-bg-rgb)_/_0.92)] px-3 font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--c-accent)] backdrop-blur-[2px] sm:left-6 sm:top-6">
            {copy.insideHall}
          </p>
        )}
      </div>
      <div className="flex flex-col justify-between">
        {hall && shown && entered ? (
          <ObjectPanel copy={copy} item={shown} onClose={() => setSelectedObject(null)} />
        ) : hall ? (
          <HallPanel
            copy={copy}
            hall={hall}
            onClear={() => { setEntered(false); onHall(null); }}
            entered={entered}
            onEnter={enterHall}
            onLeave={() => setEntered(false)}
            items={objects.filter((item) => item.hall === hall)}
            onOpenObject={(id) => { setSelectedObject(id); if (!entered) enterHall(); }}
          />
        ) : (
          <div className="flex flex-col gap-6 p-5 sm:p-8 lg:p-12">
            <div className="flex items-start justify-between gap-4">
              {/* На телефоне та же подпись стоит строкой выше, в шапке раздела:
                  две одинаковые строки подряд — не заголовок, а сбой. */}
              <p className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)] sm:block">{copy.museumLabel}</p>
              <p className="shrink-0 font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.4)]">{copy.modelHint}</p>
            </div>
            {/* Список залов дублирует клик по зданию: макет — не единственный
                способ попасть внутрь, и с клавиатуры он недоступен. */}
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.4)]">{copy.hallsHint}</p>
              <ul className="mt-4">
                {HALLS.map((item) => (
                  <li key={item.id} className="border-t border-[rgb(var(--c-accent-rgb)_/_0.28)] last:border-b">
                    <button
                      type="button"
                      onClick={() => onHall(item.id)}
                      className="flex min-h-14 w-full items-baseline justify-between gap-4 py-3 text-left transition hover:opacity-60"
                    >
                      <span className="font-display text-2xl leading-tight">{copy.legend[item.id]}</span>
                      <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--c-accent-rgb)_/_0.5)]">
                        {item.access === 'passport' ? copy.accessPassport : copy.accessOpen}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <p className="border-t border-[rgb(var(--c-accent-rgb)_/_0.9)] px-5 py-5 font-mono text-[9px] uppercase tracking-[0.15em] text-[rgb(var(--c-accent-rgb)_/_0.56)] sm:px-8 lg:px-12">{copy.emptyFoot}</p>
      </div>
    </section>
  );
}

function VitrineCollection({ works, selectedId, onSelect, copy }: { works: FuturoshockWork[]; selectedId: string | null; onSelect: (id: string) => void; copy: MuseumCopy }) {
  const selected = works.find((work) => work.id === selectedId) || works[0];
  if (!selected) return null;
  const selectedIndex = works.findIndex((work) => work.id === selected.id);

  return (
    <>
      <section aria-labelledby="vitrine-title" className="grid lg:grid-cols-[minmax(0,1.18fr)_minmax(22rem,.82fr)]">
        <figure className="border-b border-[rgb(var(--c-accent-rgb)_/_0.9)] lg:border-b-0 lg:border-r">
          <div className="aspect-[4/3] overflow-hidden bg-[#efefeb] sm:aspect-[16/10] lg:aspect-auto lg:min-h-[42rem]"><WorkImage work={selected} copy={copy} priority /></div>
          <figcaption className="grid gap-3 border-t border-[rgb(var(--c-accent-rgb)_/_0.9)] px-5 py-4 sm:grid-cols-[auto_1fr] sm:items-baseline sm:px-8 lg:px-12">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{selected.medium || selected.format}</span>
            <p className="text-sm leading-relaxed sm:text-right">{workLine(selected)}</p>
          </figcaption>
        </figure>

        <div className="flex min-h-full flex-col">
          <div className="px-5 pb-8 pt-9 sm:px-8 lg:px-12 lg:pb-10 lg:pt-12">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{copy.museumLabel}</p>
            <h1 id="vitrine-title" className="mt-5 font-display text-[clamp(3.4rem,7vw,6.75rem)] leading-[0.86] tracking-[-0.04em]">Museum</h1>
            <p className="mt-7 max-w-[36rem] text-[15px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.76)]">{copy.collectionIntro}</p>
          </div>

          <article id="object-dossier" className="border-y border-[rgb(var(--c-accent-rgb)_/_0.9)] px-5 py-5 sm:px-8 lg:px-12">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{copy.object} {String(selectedIndex + 1).padStart(2, '0')} / {copy.objectDossier}</p>
            <h2 className="mt-3 font-display text-[clamp(2rem,3.8vw,3.7rem)] leading-[0.92]">{selected.title}</h2>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--c-accent-rgb)_/_0.62)]">{catalogueNumber(selected, selectedIndex)}</p>
            {selected.statement && <p className="mt-5 max-w-[37rem] text-[15px] leading-relaxed text-[rgb(var(--c-accent-rgb)_/_0.78)]">{selected.statement}</p>}
            <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-4 border-t border-[rgb(var(--c-accent-rgb)_/_0.2)] pt-5 font-mono text-[9px] uppercase tracking-[0.13em] sm:grid-cols-3">
              <div><dt className="text-[rgb(var(--c-accent-rgb)_/_0.5)]">{copy.creator}</dt><dd className="mt-2 leading-relaxed">{selected.author || copy.pending}</dd></div>
              <div><dt className="text-[rgb(var(--c-accent-rgb)_/_0.5)]">{copy.place}</dt><dd className="mt-2 leading-relaxed">{selected.location || copy.pending}</dd></div>
              <div><dt className="text-[rgb(var(--c-accent-rgb)_/_0.5)]">{copy.date}</dt><dd className="mt-2 leading-relaxed">{selected.year || copy.pending}</dd></div>
              <div><dt className="text-[rgb(var(--c-accent-rgb)_/_0.5)]">{copy.material}</dt><dd className="mt-2 leading-relaxed">{selected.materials?.join(', ') || selected.medium || copy.pending}</dd></div>
              <div><dt className="text-[rgb(var(--c-accent-rgb)_/_0.5)]">{copy.dimensions}</dt><dd className="mt-2 leading-relaxed">{selected.dimensions || selected.edition || copy.pending}</dd></div>
              <div><dt className="text-[rgb(var(--c-accent-rgb)_/_0.5)]">{copy.catalogueNumber}</dt><dd className="mt-2 leading-relaxed">{catalogueNumber(selected, selectedIndex)}</dd></div>
            </dl>
            {selected.relatedArticleUrl && <a href={selected.relatedArticleUrl} className="mt-7 inline-flex min-h-11 items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] underline decoration-1 underline-offset-4 transition hover:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--c-accent)]">{copy.readContext} <ArrowUpRight size={13} aria-hidden="true" /></a>}
          </article>

        </div>
      </section>

      <section aria-labelledby="collection-archive-title" className="border-t border-[rgb(var(--c-accent-rgb)_/_0.9)]">
        <div className="px-5 py-8 sm:px-8 lg:px-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="collection-archive-title" className="font-display text-3xl sm:text-4xl">{copy.archive}</h2>
            <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{works.length} {copy.objectCount}</span>
          </div>
          <ol className="mt-6 border-t border-[rgb(var(--c-accent-rgb)_/_0.9)]">
            {works.map((work, index) => <li key={work.id} className="border-b border-[rgb(var(--c-accent-rgb)_/_0.9)]"><button type="button" onClick={() => { onSelect(work.id); document.getElementById('object-dossier')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} aria-pressed={selected.id === work.id} className={`group grid min-h-24 w-full grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3 text-left transition hover:bg-[rgb(var(--c-accent-rgb)_/_0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--c-accent)] sm:grid-cols-[5rem_minmax(0,1.3fr)_minmax(9rem,.7fr)_auto] sm:gap-5 ${selected.id === work.id ? 'bg-[rgb(var(--c-accent-rgb)_/_0.06)]' : ''}`}><span className="font-mono text-[10px] text-[rgb(var(--c-accent-rgb)_/_0.52)]">{String(index + 1).padStart(2, '0')}</span><span className="min-w-0"><span className="block font-display text-xl leading-tight sm:text-2xl">{work.title}</span><span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.13em] text-[rgb(var(--c-accent-rgb)_/_0.56)]">{catalogueNumber(work, index)}</span></span><span className="hidden font-mono text-[9px] uppercase tracking-[0.13em] text-[rgb(var(--c-accent-rgb)_/_0.62)] sm:block">{workLine(work)}</span><span className="inline-flex min-h-11 items-center gap-2 pr-1 font-mono text-[8px] uppercase tracking-[0.13em] underline decoration-1 underline-offset-4 transition group-hover:opacity-55">{copy.openObject}<ArrowUpRight size={13} aria-hidden="true" /></span></button></li>)}
          </ol>
        </div>
      </section>
    </>
  );
}

export function VitrinePage({ lang = 'EN', hall, onHallChange }: { lang?: string; hall?: string; onHallChange?: (hall: string | null) => void }) {
  const [works, setWorks] = useState<FuturoshockWork[]>(() => orderWorks(getFuturoshock()));
  /* Расстановка предметов приходит из того же контента, что и всё остальное:
     редакция двигает вещи в админке, страница подхватывает без сборки. */
  const [museumObjects, setMuseumObjects] = useState<MuseumObject[]>(() => getMuseumObjects());
  const [selectedId, setSelectedId] = useState<string | null>(() => works[0]?.id || null);
  const copy = getMuseumCopy(lang);
  /* Зал живёт в адресе, а не в состоянии страницы: неизвестное имя в ссылке
     не должно ломать экран — оно просто открывает музей целиком. */
  const activeHall = (HALLS.find((item) => item.id === hall)?.id ?? null) as HallId | null;
  const setHall = (next: HallId | null) => onHallChange?.(next);

  /* Выдуманное имя зала в ссылке открывало музей целиком, но оставалось в
     адресной строке и в истории: посетитель видел путь, которого нет.
     Адрес приводится к разделу, без новой записи в истории. */
  useEffect(() => {
    if (hall && !activeHall) onHallChange?.(null);
  }, [activeHall, hall, onHallChange]);

  useEffect(() => subscribeContent(() => {
    setWorks(orderWorks(getFuturoshock()));
    setMuseumObjects(getMuseumObjects());
  }), []);
  useEffect(() => {
    if (!works.some((work) => work.id === selectedId)) setSelectedId(works[0]?.id || null);
  }, [selectedId, works]);
  useEffect(() => {
    document.title = 'EPRIS Museum | EPRIS Journal';
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = 'https://eprisjournal.com/museum';
  }, []);

  /* Контейнер тянется на всю высоту экрана: иначе на большом мониторе разворот
     обрывается посреди страницы, боковые линейки заканчиваются в никуда, и под
     ними остаётся белое поле, которое читается как недогруженная страница. */
  return <main className="flex min-h-screen flex-col bg-[var(--c-bg)] pt-16 text-[var(--c-accent)]"><div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col border-x border-[rgb(var(--c-accent-rgb)_/_0.9)]"><header className="flex items-center justify-between gap-4 border-b border-[rgb(var(--c-accent-rgb)_/_0.9)] px-5 py-3 sm:px-8 lg:px-12"><p className="font-mono text-[9px] uppercase tracking-[0.18em] sm:text-[10px]">{copy.museumLabel}</p><span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--c-accent-rgb)_/_0.55)]">{String(works.length || museumObjects.length).padStart(2, '0')} {copy.objects}</span></header>{works.length === 0 ? <EmptyVitrine copy={copy} hall={activeHall} onHall={setHall} objects={museumObjects} /> : <VitrineCollection works={works} selectedId={selectedId} onSelect={setSelectedId} copy={copy} />}</div></main>;
}
