import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CardInput from "../components/CardInput";
import CardList from "../components/CardList";
import RandomPicker from "../components/RandomPicker";
import ShareModal from "../components/ShareModal";
import { usePeer } from "../contexts/PeerContext";

const SessionPage: React.FC = () => {
  const {
    user,
    session,
    participants,
    cards,
    selectedCard,
    loading,
    error,
    showRandomPicker,
    setShowRandomPicker,
    pickRandomCard,
    newSession: resetSession,
  } = usePeer();

  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [showShareModal, setShowShareModal] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // ユーザーがログインしていない場合はホームにリダイレクト
  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  // カード抽選ハンドラ
  const handlePickRandomCard = async () => {
    if (!user?.isHost) return;

    try {
      await pickRandomCard();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "予期せぬエラーが発生しました"
      );
      setTimeout(() => setLocalError(null), 3000);
    }
  };

  // セッションリセットハンドラ
  const handleResetSession = async () => {
    if (!user?.isHost) return;

    if (
      window.confirm(
        "本当にセッションをリセットしますか？全てのカードの選択状態がリセットされます。"
      )
    ) {
      try {
        await resetSession();
      } catch (err) {
        setLocalError(
          err instanceof Error ? err.message : "予期せぬエラーが発生しました"
        );
        setTimeout(() => setLocalError(null), 3000);
      }
    }
  };

  // ローディング中表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yamunabe-500 mx-auto mb-4"></div>
          <p className="text-slate-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-900/70 text-white p-6 rounded-lg max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-4">エラーが発生しました</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-white text-red-900 rounded-md font-medium"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  // 参加者自身のカード
  const myCards = cards.filter((card) => card.authorId === user?.id);

  // 未選択のカード
  const unselectedCards = cards.filter((card) => !card.selected);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ヘッダー */}
      <header className="bg-slate-800 p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center">
          <h1 className="text-2xl font-bold text-yamunabe-500">
            {session?.name}
            <span className="ml-2 text-sm text-slate-400">
              #{sessionId?.substring(0, 8)}
            </span>
          </h1>

          <div className="flex items-center space-x-4 mt-2 sm:mt-0">
            <div className="text-slate-400">{participants.length}人参加中</div>

            <button
              onClick={() => setShowShareModal(true)}
              className="py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded"
            >
              共有
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto p-4">
        {/* ローカルエラー表示 */}
        <AnimatePresence>
          {localError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-900/70 text-white p-3 rounded-md mb-4"
            >
              {localError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ステータス表示 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-lg p-4 mb-6"
        >
          <div className="flex flex-wrap justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">
                ステータス:
                {session?.status === "collecting" && (
                  <span className="text-green-400 ml-2">募集中</span>
                )}
                {session?.status === "picking" && (
                  <span className="text-yamunabe-500 ml-2">抽選中</span>
                )}
                {session?.status === "finished" && (
                  <span className="text-blue-400 ml-2">完了</span>
                )}
              </h2>
              <p className="text-slate-400">
                {session?.status === "collecting" &&
                  "参加者からのトピック投稿を受け付けています"}
                {session?.status === "picking" &&
                  "トピックを抽選して議論しています"}
                {session?.status === "finished" &&
                  "全てのトピックが選ばれました"}
              </p>
            </div>

            {user?.isHost && (
              <div className="flex space-x-3 mt-4 sm:mt-0">
                <button
                  onClick={handlePickRandomCard}
                  disabled={
                    session?.status === "finished" ||
                    unselectedCards.length === 0
                  }
                  className="py-2 px-4 bg-yamunabe-500 hover:bg-yamunabe-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded"
                >
                  トピックを抽選
                </button>

                <button
                  onClick={handleResetSession}
                  className="py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded"
                >
                  リセット
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* 選択中のカード表示 */}
        <AnimatePresence>
          {selectedCard && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-yamunabe-500 text-slate-900 rounded-lg p-6 mb-6 shadow-lg"
            >
              <h3 className="text-lg font-semibold mb-2">現在のトピック</h3>
              <div className="bg-white rounded-lg p-6 text-lg shadow-inner">
                {selectedCard.content}
              </div>
              <div className="mt-4 text-sm flex justify-end">
                <div className="flex items-center">
                  投稿者: {selectedCard.authorName}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* カード投稿フォーム */}
        {session?.status === "collecting" && <CardInput />}

        {/* カードリスト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* マイカード一覧 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
          >
            <h3 className="text-xl font-semibold mb-4">
              あなたの投稿 ({myCards.length})
            </h3>
            <CardList cards={myCards} isMyCards={true} />
          </motion.div>

          {/* すべてのカード一覧 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
          >
            <h3 className="text-xl font-semibold mb-4">
              すべての投稿 ({cards.length})
            </h3>
            <CardList cards={cards} isMyCards={false} />
          </motion.div>
        </div>
      </main>

      {/* 抽選アニメーション */}
      <AnimatePresence>
        {showRandomPicker && (
          <RandomPicker
            cards={cards}
            selectedCard={selectedCard}
            participants={participants}
            onClose={() => setShowRandomPicker(false)}
          />
        )}
      </AnimatePresence>

      {/* 共有モーダル */}
      <AnimatePresence>
        {showShareModal && (
          <ShareModal
            sessionId={sessionId || ""}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SessionPage;
