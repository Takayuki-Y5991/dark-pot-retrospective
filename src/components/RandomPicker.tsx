import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Card, Participant } from "../types";

interface RandomPickerProps {
  cards: Card[];
  selectedCard: Card | null;
  participants: Participant[];
  onClose: () => void;
}

const RandomPicker = ({ cards, selectedCard, onClose }: RandomPickerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(100);
  const [showResult, setShowResult] = useState(false);

  // 未選択のカードのみをシャッフル対象にする
  const unselectedCards = cards.filter((card) => !card.selected);

  // カードをシャッフルする
  useEffect(() => {
    // 結果が表示されていたり、未選択カードがない場合は何もしない
    if (showResult || unselectedCards.length === 0) return;

    // カードインデックスを一定間隔で切り替える
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % unselectedCards.length);
    }, speed);

    // 徐々に遅くする
    const slowDown = setTimeout(() => {
      setSpeed((prev) => Math.min(prev + 20, 300));
    }, 1500);

    // 約5秒後に結果を表示
    const showResultTimer = setTimeout(() => {
      setShowResult(true);

      // 結果表示から3秒後に閉じる
      setTimeout(() => {
        onClose();
      }, 3000);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(slowDown);
      clearTimeout(showResultTimer);
    };
  }, [showResult, unselectedCards.length, speed, onClose]);

  // 表示中カードのコンテンツを取得
  const getCurrentCard = () => {
    if (showResult && selectedCard) {
      return selectedCard;
    } else if (unselectedCards.length > 0) {
      return unselectedCards[currentIndex];
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
          className="text-3xl font-bold mb-8 text-yamunabe-500"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {showResult ? "選ばれたトピック" : "トピックを抽選中..."}
        </motion.h2>

        <AnimatePresence mode="wait">
          {currentCard && (
            <motion.div
              key={showResult ? "result" : currentCard.id}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", damping: 15 }}
              className={`bg-white text-slate-900 p-8 rounded-lg shadow-2xl mx-auto ${
                showResult
                  ? "border-4 border-yamunabe-500 transform-gpu"
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
                  投稿者: 匿名
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
      </div>
    </motion.div>
  );
};

export default RandomPicker;
