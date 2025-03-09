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
    pickRandomCard,
    newSession: resetSession,
    handleRandomPickerClose,
  } = usePeer();

  // URL parameters and navigation
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Local state
  const [showShareModal, setShowShareModal] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId || "");

  // Toggle state for showing all cards - initially false (closed)
  const [showAllCards, setShowAllCards] = useState(false);

  // Monitor session ID changes
  useEffect(() => {
    if (session?.id && session.id !== currentSessionId) {
      setCurrentSessionId(session.id);
    }
  }, [session?.id, currentSessionId]);

  // Redirect to home if user is not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  // Card selection handler
  const handlePickRandomCard = async () => {
    if (!user?.isHost) return;

    try {
      await pickRandomCard();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setTimeout(() => setLocalError(null), 3000);
    }
  };

  // Session reset handler
  const handleResetSession = async () => {
    if (!user?.isHost) return;

    if (
      window.confirm(
        "Are you sure you want to reset the session? All cards will be deleted."
      )
    ) {
      try {
        // Ask for new session name
        const newSessionName = prompt(
          "Please enter a new session name",
          session?.name
        );

        // Cancel if user pressed cancel
        if (newSessionName === null) return;

        // Use original name if empty
        const finalSessionName =
          newSessionName?.trim() || session?.name || "New Session";

        // Get resetSession return value and update new session ID
        const newSessionId = await resetSession(finalSessionName);
        if (newSessionId) {
          setCurrentSessionId(newSessionId);
          // Show share modal after creating new session
          setTimeout(() => {
            setShowShareModal(true);
          }, 500);
        }
      } catch (err) {
        setLocalError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
        setTimeout(() => setLocalError(null), 3000);
      }
    }
  };

  // Toggle button handler
  const toggleAllCards = () => {
    setShowAllCards((prev) => !prev);
  };

  // Loading display
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-dark-pot-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Error display
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-900/70 text-white p-6 rounded-lg max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-4">An Error Occurred</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-white text-red-900 rounded-md font-medium"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // User's own cards
  const myCards = cards.filter((card) => card.authorId === user?.id);

  // Unselected cards
  const unselectedCards = cards.filter((card) => !card.selected);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center">
          <h1 className="text-2xl font-bold text-dark-pot-500">
            {session?.name}
            <span className="ml-2 text-sm text-slate-400">
              #{currentSessionId.substring(0, 8)}
            </span>
          </h1>

          <div className="flex items-center space-x-4 mt-2 sm:mt-0">
            <div className="text-slate-400">
              {participants.length} participants
            </div>

            <button
              onClick={() => setShowShareModal(true)}
              className="py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded"
            >
              Share
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto p-4">
        {/* Local error display */}
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

        {/* Status display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-lg p-4 mb-6"
        >
          <div className="flex flex-wrap justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">
                Status:
                {session?.status === "collecting" && (
                  <span className="text-green-400 ml-2">Collecting</span>
                )}
                {session?.status === "picking" && (
                  <span className="text-dark-pot-500 ml-2">Selecting</span>
                )}
                {session?.status === "finished" && (
                  <span className="text-blue-400 ml-2">Completed</span>
                )}
              </h2>
              <p className="text-slate-400">
                {session?.status === "collecting" &&
                  "Accepting topic submissions from participants"}
                {session?.status === "picking" &&
                  "Selecting topics for discussion"}
                {session?.status === "finished" &&
                  "All topics have been selected"}
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
                  className="py-2 px-4 bg-dark-pot-500 hover:bg-dark-pot-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded"
                >
                  Select Topic
                </button>

                <button
                  onClick={handleResetSession}
                  className="py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded"
                >
                  New Session
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Selected card display */}
        <AnimatePresence>
          {selectedCard && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-dark-pot-500 text-slate-900 rounded-lg p-6 mb-6 shadow-lg"
            >
              <h3 className="text-lg font-semibold mb-2">Current Topic</h3>
              <div className="bg-white rounded-lg p-6 text-lg shadow-inner">
                {selectedCard.content}
              </div>
              <div className="mt-4 text-sm flex justify-end">
                <div className="flex items-center">Posted by: Anonymous</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card submission form */}
        {session?.status === "collecting" && <CardInput />}

        {/* Card list */}
        <div className="space-y-6">
          {/* My cards list */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
          >
            <h3 className="text-xl font-semibold mb-4">
              Your Posts ({myCards.length})
            </h3>
            <CardList cards={myCards} isMyCards={true} />
          </motion.div>

          {/* All cards list (host only - toggleable) */}
          {user?.isHost && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
            >
              <div
                className="flex justify-between items-center mb-4 cursor-pointer"
                onClick={toggleAllCards}
              >
                <h3 className="text-xl font-semibold">
                  All Posts ({cards.length})
                </h3>
                <div className="flex items-center text-slate-400 hover:text-white">
                  <span className="mr-2">
                    {showAllCards ? "Close" : "Show"}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 transform transition-transform ${
                      showAllCards ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>

              <AnimatePresence>
                {showAllCards && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <CardList cards={cards} isMyCards={false} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      {/* Selection animation */}
      <AnimatePresence>
        {showRandomPicker && (
          <RandomPicker
            cards={cards}
            selectedCard={selectedCard}
            participants={participants}
            onClose={handleRandomPickerClose}
          />
        )}
      </AnimatePresence>

      {/* Share modal */}
      <AnimatePresence>
        {showShareModal && (
          <ShareModal
            sessionId={currentSessionId}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SessionPage;
