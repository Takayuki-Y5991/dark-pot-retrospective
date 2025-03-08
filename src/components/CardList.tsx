import { motion } from "framer-motion";
import { Card } from "../types";

interface CardListProps {
  cards: Card[];
  isMyCards: boolean;
}

const CardList = ({ cards, isMyCards }: CardListProps) => {
  if (cards.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 text-center text-slate-400">
        {isMyCards
          ? "あなたはまだトピックを投稿していません"
          : "まだ投稿されたトピックはありません"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`p-4 rounded-lg transition-all ${
            card.selected
              ? "bg-slate-700 opacity-70" +
                (isMyCards ? " border-l-4 border-yamunabe-500" : "")
              : "bg-slate-800 hover:bg-slate-700"
          }`}
        >
          <p className="mb-3">{card.content}</p>
          <div className="text-xs text-slate-400 flex justify-between">
            {!isMyCards && <span>投稿者: {card.authorId}</span>}
            {card.selected && (
              <span className="text-yamunabe-500">選択済み</span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default CardList;
