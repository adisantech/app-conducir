import React, { useState } from 'react';
import { useMemorice } from '../../../hooks/useMemorice';
import { MemoriceCardView } from './MemoriceCardView';
import { MemoriceCategory, MemoriceDifficulty } from '../../../types/games';
import { RotateCcw, Timer, Award, Sparkles, BookA, TrafficCone } from 'lucide-react';

export const MemoriceGame: React.FC = () => {
  const [category, setCategory] = useState<MemoriceCategory>('glosario');
  const [difficulty, setDifficulty] = useState<MemoriceDifficulty>('medium');

  const {
    cards,
    moves,
    seconds,
    isVictory,
    totalPairs,
    matchedPairsCount,
    flipCard,
    restart,
  } = useMemorice(category, difficulty);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Game Header Controls */}
      <div className="bg-slate-800/70 border border-slate-700/60 rounded-2xl p-5 mb-8 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Memorice Vial de Chile
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Emparejá cada concepto con su definición o la imagen de cada señal con su nombre.
            </p>
          </div>

          {/* Mode & Difficulty Selectors */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Toggle */}
            <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-700 flex items-center gap-1 text-xs font-medium">
              <button
                onClick={() => setCategory('glosario')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  category === 'glosario'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookA className="w-3.5 h-3.5" />
                Glosario
              </button>
              <button
                onClick={() => setCategory('senales')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  category === 'senales'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrafficCone className="w-3.5 h-3.5" />
                Señales
              </button>
            </div>

            {/* Difficulty Toggle */}
            <div className="bg-slate-900/80 p-1 rounded-xl border border-slate-700 flex items-center gap-1 text-xs font-medium">
              {(['easy', 'medium', 'hard'] as MemoriceDifficulty[]).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`px-2.5 py-1.5 rounded-lg transition-colors capitalize cursor-pointer ${
                    difficulty === diff
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {diff === 'easy' ? 'Fácil (4)' : diff === 'medium' ? 'Medio (6)' : 'Difícil (8)'}
                </button>
              ))}
            </div>

            {/* Restart button */}
            <button
              onClick={restart}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-semibold transition-all border border-slate-600 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reiniciar
            </button>
          </div>
        </div>

        {/* Live Score Bar */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-700/60">
          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Tiempo</p>
              <p className="text-lg font-bold text-white font-mono">{formatTime(seconds)}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Intentos</p>
              <p className="text-lg font-bold text-white font-mono">{moves}</p>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Progreso</p>
              <p className="text-lg font-bold text-emerald-400 font-mono">
                {matchedPairsCount} / {totalPairs}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Victory Banner */}
      {isVictory && (
        <div className="mb-8 p-6 bg-gradient-to-r from-emerald-900/90 to-teal-900/90 border border-emerald-500 rounded-2xl text-center shadow-2xl animate-fade-in">
          <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-300 mb-3">
            <Award className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-white">¡Felicitaciones, completaste el Memorice!</h3>
          <p className="text-emerald-200 mt-1 text-sm max-w-md mx-auto">
            Lograste emparejar todos los conceptos en <span className="font-bold">{moves} intentos</span> y{' '}
            <span className="font-bold">{formatTime(seconds)}</span>.
          </p>
          <button
            onClick={restart}
            className="mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition-transform hover:scale-105 cursor-pointer text-sm"
          >
            Jugar otra partida
          </button>
        </div>
      )}

      {/* Cards Grid */}
      <div
        className={`grid gap-4 ${
          difficulty === 'easy'
            ? 'grid-cols-2 md:grid-cols-4'
            : difficulty === 'medium'
            ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
        }`}
      >
        {cards.map((card) => (
          <MemoriceCardView
            key={card.id}
            card={card}
            onClick={() => flipCard(card.id)}
          />
        ))}
      </div>
    </div>
  );
};
