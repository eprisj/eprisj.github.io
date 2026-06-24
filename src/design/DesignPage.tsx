import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, Search, ExternalLink, ChevronLeft } from 'lucide-react';
import {
  getProjects, getProducts, getBrands, getStudios,
  getProject, getProduct, getBrand, getStudio,
  filterProjects, computeFacets, similarProjects,
  brandsForProject, productsForProject, studioForProject,
  projectsForBrand, productsForBrand,
  projectsForStudio, projectsForProduct, brandForProduct,
  searchAll,
  designImage,
  type Project, type Brand, type DesignStudio, type Product,
  type ProjectType, type ProjectFilters,
  PROJECT_TYPES, PRODUCT_CATEGORIES,
} from './designApi';

// ── helpers ──────────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-[#C9A690]">
      {children}
    </span>
  );
}
function Rule() {
  return <div className="w-full border-t border-[#501a2c]/15" />;
}
function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#501a2c]/60 border border-[#501a2c]/20 px-2 py-0.5">
      {children}
    </span>
  );
}

// ── Sub-view types ────────────────────────────────────────────────────────────
type View =
  | { type: 'index' }
  | { type: 'project'; slug: string }
  | { type: 'brand'; slug: string }
  | { type: 'studio'; slug: string }
  | { type: 'product'; slug: string };

// ── Index cards ───────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick, index }: { project: Project; onClick: () => void; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-6%' }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.06, 0.25), ease: [0.22, 1, 0.36, 1] }}
      className="group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[#1a0812]">
        <img
          src={designImage(project.featuredSeed, 800, 600)}
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-3 left-3">
          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#F5F0EB] bg-[#501a2c]/90 backdrop-blur-sm px-2.5 py-1">
            {project.projectType}
          </span>
        </div>
        <span className="absolute bottom-3 right-3 font-mono text-[9px] text-[#F5F0EB] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          View project <ArrowRight size={11} />
        </span>
      </div>
      <div className="mt-4 pr-2">
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <h3 className="font-serif text-lg leading-tight text-[#501a2c] group-hover:text-[#C9A690] transition-colors line-clamp-1">
            {project.title}
          </h3>
          <span className="font-mono text-[10px] text-[#501a2c]/35 shrink-0">{project.year}</span>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/45 mb-2">
          {project.architect} · {project.location}
        </p>
        <p className="font-serif text-sm text-[#501a2c]/55 leading-relaxed line-clamp-2">{project.excerpt}</p>
      </div>
    </motion.div>
  );
}

