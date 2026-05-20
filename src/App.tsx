import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, ReactNode, useState, useEffect, useCallback, FormEvent } from 'react';
import {
  Article,
  ContentBlock,
  DEFAULT_LANGUAGE,
  getAvailableLanguages,
  getContentForLanguage,
  Item,
  LibraryItem,
  Review,
  translations
} from './data';
import { Search, Folder, Star, ArrowUpRight, Download, FileText, BookOpen, Menu, X, Globe, MapPin, ExternalLink, ArrowLeft, Quote, Play, Music, Image as ImageIcon, CheckSquare, Square, BarChart, Lightbulb } from 'lucide-react';

function getTranslation(lang: string, key: string) {
  return translations[lang]?.[key] || translations[DEFAULT_LANGUAGE]?.[key] || key;
}

function isCustomMediaReference(value: string): boolean {
  return /^(https?:)?\/\//i.test(value) || value.startsWith('/') || value.startsWith('./') || value.startsWith('../') || value.startsWith('data:') || value.startsWith('blob:');
}

function resolveMediaSource(value: string | undefined, width: number, height: number): string {
  const normalized = (value || '').trim();
  if (!normalized) {
    return '';
  }

  if (isCustomMediaReference(normalized)) {
    return normalized;
  }

  return `https://picsum.photos/seed/${encodeURIComponent(normalized)}/${width}/${height}?grayscale`;
}

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.8, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}

