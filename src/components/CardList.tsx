import { usePeer } from "@/contexts/PeerContext";
import { Card } from "@/types";
import { motion } from "framer-motion";

interface CardListProps {
  cards: Card[];
  isMyCards: boolean;
}

const CardList = ({ cards, isMyCards }: CardListProps) => {
  const { user, deleteCard } = usePeer();

  // Card deletion handler
  const handleDeleteCard = async (cardId: string) => {
    if (window.confirm("Are you sure you want to delete this topic?")) {
      try {
        await deleteCard(cardId);
      } catch {
        alert("Failed to delete the topic");
      }
    }
  };

  if (cards.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 text-center text-slate-400">
        {isMyCards
          ? "You haven't posted any topics yet"
          : "No topics have been posted yet"}
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
                (isMyCards ? " border-l-4 border-dark-pot-500" : "")
              : "bg-slate-800 hover:bg-slate-700"
          }`}
        >
          <div className="flex justify-between">
            <p className="mb-3 flex-grow">{card.content}</p>

            {/* Delete button - shown for own cards or when user is host */}
            {(isMyCards || user?.isHost) && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Stop event propagation
                  handleDeleteCard(card.id);
                }}
                className="text-red-400 hover:text-red-300 ml-2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-slate-600 transition-colors"
                aria-label="Delete topic"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 flex justify-between">
            {!isMyCards && <span>Posted by: Anonymous</span>}
            {card.selected && (
              <span className="text-dark-pot-500">Selected</span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default CardList;
