import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";

interface ShareModalProps {
  sessionId: string;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ sessionId, onClose }) => {
  const [copied, setCopied] = useState(false);

  const [currentSessionId, setCurrentSessionId] = useState(sessionId);

  const shareUrl = `${window.location.origin}/session/${currentSessionId}`;
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      return;
    }
  };

  const copySessionId = async () => {
    try {
      await navigator.clipboard.writeText(currentSessionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      return;
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Dark Pot Retrospective",
          text: "Here's an invitation to join the retrospective session.",
          url: shareUrl,
        });
      } catch {
        return;
      }
    } else {
      copyToClipboard();
    }
  };

  useEffect(() => {
    if (sessionId && sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId);
    }
  }, [sessionId, currentSessionId]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-slate-800 rounded-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold mb-4">Share Session</h3>

        <p className="text-slate-400 mb-3">
          Share the link or session ID below to invite participants
        </p>

        <div className="mb-6">
          <div className="text-sm text-slate-400 mb-1">Session ID:</div>
          <div className="flex mb-4">
            <input
              type="text"
              value={currentSessionId}
              readOnly
              className="flex-grow p-2 bg-slate-900 border border-slate-700 rounded-l text-sm"
            />
            <button
              onClick={copySessionId}
              className="bg-slate-700 hover:bg-slate-600 px-3 rounded-r flex items-center"
              aria-label="Copy session ID"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                />
              </svg>
            </button>
          </div>

          <AnimatePresence>
            {copied && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-green-400 text-sm mt-2"
              >
                Copied!
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded"
          >
            Close
          </button>

          {typeof navigator.share === "function" && (
            <button
              onClick={nativeShare}
              className="py-2 px-4 bg-dark-pot-500 hover:bg-dark-pot-600 text-white rounded flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 mr-2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                />
              </svg>
              Share
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ShareModal;
