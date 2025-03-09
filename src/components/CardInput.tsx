import { usePeer } from "@/contexts/PeerContext";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useState } from "react";

const CardInput = () => {
  const { submitCard } = usePeer();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!content.trim()) {
        setError("Please enter a topic");
        return;
      }

      setError(null);
      setIsSubmitting(true);

      try {
        await submitCard(content);
        setContent("");

        setSuccessMessage("Topic posted successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to post");
      } finally {
        setIsSubmitting(false);
      }
    },
    [content, submitCard]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-slate-800 rounded-lg p-5 shadow-lg mb-6"
    >
      <h3 className="text-lg font-semibold mb-3">Post New Topic</h3>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter what you want to discuss in the retrospective..."
            className="w-full p-3 bg-slate-900 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-dark-pot-500 focus:border-transparent h-24 resize-none"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex justify-between items-center">
          <div>
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-red-400 text-sm"
                >
                  {error}
                </motion.p>
              )}

              {successMessage && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-green-400 text-sm"
                >
                  {successMessage}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={isSubmitting || !content.trim()}
            className="py-2 px-4 bg-dark-pot-500 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
          >
            {isSubmitting ? "Posting..." : "Post"}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

export default CardInput;
