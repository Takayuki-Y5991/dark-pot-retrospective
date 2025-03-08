import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";
import { usePeer } from "../contexts/PeerContext";

const CardInput = () => {
  const { submitCard } = usePeer();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError("トピックを入力してください");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await submitCard(content);
      setContent("");

      // 成功メッセージを表示して一定時間後に消す
      setSuccessMessage("トピックを投稿しました！");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "投稿に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-slate-800 rounded-lg p-5 shadow-lg mb-6"
    >
      <h3 className="text-lg font-semibold mb-3">新しいトピックを投稿</h3>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="レトロスペクティブで話し合いたいことを入力してください..."
            className="w-full p-3 bg-slate-900 border border-slate-700 rounded-md focus:outline-none focus:ring-2 focus:ring-yamunabe-500 focus:border-transparent h-24 resize-none"
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
            className="py-2 px-4 bg-yamunabe-500 hover:bg-yamunabe-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
          >
            {isSubmitting ? "投稿中..." : "投稿する"}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};

export default CardInput;
