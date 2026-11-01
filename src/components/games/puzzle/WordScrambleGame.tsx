import React, { useState, useEffect, useCallback } from 'react';
import gamesSeed from '../../../data/games_seed.json';
import { WordScrambleGame as IScramble } from '../../../types/games';
import { Lightbulb, ArrowRight, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const WordScrambleGame: React.FC = () => {
  const words = gamesSeed.puzzle.words;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPuzzle, setCurrentPuzzle] = useState<IScramble | null>(null);
  const [userGuess, setUserGuess] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);

  const scrambleWord = (word: string) => {
    const arr = word.split('');
    let scrambled = word;
    while (scrambled === word && word.length > 2) {
      arr.sort(() => 0.5 - Math.random());
      scrambled = arr.join('');
    }
    return scrambled;
  };

  const loadPuzzle = useCallback(
    (index: number) => {
      const item = words[index % words.length];
      const scrambled = scrambleWord(item.word);
      setCurrentPuzzle({
        word: item.word,
        display: item.display,
        clue: item.clue,
        scrambled,
      });
      setUserGuess('');
      setIsCorrect(false);
      setRevealedIndices([]);
    },
    [words]
  );

  useEffect(() => {
    loadPuzzle(currentIndex);
  }, [currentIndex, loadPuzzle]);

  const handleLetterClick = (letter: string) => {
    if (isCorrect || !currentPuzzle) return;
    if (userGuess.length < currentPuzzle.word.length) {
      setUserGuess((prev) => prev + letter);
    }
  };

  const handleBackspace = () => {
    if (isCorrect) return;
    setUserGuess((prev) => prev.slice(0, -1));
  };

  const handleCheck = () => {
    if (!currentPuzzle) return;
    if (userGuess.toUpperCase() === currentPuzzle.word) {
      setIsCorrect(true);
      setScore((s) => s + 10);
      try {
        confetti({ particleCount: 50, spread: 50 });
      } catch {
        // ignore
      }
    }
  };

  const handleHint = () => {
    if (!currentPuzzle || isCorrect) return;
    // Find unrevealed index
    const unrevealed = currentPuzzle.word
      .split('')
      .map((_, i) => i)
      .filter((i) => !revealedIndices.includes(i));

    if (unrevealed.length > 0) {
      const nextIdx = unrevealed[0];
      setRevealedIndices((prev) => [...prev, nextIdx]);
    }
  };

  const handleNext = () => {
    setCurrentIndex((i) => i + 1);
  };

  if (!currentPuzzle) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 mb-6 shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-white text-sm">Puzzle Vial: Desafío de Palabras</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="text-slate-400">Puntaje: <span className="text-emerald-400 font-mono">{score}</span></span>
          <span className="text-slate-400">Palabra #{currentIndex + 1}</span>
        </div>
      </div>

      {/* Puzzle Card */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 md:p-8 shadow-xl">
        {/* Clue */}
        <div className="mb-6 p-4 rounded-xl bg-slate-900/80 border border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">
            Pista Oficial del Glosario
          </p>
          <p className="text-sm text-slate-200 leading-relaxed italic">
            "{currentPuzzle.clue}"
          </p>
        </div>

        {/* Scrambled Letters */}
        <div className="text-center mb-6">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">
            Letras desordenadas
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {currentPuzzle.scrambled.split('').map((letter, idx) => (
              <button
                key={idx}
                disabled={isCorrect}
                onClick={() => handleLetterClick(letter)}
                className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-blue-600 text-white font-bold text-lg border border-slate-600 hover:border-blue-400 shadow transition-all active:scale-95 cursor-pointer flex items-center justify-center"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>

        {/* User Input Slots */}
        <div className="flex justify-center gap-2 mb-6">
          {currentPuzzle.word.split('').map((char, idx) => {
            const entered = userGuess[idx] || '';
            const isRevealed = revealedIndices.includes(idx);
            const letterToShow = isRevealed ? char : entered;

            return (
              <div
                key={idx}
                className={`w-11 h-12 rounded-xl border-2 flex items-center justify-center font-bold text-xl uppercase transition-colors ${
                  isCorrect
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                    : isRevealed
                    ? 'border-amber-500/80 bg-amber-950/40 text-amber-300'
                    : letterToShow
                    ? 'border-blue-500 bg-slate-900 text-white'
                    : 'border-slate-700 bg-slate-950 text-slate-400'
                }`}
              >
                {letterToShow}
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-700/60">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackspace}
              disabled={isCorrect || userGuess.length === 0}
              className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold border border-slate-600 disabled:opacity-40 cursor-pointer"
            >
              Borrar
            </button>
            <button
              onClick={handleHint}
              disabled={isCorrect || revealedIndices.length >= currentPuzzle.word.length - 1}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Pista
            </button>
          </div>

          {!isCorrect ? (
            <button
              onClick={handleCheck}
              disabled={userGuess.length === 0}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 disabled:opacity-40 cursor-pointer"
            >
              Comprobar
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 cursor-pointer animate-pulse"
            >
              <span>¡Correcto! Siguiente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
