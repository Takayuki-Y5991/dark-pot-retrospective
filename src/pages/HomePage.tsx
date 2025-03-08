import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePeer } from "../contexts/PeerContext";

export const HomePage = () => {
  const { createSession, joinSession, loading, error } = usePeer();

  const [sessionName, setSessionName] = useState("");
  const [joinSessionId, setJoinSessionId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const navigate = useNavigate();

  // セッション作成ハンドラ
  const handleCreateSession = async () => {
    setLocalError(null);

    try {
      const sessionId = await createSession(sessionName);
      navigate(`/session/${sessionId}`);
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "An unexpected error has occurred..."
      );
    }
  };

  // セッション参加ハンドラ
  const handleJoinSession = async () => {
    if (!joinSessionId) {
      setLocalError("セッションIDを入力してください");
      return;
    }

    setLocalError(null);

    try {
      await joinSession(joinSessionId);
      navigate(`/session/${joinSessionId}`);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "予期せぬエラーが発生しました"
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full bg-slate-800 rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="p-8">
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl font-bold text-center mb-2 text-yamunabe-500"
          >
            闇鍋レトロスペクティブ
          </motion.h1>
          <p className="text-slate-400 text-center mb-8">
            チームの振り返りをもっと楽しく、もっと効果的に
          </p>

          {(error || localError) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-900/60 text-white p-3 rounded-md mb-4"
            >
              {error || localError}
            </motion.div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* セッション作成 */}
            <motion.div
              whileHover={{ translateY: -5 }}
              className="bg-slate-700 p-6 rounded-lg transition-colors"
            >
              <h2 className="text-xl font-semibold mb-4">
                新しいセッションを作成
              </h2>

              {!isCreating ? (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full py-2 px-4 bg-yamunabe-500 hover:bg-yamunabe-600 text-white font-medium rounded-md transition-colors"
                >
                  セッションを作成
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      あなたの名前
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="名前を入力"
                      className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-yamunabe-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      セッション名 (任意)
                    </label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="例: チームAレトロスペクティブ"
                      className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-yamunabe-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsCreating(false)}
                      className="flex-1 py-2 px-4 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-md"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleCreateSession}
                      disabled={loading || !userName}
                      className="flex-1 py-2 px-4 bg-yamunabe-500 hover:bg-yamunabe-600 disabled:bg-slate-500 disabled:cursor-not-allowed text-white font-medium rounded-md"
                    >
                      {loading ? "お待ちください..." : "作成"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* セッション参加 */}
            <motion.div
              whileHover={{ translateY: -5 }}
              className="bg-slate-700 p-6 rounded-lg transition-colors"
            >
              <h2 className="text-xl font-semibold mb-4">
                既存のセッションに参加
              </h2>

              {!isJoining ? (
                <button
                  onClick={() => setIsJoining(true)}
                  className="w-full py-2 px-4 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-md transition-colors"
                >
                  セッションに参加
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      あなたの名前
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="名前を入力"
                      className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-yamunabe-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      セッションID
                    </label>
                    <input
                      type="text"
                      value={joinSessionId}
                      onChange={(e) => setJoinSessionId(e.target.value)}
                      placeholder="ホストから共有されたID"
                      className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-yamunabe-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsJoining(false)}
                      className="flex-1 py-2 px-4 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-md"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleJoinSession}
                      disabled={loading || !userName || !joinSessionId}
                      className="flex-1 py-2 px-4 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-md"
                    >
                      {loading ? "お待ちください..." : "参加"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        <div className="bg-slate-900 p-4 text-center text-slate-500 text-sm">
          © 2025 闇鍋レトロスペクティブツール
        </div>
      </motion.div>
    </div>
  );
};
