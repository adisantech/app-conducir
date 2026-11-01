import React, { useState, useMemo } from 'react';
import manifestData from '../../data/manifest.json';
import { allChapters } from '../../data/chapterIndex';
import { Book, ChevronLeft, ChevronRight, Search, FileText } from 'lucide-react';

export const ChapterBrowser: React.FC = () => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>('cap-1');
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentChapter = allChapters[selectedChapterId];
  const pages = currentChapter?.pages || [];
  const currentPage = pages[selectedPageIndex] || pages[0];

  // Search matches inside chapter
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim() || !currentChapter) return [];
    const query = searchQuery.toLowerCase();
    const matches: { pageIndex: number; pageNumber: number; snippet: string }[] = [];

    pages.forEach((p, idx) => {
      const lower = p.content.toLowerCase();
      const pos = lower.indexOf(query);
      if (pos !== -1) {
        const start = Math.max(0, pos - 40);
        const end = Math.min(p.content.length, pos + 80);
        matches.push({
          pageIndex: idx,
          pageNumber: p.page_number,
          snippet: '...' + p.content.slice(start, end).replace(/\n/g, ' ') + '...',
        });
      }
    });
    return matches;
  }, [searchQuery, currentChapter, pages]);

  const handleChapterSelect = (id: string) => {
    setSelectedChapterId(id);
    setSelectedPageIndex(0);
    setSearchQuery('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Chapters List */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Book className="w-4 h-4 text-blue-400" />
              Contenidos del Libro
            </h2>
            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
              {manifestData.chapters.map((ch) => {
                const isSelected = selectedChapterId === ch.id;
                const isChapter = ch.type === 'chapter';

                return (
                  <button
                    key={ch.id}
                    onClick={() => handleChapterSelect(ch.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-2.5 cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                        : 'text-slate-300 hover:bg-slate-700/60'
                    }`}
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        isSelected
                          ? 'bg-blue-800 text-blue-100'
                          : 'bg-slate-900 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {isChapter ? `Cap ${ch.number}` : ch.type === 'anexo' ? `Anx ${ch.number}` : 'Intro'}
                    </span>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate font-medium">{ch.title}</p>
                      <p
                        className={`text-[10px] mt-0.5 ${
                          isSelected ? 'text-blue-200' : 'text-slate-400'
                        }`}
                      >
                        Págs. {ch.start_page} - {ch.end_page} ({ch.total_pages} págs.)
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-3 space-y-4">
          {/* Chapter Header & Search Bar */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {currentChapter?.type === 'chapter' ? `Capítulo ${currentChapter.number}` : currentChapter?.type?.toUpperCase()}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Páginas {currentChapter?.start_page} a {currentChapter?.end_page}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1">{currentChapter?.title}</h2>
            </div>

            {/* In-chapter search input */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar en el capítulo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Search Results Dropdown/Banner */}
          {searchQuery.trim() && (
            <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 shadow">
              <p className="text-xs text-slate-400 font-medium mb-2">
                Coincidencias encontradas ({searchMatches.length}):
              </p>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {searchMatches.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPageIndex(m.pageIndex)}
                    className="text-left p-2 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-blue-500 text-xs text-slate-300 transition-colors"
                  >
                    <span className="font-bold text-blue-400 mr-1">Pág {m.pageNumber}:</span>
                    <span className="italic">{m.snippet}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Page Viewer Box */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-2xl p-6 md:p-8 shadow-xl min-h-[500px] flex flex-col justify-between">
            <div>
              {/* Page metadata bar */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-700/60 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <FileText className="w-4 h-4 text-blue-400" />
                  Página {currentPage?.page_number || currentChapter?.start_page} del Libro Oficial
                </span>
                <span>
                  Hoja {selectedPageIndex + 1} de {pages.length}
                </span>
              </div>

              {/* Clean Page Text */}
              <div className="prose prose-invert max-w-none text-slate-200 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans">
                {currentPage?.content || 'No hay contenido disponible para esta página.'}
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-6 mt-8 border-t border-slate-700/60">
              <button
                disabled={selectedPageIndex === 0}
                onClick={() => setSelectedPageIndex((i) => i - 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs font-semibold text-white transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Página Anterior
              </button>

              <div className="flex items-center gap-1 overflow-x-auto max-w-[200px] md:max-w-[400px] py-1">
                {pages.map((p, idx) => (
                  <button
                    key={p.page_number}
                    onClick={() => setSelectedPageIndex(idx)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                      selectedPageIndex === idx
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {p.page_number}
                  </button>
                ))}
              </div>

              <button
                disabled={selectedPageIndex === pages.length - 1}
                onClick={() => setSelectedPageIndex((i) => i + 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-xs font-semibold text-white transition-all cursor-pointer"
              >
                Página Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
