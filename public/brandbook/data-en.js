(() => {
  const b = window.EPRIS_BRANDBOOK;
  b.defaults = {
    intro: 'A practical guide to how EPRIS looks, reads and moves: colour, typography, imagery, voice and interface. One clear system for editors, writers, photographers and collaborators.',
    identity: [
      {title:'What EPRIS is',body:'An independent journal devoted to architecture, art, design and contemporary culture. It is conceived as an issue rather than a feed: measured, edited and made to be revisited.'},
      {title:'Editorial tone',body:'Quiet, exact and curious. The interface never competes with the work. Space, fine rules and deliberate pacing replace decoration and urgency.'},
      {title:'Recognisable in three details',body:'Burgundy ink on warm paper. Widely tracked capitals for editorial metadata. Square corners for images and reading surfaces.'},
    ],
    rules: [
      'Burgundy is primarily an ink colour. It becomes a background only in selected dark editorial fields.',
      'Gold is an accent, never a body-text colour: use it for rules, numbering and categories.',
      'Monospaced type belongs to navigation, dates, captions and metadata. It never interrupts a long-form paragraph.',
      'Reading type is never letter-spaced. Its rhythm comes from line height, measure and paragraph spacing.',
      'Images, covers and editorial panels use square corners. Rounded forms are reserved for controls.',
      'Depth is created with paper tones and borders, not diffuse shadows.',
      'Small type is reserved for short service information. Body copy remains comfortably readable.',
    ],
    components: [
      {name:'Button',anatomy:'A one-pixel oval outline with a short, clearly named action.',spec:['Transparent at rest.','Burgundy fill on hover or press, without movement.','Reversed on dark surfaces.'],dont:'Do not make every action solid. EPRIS controls should remain quiet.'},
      {name:'Category label',anatomy:'A short uppercase label with generous tracking and no frame.',spec:['On photography, use a pale translucent field.','Without photography, use the gold accent.','One category per card.'],dont:'Do not colour-code subjects. The word carries the meaning.'},
      {name:'Editorial card',anatomy:'A paper surface, fine border, image above and square corners.',spec:['Image, category, title, standfirst, rule and credit.','Titles use the reading serif in sentence case.','Credits align at the foot of a group.'],dont:'Do not add a shadow or rounded corners. The card is a page, not an app tile.'},
      {name:'Pull quote',anatomy:'A larger reading line with a narrow gold rule.',spec:['One thought the reader can carry away.','Keep it concise enough to read at a glance.'],dont:'Do not add quotation marks when the rule already establishes the form.'},
      {name:'Rule',anatomy:'A one-pixel burgundy line at low opacity.',spec:['Use it to separate meaning.','One decisive rule is stronger than several decorative ones.'],dont:'Do not place a rule directly beneath every heading.'},
      {name:'Image caption',anatomy:'Small, tracked metadata in a restrained colour.',spec:['Object, place, year; then credit where required.','Use continuous numbering only inside a gallery.'],dont:'Do not repeat the title in the caption.'},
    ],
    dodont: [
      {topic:'Headline',good:'Serif, sentence case, no added tracking.',bad:'Spaced uppercase: that treatment belongs to metadata.'},
      {topic:'Metadata',good:'Uppercase, compact and clearly tracked.',bad:'Mixed with reading copy inside a paragraph.'},
      {topic:'Accent',good:'A gold rule or short category label.',bad:'A gold paragraph on a pale surface.'},
      {topic:'Card',good:'Square corners, fine border, no shadow.',bad:'A rounded card floating on a soft shadow.'},
      {topic:'Button',good:'Outline at rest, burgundy on interaction.',bad:'Gradient, bounce or decorative elevation.'},
      {topic:'Spacing',good:'A consistent rhythm of 8, 16, 24 and 32.',bad:'Unrelated gaps adjusted by eye.'},
    ],
    imagery: [
      {title:'Proportion',body:'Use 16:9 for story cards, 4:3 for covers and lead features, and 1:1 for author portraits.'},
      {title:'Treatment',body:'Warm, lightly restrained colour and open tonal detail. Avoid crushed shadows: retain material and atmosphere.'},
      {title:'Point of view',body:'Objects, spaces and relations matter more than a frontal face. Emptiness is an active part of the frame.'},
      {title:'What to avoid',body:'Stock expressions, heavy filters, framed collages, shadows and promotional text across photographs.'},
      {title:'Delivery',body:'Use WebP where possible: 1600 pixels for cards and 2400 for covers. Name files from the story slug.'},
    ],
    voice: [
      {good:'Read',bad:'DISCOVER MORE NOW →',note:'Controls use the shortest unambiguous action.'},
      {good:'Issue 04 · MMXXVI',bad:'Our fourth issue for the year 2026',note:'Issue information is compact and typographic.'},
      {good:'Olea, Limassol',bad:'A review of the Olea restaurant in Limassol',note:'A standfirst names the subject instead of repeating the format.'},
      {good:'The middle loses tension.',bad:'One small downside is that it occasionally feels a little slow.',note:'Criticism is precise and does not apologise for itself.'},
    ],
    a11y: ['Body text maintains a contrast ratio of at least 4.5:1.','Gold is decorative on light paper and is never used for essential text.','Keyboard focus is always visible.','Every touch target is at least 44 by 44 pixels.','Meaningful images have useful alternative text.','Motion respects the reduced-motion preference.'],
    motionRules: ['Use one easing character across the site.','Animate opacity and position, not layout dimensions.','Reveal a section once rather than on every scroll.','When reduced motion is enabled, content appears immediately.'],
    refs: [
      {group:'Editorial references',name:'The Gentlewoman',url:'https://thegentlewoman.co.uk',why:'A model of quiet structure, generous fields and restrained colour.',take:'Space can establish authority more effectively than decoration.'},
      {group:'Editorial references',name:'Apartamento',url:'https://www.apartamentomagazine.com',why:'Direct photography paired with disciplined typography.',take:'Images may remain tactile and unpolished without becoming casual.'},
      {group:'Editorial references',name:'Kinfolk',url:'https://www.kinfolk.com',why:'Warm paper and spacious long-form layouts.',take:'A generous line height helps serious text remain inviting.'},
      {group:'Editorial references',name:'MUBI Notebook',url:'https://mubi.com/en/notebook',why:'Criticism with clear hierarchy and minimal interface furniture.',take:'Reviews need a strong proposition, not visual noise.'},
      {group:'Editorial references',name:'032c',url:'https://032c.com',why:'A useful opposite pole: aggressive typography and abrupt fields.',take:'It clarifies the boundary beyond which EPRIS stops sounding like itself.'},
      {group:'Standards and tools',name:'WCAG 2.2',url:'https://www.w3.org/TR/WCAG22/#contrast-minimum',why:'The accessibility standard used for contrast.',take:'Visual restraint must never reduce usability.'},
      {group:'Standards and tools',name:'Google Fonts',url:'https://fonts.google.com',why:'Source for the approved editorial families.',take:'Use the approved families rather than near substitutes.'},
    ],
  };
  const words = {
    '#4a1728':['Burgundy','Primary ink: body text, headings, rules and active states.'], '#b8956e':['Gold','Accent for categories, numbering and rules.'], '#f5f0eb':['Paper','The principal page surface and visual temperature.'], '#1a0b10':['Ink','Maximum contrast for dark sections and image fields.'],
    '#f5eddc':['Light cream','Cards and editorial inserts.'], '#ede1c6':['Cream','Issue covers and document surfaces.'], '#e7d8b8':['Deep cream','Rules and subtle depth.'], '#4a7c59':['Success','Confirmation and completion.'], '#b33939':['Error','Errors and destructive actions.'], '#b8860b':['Attention','Warnings, drafts and pending states.']
  };
  [...b.palette.core,...b.palette.cream,...b.palette.state].forEach(x=>{if(words[x.hex]) [x.name,x.role]=words[x.hex]});
  const surfaceNames=['raised paper','paper','recessed paper','dark field','ink','deep ink']; b.palette.surfaces.forEach((x,i)=>x.name=surfaceNames[i]);
  const roles=['Navigation, dates, categories, captions and metadata. Never inside reading paragraphs.','Feature titles and cover-scale statements.','Long-form essays and article introductions.','Forms, controls and supporting interface text.','Selected quotations and literary openings.'];
  const samples=['EPRIS JOURNAL — ISSUE 04 / MMXXVI','A room for slower attention','Every issue gives attention a shape.','Subscribe to the journal','We write about what cannot be reduced to news.']; b.fonts.forEach((x,i)=>{x.role=roles[i];x.sample=samples[i]});
  const scaleNames=['utility','caption','category','metadata','standfirst','body','lead','subheading','headline','cover']; const scaleRoles=['Copyright and technical marks.','Image captions, dates and tags.','Categories, navigation and controls.','Author, reading time and card data.','Card summaries.','Article body copy.','Opening paragraph.','Article section headings.','Story title.','Cover and lead-feature title.']; b.scale.forEach((x,i)=>{x.name=scaleNames[i];x.role=scaleRoles[i]});
  b.space=[['8 / 12 / 16','Within controls and cards.'],['24 / 32','Between blocks inside a section.'],['64 / 96','Between page sections.'],['1200 pixels','Maximum reading canvas; galleries may extend to 1600.']];
  b.motion=[['0.2 s','Colour, focus and active-state changes.'],['0.3 s','Element entrance and preview expansion.'],['0.5 s','Section reveals and page transitions.']];
})();
