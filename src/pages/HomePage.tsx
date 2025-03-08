import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ChefHat,
  DoorOpen,
  Loader,
  LogIn,
  PlusCircle,
  Users,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
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

  const handleCreateSession = useCallback(async () => {
    if (!sessionName) {
      setLocalError("セッション名を入力してください");
      return;
    }

    setLocalError(null);
    try {
      const sessionId = await createSession(sessionName);
      navigate(`/session/${sessionId}`);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "予期せぬエラーが発生しました"
      );
    }
  }, [createSession, navigate, sessionName]);

  const handleJoinSession = useCallback(async () => {
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
  }, [joinSession, joinSessionId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-900 to-slate-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full bg-slate-800/50 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden border border-slate-700/50"
      >
        <div className="p-6 sm:p-8">
          <motion.div
            className="flex items-center justify-center mb-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <ChefHat className="w-8 h-8 sm:w-10 sm:h-10 mr-2 sm:mr-3 text-dark-pot-400 flex-shrink-0" />
            <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text bg-gradient-to-r from-dark-pot-400 to-dark-pot-500 text-white">
              Dark Pot
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-slate-400 text-center mb-6 sm:mb-8 text-sm sm:text-base"
          >
            チームの振り返りをもっと楽しく、もっと効果的に
          </motion.p>

          {(error || localError) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-900/60 border border-red-700/50 text-white p-3 sm:p-4 rounded-lg mb-5 sm:mb-6 flex items-start text-sm sm:text-base"
            >
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error || localError}</span>
            </motion.div>
          )}

          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {/* セッション作成 */}
            <motion.div
              whileHover={{ translateY: -5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="bg-gradient-to-br from-slate-700/80 to-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg border border-slate-600/50"
            >
              <div className="flex items-center mb-3 sm:mb-4">
                <DoorOpen className="w-5 h-5 mr-2 text-dark-pot-400 flex-shrink-0" />
                <h2 className="text-lg sm:text-xl font-semibold">
                  新しいセッションを作成
                </h2>
              </div>

              {!isCreating ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsCreating(true)}
                  className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-medium rounded-lg transition-all duration-300 shadow-md flex items-center justify-center"
                >
                  <PlusCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">セッションを作成</span>
                </motion.button>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1 font-medium">
                      セッション名
                    </label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="例: チームAレトロスペクティブ"
                      className="w-full p-2 sm:p-2.5 bg-slate-800/80 border border-slate-600 rounded-lg focus:ring-2 focus:ring-dark-pot-500 focus:border-transparent transition-all duration-200 outline-none shadow-inner text-sm sm:text-base"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsCreating(false)}
                      className="w-full sm:flex-1 py-2 sm:py-2.5 px-4 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">キャンセル</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreateSession}
                      disabled={loading || !sessionName}
                      className="w-full sm:flex-1 py-2 sm:py-2.5 px-4 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 disabled:from-slate-500 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
                          <span className="truncate">お待ちください...</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">作成</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* セッション参加 */}
            <motion.div
              whileHover={{ translateY: -5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="bg-gradient-to-br from-slate-700/80 to-slate-700/50 p-4 sm:p-6 rounded-xl shadow-lg border border-slate-600/50"
            >
              <div className="flex items-center mb-3 sm:mb-4">
                <Users className="w-5 h-5 mr-2 text-dark-pot-400 flex-shrink-0" />
                <h2 className="text-lg sm:text-xl font-semibold">
                  既存のセッションに参加
                </h2>
              </div>

              {!isJoining ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsJoining(true)}
                  className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-medium rounded-lg transition-all duration-300 shadow-md flex items-center justify-center"
                >
                  <LogIn className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">セッションに参加</span>
                </motion.button>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1 font-medium">
                      セッションID
                    </label>
                    <input
                      type="text"
                      value={joinSessionId}
                      onChange={(e) => setJoinSessionId(e.target.value)}
                      placeholder="ホストから共有されたID"
                      className="w-full p-2 sm:p-2.5 bg-slate-800/80 border border-slate-600 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all duration-200 outline-none shadow-inner text-sm sm:text-base"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsJoining(false)}
                      className="w-full sm:flex-1 py-2 sm:py-2.5 px-4 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">キャンセル</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleJoinSession}
                      disabled={loading || !joinSessionId}
                      className="w-full sm:flex-1 py-2 sm:py-2.5 px-4 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center"
                    >
                      {loading ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
                          <span className="truncate">お待ちください...</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">参加</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm p-3 sm:p-4 text-center text-slate-500 text-xs sm:text-sm border-t border-slate-700/50">
          © 2025 Dark Pot Retrospective Tool
        </div>
      </motion.div>
    </div>
  );
};
