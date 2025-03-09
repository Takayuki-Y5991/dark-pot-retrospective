import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Card, Participant } from "../types";

interface RandomPickerProps {
  cards: Card[];
  selectedCard: Card | null;
  participants: Participant[];
  onClose: () => void;
}

// Pot animation component
const PotAnimation = () => {
  return (
    <motion.div
      className="relative w-48 h-48 mx-auto my-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Main rotation animation - outer circle */}
      <motion.div
        className="absolute inset-0 border-8 border-dark-pot-500 border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Inner rotation animation */}
      <motion.div
        className="absolute inset-4 border-6 border-dark-pot-300 border-b-transparent rounded-full"
        animate={{ rotate: -360 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Pot SVG representation */}
      <motion.div
        className="absolute inset-8 flex items-center justify-center"
        animate={{ y: [0, -5, 0, -3, 0] }}
        transition={{
          repeat: Infinity,
          duration: 1.8,
          ease: "easeInOut",
        }}
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pot body */}
          <motion.path
            d="M15 45C15 36.7157 21.7157 30 30 30H50C58.2843 30 65 36.7157 65 45V55C65 58.3137 62.3137 61 59 61H21C17.6863 61 15 58.3137 15 55V45Z"
            fill="#6B7280"
            animate={{
              fill: ["#6B7280", "#4B5563", "#6B7280"],
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: "easeInOut",
            }}
          />

          {/* Pot handle (left) */}
          <path
            d="M10 37C10 33.6863 12.6863 31 16 31H20V39H16C12.6863 39 10 36.3137 10 33V37Z"
            fill="#4B5563"
          />

          {/* Pot handle (right) */}
          <path
            d="M70 37C70 33.6863 67.3137 31 64 31H60V39H64C67.3137 39 70 36.3137 70 33V37Z"
            fill="#4B5563"
          />

          {/* Cooking content */}
          <motion.path
            d="M22 45C22 41.6863 24.6863 39 28 39H52C55.3137 39 58 41.6863 58 45V55C58 55 55.3137 56 52 56H28C24.6863 56 22 55 22 55V45Z"
            fill="#F59E0B"
            animate={{
              fill: ["#F59E0B", "#D97706", "#F59E0B"],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut",
            }}
          />

          {/* Ladle */}
          <motion.g
            animate={{
              rotate: [0, 15, 0, -15, 0],
              x: [0, 2, 0, -2, 0],
              y: [0, -1, -2, -1, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              ease: "easeInOut",
            }}
          >
            <path
              d="M42 25C42 22.2386 44.2386 20 47 20H49C51.7614 20 54 22.2386 54 25V40H42V25Z"
              fill="#9CA3AF"
            />
            <ellipse cx="48" cy="20" rx="6" ry="4" fill="#9CA3AF" />
          </motion.g>

          {/* Steam */}
          <motion.path
            d="M35 35C35 35 33 31 36 29C39 27 41 29 40 31C39 33 42 34 44 32C46 30 45 26 42 25"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            fill="transparent"
            animate={{
              y: [-2, -4, -2],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: "easeInOut",
            }}
          />

          <motion.path
            d="M50 33C50 33 48 29 51 27C54 25 56 27 55 29C54 31 57 32 59 30C61 28 60 24 57 23"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            fill="transparent"
            animate={{
              y: [-2, -5, -2],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.3,
              ease: "easeInOut",
              delay: 0.3,
            }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
};

const RandomPicker = ({ cards, selectedCard, onClose }: RandomPickerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(150); // Initial value set slightly slower
  const [showResult, setShowResult] = useState(false);
  const [phase, setPhase] = useState("initializing"); // initializing, shuffling, result
  const [shuffleCards, setShuffleCards] = useState<Card[]>([]);
  const [countdownTime, setCountdownTime] = useState(5);
  const [countdownActive, setCountdownActive] = useState(false);

  // Check selected card on initial mount
  useEffect(() => {
    if (selectedCard) {
      setPhase("shuffling");

      // Variable to store cleanup functions
      const timers: NodeJS.Timeout[] = [];

      const timer = setTimeout(() => {
        setPhase("result");
        setShowResult(true);

        // Close 3 seconds after showing result
        const closeTimer = setTimeout(() => {
          onClose();
        }, 3000);

        timers.push(closeTimer);
      }, 3000);

      timers.push(timer);

      // Cleanup function
      return () => {
        timers.forEach((t) => clearTimeout(t));
      };
    } else {
      // Stay in initialization phase if no cards
      setPhase("initializing");

      // Transition to shuffle phase after 2 seconds (to show loading animation)
      const timer = setTimeout(() => {
        // Make unselected cards targets for shuffling
        const unselectedCards = cards.filter((card) => !card.selected);

        if (unselectedCards.length > 0) {
          // Generate and shuffle dummy cards
          const shuffleSet: Card[] = [];
          // Generate 10 dummy cards
          for (let i = 0; i < 10; i++) {
            const randomCard =
              unselectedCards[
                Math.floor(Math.random() * unselectedCards.length)
              ];
            if (randomCard) {
              shuffleSet.push({
                ...randomCard,
                id: `${randomCard.id}_${i}`,
              });
            }
          }

          setShuffleCards(shuffleSet);
          setPhase("shuffling");

          // Start countdown
          setCountdownActive(true);
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [selectedCard, cards, onClose]);

  // Countdown processing
  useEffect(() => {
    if (!countdownActive) return;

    const interval = setInterval(() => {
      setCountdownTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // If no result is shown when countdown ends, force close
          if (!showResult && !selectedCard) {
            onClose();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdownActive, showResult, selectedCard, onClose]);

  // Card shuffle animation
  useEffect(() => {
    if (phase !== "shuffling" || shuffleCards.length === 0) return;

    // Switch card index at regular intervals
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % shuffleCards.length);
    }, speed);

    // Gradually slow down (for more dramatic effect)
    const slowDown = setTimeout(() => {
      setSpeed((prev) => Math.min(prev + 50, 500));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(slowDown);
    };
  }, [phase, shuffleCards.length, speed]);

  // Get content of currently displayed card
  const getCurrentCard = () => {
    if (showResult && selectedCard) {
      return selectedCard;
    } else if (phase === "shuffling" && shuffleCards.length > 0) {
      return shuffleCards[currentIndex];
    } else if (cards.length > 0 && !selectedCard) {
      // Show first card if no card is selected
      const unselectedCards = cards.filter((card) => !card.selected);
      if (unselectedCards.length > 0) {
        return unselectedCards[currentIndex % unselectedCards.length];
      }
    }
    return null;
  };

  const currentCard = getCurrentCard();

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center max-w-4xl w-full">
        <motion.h2
          className="text-3xl font-bold mb-8 text-dark-pot-500"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {phase === "initializing" && "Preparing random selection..."}
          {phase === "shuffling" &&
            countdownActive &&
            !selectedCard &&
            `Selecting a topic... (${countdownTime})`}
          {phase === "shuffling" && !countdownActive && "Selecting a topic..."}
          {phase === "result" && "Selected Topic"}
        </motion.h2>

        <AnimatePresence mode="wait">
          {phase === "initializing" && <PotAnimation key="loading" />}

          {phase === "shuffling" && !currentCard && (
            <PotAnimation key="shuffling-loading" />
          )}

          {currentCard && (
            <motion.div
              key={showResult ? "result" : currentCard.id}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", damping: 15 }}
              className={`bg-white text-slate-900 p-8 rounded-lg shadow-2xl mx-auto ${
                showResult
                  ? "border-4 border-dark-pot-500 transform-gpu"
                  : "border border-slate-200"
              }`}
            >
              <p className="text-xl mb-4">{currentCard.content}</p>

              {showResult && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-slate-600 text-right mt-4"
                >
                  Posted by: Anonymous
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {showResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, type: "spring" }}
            className="mt-12"
          >
            <motion.div
              className="inline-block"
              animate={{
                rotate: [0, 10, 0, -10, 0],
                scale: [1, 1.2, 1, 1.2, 1],
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <span className="text-4xl">🎉</span>
            </motion.div>
          </motion.div>
        )}

        {phase !== "result" && countdownActive && (
          <motion.button
            className="mt-6 px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-white"
            onClick={onClose}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Cancel
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default RandomPicker;
