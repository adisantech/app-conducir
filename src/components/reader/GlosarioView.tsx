import React, { useState, useMemo } from 'react';
import glosarioData from '../../data/glosario.json';
import { Search, BookA, Bookmark } from 'lucide-react';

export const GlosarioView: React.FC = () => {
  const [filter, setFilter] = useState('');

  const filteredItems = useMemo(() => {
    if (!filter.trim()) return glosarioData;
    const q = filter.toLowerCase();
    return glosarioData.filter(
      (item) => item.term.toLowerCase().includes(q) || item.definition.toLowerCase().includes(q)
    );
  }, [filter]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header & Search */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 mb-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookA className="w-6 h-6 text-blue-400" />
            Glosario Legal de Conducción en Chile
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Definiciones técnicas y legales de la Ley de Tránsito y el manual CONASET.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Filtrar por término o concepto..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-inner"
          />
        </div>
      </div>

      {/* Terms Count Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-4 px-1">
        <span>Mostrando {filteredItems.length} de {glosarioData.length} términos</span>
        {filter && (
          <button
            onClick={() => setFilter('')}
            className="text-blue-400 hover:underline cursor-pointer"
          >
            Limpiar búsqueda
          </button>
        )}
      </div>

      {/* Terms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 rounded-2xl p-5 shadow transition-all hover:bg-slate-850 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-blue-400 shrink-0" />
                  {item.term}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  {item.id}
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                {item.definition}
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-700/40 text-[10px] text-slate-400 flex justify-between">
              <span>Ley de Tránsito Chile</span>
              <span>Anexo 2</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
