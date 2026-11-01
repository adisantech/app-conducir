import React, { useState } from 'react';
import { Header, ActiveTab } from './components/common/Header';
import { ChapterBrowser } from './components/reader/ChapterBrowser';
import { MemoriceGame } from './components/games/memorice/MemoriceGame';
import { QuizGame } from './components/games/quiz/QuizGame';
import { WordScrambleGame } from './components/games/puzzle/WordScrambleGame';
import { GlosarioView } from './components/reader/GlosarioView';
import manifestData from './data/manifest.json';
import { Shield } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('memorice');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1">
        {activeTab === 'reader' && <ChapterBrowser />}
        {activeTab === 'memorice' && <MemoriceGame />}
        {activeTab === 'quiz' && <QuizGame />}
        {activeTab === 'puzzle' && <WordScrambleGame />}
        {activeTab === 'glosario' && <GlosarioView />}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/80 py-6 px-4 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-blue-400" />
            <span>
              Material basado en el <strong>{manifestData.book_title}</strong> (Edición {manifestData.year}) • CONASET Chile
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400">
            <span>{manifestData.total_pages} Páginas</span>
            <span>•</span>
            <span>{manifestData.total_chapters} Capítulos</span>
            <span>•</span>
            <span>{manifestData.total_signals} Señales</span>
            <span>•</span>
            <span>{manifestData.total_glosario_terms} Términos</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
