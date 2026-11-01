import { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { MemoriceCard, MemoriceDifficulty, MemoriceCategory } from '../types/games';
import glosarioData from '../data/glosario.json';
import senalesData from '../data/senales.json';

const DIFFICULTY_PAIRS: Record<MemoriceDifficulty, number> = {
  easy: 4,
  medium: 6,
  hard: 8,
};

// Pure deck construction is shared by initialization and deterministic regressions.
export function createMemoriceDeck(
  category: MemoriceCategory,
  difficulty: MemoriceDifficulty
): MemoriceCard[] {
    const pairCount = DIFFICULTY_PAIRS[difficulty];
    const newCards: MemoriceCard[] = [];

    if (category === 'glosario') {
      // Pick random terms with compact definitions
      const eligible = [...glosarioData]
        .filter((item) => item.definition.length <= 150)
        .sort(() => 0.5 - Math.random())
        .slice(0, pairCount);

      eligible.forEach((item, idx) => {
        const pairId = `pair-${idx}`;
        // Card A: Term
        newCards.push({
          id: `card-${pairId}-term`,
          pairId,
          content: item.term,
          subtext: 'Concepto',
          type: 'term',
          isFlipped: false,
          isMatched: false,
        });
        // Card B: Definition
        newCards.push({
          id: `card-${pairId}-def`,
          pairId,
          content: item.definition,
          subtext: 'Definición',
          type: 'definition',
          isFlipped: false,
          isMatched: false,
        });
      });
    } else {
      // Traffic signals category
      // Shuffle before choosing a representative so every physical variant is eligible.
      const shuffled = [...senalesData];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const names = new Set<string>();
      const eligible = shuffled.filter(item => {
        if (names.has(item.name)) return false;
        names.add(item.name);
        return true;
      }).slice(0, pairCount);

      eligible.forEach((item, idx) => {
        const pairId = `pair-${idx}`;
        // Card A: Signal image
        newCards.push({
          id: `card-${pairId}-sign`,
          pairId,
          content: item.name,
          imageUrl: item.imageUrl,
          subtext: 'Señal Vial',
          type: 'sign',
          isFlipped: false,
          isMatched: false,
        });
        // Card B: Signal name
        newCards.push({
          id: `card-${pairId}-cat`,
          pairId,
          content: item.name,
          subtext: 'Nombre de la señal',
          type: 'category',
          isFlipped: false,
          isMatched: false,
        });
      });
    }

    // Shuffle cards
    newCards.sort(() => 0.5 - Math.random());
    return newCards;
}

export function useMemorice(
  category: MemoriceCategory = 'glosario',
  difficulty: MemoriceDifficulty = 'medium'
) {
  const [cards, setCards] = useState<MemoriceCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<string[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const isCheckingRef = useRef<boolean>(false);

  const initGame = useCallback(() => {
    setCards(createMemoriceDeck(category, difficulty));
    setFlippedCards([]);
    setMatchedPairs([]);
    setMoves(0);
    setSeconds(0);
    setIsPlaying(false);
    setIsVictory(false);
    isCheckingRef.current = false;
  }, [category, difficulty]);

  // Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying && !isVictory) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isVictory]);

  // Flip card handler
  const flipCard = useCallback(
    (cardId: string) => {
      if (isCheckingRef.current) return;

      const target = cards.find((c) => c.id === cardId);
      if (!target || target.isFlipped || target.isMatched) return;

      if (!isPlaying) {
        setIsPlaying(true);
      }

      // Flip the clicked card
      const newFlipped = [...flippedCards, cardId];
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c))
      );
      setFlippedCards(newFlipped);

      // If two cards are flipped, check match
      if (newFlipped.length === 2) {
        setMoves((m) => m + 1);
        isCheckingRef.current = true;

        const firstCard = cards.find((c) => c.id === newFlipped[0])!;
        const secondCard = cards.find((c) => c.id === newFlipped[1])!;

        if (firstCard.pairId === secondCard.pairId) {
          // MATCH!
          const newMatched = [...matchedPairs, firstCard.pairId];
          setMatchedPairs(newMatched);
          setCards((prev) =>
            prev.map((c) =>
              c.pairId === firstCard.pairId
                ? { ...c, isMatched: true, isFlipped: true }
                : c
            )
          );
          setFlippedCards([]);
          isCheckingRef.current = false;

          // Check for full victory
          const totalPairs = DIFFICULTY_PAIRS[difficulty];
          if (newMatched.length === totalPairs) {
            setIsVictory(true);
            setIsPlaying(false);
            try {
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
              });
            } catch {
              // Ignore if canvas is not ready
            }
          }
        } else {
          // NO MATCH -> flip back after delay
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c) =>
                newFlipped.includes(c.id) ? { ...c, isFlipped: false } : c
              )
            );
            setFlippedCards([]);
            isCheckingRef.current = false;
          }, 900);
        }
      }
    },
    [cards, flippedCards, matchedPairs, isPlaying, difficulty]
  );

  useEffect(() => {
    initGame();
  }, [initGame]);

  return {
    cards,
    moves,
    seconds,
    isVictory,
    totalPairs: DIFFICULTY_PAIRS[difficulty],
    matchedPairsCount: matchedPairs.length,
    flipCard,
    restart: initGame,
  };
}
