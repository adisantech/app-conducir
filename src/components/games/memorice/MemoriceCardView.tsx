import React from 'react';
import { MemoriceCard } from '../../../types/games';
import { Car, CheckCircle2, HelpCircle } from 'lucide-react';

interface MemoriceCardViewProps {
  card: MemoriceCard;
  onClick: () => void;
}

export const MemoriceCardView: React.FC<MemoriceCardViewProps> = ({ card, onClick }) => {
  const isTerm = card.type === 'term' || card.type === 'sign';

  return (
    <div
      onClick={onClick}
      className={`relative h-44 w-full cursor-pointer perspective-1000 select-none group transition-transform duration-200 active:scale-95 ${
        card.isMatched ? 'opacity-85' : ''
      }`}
    >
      <div
        className={`w-full h-full duration-500 transform-style-3d transition-transform ${
          card.isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* FRONT OF CARD (Hidden before flip / Card Back) */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl flex flex-col items-center justify-center p-4 backface-hidden shadow-lg group-hover:border-blue-500/50 group-hover:shadow-blue-500/10 transition-all">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-blue-400 mb-2 group-hover:scale-110 transition-transform">
            <Car className="w-6 h-6" />
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Memorice
          </span>
          <span className="text-[10px] text-slate-400 mt-1">Tocar para voltear</span>
        </div>

        {/* BACK OF CARD (Visible when flipped / Content Face) */}
        <div
          className={`absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col justify-between backface-hidden rotate-y-180 border shadow-xl transition-colors ${
            card.isMatched
              ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-100'
              : isTerm
              ? 'bg-gradient-to-br from-blue-900/90 to-slate-900 border-blue-500/70 text-white'
              : 'bg-gradient-to-br from-amber-950/70 to-slate-900 border-amber-500/70 text-amber-50'
          }`}
        >
          {/* Card Type Tag */}
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                card.isMatched
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : isTerm
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {card.subtext || (isTerm ? 'Concepto' : 'Definición')}
            </span>

            {card.isMatched && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Par OK
              </span>
            )}
          </div>

          {/* Card Body */}
          <div className="my-auto flex items-center justify-center text-center px-1 overflow-y-auto max-h-24">
            {card.type === 'sign' && card.imageUrl ? (
              <img
                src={card.imageUrl}
                alt={card.content}
                className="h-24 w-full object-contain"
                draggable={false}
              />
            ) : (
              <p
                className={`leading-snug ${
                  isTerm
                    ? 'font-bold text-base md:text-lg text-white'
                    : 'text-xs md:text-sm text-slate-200 font-normal italic'
                }`}
              >
                {card.content}
              </p>
            )}
          </div>

          {/* Card Footer note */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/40">
            <span>CONASET</span>
            <HelpCircle className="w-3 h-3 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
