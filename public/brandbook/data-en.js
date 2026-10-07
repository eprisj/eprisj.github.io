(() => {
  const b = window.EPRIS_BRANDBOOK;
  b.defaults = {
    intro: 'The working standards for EPRIS Journal. Use this guide when writing, commissioning photography or building an editorial page.',
    identity: [
      {title:'Scope',body:'EPRIS is an independent journal about architecture, art, design and contemporary culture. Articles, interviews, reviews and visual essays are the core formats.'},
      {title:'Editorial standard',body:'Every published piece must have a clear subject, verified names and dates, credited images and an edited English text. The design supports the material and does not add a second narrative.'},
      {title:'Visual identity',body:'Black and white, serif reading type, monospaced metadata, thin rules and square image frames. These elements remain consistent across sections.'},
    ],
    rules: [
      'Use black, white and neutral grey only. Editorial images provide the colour.',
      'Create hierarchy with type size, weight, spacing and rules.',
      'Use monospaced type for navigation, dates, categories, captions and metadata only.',
      'Use serif type for titles, standfirsts and long-form reading. Do not add letter spacing to body copy.',
      'Use square corners for images, cards and editorial panels. Rounded corners are limited to controls.',
      'Use one-pixel borders instead of decorative shadows.',
      'Keep body text at 16 pixels or larger on mobile and maintain a readable line length.',
    ],
    components: [
      {name:'Button',anatomy:'A short action inside a one-pixel rounded outline.',spec:['Use a verb that describes the result.','Use black fill for the primary action and outline for secondary actions.','Minimum touch target: 44 by 44 pixels.'],dont:'Do not use gradients, shadows or vague labels such as “Continue”.'},
      {name:'Category label',anatomy:'A short uppercase label in monospaced type.',spec:['Use one category per item.','Place it above the title or on a solid white field over an image.','Keep the wording consistent across the site.'],dont:'Do not assign different colours to categories.'},
      {name:'Editorial card',anatomy:'Image, category, title, standfirst and credit inside a square frame.',spec:['Use a one-pixel border.','Set the title in sentence case.','Keep image ratios consistent within a row.'],dont:'Do not add rounded corners or a drop shadow.'},
      {name:'Pull quote',anatomy:'A short quotation set larger than body copy and marked by a black rule.',spec:['Use the speaker’s exact words.','Keep attribution next to the quote.'],dont:'Do not use a pull quote to repeat the headline.'},
      {name:'Rule',anatomy:'A one-pixel black or grey line.',spec:['Use it to separate sections or metadata.','Keep the same weight throughout a page.'],dont:'Do not place rules between every paragraph.'},
      {name:'Image caption',anatomy:'Object or work, place, year and credit in monospaced metadata.',spec:['Credit every image according to its licence or supplied credit line.','Keep captions directly attached to their image.'],dont:'Do not repeat the headline or add unsupported interpretation.'},
    ],
    dodont: [
      {topic:'Headline',good:'Serif, sentence case, no added tracking.',bad:'Spaced uppercase: that treatment belongs to metadata.'},
      {topic:'Metadata',good:'Uppercase, compact and clearly tracked.',bad:'Mixed with reading copy inside a paragraph.'},
      {topic:'Emphasis',good:'Scale, weight, spacing or a black rule.',bad:'A decorative colour or effect.'},
      {topic:'Card',good:'Square corners, fine border, no shadow.',bad:'A rounded card floating on a soft shadow.'},
      {topic:'Button',good:'Outline at rest, black on interaction.',bad:'Gradient, colour accent or decorative elevation.'},
      {topic:'Spacing',good:'A consistent rhythm of 8, 16, 24 and 32.',bad:'Unrelated gaps adjusted by eye.'},
    ],
    imagery: [
      {title:'Ratios',body:'Use 16:9 for standard story cards, 4:3 for covers and lead features, and 1:1 for contributor portraits.'},
      {title:'Selection',body:'Choose images that explain the subject: overall view, spatial context, material detail and human scale. Avoid several near-identical views.'},
      {title:'Treatment',body:'Preserve natural colour, highlight detail and readable shadows. Do not apply a house filter.'},
      {title:'Rights and credits',body:'Publish only images with documented permission or a compatible licence. Store the required credit and source with the file.'},
      {title:'Delivery',body:'Use WebP or AVIF where possible. Supply at least 1600 pixels for cards and 2400 pixels for covers; use the story slug in the filename.'},
    ],
    voice: [
      {good:'Read',bad:'Discover more now',note:'Interface labels use the shortest clear action.'},
      {good:'Olea, Limassol',bad:'A review of the Olea restaurant in Limassol',note:'A standfirst adds information instead of repeating the content type.'},
      {good:'The middle loses tension.',bad:'There are a few small issues, but overall it is quite good.',note:'Criticism identifies the issue and avoids filler.'},
      {good:'The exhibition closed on 13 September 2026.',bad:'The exhibition has recently finished.',note:'Use specific dates and verifiable facts.'},
    ],
    a11y: ['Body text must meet a contrast ratio of at least 4.5:1.','Keyboard focus must remain visible.','Touch targets must be at least 44 by 44 pixels.','Meaningful images require concise alternative text; decorative images use empty alternative text.','Pages must remain usable at 200% zoom without horizontal scrolling.','Motion must respect the reduced-motion preference.'],
    motionRules: ['Use motion only to explain a change of state or location.','Animate opacity and transform; avoid layout-dependent animation.','Keep interface transitions between 150 and 300 milliseconds.','Do not replay entrance effects every time a section returns to view.','When reduced motion is enabled, show content immediately.'],
    refs: [
      {group:'Standards',name:'WCAG 2.2',url:'https://www.w3.org/TR/WCAG22/',why:'Accessibility requirements for contrast, keyboard operation, focus and reflow.',take:'Check every new component against the relevant success criteria.'},
      {group:'Standards',name:'Web Content Accessibility Guidelines — contrast',url:'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',why:'Method and thresholds used for the contrast examples on this page.',take:'Normal text requires at least 4.5:1.'},
      {group:'Assets',name:'Google Fonts',url:'https://fonts.google.com',why:'Source for Playfair Display, PT Serif and PT Sans.',take:'Use the specified families and weights.'},
    ],
  };
  const roles=['Navigation, dates, categories, captions and metadata. Never inside reading paragraphs.','Feature titles and cover-scale statements.','Long-form essays and article introductions.','Forms, controls and supporting interface text.','Selected quotations and literary openings.'];
  const samples=['EPRIS JOURNAL — ISSUE 04 / MMXXVI','A room for slower attention','Every issue gives attention a shape.','Subscribe to the journal','We write about what cannot be reduced to news.']; b.fonts.forEach((x,i)=>{x.role=roles[i];x.sample=samples[i]});
  const scaleNames=['utility','caption','category','metadata','standfirst','body','lead','subheading','headline','cover']; const scaleRoles=['Copyright and technical marks.','Image captions, dates and tags.','Categories, navigation and controls.','Author, reading time and card data.','Card summaries.','Article body copy.','Opening paragraph.','Article section headings.','Story title.','Cover and lead-feature title.']; b.scale.forEach((x,i)=>{x.name=scaleNames[i];x.role=scaleRoles[i]});
  b.space=[['8 / 12 / 16','Within controls and cards.'],['24 / 32','Between blocks inside a section.'],['64 / 96','Between page sections.'],['1200 pixels','Maximum reading canvas; galleries may extend to 1600.']];
  b.motion=[['0.2 s','Colour, focus and active-state changes.'],['0.3 s','Element entrance and preview expansion.'],['0.5 s','Section reveals and page transitions.']];
  b.palette = {
    core:[
      {hex:'#000000',name:'Black',onDark:true,role:'Primary type, rules, controls and dark editorial fields.'},
      {hex:'#ffffff',name:'White',role:'The principal page and reading surface.'}
    ],
    cream:[
      {hex:'#f7f7f7',name:'Soft white',role:'A subtle secondary surface.'},
      {hex:'#ededed',name:'Light grey',role:'Dividers and quiet recessed fields.'},
      {hex:'#666666',name:'Mid grey',onDark:true,role:'Secondary information only.'}
    ],
    state:[
      {hex:'#000000',name:'Active',onDark:true,role:'Selected and confirmed states.'},
      {hex:'#333333',name:'Attention',onDark:true,role:'Warnings expressed with text and icon as well as tone.'},
      {hex:'#999999',name:'Inactive',role:'Disabled and unavailable states.'}
    ],
    surfaces:[
      {hex:'#ffffff',name:'white',on:'#000000'},{hex:'#f7f7f7',name:'soft white',on:'#000000'},{hex:'#ededed',name:'light grey',on:'#000000'},
      {hex:'#333333',name:'charcoal',on:'#ffffff'},{hex:'#111111',name:'near black',on:'#ffffff'},{hex:'#000000',name:'black',on:'#ffffff'}
    ]
  };
})();