function NavBar({
  activeTab,
  setActiveTab,
  currentLang,
  setCurrentLang,
  t,
  languages,
  libraryCount
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentLang: string;
  setCurrentLang: (lang: string) => void;
  t: (key: string) => string;
  languages: string[];
  libraryCount: number;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'gallery', label: t('nav.gallery') },
    { id: 'articles', label: t('nav.articles') },
    { id: 'reviews', label: t('nav.reviews') },
    { id: 'library', label: t('nav.library') },
    { id: 'about', label: t('nav.about') },
  ];

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    // In a real app, this would trigger a search. 
    // For now, we'll just close the overlay and maybe log it.
    console.log("Searching for:", searchQuery);
    setIsSearchOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#F5F0EB] border-b border-[#501a2c] flex text-xs font-mono uppercase tracking-widest text-[#501a2c] h-16">
        {/* Logo Section */}
        <div className="w-full md:w-64 border-r-0 md:border-r border-[#501a2c] p-4 flex items-center justify-between md:justify-start gap-3 shrink-0 cursor-pointer bg-[#F5F0EB] z-50">
          <div className="flex items-center gap-3" onClick={() => setActiveTab('gallery')}>
            <div className="w-4 h-4 border border-[#501a2c] rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-[#501a2c] rounded-full" />
            </div>
            <span className="font-bold tracking-[0.2em] whitespace-nowrap">EPRIS JOURNAL</span>
          </div>
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:grid flex-1 grid-cols-5 divide-x divide-[#501a2c]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center transition-colors group h-full ${
                activeTab === tab.id ? 'bg-[#501a2c] text-[#F5F0EB]' : 'hover:bg-[#501a2c] hover:text-[#F5F0EB]'
              }`}
            >
              <span className="font-bold">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Desktop Right Section */}
        <div className="hidden md:flex divide-x divide-[#501a2c] border-l border-[#501a2c]">
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="w-16 flex items-center justify-center hover:bg-[#501a2c] hover:text-[#F5F0EB] transition-colors"
          >
            <Search size={16} />
          </button>
          
          <div className="relative w-16 group">
            <button 
              className="w-full h-full flex items-center justify-center hover:bg-[#501a2c] hover:text-[#F5F0EB] transition-colors"
              onClick={() => setIsLangOpen(!isLangOpen)}
            >
              {currentLang}
            </button>
            <div className="absolute top-full right-0 w-16 bg-[#F5F0EB] border-x border-b border-[#501a2c] hidden group-hover:block">
              {languages.filter(l => l !== currentLang).map(lang => (
                <button 
                  key={lang}
                  onClick={() => setCurrentLang(lang)}
                  className="w-full py-2 hover:bg-[#501a2c] hover:text-[#F5F0EB] transition-colors block text-center border-b border-[#501a2c]/20 last:border-0"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('library')}
            className={`w-24 flex flex-col items-center justify-center transition-colors gap-1 ${
              activeTab === 'library' ? 'bg-[#501a2c] text-[#F5F0EB]' : 'hover:bg-[#501a2c] hover:text-[#F5F0EB]'
            }`}
          >
            <Folder size={16} />
            <span className="text-[9px]">{t('files')} ({libraryCount})</span>
          </button>
        </div>
      </nav>

      {/* Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-[#F5F0EB]/95 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <button 
              onClick={() => setIsSearchOpen(false)}
              className="absolute top-8 right-8 p-2 hover:bg-[#501a2c] hover:text-[#F5F0EB] rounded-full transition-colors border border-[#501a2c]"
            >
              <X size={24} />
            </button>
            <form onSubmit={handleSearch} className="w-full max-w-3xl">
              <input 
                type="text" 
                placeholder={t('search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-b-2 border-[#501a2c] text-3xl md:text-5xl font-serif text-[#501a2c] placeholder-[#501a2c]/20 focus:outline-none py-4 text-center"
                autoFocus
              />
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 w-full h-[calc(100vh-4rem)] bg-[#F5F0EB] z-40 flex flex-col md:hidden overflow-y-auto"
          >
            <div className="flex flex-col divide-y divide-[#501a2c] border-b border-[#501a2c]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMenuOpen(false);
                  }}
                  className={`p-6 flex items-center justify-between text-left ${
                    activeTab === tab.id ? 'bg-[#501a2c] text-[#F5F0EB]' : ''
                  }`}
                >
                  <span className="font-bold text-lg">{tab.label}</span>
                </button>
              ))}
            </div>
            
            <div className="mt-auto border-t border-[#501a2c]">
              <div className="grid grid-cols-3 sm:grid-cols-4 divide-x divide-[#501a2c] border-b border-[#501a2c]">
                {languages.map(lang => (
                  <button 
                    key={lang}
                    onClick={() => setCurrentLang(lang)}
                    className={`p-4 text-center hover:bg-[#501a2c] hover:text-[#F5F0EB] ${currentLang === lang ? 'bg-[#501a2c] text-[#F5F0EB]' : ''}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <div className="p-4 flex justify-center gap-8">
                <button onClick={() => { setIsMenuOpen(false); setIsSearchOpen(true); }}>
                  <Search size={24} />
                </button>
                <button onClick={() => { setIsMenuOpen(false); setActiveTab('library'); }}>
                  <Folder size={24} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Hero({ t }: { t: (key: string) => string }) {
  return (
    <section className="relative pt-16 border-b border-[#501a2c]/20">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-1 md:grid-cols-3 items-end px-4 sm:px-8 md:px-16 py-10 sm:py-16 md:py-28 gap-4 md:gap-8"
      >
        {/* Left: EPRIS masthead */}
        <div className="text-center md:text-left">
          <p className="font-mono text-4xl sm:text-5xl md:text-7xl tracking-[0.13em] text-[#501a2c] leading-none">EPRIS</p>
          <p className="font-mono text-sm tracking-[0.13em] text-[#501a2c]/50 uppercase mt-1">journal.</p>
        </div>

        {/* Center: categories tagline */}
        <div className="flex items-end justify-center pb-1">
          <p className="font-mono text-xs md:text-sm tracking-[0.13em] text-[#501a2c]/50 uppercase text-center">
            {t('hero.tagline1')}
          </p>
        </div>

        {/* Right: brand tagline */}
        <div className="flex items-end justify-center md:justify-end pb-1">
          <p className="font-mono text-xs md:text-sm tracking-[0.13em] text-[#501a2c]/50 uppercase text-center md:text-right">
            {t('hero.tagline2')}
          </p>
        </div>
      </motion.div>
    </section>
  );
}

function AboutSection({ t }: { t: (key: string) => string }) {
  return (
    <div className="max-w-4xl mx-auto">
      <Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
          <div className="aspect-[3/4] bg-[#E8DED5] relative overflow-hidden">
             <img 
               src="https://picsum.photos/seed/mariia-ivanova/800/1000?grayscale"
               alt="Mariia Ivanova"
               className="w-full h-full object-cover grayscale"
               referrerPolicy="no-referrer"
             />
          </div>
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[#501a2c]/60 mb-4">
              {t('editor')}
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-6xl text-[#501a2c] mb-6 sm:mb-8">
              Mariia Ivanova
            </h2>
            <div className="prose prose-lg prose-stone font-serif text-[#501a2c]/80">
              <p className="mb-6">
                {t('about.quote1')}
              </p>
              <p>
                {t('about.bio')}
              </p>
            </div>
            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-[#501a2c]/20 flex flex-col sm:flex-row gap-6 sm:gap-8">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 mb-1">{t('about.contact')}</div>
                <a href="mailto:editor@eprisjournal.com" className="font-serif text-lg text-[#501a2c] hover:text-[#C9A690] transition-colors">editor@eprisjournal.com</a>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 mb-1">{t('about.social')}</div>
                <div className="flex gap-4 font-serif text-lg text-[#501a2c]">
                  <a href="#" className="hover:text-[#C9A690] transition-colors">Instagram</a>
                  <a href="#" className="hover:text-[#C9A690] transition-colors">Twitter</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="border-t border-[#501a2c] pt-24">
          <h3 className="font-serif text-3xl md:text-4xl text-[#501a2c] mb-12 text-center">{t('about.manifesto')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="w-12 h-12 rounded-full border border-[#501a2c] flex items-center justify-center mx-auto mb-6 text-[#501a2c]">01</div>
                            <h4 className="font-mono text-xs uppercase tracking-widest mb-4">{t('about.slowdown')}</h4>
                            <p className="font-serif text-[#501a2c]/80">{t('about.slowdown.desc')}</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full border border-[#501a2c] flex items-center justify-center mx-auto mb-6 text-[#501a2c]">02</div>
                            <h4 className="font-mono text-xs uppercase tracking-widest mb-4">{t('about.curate')}</h4>
                            <p className="font-serif text-[#501a2c]/80">{t('about.curate.desc')}</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full border border-[#501a2c] flex items-center justify-center mx-auto mb-6 text-[#501a2c]">03</div>
                            <h4 className="font-mono text-xs uppercase tracking-widest mb-4">{t('about.preserve')}</h4>
                            <p className="font-serif text-[#501a2c]/80">{t('about.preserve.desc')}</p>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function WelcomingLetter({ t }: { t: (key: string) => string }) {
  return (
    <Reveal>
      <section className="mb-16 py-16 border-b border-[#501a2c]/20">
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-serif text-xl md:text-2xl text-[#501a2c]/70 leading-relaxed mb-10 italic">
            {t('hero.quote')}
          </p>
          <div>
            <p style={{ fontFamily: "'Zeyada', cursive" }} className="text-4xl text-[#501a2c] tracking-[0.04em]">Mariia Ivanova</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-[#501a2c]/50 mt-1">Editor-in-Chief</p>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

function GallerySection({ items }: { items: Item[] }) {
  if (items.length === 0) return null;
  const [featured, ...rest] = items;

  return (
    <div>
      {/* Featured article */}
      <Reveal>
        <div className="grid grid-cols-1 md:grid-cols-3 mb-12 border border-[#501a2c] group cursor-pointer overflow-hidden">
          <div className="md:col-span-2 aspect-[4/3] overflow-hidden bg-[#E8DED5]">
            <motion.img
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              src={resolveMediaSource(featured.imageUrl || featured.imageSeed, 1000, 750)}
              alt={featured.title}
              className="w-full h-full object-cover grayscale"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="p-8 md:p-12 flex flex-col justify-between border-t md:border-t-0 md:border-l border-[#501a2c]">
            <div>
              <span className="border border-[#501a2c] px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-[#501a2c]">
                {featured.fig}
              </span>
              <h2 className="font-serif text-3xl md:text-4xl text-[#501a2c] mt-6 mb-4 leading-tight">
                {featured.title}
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/60 mb-6">
                {featured.subtitle}
              </p>
              <p className="font-serif text-base text-[#501a2c]/70 leading-relaxed">
                {featured.description}
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-[#501a2c]/20">
              <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#501a2c] group-hover:gap-4 transition-all duration-300">
                View <ArrowUpRight size={14} />
              </span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {rest.map((item, index) => (
          <Reveal key={item.id} delay={index * 0.05}>
            <div className="group cursor-pointer">
              <div className="aspect-[4/3] overflow-hidden bg-[#E8DED5] mb-4">
                <motion.img
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  src={resolveMediaSource(item.imageUrl || item.imageSeed, 600, 450)}
                  alt={item.title}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="border-t border-[#501a2c] pt-3">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-serif text-xl text-[#501a2c]">{item.title}</h3>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40">{item.fig}</span>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/60">
                  {item.subtitle}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function ChecklistBlock({ items, caption }: { items: string[], caption?: string }) {
  const [checkedState, setCheckedState] = useState<boolean[]>(new Array(items.length).fill(false));

  const toggle = (index: number) => {
    const updated = [...checkedState];
    updated[index] = !updated[index];
    setCheckedState(updated);
  };

  return (
    <div className="my-12 p-8 bg-[#F5F0EB] border border-[#501a2c]/20 rounded-xl">
      {caption && (
        <h4 className="font-mono text-xs uppercase tracking-widest text-[#501a2c]/60 mb-6 flex items-center gap-2">
          <CheckSquare size={14} /> {caption}
        </h4>
      )}
      <ul className="space-y-4">
        {items.map((item, index) => (
          <li 
            key={index} 
            onClick={() => toggle(index)}
            className="flex items-start gap-4 cursor-pointer group"
          >
            <div className={`mt-1 w-5 h-5 border border-[#501a2c] flex items-center justify-center transition-colors ${checkedState[index] ? 'bg-[#501a2c]' : 'bg-transparent'}`}>
              {checkedState[index] && <CheckSquare size={14} className="text-[#F5F0EB]" />}
            </div>
            <span className={`font-serif text-lg transition-opacity ${checkedState[index] ? 'opacity-40 line-through' : 'opacity-100'}`}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function getPollStorageKey(question: string) {
  return 'epris-poll-' + question.replace(/\s+/g, '-').toLowerCase().slice(0, 60);
}

function PollBlock({ question, options, t }: { question: string, options: { label: string, votes: number }[], t: (key: string) => string }) {
  const storageKey = getPollStorageKey(question);

  const [votedIndex, setVotedIndex] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return typeof parsed.votedIndex === 'number' ? parsed.votedIndex : null;
      }
    } catch { /* ignore */ }
    return null;
  });

  const [localOptions, setLocalOptions] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.votes)) {
          return options.map((opt, i) => ({ ...opt, votes: (parsed.votes[i] ?? opt.votes) }));
        }
      }
    } catch { /* ignore */ }
    return options;
  });

  const handleVote = (index: number) => {
    if (votedIndex !== null) return;
    setVotedIndex(index);
    const newOptions = [...localOptions];
    newOptions[index] = { ...newOptions[index], votes: newOptions[index].votes + 1 };
    setLocalOptions(newOptions);
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        question,
        votedIndex: index,
        votes: newOptions.map(o => o.votes),
        timestamp: Date.now()
      }));
    } catch { /* quota exceeded */ }
  };

  const totalVotes = localOptions.reduce((acc, curr) => acc + curr.votes, 0);

  return (
    <div className="my-12 p-8 bg-[#501a2c] text-[#F5F0EB] rounded-xl">
      <h4 className="font-serif text-2xl mb-8 flex items-center gap-3">
        <BarChart size={24} className="opacity-60" />
        {question}
      </h4>
      <div className="space-y-4">
        {localOptions.map((opt, index) => {
          const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
          return (
            <div key={index} onClick={() => handleVote(index)} className={`cursor-pointer ${votedIndex !== null ? 'pointer-events-none' : ''}`}>
              <div className="flex justify-between text-sm font-mono uppercase tracking-widest mb-2 opacity-80">
                <span>{opt.label}</span>
                {votedIndex !== null && <span>{percentage}%</span>}
              </div>
              <div className="h-12 border border-[#F5F0EB]/20 relative overflow-hidden group">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: votedIndex !== null ? `${percentage}%` : '0%' }}
                  className="absolute top-0 left-0 h-full bg-[#C9A690]/40"
                />
                <div className={`absolute inset-0 flex items-center px-4 transition-colors ${votedIndex === index ? 'bg-[#C9A690]/20' : 'group-hover:bg-[#F5F0EB]/5'}`}>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {votedIndex !== null && (
        <p className="mt-6 text-center font-mono text-xs uppercase tracking-widest opacity-40">
          {t('poll.thanks')}
        </p>
      )}
    </div>
  );
}

function NoteBlock({ content }: { content: string }) {
  return (
    <div className="my-12 p-6 bg-[#C9A690]/10 border-l-4 border-[#C9A690] flex gap-4">
      <Lightbulb className="w-6 h-6 text-[#C9A690] shrink-0" />
      <p className="font-serif text-lg text-[#501a2c] italic">
        {content}
      </p>
    </div>
  );
}

function ArticleView({ article, onClose, t }: { article: Article; onClose: () => void; t: (key: string) => string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-[60] bg-[#F5F0EB] overflow-y-auto"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-24 relative">
        <button 
          onClick={onClose}
          className="fixed top-4 left-4 sm:top-8 sm:left-8 md:left-16 z-50 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#501a2c] hover:opacity-60 transition-opacity bg-[#F5F0EB]/80 backdrop-blur-sm px-3 py-2 sm:px-4 rounded-full border border-[#501a2c]/10"
        >
          <ArrowLeft size={16} /> {t('back')}
        </button>

        <article className="mt-12">
          <header className="mb-16">
            {/* Hero image first — matches Figma layout */}
            <div className="aspect-[16/9] w-full overflow-hidden bg-[#E8DED5] mb-12">
              <img
                src={resolveMediaSource(article.imageUrl || article.imageSeed, 1200, 675)}
                alt={article.title}
                className="w-full h-full object-cover grayscale"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 md:gap-4 font-mono text-[10px] md:text-xs text-[#501a2c]/60 uppercase tracking-widest mb-6 flex-wrap">
                <span>{article.date}</span>
                <span className="w-1 h-1 bg-[#501a2c]/40 rounded-full" />
                <span>{article.author}</span>
                {article.role && (
                  <>
                    <span className="w-1 h-1 bg-[#501a2c]/40 rounded-full" />
                    <span className="text-[#C9A690]">{article.role}</span>
                  </>
                )}
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl md:text-7xl text-[#501a2c] mb-8 leading-tight">
                {article.title}
              </h1>
              <div className="flex justify-center gap-2 flex-wrap">
                {article.tags.map(tag => (
                  <span key={tag} className="border border-[#501a2c] px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#501a2c]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </header>

          <div className="prose prose-lg prose-stone mx-auto font-serif text-[#501a2c]/80">
            {article.content?.map((block, index) => {
              switch (block.type) {
                case 'text': {
                  if (typeof block.content !== 'string') return null;
                  return <p key={index} className="mb-8 leading-relaxed text-xl">{block.content}</p>;
                }
                case 'quote': {
                  if (typeof block.content !== 'string') return null;
                  return (
                    <blockquote key={index} className="border-l-2 border-[#C9A690] pl-6 my-12 italic text-2xl text-[#501a2c]">
                      <Quote className="inline-block w-6 h-6 text-[#C9A690] mb-2 mr-2 opacity-50" />
                      {block.content}
                    </blockquote>
                  );
                }
                case 'image': {
                  if (typeof block.content !== 'string') return null;
                  const imageSource = resolveMediaSource(block.content, 800, 500);
                  if (!imageSource) return null;
                  return (
                    <figure key={index} className="my-12">
                      <img 
                        src={imageSource} 
                        alt={block.caption || "Article image"} 
                        className="w-full h-auto grayscale"
                        referrerPolicy="no-referrer"
                      />
                      {block.caption && (
                        <figcaption className="text-center font-mono text-xs text-[#501a2c]/60 mt-4 uppercase tracking-widest">
                          {block.caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                }
                case 'map': {
                  if (typeof block.content !== 'string') return null;
                  const lat = block.coordinates?.lat;
                  const lng = block.coordinates?.lng;
                  return (
                    <div key={index} className="my-12 p-6 bg-[#E8DED5] border border-[#501a2c]/20">
                      <div className="flex items-center gap-3 mb-4 text-[#501a2c]">
                        <MapPin size={20} />
                        <span className="font-mono text-sm uppercase tracking-widest">{block.content}</span>
                      </div>
                      {lat !== undefined && lng !== undefined && (
                        <div className="aspect-video overflow-hidden">
                          <iframe
                            title={block.content}
                            width="100%"
                            height="100%"
                            style={{ border: 0, filter: 'grayscale(100%) contrast(1.1)' }}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.01}%2C${lng + 0.02}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
                          />
                        </div>
                      )}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 text-xs font-mono uppercase tracking-widest text-[#501a2c] hover:text-[#C9A690] transition-colors"
                      >
                        {t('maps.open')} <ExternalLink size={12} />
                      </a>
                    </div>
                  );
                }
                case 'link': {
                  if (typeof block.content !== 'string') return null;
                  return (
                    <div key={index} className="my-8">
                      <a 
                        href={block.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-lg font-serif text-[#501a2c] border-b border-[#501a2c] hover:text-[#C9A690] hover:border-[#C9A690] transition-colors pb-1"
                      >
                        {block.content} <ArrowUpRight size={16} />
                      </a>
                    </div>
                  );
                }
                case 'video':
                  return (
                    <figure key={index} className="my-12">
                      <div className="aspect-video bg-black relative flex items-center justify-center group cursor-pointer">
                        {/* Placeholder for video player */}
                        <Play size={48} className="text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                        <span className="sr-only">Play Video</span>
                      </div>
                      {block.caption && (
                        <figcaption className="text-center font-mono text-xs text-[#501a2c]/60 mt-4 uppercase tracking-widest">
                          {block.caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                case 'audio':
                  return (
                    <figure key={index} className="my-8 sm:my-12 p-4 sm:p-6 bg-[#E8DED5] border border-[#501a2c]/20 flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#501a2c] flex items-center justify-center text-[#F5F0EB]">
                        <Music size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="h-1 bg-[#501a2c]/20 rounded-full overflow-hidden">
                          <div className="h-full w-1/3 bg-[#501a2c]" />
                        </div>
                        {block.caption && (
                          <figcaption className="font-mono text-xs text-[#501a2c]/60 mt-2 uppercase tracking-widest">
                            {block.caption}
                          </figcaption>
                        )}
                      </div>
                    </figure>
                  );
                case 'gallery':
                  return (
                    <figure key={index} className="my-12">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Array.isArray(block.content) &&
                          block.content.map((img, i) => {
                            if (typeof img !== 'string') return null;
                            const gallerySource = resolveMediaSource(img, 400, 400);
                            if (!gallerySource) return null;

                            return (
                              <div key={i} className="aspect-square bg-[#E8DED5] overflow-hidden">
                                <img 
                                  src={gallerySource} 
                                  alt={`Gallery image ${i + 1}`}
                                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            );
                          })}
                      </div>
                      {block.caption && (
                        <figcaption className="text-center font-mono text-xs text-[#501a2c]/60 mt-4 uppercase tracking-widest">
                          {block.caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                case 'checklist':
                  if (typeof block.content === 'object' && !Array.isArray(block.content) && 'items' in block.content && Array.isArray(block.content.items)) {
                    return <ChecklistBlock key={index} items={block.content.items} caption={block.caption} />;
                  }
                  return null;
                case 'poll':
                  if (
                    typeof block.content === 'object' &&
                    !Array.isArray(block.content) &&
                    'question' in block.content &&
                    typeof block.content.question === 'string' &&
                    'options' in block.content &&
                    Array.isArray(block.content.options)
                  ) {
                    return <PollBlock key={index} question={block.content.question} options={block.content.options} t={t} />;
                  }
                  return null;
                case 'note':
                  if (typeof block.content !== 'string') return null;
                  return <NoteBlock key={index} content={block.content} />;
                default:
                  return null;
              }
            })}
          </div>

          <footer className="mt-16 pt-12 border-t border-[#501a2c]/20">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-full bg-[#501a2c] flex items-center justify-center text-[#F5F0EB] font-serif text-xl shrink-0">
                {article.author.charAt(0)}
              </div>
              <div>
                <p className="font-serif text-xl mb-1">{article.author}</p>
                <p className="font-mono text-xs uppercase tracking-widest text-[#501a2c]/60 mb-3">{article.role}</p>
                <p className="font-mono text-xs text-[#501a2c]/50">{article.date}</p>
              </div>
            </div>
            {article.tags && (
              <div className="flex flex-wrap gap-2 mt-8">
                {article.tags.map((tag: string, i: number) => (
                  <span key={i} className="px-3 py-1 border border-[#501a2c]/20 font-mono text-xs uppercase tracking-widest text-[#501a2c]/60">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </footer>
        </article>
      </div>
    </motion.div>
  );
}

function ArticlesSection({
  articles,
  onArticleClick,
  t
}: {
  articles: Article[];
  onArticleClick: (article: Article) => void;
  t: (key: string) => string;
}) {
  // Get unique categories
  const categories = Array.from(new Set(articles.map(a => a.category)));
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredArticles = activeCategory 
    ? articles.filter(a => a.category === activeCategory)
    : articles;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-16 border-b border-[#501a2c]/20 pb-8">
        <button 
          onClick={() => setActiveCategory(null)}
          className={`font-mono text-xs uppercase tracking-widest transition-colors ${!activeCategory ? 'text-[#501a2c] font-bold' : 'text-[#501a2c]/60 hover:text-[#501a2c]'}`}
        >
          {t('all')}
        </button>
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`font-mono text-xs uppercase tracking-widest transition-colors ${activeCategory === cat ? 'text-[#501a2c] font-bold' : 'text-[#501a2c]/60 hover:text-[#501a2c]'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filteredArticles.map((article, index) => (
        <div key={article.id}>
          <Reveal delay={index * 0.1}>
            <article 
              className="border-b border-[#501a2c]/20 pb-12 group cursor-pointer"
              onClick={() => onArticleClick(article)}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                 <div className="md:col-span-1 aspect-[4/3] overflow-hidden bg-[#E8DED5]">
                    <img 
                      src={resolveMediaSource(article.imageUrl || article.imageSeed, 400, 300)} 
                      alt={article.title}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      referrerPolicy="no-referrer"
                    />
                 </div>
                 <div className="md:col-span-2">
                    <div className="flex items-baseline justify-between mb-4 font-mono text-[10px] sm:text-xs text-[#501a2c]/60 uppercase tracking-widest gap-2 flex-wrap">
                      <div className="flex gap-2">
                        <span>{article.date}</span>
                        {article.category && (
                          <>
                            <span className="text-[#C9A690]">•</span>
                            <span className="text-[#501a2c]">{article.category}</span>
                          </>
                        )}
                      </div>
                      <span>{article.author}</span>
                    </div>
                    <h2 className="font-serif text-2xl sm:text-3xl md:text-5xl text-[#501a2c] mb-4 sm:mb-6 group-hover:text-[#C9A690] transition-colors">
                      {article.title}
                    </h2>
                    <p className="font-serif text-lg text-[#501a2c]/80 leading-relaxed mb-6">
                      {article.excerpt}
                    </p>
                 </div>
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-2 flex-wrap min-w-0">
                  {article.tags.map(tag => (
                    <span key={tag} className="border border-[#501a2c] px-2 sm:px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#501a2c]">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="flex items-center gap-2 text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#501a2c] group-hover:translate-x-2 transition-transform whitespace-nowrap shrink-0">
                  {t('read.article')} <ArrowUpRight size={14} />
                </span>
              </div>
            </article>
          </Reveal>
        </div>
      ))}
    </div>
  );
}

function ReviewsSection({ reviews, t }: { reviews: Review[]; t: (key: string) => string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      {reviews.map((review, index) => (
        <div key={review.id}>
          <Reveal delay={index * 0.1}>
            <div className="bg-[#E8DED5] p-8 md:p-12 border border-[#501a2c] h-full flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-8">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={16} 
                        className={i < Math.floor(review.rating) ? "fill-[#501a2c] text-[#501a2c]" : "text-[#501a2c]/20"} 
                      />
                    ))}
                  </div>
                  <span className="font-mono text-xs uppercase tracking-widest text-[#501a2c]/40">{t('review')} 0{review.id}</span>
                </div>
                <h3 className="font-serif text-3xl text-[#501a2c] mb-2">{review.title}</h3>
                <p className="font-mono text-xs uppercase tracking-widest text-[#501a2c]/60 mb-6">{review.subject}</p>
                <p className="font-serif text-lg leading-relaxed text-[#501a2c]/80 italic">
                  "{review.content}"
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-[#501a2c]/10 font-mono text-xs uppercase tracking-widest text-[#501a2c]/60 text-right">
                — {review.author}
              </div>
            </div>
          </Reveal>
        </div>
      ))}
    </div>
  );
}

function LibrarySection({ libraryItems, t }: { libraryItems: LibraryItem[]; t: (key: string) => string }) {
  return (
    <div className="border border-[#501a2c]">
      <div className="grid grid-cols-12 border-b border-[#501a2c] bg-[#501a2c] text-[#F5F0EB] p-3 sm:p-4 font-mono text-[10px] sm:text-xs uppercase tracking-widest">
        <div className="col-span-9 sm:col-span-8 md:col-span-5">{t('library.title')}</div>
        <div className="col-span-2 hidden md:block">{t('library.type')}</div>
        <div className="col-span-2 hidden md:block">{t('library.size')}</div>
        <div className="col-span-2 hidden md:block">{t('library.year')}</div>
        <div className="col-span-3 sm:col-span-4 md:col-span-1 text-right">{t('library.action')}</div>
      </div>
      {libraryItems.map((item, index) => (
        <div key={item.id}>
          <Reveal delay={index * 0.05}>
            <div className="grid grid-cols-12 p-3 sm:p-4 border-b border-[#501a2c]/20 items-center hover:bg-[#E8DED5] transition-colors group font-mono text-xs sm:text-sm text-[#501a2c]">
              <div className="col-span-9 sm:col-span-8 md:col-span-5 font-medium flex items-center gap-2 sm:gap-3 min-w-0">
                <BookOpen size={16} className="text-[#501a2c]/40 group-hover:text-[#501a2c] shrink-0 hidden sm:block" />
                <span className="truncate">{item.title}</span>
              </div>
              <div className="col-span-2 hidden md:block opacity-60">{item.type}</div>
              <div className="col-span-2 hidden md:block opacity-60">{item.size}</div>
              <div className="col-span-2 hidden md:block opacity-60">{item.year}</div>
              <div className="col-span-3 sm:col-span-4 md:col-span-1 text-right">
                <button className="inline-flex items-center justify-center w-8 h-8 border border-[#501a2c] rounded-full hover:bg-[#501a2c] hover:text-[#F5F0EB] transition-colors">
                  <Download size={14} />
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      ))}
    </div>
  );
}

function Sidebar({ t }: { t: (key: string) => string }) {
  const labels = [t('sidebar.lifestyle'), t('sidebar.travel'), t('sidebar.taste'), t('sidebar.design'), t('sidebar.culture'), t('sidebar.lifestyle'), t('sidebar.travel')];
  return (
    <aside className="hidden lg:flex w-12 border-l border-[#501a2c] flex-col justify-between items-center py-8 fixed right-0 top-0 h-full bg-[#F5F0EB] z-40 pt-24">
      <div className="h-full w-full relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-max h-full pt-4">
          <p className="writing-vertical-rl text-[10px] font-mono uppercase tracking-[0.3em] text-[#501a2c]/40 flex gap-8 whitespace-nowrap">
            {labels.map((label, i) => (
              <span key={i}>{i > 0 && <span className="text-[#C9A690] mr-8">•</span>}{label}</span>
            ))}
          </p>
        </div>
      </div>
    </aside>
  );
}

const VALID_TABS = ['gallery', 'articles', 'reviews', 'library', 'about'];

function parsePath(pathname: string): { tab?: string; articleId?: number } {
  const p = pathname.replace(/^\//, '').replace(/\/$/, '');
  if (!p) return {};
  const articleMatch = p.match(/^article\/(\d+)$/);
  if (articleMatch) return { tab: 'articles', articleId: parseInt(articleMatch[1], 10) };
  if (VALID_TABS.includes(p)) return { tab: p };
  return {};
}

export default function App() {
  const initialRoute = parsePath(window.location.pathname);
  const [activeTab, setActiveTab] = useState(initialRoute.tab || 'gallery');
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(initialRoute.articleId ?? null);
  const [currentLang, setCurrentLang] = useState(DEFAULT_LANGUAGE);
  const languageOptions = getAvailableLanguages();
  const { items, articles, reviews, libraryItems } = getContentForLanguage(currentLang);
  const selectedArticle = selectedArticleId !== null ? articles.find((article) => article.id === selectedArticleId) || null : null;
  const t = (key: string) => getTranslation(currentLang, key);

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, '', path);
  }, []);

  const handleSetTab = useCallback((tab: string) => {
    setActiveTab(tab);
    setSelectedArticleId(null);
    navigate(tab === 'gallery' ? '/' : `/${tab}`);
  }, [navigate]);

  const handleSelectArticle = useCallback((id: number) => {
    setSelectedArticleId(id);
    navigate(`/article/${id}`);
  }, [navigate]);

  const handleCloseArticle = useCallback(() => {
    setSelectedArticleId(null);
    navigate(activeTab === 'gallery' ? '/' : `/${activeTab}`);
  }, [activeTab, navigate]);

  useEffect(() => {
    const onPopState = () => {
      const parsed = parsePath(window.location.pathname);
      if (parsed.articleId !== undefined) {
        setSelectedArticleId(parsed.articleId);
        setActiveTab('articles');
      } else {
        setSelectedArticleId(null);
        setActiveTab(parsed.tab || 'gallery');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F0EB] text-[#501a2c] selection:bg-[#C9A690] selection:text-white">
      <NavBar
        activeTab={activeTab}
        setActiveTab={handleSetTab}
        currentLang={currentLang}
        setCurrentLang={setCurrentLang}
        t={t}
        languages={languageOptions}
        libraryCount={libraryItems.length}
      />
      
      <div className="lg:pr-12"> {/* Padding for sidebar */}
        <Hero t={t} />

        <main className="max-w-[1600px] mx-auto px-4 sm:px-8 md:px-16 py-8 sm:py-12 md:py-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {activeTab === 'gallery' && (
                <>
                  <WelcomingLetter t={t} />
                  <GallerySection items={items} />
                </>
              )}
              {activeTab === 'articles' && <ArticlesSection articles={articles} onArticleClick={(article) => handleSelectArticle(article.id)} t={t} />}
              {activeTab === 'reviews' && <ReviewsSection reviews={reviews} t={t} />}
              {activeTab === 'library' && <LibrarySection libraryItems={libraryItems} t={t} />}
              {activeTab === 'about' && <AboutSection t={t} />}
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="border-t border-[#501a2c] bg-[#501a2c] text-[#F5F0EB] py-8 sm:py-12 md:py-24 px-4 sm:px-8 md:px-16">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
            <div>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-6xl mb-6 sm:mb-8 text-[#C9A690]">EPRIS JOURNAL</h2>
              <div className="font-mono text-xs uppercase tracking-widest opacity-60 max-w-xs leading-relaxed">
                <p>{t('hero.subtitle2')}</p>
                <p>{t('hero.subtitle1')}</p>
              </div>
            </div>
            <div className="text-left md:text-right font-mono text-xs uppercase tracking-widest opacity-40">
              <p>© 2026 Epris Journal</p>
              <p>{t('footer.rights')}</p>
            </div>
          </div>
        </footer>
      </div>
      
      <Sidebar t={t} />

      <AnimatePresence>
        {selectedArticle && (
          <ArticleView article={selectedArticle} onClose={handleCloseArticle} t={t} />
        )}
      </AnimatePresence>
    </div>
  );
}
