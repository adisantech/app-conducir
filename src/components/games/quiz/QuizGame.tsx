import React, { useState } from 'react';
import gamesSeed from '../../../data/games_seed.json';
import { QuizQuestion } from '../../../types/games';
import { CheckCircle, XCircle, AlertCircle, ArrowRight, RotateCcw, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

export const QuizGame: React.FC = () => {
  const questions: QuizQuestion[] = gamesSeed.quiz.questions;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    if (idx === currentQ.answer_index) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
      try {
        confetti({ particleCount: 80, spread: 60 });
      } catch {
        // ignore
      }
    }
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
  };

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 75;

    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 text-center shadow-2xl">
          <div
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
              passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            <Trophy className="w-8 h-8" />
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">
            {passed ? '¡Aprobaste el Test Teórico!' : 'Podés repasar y volver a intentar'}
          </h3>
          <p className="text-slate-300 text-sm mb-6">
            Obtuviste <span className="font-bold text-white">{score}</span> de{' '}
            <span className="font-bold text-white">{questions.length}</span> correctas ({percentage}%).
          </p>

          <button
            onClick={restartQuiz}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reiniciar Test
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
        <span>Pregunta {currentIndex + 1} de {questions.length}</span>
        <span>Aciertos: {score}</span>
      </div>
      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-6">
        <div
          className="bg-blue-500 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-500/20">
          Capítulo {currentQ.chapter}
        </div>

        <h3 className="text-lg md:text-xl font-bold text-white leading-relaxed mb-6">
          {currentQ.question}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {currentQ.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQ.answer_index;

            let buttonStyle = 'bg-slate-900/60 border-slate-700/80 text-slate-200 hover:bg-slate-750 hover:border-slate-600';
            if (isAnswered) {
              if (isCorrect) {
                buttonStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-100 font-semibold';
              } else if (isSelected) {
                buttonStyle = 'bg-rose-950/80 border-rose-500 text-rose-100';
              } else {
                buttonStyle = 'bg-slate-900/30 border-slate-800 text-slate-400 opacity-60';
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleSelectOption(idx)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${buttonStyle}`}
              >
                <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0 border border-slate-700">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-sm leading-snug flex-1">{opt}</span>
                {isAnswered && isCorrect && (
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation & Next */}
        {isAnswered && (
          <div className="mt-6 pt-5 border-t border-slate-700/60 animate-fade-in">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 text-sm text-slate-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-200 mb-1">Fundamento normativo:</p>
                <p className="text-xs text-slate-300 leading-relaxed">{currentQ.explanation}</p>
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/30 cursor-pointer"
              >
                <span>{currentIndex < questions.length - 1 ? 'Siguiente Pregunta' : 'Ver Resultados'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
