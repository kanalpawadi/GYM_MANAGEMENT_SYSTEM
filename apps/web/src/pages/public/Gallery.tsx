import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Maximize2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { useContent } from '../../content/ContentContext';

export const Gallery: React.FC = () => {
  const [filter, setFilter] = useState('All');
  const [selectedImg, setSelectedImg] = useState<{ title: string; category: string; url: string } | null>(null);

  const images = useContent('gallery').items;

  const filtered = filter === 'All' ? images : images.filter((img) => img.category === filter);

  return (
    <>
      <Helmet>
        <title>Photo Gallery & Facility Tour | RV Fitness</title>
        <meta name="description" content="Take a virtual tour of RV Fitness: Hammer Strength equipment, Zumba studios, CrossFit arena, and steam bath." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-10">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">INSIDE RV FITNESS</span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl break-words font-heading text-white tracking-wide uppercase mt-1">
            GYM <span className="text-gym-primary">GALLERY</span>
          </h1>
          <p className="text-sm text-gym-muted mt-2">
            Explore our state-of-the-art facility, heavy machinery, dance studios, and high-energy workout sessions.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {['All', ...Array.from(new Set(images.map((img) => img.category).filter(Boolean)))].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-lg font-heading text-sm uppercase transition-all ${
                filter === cat
                  ? 'bg-gold-gradient text-black font-bold shadow-yellow-glow'
                  : 'bg-gym-surface text-gym-muted border border-gym-border hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((img, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedImg(img)}
              className="group relative h-64 rounded-xl overflow-hidden border border-gym-border cursor-pointer shadow-lg bg-gym-surface"
            >
              <img src={img.url} alt={img.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-heading text-white uppercase">{img.title}</span>
                  <Maximize2 className="w-5 h-5 text-gym-primary" />
                </div>
                <span className="text-xs text-gym-primary font-heading uppercase">{img.category}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox Modal */}
        <Modal isOpen={!!selectedImg} onClose={() => setSelectedImg(null)} title={selectedImg?.title} maxWidth="2xl">
          {selectedImg && (
            <div className="flex flex-col gap-4">
              <img src={selectedImg.url} alt={selectedImg.title} className="w-full h-96 object-cover rounded-lg border border-gym-border" />
              <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">{selectedImg.category} FACILITY</span>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
};