// ── Facet sidebar ─────────────────────────────────────────────────────────────
function FacetSidebar({
  filters,
  onChange,
  projects,
}: {
  filters: ProjectFilters;
  onChange: (f: ProjectFilters) => void;
  projects: Project[];
}) {
  const facets = useMemo(() => computeFacets(projects), [projects]);

  const toggle = <K extends keyof ProjectFilters>(key: K, val: NonNullable<ProjectFilters[K]>[number]) => {
    const arr = (filters[key] as unknown[]) ?? [];
    const next = arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
    onChange({ ...filters, [key]: next.length ? next : undefined });
  };

  const isActive = (key: keyof ProjectFilters, val: unknown) =>
    ((filters[key] as unknown[]) ?? []).includes(val);

  const totalActive = [
    filters.types, filters.countries, filters.styles, filters.budgets,
  ].filter(Boolean).reduce((n, arr) => n + (arr?.length ?? 0), 0);

  return (
    <aside className="shrink-0 w-56 font-mono text-[10px]">
      <div className="flex items-center justify-between mb-5">
        <Label>Filter</Label>
        {totalActive > 0 && (
          <button
            onClick={() => onChange({})}
            className="text-[#501a2c]/40 hover:text-[#501a2c] transition-colors flex items-center gap-1 uppercase tracking-widest text-[9px]"
          >
            <X size={10} /> Clear all
          </button>
        )}
      </div>

      {/* Type */}
      <div className="mb-5">
        <p className="text-[#501a2c]/40 uppercase tracking-[0.2em] mb-2.5">Type</p>
        <div className="space-y-1.5">
          {facets.types.map(({ value, count }) => (
            <button
              key={value}
              onClick={() => toggle('types', value as ProjectType)}
              disabled={count === 0 && !isActive('types', value)}
              className={`flex w-full items-center justify-between transition-colors ${
                isActive('types', value) ? 'text-[#501a2c] font-bold' : count === 0 ? 'text-[#501a2c]/20' : 'text-[#501a2c]/55 hover:text-[#501a2c]'
              }`}
            >
              <span>{value}</span>
              <span className="opacity-50">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Country */}
      <div className="mb-5">
        <p className="text-[#501a2c]/40 uppercase tracking-[0.2em] mb-2.5">Country</p>
        <div className="space-y-1.5">
          {facets.countries.map(({ value, count }) => (
            <button
              key={value}
              onClick={() => toggle('countries', value)}
              className={`flex w-full items-center justify-between transition-colors ${
                isActive('countries', value) ? 'text-[#501a2c] font-bold' : 'text-[#501a2c]/55 hover:text-[#501a2c]'
              }`}
            >
              <span>{value}</span>
              <span className="opacity-50">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Style */}
      <div className="mb-5">
        <p className="text-[#501a2c]/40 uppercase tracking-[0.2em] mb-2.5">Style</p>
        <div className="space-y-1.5">
          {facets.styles.map(({ value, count }) => (
            <button
              key={value}
              onClick={() => toggle('styles', value)}
              className={`flex w-full items-center justify-between transition-colors ${
                isActive('styles', value) ? 'text-[#501a2c] font-bold' : 'text-[#501a2c]/55 hover:text-[#501a2c]'
              }`}
            >
              <span className="truncate text-left">{value}</span>
              <span className="opacity-50 shrink-0 ml-2">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div>
        <p className="text-[#501a2c]/40 uppercase tracking-[0.2em] mb-2.5">Budget</p>
        <div className="flex gap-2">
          {facets.budgets.map(({ value, count }) => (
            <button
              key={value}
              onClick={() => toggle('budgets', value)}
              disabled={count === 0 && !isActive('budgets', value)}
              className={`text-[11px] px-2 py-1 border transition-colors ${
                isActive('budgets', value)
                  ? 'border-[#501a2c] bg-[#501a2c] text-[#F5F0EB]'
                  : count === 0
                  ? 'border-[#501a2c]/10 text-[#501a2c]/20'
                  : 'border-[#501a2c]/30 text-[#501a2c]/55 hover:border-[#501a2c] hover:text-[#501a2c]'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

// ── ProjectDetail ─────────────────────────────────────────────────────────────
function ProjectDetail({ slug, onNav }: { slug: string; onNav: (v: View) => void }) {
  const project = getProject(slug);
  const [activeImg, setActiveImg] = useState(0);

  if (!project) return <div className="pt-20 text-center font-mono text-sm text-[#501a2c]/40">Project not found.</div>;

  const studio = studioForProject(project);
  const brands = brandsForProject(project);
  const products = productsForProject(project);
  const similar = similarProjects(project, 4);

  return (
    <motion.div
      key={slug}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Hero */}
      <div className="relative aspect-[16/9] max-h-[70vh] overflow-hidden bg-[#1a0812]">
        <img
          src={designImage(project.gallerySeeds[activeImg] ?? project.featuredSeed, 1600, 900)}
          alt={project.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#F5F0EB]/60 mb-2">
            {project.projectType} · {project.location}, {project.country} · {project.year}
          </p>
          <h1
            style={{ fontFamily: "'Playfair Display', serif" }}
            className="text-[clamp(32px,5vw,72px)] leading-[1.0] text-[#F5F0EB]"
          >
            {project.title}
          </h1>
        </div>
      </div>

      {/* Gallery strip */}
      {project.gallerySeeds.length > 1 && (
        <div className="flex gap-2 p-4 md:px-10 border-b border-[#501a2c]/15 overflow-x-auto">
          {project.gallerySeeds.map((s, i) => (
            <button
              key={s}
              onClick={() => setActiveImg(i)}
              className={`shrink-0 w-20 h-14 overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-[#501a2c]' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              <img src={designImage(s, 160, 112)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 md:py-20 grid md:grid-cols-[1fr_280px] gap-12 md:gap-20">
        {/* Left: editorial text */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            {studio && (
              <button onClick={() => onNav({ type: 'studio', slug: studio.slug })}
                className="font-mono text-[10px] uppercase tracking-widest text-[#C9A690] hover:text-[#501a2c] transition-colors border-b border-[#C9A690]/30">
                {studio.name}
              </button>
            )}
            <span className="text-[#501a2c]/30 font-mono text-[10px]">·</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/50">{project.style}</span>
          </div>

          {project.description.split('\n\n').map((para, i) => (
            <p key={i} className="font-serif text-base md:text-lg text-[#501a2c]/75 leading-relaxed mb-6">
              {para}
            </p>
          ))}

          <div className="flex flex-wrap gap-2 mt-8">
            {project.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
          </div>
        </div>

        {/* Right: data sidebar */}
        <div className="space-y-8 font-mono text-[11px]">
          {/* Project data */}
          <div>
            <Label>Project Data</Label>
            <div className="mt-3 space-y-3">
              {[
                ['Area', `${project.areaM2.toLocaleString()} m²`],
                ['Year', String(project.year)],
                ['Location', `${project.location}, ${project.country}`],
                ['Type', project.projectType],
                ['Style', project.style],
                ['Budget', project.budgetRange],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <span className="text-[#501a2c]/40 uppercase tracking-widest">{k}</span>
                  <span className="text-[#501a2c] text-right">{v}</span>
                </div>
              ))}
              {studio && (
                <div className="flex justify-between gap-4">
                  <span className="text-[#501a2c]/40 uppercase tracking-widest">Studio</span>
                  <button
                    onClick={() => onNav({ type: 'studio', slug: studio.slug })}
                    className="text-[#501a2c] text-right hover:text-[#C9A690] transition-colors text-right"
                  >
                    {studio.name}
                  </button>
                </div>
              )}
            </div>
          </div>

          <Rule />

          {/* Design components */}
          <div>
            <Label>Design Components</Label>
            <div className="mt-3 space-y-4">
              {project.materials.length > 0 && (
                <div>
                  <p className="text-[#501a2c]/40 uppercase tracking-widest mb-1.5">Materials</p>
                  <ul className="space-y-1">
                    {project.materials.map((m) => <li key={m} className="text-[#501a2c]/65">{m}</li>)}
                  </ul>
                </div>
              )}
              {project.furniture.length > 0 && (
                <div>
                  <p className="text-[#501a2c]/40 uppercase tracking-widest mb-1.5">Furniture</p>
                  <ul className="space-y-1">
                    {project.furniture.map((f) => <li key={f} className="text-[#501a2c]/65">{f}</li>)}
                  </ul>
                </div>
              )}
              {project.lighting.length > 0 && (
                <div>
                  <p className="text-[#501a2c]/40 uppercase tracking-widest mb-1.5">Lighting</p>
                  <ul className="space-y-1">
                    {project.lighting.map((l) => <li key={l} className="text-[#501a2c]/65">{l}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related brands */}
      {brands.length > 0 && (
        <div className="border-t border-[#501a2c]/15 px-6 md:px-10 py-10">
          <div className="max-w-6xl mx-auto">
            <Label>Related Brands</Label>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => onNav({ type: 'brand', slug: brand.slug })}
                  className="text-left border border-[#501a2c]/15 p-4 hover:border-[#501a2c]/40 hover:bg-[#501a2c]/3 transition-all group"
                >
                  <p className="font-serif text-sm text-[#501a2c] group-hover:text-[#C9A690] transition-colors mb-1">{brand.name}</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/35">{brand.country}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Related products */}
      {products.length > 0 && (
        <div className="border-t border-[#501a2c]/15 px-6 md:px-10 py-10">
          <div className="max-w-6xl mx-auto">
            <Label>Products Used</Label>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => onNav({ type: 'product', slug: product.slug })}
                  className="text-left group"
                >
                  <div className="aspect-square overflow-hidden bg-[#1a0812] mb-2">
                    <img
                      src={designImage(product.imageSeed, 400, 400)}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <p className="font-serif text-xs text-[#501a2c] group-hover:text-[#C9A690] transition-colors leading-snug">{product.name}</p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/35 mt-0.5">{product.category}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Similar interiors */}
      {similar.length > 0 && (
        <div className="border-t border-[#501a2c]/15 px-6 md:px-10 py-10 md:py-16">
          <div className="max-w-6xl mx-auto">
            <Label>Similar Interiors</Label>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
              {similar.map((p) => (
                <button key={p.id} onClick={() => onNav({ type: 'project', slug: p.slug })} className="text-left group">
                  <div className="aspect-[4/3] overflow-hidden bg-[#1a0812] mb-2">
                    <img
                      src={designImage(p.featuredSeed, 600, 450)}
                      alt={p.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <p className="font-serif text-sm text-[#501a2c] group-hover:text-[#C9A690] transition-colors leading-snug">{p.title}</p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/35 mt-0.5">{p.location} · {p.year}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── BrandDetail ───────────────────────────────────────────────────────────────
function BrandDetail({ slug, onNav }: { slug: string; onNav: (v: View) => void }) {
  const brand = getBrand(slug);
  if (!brand) return null;

  const products = productsForBrand(brand.id);
  const projects = projectsForBrand(brand.id);

  return (
    <motion.div key={slug} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-start mb-16">
          <div>
            <Label>Brand</Label>
            <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(36px,6vw,80px)] leading-[1.0] text-[#501a2c] mt-4 mb-4">
              {brand.name}
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#C9A690] mb-6">
              {brand.country}{brand.founded ? ` · Est. ${brand.founded}` : ''}
            </p>
            <p className="font-serif text-base md:text-lg text-[#501a2c]/70 leading-relaxed max-w-lg">{brand.description}</p>
          </div>
          <div className="flex flex-col gap-3 md:items-end md:text-right">
            <div className="font-mono text-[11px] space-y-1">
              <p className="text-[#501a2c]/40 uppercase tracking-widest">Website</p>
              <a href={`https://${brand.website}`} target="_blank" rel="noopener noreferrer"
                className="text-[#501a2c] hover:text-[#C9A690] flex items-center gap-1 md:justify-end transition-colors">
                {brand.website} <ExternalLink size={11} />
              </a>
            </div>
            <div className="font-mono text-[11px] space-y-1 mt-4">
              <p className="text-[#501a2c]/40 uppercase tracking-widest">In our database</p>
              <p className="text-[#501a2c]">{products.length} products · {projects.length} projects</p>
            </div>
          </div>
        </div>

        <Rule />

        {products.length > 0 && (
          <div className="mt-12">
            <Label>Products by {brand.name}</Label>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 md:gap-6">
              {products.map((p) => (
                <button key={p.id} onClick={() => onNav({ type: 'product', slug: p.slug })} className="text-left group">
                  <div className="aspect-square overflow-hidden bg-[#1a0812] mb-2">
                    <img src={designImage(p.imageSeed, 400, 400)} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <p className="font-serif text-sm text-[#501a2c] group-hover:text-[#C9A690] transition-colors">{p.name}</p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/35 mt-0.5">{p.category} · {p.year ?? ''}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div className="mt-14">
            <Rule />
            <div className="mt-10">
              <Label>Projects featuring {brand.name}</Label>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                {projects.map((p, i) => (
                  <ProjectCard key={p.id} project={p} index={i} onClick={() => onNav({ type: 'project', slug: p.slug })} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── StudioDetail ──────────────────────────────────────────────────────────────
function StudioDetail({ slug, onNav }: { slug: string; onNav: (v: View) => void }) {
  const studio = getStudio(slug);
  if (!studio) return null;

  const projects = projectsForStudio(studio.id);

  return (
    <motion.div key={slug} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="grid md:grid-cols-[1fr_280px] gap-12 md:gap-20 mb-16">
          <div>
            <Label>Design Studio</Label>
            <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(32px,5vw,70px)] leading-[1.0] text-[#501a2c] mt-4 mb-4">
              {studio.name}
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#C9A690] mb-6">
              {studio.city}, {studio.country} · Est. {studio.yearFounded}
            </p>
            <p className="font-serif text-base md:text-lg text-[#501a2c]/70 leading-relaxed max-w-2xl">{studio.description}</p>
          </div>
          <div className="font-mono text-[11px] space-y-4">
            {[
              ['Team', studio.teamSize],
              ['Founded', String(studio.yearFounded)],
              ['Location', `${studio.city}, ${studio.country}`],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[#501a2c]/40 uppercase tracking-widest mb-0.5">{k}</p>
                <p className="text-[#501a2c]">{v}</p>
              </div>
            ))}
            {studio.awards.length > 0 && (
              <div>
                <p className="text-[#501a2c]/40 uppercase tracking-widest mb-1">Awards</p>
                <ul className="space-y-1">
                  {studio.awards.map((a) => <li key={a} className="text-[#501a2c]/70">{a}</li>)}
                </ul>
              </div>
            )}
            <a href={`https://${studio.website}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#501a2c] hover:text-[#C9A690] transition-colors mt-2">
              {studio.website} <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {projects.length > 0 && (
          <>
            <Rule />
            <div className="mt-10">
              <Label>Portfolio · {projects.length} projects</Label>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                {projects.map((p, i) => (
                  <ProjectCard key={p.id} project={p} index={i} onClick={() => onNav({ type: 'project', slug: p.slug })} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── ProductDetail ─────────────────────────────────────────────────────────────
function ProductDetail({ slug, onNav }: { slug: string; onNav: (v: View) => void }) {
  const product = getProduct(slug);
  if (!product) return null;

  const brand = brandForProduct(product);
  const projects = projectsForProduct(product.id);

  return (
    <motion.div key={slug} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-start mb-16">
          <div className="aspect-square overflow-hidden bg-[#1a0812]">
            <img src={designImage(product.imageSeed, 800, 800)} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <Label>{product.category}</Label>
            <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(28px,4vw,56px)] leading-[1.1] text-[#501a2c] mt-4 mb-3">
              {product.name}
            </h1>
            {brand && (
              <button onClick={() => onNav({ type: 'brand', slug: brand.slug })}
                className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#C9A690] hover:text-[#501a2c] transition-colors border-b border-[#C9A690]/30 mb-6 block">
                {brand.name}
              </button>
            )}
            <p className="font-serif text-base text-[#501a2c]/70 leading-relaxed mb-8">{product.description}</p>
            <div className="font-mono text-[11px] space-y-3">
              {[
                ['Dimensions', product.dimensions],
                ['Country', product.country],
                ...(product.year ? [['Year', product.year]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex gap-6">
                  <span className="text-[#501a2c]/40 uppercase tracking-widest w-24 shrink-0">{k}</span>
                  <span className="text-[#501a2c]">{v}</span>
                </div>
              ))}
              {product.materials.length > 0 && (
                <div className="flex gap-6">
                  <span className="text-[#501a2c]/40 uppercase tracking-widest w-24 shrink-0">Materials</span>
                  <span className="text-[#501a2c]">{product.materials.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {projects.length > 0 && (
          <>
            <Rule />
            <div className="mt-10">
              <Label>Seen in {projects.length} project{projects.length !== 1 ? 's' : ''}</Label>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                {projects.map((p, i) => (
                  <ProjectCard key={p.id} project={p} index={i} onClick={() => onNav({ type: 'project', slug: p.slug })} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Index ─────────────────────────────────────────────────────────────────────
function DesignIndex({ onNav }: { onNav: (v: View) => void }) {
  const allProjects = useMemo(() => getProjects(), []);
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('__all');
  const [showSearch, setShowSearch] = useState(false);

  const filtered = useMemo(() => {
    const base = filterProjects({
      ...filters,
      query: search.trim() || undefined,
    });
    if (activeCategory === '__all') return base;
    return base.filter((p) => p.projectType === activeCategory);
  }, [filters, search, activeCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSearch(false);
  };

  return (
    <div>
      {/* Hero banner */}
      <div className="border-b border-[#501a2c]/20 px-6 md:px-10 lg:px-16 py-14 md:py-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-end">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.32em] text-[#C9A690] mb-5">EPRIS · Design Archive</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-[clamp(42px,7vw,96px)] leading-[0.95] text-[#501a2c]">
              Design
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40 mt-4">
              Projects · Products · Brands · Studios
            </p>
          </div>
          <div className="flex md:justify-end">
            <p className="font-serif text-base md:text-lg text-[#501a2c]/55 leading-relaxed max-w-md">
              A relational archive of significant interiors, the objects within them, and the studios and brands behind each decision.
            </p>
          </div>
        </div>
      </div>

      {/* Type filter strip */}
      <div className="border-b border-[#501a2c]/20 px-6 md:px-10 lg:px-16 overflow-x-auto">
        <div className="flex items-center gap-0 font-mono text-[10px] uppercase tracking-widest">
          {(['__all', ...PROJECT_TYPES] as const).map((type) => (
            <button
              key={type}
              onClick={() => setActiveCategory(type)}
              className={`px-4 py-3.5 border-r border-[#501a2c]/15 whitespace-nowrap transition-colors ${
                activeCategory === type ? 'bg-[#501a2c] text-[#F5F0EB]' : 'text-[#501a2c]/55 hover:text-[#501a2c] hover:bg-[#501a2c]/5'
              }`}
            >
              {type === '__all' ? 'All' : type}
            </button>
          ))}
          <div className="ml-auto pl-4 shrink-0">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center gap-1.5 text-[#501a2c]/55 hover:text-[#501a2c] transition-colors px-4 py-3.5"
            >
              <Search size={13} /> Search
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-[#501a2c]/20 overflow-hidden"
          >
            <form onSubmit={handleSearchSubmit} className="px-6 md:px-10 lg:px-16 py-4 flex gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects, architects, brands, materials…"
                autoFocus
                className="flex-1 bg-transparent border-b border-[#501a2c]/30 font-serif text-base text-[#501a2c] placeholder-[#501a2c]/25 focus:outline-none py-1 focus:border-[#501a2c]"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-[#501a2c]/40 hover:text-[#501a2c] transition-colors">
                  <X size={16} />
                </button>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex gap-0">
        {/* Facet sidebar — desktop only */}
        <div className="hidden lg:block border-r border-[#501a2c]/15 p-8 pt-10 min-h-screen w-64 shrink-0 sticky top-16 self-start overflow-y-auto max-h-[calc(100vh-4rem)]">
          <FacetSidebar filters={filters} onChange={setFilters} projects={filtered} />
        </div>

        {/* Grid */}
        <div className="flex-1 px-6 md:px-10 py-10 md:py-14">
          <div className="flex items-center justify-between mb-8">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#501a2c]/40">
              {filtered.length} {filtered.length === 1 ? 'project' : 'projects'}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-serif text-xl text-[#501a2c]/35">No projects match the current filter.</p>
              <button onClick={() => { setFilters({}); setSearch(''); setActiveCategory('__all'); }}
                className="mt-4 font-mono text-[10px] uppercase tracking-widest text-[#C9A690] hover:text-[#501a2c] transition-colors">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-10">
              {filtered.map((project, i) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={i}
                  onClick={() => onNav({ type: 'project', slug: project.slug })}
                />
              ))}
            </div>
          )}

          {/* Brands sub-section */}
          <div className="mt-20 pt-12 border-t border-[#501a2c]/15">
            <div className="flex items-baseline justify-between mb-8">
              <Label>Brands in the Archive</Label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {getBrands().map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => onNav({ type: 'brand', slug: brand.slug })}
                  className="text-left border border-[#501a2c]/15 p-4 hover:border-[#501a2c]/40 hover:bg-[#501a2c]/3 transition-all group"
                >
                  <p className="font-serif text-sm text-[#501a2c] group-hover:text-[#C9A690] transition-colors mb-1">{brand.name}</p>
                  <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/35">
                    {brand.country}{brand.founded ? ` · ${brand.founded}` : ''}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Studios sub-section */}
          <div className="mt-16 pt-12 border-t border-[#501a2c]/15">
            <div className="flex items-baseline justify-between mb-8">
              <Label>Studios</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getStudios().map((s) => (
                <button
                  key={s.id}
                  onClick={() => onNav({ type: 'studio', slug: s.slug })}
                  className="text-left border border-[#501a2c]/15 p-5 hover:border-[#501a2c]/40 hover:bg-[#501a2c]/3 transition-all group flex items-start gap-4"
                >
                  <div className="aspect-square w-16 overflow-hidden shrink-0 bg-[#1a0812]">
                    <img src={designImage(s.imageSeed, 128, 128)} alt={s.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-serif text-sm text-[#501a2c] group-hover:text-[#C9A690] transition-colors mb-1">{s.name}</p>
                    <p className="font-mono text-[8px] uppercase tracking-widest text-[#501a2c]/35">
                      {s.city}, {s.country} · Est. {s.yearFounded}
                    </p>
                    <p className="font-serif text-xs text-[#501a2c]/50 leading-relaxed mt-2 line-clamp-2">{s.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
function Breadcrumb({ view, onNav }: { view: View; onNav: (v: View) => void }) {
  if (view.type === 'index') return null;

  const labels: Record<string, string> = {
    project: 'Project',
    brand: 'Brand',
    studio: 'Studio',
    product: 'Product',
  };

  const getName = () => {
    if (view.type === 'project') return getProject(view.slug)?.title ?? view.slug;
    if (view.type === 'brand') return getBrand(view.slug)?.name ?? view.slug;
    if (view.type === 'studio') return getStudio(view.slug)?.name ?? view.slug;
    if (view.type === 'product') return getProduct(view.slug)?.name ?? view.slug;
    return '';
  };

  return (
    <div className="sticky top-16 z-30 bg-[#F5F0EB]/95 backdrop-blur-sm border-b border-[#501a2c]/15 px-6 md:px-10 py-3 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest">
      <button
        onClick={() => onNav({ type: 'index' })}
        className="flex items-center gap-1 text-[#501a2c]/50 hover:text-[#501a2c] transition-colors"
      >
        <ChevronLeft size={11} /> Design
      </button>
      <span className="text-[#501a2c]/20">/</span>
      <span className="text-[#C9A690]">{labels[view.type]}</span>
      <span className="text-[#501a2c]/20">/</span>
      <span className="text-[#501a2c]/70 truncate max-w-[200px]">{getName()}</span>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function DesignPage() {
  const [view, setView] = useState<View>({ type: 'index' });
  const [history, setHistory] = useState<View[]>([]);

  const navigate = useCallback((next: View) => {
    setHistory((h) => [...h, view]);
    setView(next);
    window.scrollTo({ top: 64, behavior: 'smooth' });
  }, [view]);

  const goBack = useCallback(() => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory((h) => h.slice(0, -1));
      setView(prev);
      window.scrollTo({ top: 64, behavior: 'smooth' });
    }
  }, [history]);

  return (
    <div className="pt-16 min-h-screen bg-[#F5F0EB]">
      <Breadcrumb view={view} onNav={navigate} />
      {history.length > 0 && view.type !== 'index' && (
        <button
          onClick={goBack}
          className="absolute left-6 md:left-10 mt-4 flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-[#501a2c]/40 hover:text-[#501a2c] transition-colors z-10"
        >
          <ChevronLeft size={11} /> Back
        </button>
      )}

      <AnimatePresence mode="wait">
        {view.type === 'index' && <DesignIndex key="index" onNav={navigate} />}
        {view.type === 'project' && <ProjectDetail key={`proj-${view.slug}`} slug={view.slug} onNav={navigate} />}
        {view.type === 'brand' && <BrandDetail key={`brand-${view.slug}`} slug={view.slug} onNav={navigate} />}
        {view.type === 'studio' && <StudioDetail key={`studio-${view.slug}`} slug={view.slug} onNav={navigate} />}
        {view.type === 'product' && <ProductDetail key={`prod-${view.slug}`} slug={view.slug} onNav={navigate} />}
      </AnimatePresence>
    </div>
  );
}
