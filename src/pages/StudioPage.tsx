import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { Studio } from '../data';

export function StudioPage({ studio, t }: { studio: Studio; t: (key: string) => string }) {
  return (
    <div className="pt-16 min-h-screen bg-[#F5F0EB]">
      {/* Hero */}
      <div className="border-b border-[#501a2c]/20 px-6 sm:px-10 md:px-16 py-12 md:py-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#501a2c]/40 mb-3">
              {t('studio.kicker')}
            </p>
            <h1 className="font-serif text-5xl md:text-7xl text-[#501a2c] leading-none mb-4">
              {studio.name}
            </h1>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#C9A690] mb-8">
              {t('studio.tagline')}
            </p>
            <p className="font-serif text-base md:text-lg text-[#501a2c]/70 leading-relaxed max-w-md">
              {t('studio.bio')}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative aspect-[3/4] bg-[#1a0812] overflow-hidden shadow-lg"
          >
            <img
              src={studio.heroImage}
              alt={studio.name}
              className="w-full h-full object-cover grayscale"
            />
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 sm:px-10 md:px-16 py-12 md:py-20">
        {/* Services */}
        {studio.services.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-14 md:mb-20"
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-6">
              {t('studio.services.title')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-px bg-[#501a2c]/20 border border-[#501a2c]/20">
              {studio.services.map((service, i) => (
                <div key={i} className="bg-[#F5F0EB] px-5 py-6">
                  <span className="font-mono text-[9px] text-[#C9A690] mr-2">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-serif text-base text-[#501a2c]">{service}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Projects */}
        {studio.projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-14 md:mb-20"
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#501a2c]/40 mb-6">
              {t('studio.projects.title')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 md:gap-8">
              {studio.projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                >
                  <div className="relative aspect-[4/3] bg-[#1a0812] overflow-hidden shadow-md">
                    <img
                      src={project.imageUrl}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <h3 className="font-serif text-lg md:text-xl text-[#501a2c]">{project.title}</h3>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/35">
                      {project.year}
                    </span>
                  </div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#C9A690]">
                    {project.category}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="border-t border-[#501a2c]/20 pt-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
        >
          <div>
            <p className="font-serif text-2xl md:text-3xl text-[#501a2c] mb-2">
              {t('studio.cta.title')}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/35">
              {t('studio.cta.desc')}
            </p>
          </div>
          <a
            href={studio.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-8 py-4 font-mono text-xs uppercase tracking-widest border border-[#501a2c] text-[#501a2c] hover:bg-[#501a2c] hover:text-[#F5F0EB] transition-all duration-300 shrink-0 w-fit"
          >
            <ArrowUpRight size={16} />
            {t('studio.cta.button')}
          </a>
        </motion.div>
      </div>
    </div>
  );
}
