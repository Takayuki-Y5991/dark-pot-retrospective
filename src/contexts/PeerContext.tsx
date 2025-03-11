import {
  createClient,
  RealtimeChannel,
  SupabaseClient,
} from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Card,
  CardAddedMessage,
  CardDeletedMessage,
  CardSelectedMessage,
  JoinAcceptedMessage,
  JoinRequestMessage,
  Message,
  Participant,
  ParticipantJoinedMessage,
  ParticipantLeftMessage,
  Session,
  SessionNewMessage,
  SessionStateMessage,
  SessionStatus,
  User,
} from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const generateUniqueId = (): string => {
  return nanoid(6) + "_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
};

interface PeerContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  session: Session | null;
  participants: Participant[];
  cards: Card[];
  selectedCard: Card | null;
  loading: boolean;
  error: string | null;
  showRandomPicker: boolean;
  setShowRandomPicker: (show: boolean) => void;
  createSession: (sessionName: string) => Promise<string>;
  joinSession: (sessionId: string) => Promise<void>;
  submitCard: (content: string) => Promise<void>;
  pickRandomCard: () => Promise<void>;
  newSession: (sessionName: string) => Promise<string>;
  leaveSession: () => Promise<void>;
  handleRandomPickerClose: () => void;
  deleteCard: (cardId: string) => Promise<void>;
}

const PeerContext = createContext<PeerContextType | undefined>(undefined);

export function PeerProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState<SupabaseClient>(() =>
    createClient(supabaseUrl, supabaseAnonKey)
  );
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRandomPicker, setShowRandomPicker] = useState<boolean>(false);

  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("dark-pot-user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (e) {
        console.error("Error parsing user data:", e);
        localStorage.removeItem("dark-pot-user");
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("dark-pot-user", JSON.stringify(user));
    } else {
      localStorage.removeItem("dark-pot-user");
    }
  }, [user]);

  // ユーザーの状態を監視するPresenceチャネルのセットアップ
  useEffect(() => {
    if (!user || !session) return;

    // Presenceチャネルをセットアップ
    const presenceChannel = supabase.channel(`presence:${session.id}`, {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        console.log("Presence state updated:", state);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log(`User ${key} joined:`, newPresences);
      })
      .on("presence", { event: "leave" }, async ({ key }) => {
        console.log(`User ${key} left`);

        if (key === session.hostId && user?.id !== session.hostId) {
          console.log("Host left, session will be closed");
          await handleHostLeft();
        }
      });

    presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({
          online_at: new Date().toISOString(),
          user_id: user.id,
          is_host: user.isHost,
        });
        presenceChannelRef.current = presenceChannel;
      }
    });

    return () => {
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe();
        presenceChannelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, session?.id]);

  useEffect(() => {
    if (!user || !session) return;

    const newChannel = supabase.channel(`session:${session.id}`, {
      config: { broadcast: { self: false } },
    });

    newChannel
      .on("broadcast", { event: "JOIN_REQUEST" }, ({ payload }) => {
        if (user.isHost) {
          handleJoinRequest(payload.senderId);
        }
      })
      .on("broadcast", { event: "JOIN_ACCEPTED" }, ({ payload }) => {
        handleJoinAccepted(payload as JoinAcceptedMessage);
      })
      .on("broadcast", { event: "PARTICIPANT_JOINED" }, ({ payload }) => {
        handleParticipantJoined(payload as ParticipantJoinedMessage);
      })
      .on("broadcast", { event: "PARTICIPANT_LEFT" }, ({ payload }) => {
        handleParticipantLeft(payload as ParticipantLeftMessage);
      })
      .on("broadcast", { event: "HOST_LEFT" }, () => {
        handleHostLeft();
      })
      .on("broadcast", { event: "CARD_ADDED" }, ({ payload }) => {
        handleCardAdded(payload as CardAddedMessage);
      })
      .on("broadcast", { event: "CARD_SELECTED" }, ({ payload }) => {
        handleCardSelected(payload as CardSelectedMessage);
      })
      .on("broadcast", { event: "SESSION_RESET" }, () => {
        handleSessionReset();
      })
      .on("broadcast", { event: "SESSION_STATE" }, ({ payload }) => {
        handleSessionState(payload as SessionStateMessage);
      })
      .on("broadcast", { event: "SESSION_NEW" }, ({ payload }) => {
        handleSessionNew(payload as SessionNewMessage);
      })
      .on("broadcast", { event: "CARD_DELETED" }, ({ payload }) => {
        handleCardDeleted(payload as CardDeletedMessage);
      });

    newChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`Subscribed to session channel: ${session.id}`);
        setChannel(newChannel);

        if (!user.isHost) {
          sendJoinRequest();
        }
      }
    });

    return () => {
      newChannel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, user?.id]);

  // PeerProviderコンポーネント内のbeforeunloadイベントハンドラを修正
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      if (user) {
        // ページ遷移前に確認ダイアログを表示（任意）
        if (user.isHost) {
          event.preventDefault();
          event.returnValue =
            "ホストが退出するとセッションが終了します。よろしいですか？";
        }

        // セッションデータを削除
        if (user.isHost && session) {
          try {
            // 他の参加者に通知
            if (channel) {
              channel.send({
                type: "broadcast",
                event: "HOST_LEFT",
                payload: {
                  type: "HOST_LEFT",
                  senderId: user.id,
                  timestamp: new Date().toISOString(),
                },
              });
            }

            // セッションとそれに関連するデータを削除
            await deleteSessionData(session.id);
            console.log(`Session ${session.id} deleted on page unload`);
          } catch (error) {
            console.error("Error deleting session on page unload:", error);
          }
        } else if (session) {
          // 非ホストユーザーの場合は自分の参加者データのみを削除
          try {
            if (presenceChannelRef.current) {
              await presenceChannelRef.current.untrack();
            }

            await supabase.from("participants").delete().eq("id", user.id);

            // 他の参加者に通知
            if (channel) {
              channel.send({
                type: "broadcast",
                event: "PARTICIPANT_LEFT",
                payload: {
                  type: "PARTICIPANT_LEFT",
                  senderId: user.id,
                  timestamp: new Date().toISOString(),
                  data: { participantId: user.id },
                } as ParticipantLeftMessage,
              });
            }
          } catch (error) {
            console.error("Error removing participant on page unload:", error);
          }
        }
      }
    };

    // beforeunloadイベントを設定
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, session, channel, supabase]);

  useEffect(() => {
    // セッション情報を保存する関数 - beforeunloadでは非同期処理を待てないため
    const saveSessionStateForCleanup = () => {
      if (user?.isHost && session) {
        // ホスト情報とセッションIDをセッションストレージに保存（ローカルストレージより適切）
        const cleanupData = {
          userId: user.id,
          sessionId: session.id,
          isHost: true,
          timestamp: new Date().toISOString(),
        };
        sessionStorage.setItem("session_cleanup", JSON.stringify(cleanupData));
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (user) {
        // ホストの場合は確認ダイアログを表示
        if (user.isHost) {
          event.preventDefault();
          event.returnValue =
            "ホストが退出するとセッションが終了します。よろしいですか？";

          // クリーンアップ情報を保存
          saveSessionStateForCleanup();
        }

        // 同期的に実行できる通知のみ行う
        try {
          // 他の参加者に通知
          if (channel) {
            if (user.isHost) {
              channel.send({
                type: "broadcast",
                event: "HOST_LEFT",
                payload: {
                  type: "HOST_LEFT",
                  senderId: user.id,
                  timestamp: new Date().toISOString(),
                },
              });
            } else {
              channel.send({
                type: "broadcast",
                event: "PARTICIPANT_LEFT",
                payload: {
                  type: "PARTICIPANT_LEFT",
                  senderId: user.id,
                  timestamp: new Date().toISOString(),
                  data: { participantId: user.id },
                } as ParticipantLeftMessage,
              });
            }
          }

          // Presenceチャネルからアントラックを試みる（同期的に）
          if (presenceChannelRef.current) {
            presenceChannelRef.current.untrack();
          }
        } catch (error) {
          console.error("Error during page unload notifications:", error);
        }
      }
    };

    // beforeunloadイベントを設定
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user, session, channel]);

  useEffect(() => {
    const checkAndCleanupPreviousSession = async () => {
      const cleanupData = sessionStorage.getItem("session_cleanup");

      if (cleanupData) {
        try {
          const { sessionId, isHost, timestamp } = JSON.parse(cleanupData);

          // タイムスタンプをチェックして古すぎる場合はスキップ（オプション）
          const maxAge = 1000 * 60 * 5; // 5分
          const timeDiff = new Date().getTime() - new Date(timestamp).getTime();

          if (timeDiff <= maxAge && isHost && sessionId) {
            console.log(`Cleaning up previous session: ${sessionId}`);

            // セッションデータを削除
            await deleteSessionData(sessionId);

            console.log(
              `Previous session ${sessionId} cleaned up successfully`
            );
          }
        } catch (error) {
          console.error("Error cleaning up previous session:", error);
        }

        // クリーンアップデータを削除
        sessionStorage.removeItem("session_cleanup");
      }
    };

    checkAndCleanupPreviousSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);
  // handleUserLeave関数は残しておく（非ホストユーザーの退出処理に必要）
  // 新しいチャネルをセットアップする関数
  const setupNewChannel = async (sessionId: string) => {
    if (!user) return;

    const newChannel = supabase.channel(`session:${sessionId}`, {
      config: { broadcast: { self: false } },
    });

    // 同じイベントハンドラーを登録
    newChannel
      .on("broadcast", { event: "JOIN_REQUEST" }, ({ payload }) => {
        if (user.isHost) {
          handleJoinRequest(payload.senderId);
        }
      })
      .on("broadcast", { event: "JOIN_ACCEPTED" }, ({ payload }) => {
        handleJoinAccepted(payload as JoinAcceptedMessage);
      })
      .on("broadcast", { event: "PARTICIPANT_JOINED" }, ({ payload }) => {
        handleParticipantJoined(payload as ParticipantJoinedMessage);
      })
      .on("broadcast", { event: "PARTICIPANT_LEFT" }, ({ payload }) => {
        handleParticipantLeft(payload as ParticipantLeftMessage);
      })
      .on("broadcast", { event: "HOST_LEFT" }, () => {
        handleHostLeft();
      })
      .on("broadcast", { event: "CARD_ADDED" }, ({ payload }) => {
        handleCardAdded(payload as CardAddedMessage);
      })
      .on("broadcast", { event: "CARD_SELECTED" }, ({ payload }) => {
        handleCardSelected(payload as CardSelectedMessage);
      })
      .on("broadcast", { event: "SESSION_RESET" }, () => {
        handleSessionReset();
      })
      .on("broadcast", { event: "SESSION_STATE" }, ({ payload }) => {
        handleSessionState(payload as SessionStateMessage);
      })
      .on("broadcast", { event: "SESSION_NEW" }, ({ payload }) => {
        handleSessionNew(payload as SessionNewMessage);
      });

    await newChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`Subscribed to new session channel: ${sessionId}`);
        setChannel(newChannel);
      }
    });

    // Presenceチャネルも設定
    const presenceChannel = supabase.channel(`presence:${sessionId}`, {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        console.log("Presence state updated:", state);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log(`User ${key} joined:`, newPresences);
      })
      .on("presence", { event: "leave" }, async ({ key }) => {
        console.log(`User ${key} left`);

        // ホストが退出した場合、セッションを終了する
        if (key === session?.hostId && user?.id !== session?.hostId) {
          console.log("Host left, session will be closed");
          await handleHostLeft();
        }
      });

    await presenceChannel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await presenceChannel.track({
          online_at: new Date().toISOString(),
          user_id: user.id,
          is_host: user.isHost,
        });
        presenceChannelRef.current = presenceChannel;
      }
    });

    return newChannel;
  };

  const handleUserLeave = async () => {
    if (!user || !session) return;

    try {
      if (presenceChannelRef.current) {
        await presenceChannelRef.current.untrack();
      }

      // ホストの場合はセッションを削除
      if (user.isHost) {
        // 他の参加者に通知
        if (channel) {
          channel.send({
            type: "broadcast",
            event: "HOST_LEFT",
            payload: {
              type: "HOST_LEFT",
              senderId: user.id,
              timestamp: new Date().toISOString(),
            },
          });
        }

        // セッションとそれに関連するデータを削除
        await deleteSessionData(session.id);
      } else {
        // 参加者の場合は自分の参加者データのみを削除
        await supabase.from("participants").delete().eq("id", user.id);

        // 他の参加者に通知
        if (channel) {
          channel.send({
            type: "broadcast",
            event: "PARTICIPANT_LEFT",
            payload: {
              type: "PARTICIPANT_LEFT",
              senderId: user.id,
              timestamp: new Date().toISOString(),
              data: { participantId: user.id },
            } as ParticipantLeftMessage,
          });
        }
      }
    } catch (error) {
      console.error("Error during user leave:", error);
    }
  };

  const handleParticipantLeft = (message: ParticipantLeftMessage) => {
    const { participantId } = message.data;
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
  };

  const handleHostLeft = async () => {
    // ホストが退出した場合の処理
    setError("ホストが退出したためセッションが終了しました");

    if (channel) {
      channel.unsubscribe();
    }

    if (presenceChannelRef.current) {
      presenceChannelRef.current.unsubscribe();
    }

    // ローカルのセッションデータをクリア
    setSession(null);
    setParticipants([]);
    setCards([]);
    setSelectedCard(null);

    // ローカルストレージからもクリア
    localStorage.removeItem("dark-pot-user");
  };

  // セッションとそれに関連するすべてのデータを削除する関数
  const deleteSessionData = async (sessionId: string) => {
    if (!sessionId) return;

    try {
      console.log(`Attempting to delete session data for ${sessionId}`);

      // 各削除操作を独立して行い、一つの失敗が他に影響しないようにする
      try {
        // カード削除
        const { error: cardsError } = await supabase
          .from("cards")
          .delete()
          .eq("session_id", sessionId);
        if (cardsError) {
          console.error(`Error deleting cards: ${cardsError.message}`);
        } else {
          console.log(`Cards for session ${sessionId} deleted successfully`);
        }
      } catch (cardError) {
        console.error("Error during card deletion:", cardError);
      }

      try {
        // 参加者削除
        const { error: participantsError } = await supabase
          .from("participants")
          .delete()
          .eq("session_id", sessionId);
        if (participantsError) {
          console.error(
            `Error deleting participants: ${participantsError.message}`
          );
        } else {
          console.log(
            `Participants for session ${sessionId} deleted successfully`
          );
        }
      } catch (participantError) {
        console.error("Error during participants deletion:", participantError);
      }

      try {
        // セッション削除
        const { error: sessionError } = await supabase
          .from("sessions")
          .delete()
          .eq("id", sessionId);
        if (sessionError) {
          console.error(`Error deleting session: ${sessionError.message}`);
        } else {
          console.log(`Session ${sessionId} deleted successfully`);
        }
      } catch (sessionError) {
        console.error("Error during session deletion:", sessionError);
      }

      console.log(
        `Session ${sessionId} and all related data deletion attempts completed`
      );
      return true;
    } catch (error) {
      console.error("Error in deleteSessionData function:", error);
      return false;
    }
  };

  const sendJoinRequest = () => {
    if (!channel || !user || !session) return;

    channel.send({
      type: "broadcast",
      event: "JOIN_REQUEST",
      payload: {
        type: "JOIN_REQUEST",
        senderId: user.id,
        timestamp: new Date().toISOString(),
      } as JoinRequestMessage,
    });
  };

  const handleJoinRequest = (participantId: string) => {
    if (!user?.isHost || !session || !channel) return;

    const timestamp = new Date().toISOString();

    const newParticipant: Participant = {
      id: participantId,
      isHost: false,
      joinedAt: timestamp,
    };

    // ID重複チェックを追加して、参加者リストを更新
    setParticipants((prev) => {
      // 既に存在する場合は追加しない
      if (prev.some((p) => p.id === participantId)) {
        return prev;
      }
      // 存在しない場合は追加
      return [...prev, newParticipant];
    });

    // Send direct message to the new participant
    channel.send({
      type: "broadcast",
      event: "JOIN_ACCEPTED",
      payload: {
        type: "JOIN_ACCEPTED",
        senderId: user.id,
        timestamp,
        data: {
          participantId,
          session,
          // 現在の参加者リスト+新規参加者を送信
          participants: [...participants, newParticipant],
          cards,
        },
      } as JoinAcceptedMessage,
    });

    // Notify others about the new participant
    broadcastToAll({
      type: "PARTICIPANT_JOINED",
      senderId: user.id,
      timestamp,
      data: {
        participant: newParticipant,
      },
    } as ParticipantJoinedMessage);
  };

  const handleJoinAccepted = (message: JoinAcceptedMessage) => {
    const {
      session: newSession,
      participants: allParticipants,
      cards: allCards,
    } = message.data;

    setSession(newSession);
    setParticipants(allParticipants);
    setCards(allCards);

    if (newSession.selectedCardId) {
      const selected =
        allCards.find((card) => card.id === newSession.selectedCardId) || null;
      setSelectedCard(selected);
    }
  };

  const handleParticipantJoined = (message: ParticipantJoinedMessage) => {
    const { participant } = message.data;
    setParticipants((prev) => {
      if (prev.some((p) => p.id === participant.id)) {
        return prev;
      }
      console.log(`Adding participant: ${participant.id}`);
      return [...prev, participant];
    });
  };

  const handleCardAdded = (message: CardAddedMessage) => {
    const { card } = message.data;
    setCards((prev) => [...prev, card]);
  };

  const handleCardSelected = (message: CardSelectedMessage) => {
    const { cardId, newStatus } = message.data;

    // まずはカードの状態を更新
    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, selected: true } : card
      )
    );

    // 選択されたカードを取得 - 即時実行で対象カードを検索
    const cardSelected = cards.find((card) => card.id === cardId);

    // カードが見つかった場合にのみ選択されたカードとして設定
    if (cardSelected) {
      setSelectedCard(cardSelected);
    } else {
      // カードが見つからない場合は、サーバーから最新データを取得する
      const fetchSelectedCard = async () => {
        try {
          if (!session) return;

          // カードをDBから取得
          const { data, error } = await supabase
            .from("cards")
            .select("*")
            .eq("id", cardId)
            .single();

          if (error) {
            console.error("Error fetching selected card:", error);
            return;
          }

          if (data) {
            // アプリの型に変換
            const fetchedCard: Card = {
              id: data.id,
              authorId: data.author_id,
              content: data.content,
              selected: true, // 必ず選択済みに設定
              createdAt: data.created_at,
            };

            // ローカル状態を更新
            setSelectedCard(fetchedCard);

            // カード一覧も更新
            setCards((prev) => {
              const exists = prev.some((card) => card.id === fetchedCard.id);
              if (exists) {
                return prev.map((card) =>
                  card.id === fetchedCard.id ? fetchedCard : card
                );
              } else {
                return [...prev, fetchedCard];
              }
            });
          }
        } catch (fetchError) {
          console.error("Error in fetchSelectedCard:", fetchError);
        }
      };

      fetchSelectedCard();
    }

    // セッション状態を更新
    if (session) {
      setSession({
        ...session,
        status: newStatus,
        selectedCardId: cardId,
      });
    }

    // 抽選表示を開始
    setShowRandomPicker(true);
  };

  const handleRandomPickerClose = () => {
    setShowRandomPicker(false);

    // セッションステータスを更新（抽選中の場合）
    if (session?.status === "picking") {
      // 選択されたカードがあり、まだ未選択カードがある場合
      const remainingCards = cards.filter((card) => !card.selected).length;
      const newStatus: SessionStatus =
        remainingCards > 0 ? "collecting" : "finished";

      // セッション状態を更新
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: newStatus,
        };
      });

      // サーバー側も更新
      if (user?.isHost && session) {
        supabase
          .from("sessions")
          .update({
            status: newStatus,
            last_activity: new Date().toISOString(),
          })
          .eq("id", session.id)
          .then(({ error }) => {
            if (error) {
              console.error("Error updating session status:", error);
            }
          });
      }
    }
  };

  const handleSessionReset = () => {
    setCards((prev) => prev.map((card) => ({ ...card, selected: false })));
    setSelectedCard(null);
    setSession((prevSession) =>
      prevSession
        ? { ...prevSession, status: "collecting", selectedCardId: null }
        : null
    );
  };

  const handleSessionNew = (message: SessionNewMessage) => {
    const { sessionName, newSessionId, participantIdMap } = message.data;

    if (user && participantIdMap && participantIdMap[user.id]) {
      const newUserId = participantIdMap[user.id];
      // ユーザー情報を新しいIDとセッションIDで更新
      const updatedUser = {
        ...user,
        id: newUserId,
        sessionId: newSessionId,
      };
      setUser(updatedUser);
    } else if (user) {
      // 新しいIDがなければセッションIDだけ更新
      const updatedUser = {
        ...user,
        sessionId: newSessionId,
      };
      setUser(updatedUser);
    }

    setCards([]);
    setSelectedCard(null);

    // セッション情報を更新
    setSession((prevSession) =>
      prevSession
        ? {
            ...prevSession,
            id: newSessionId,
            name: sessionName,
            status: "collecting",
            selectedCardId: null,
          }
        : null
    );

    // チャネル更新
    if (channel) {
      channel.unsubscribe();
      setupNewChannel(newSessionId);
    }

    if (presenceChannelRef.current) {
      presenceChannelRef.current.unsubscribe();
      presenceChannelRef.current = null;
    }
  };

  const handleSessionState = (message: SessionStateMessage) => {
    const {
      session: newSession,
      participants: allParticipants,
      cards: allCards,
    } = message.data;

    setSession(newSession);
    setParticipants(allParticipants);
    setCards(allCards);

    if (newSession.selectedCardId) {
      const selected =
        allCards.find((card) => card.id === newSession.selectedCardId) || null;
      setSelectedCard(selected);
    }
  };

  const broadcastToAll = (message: Message) => {
    if (!channel) return;

    channel.send({
      type: "broadcast",
      event: message.type,
      payload: message,
    });
  };

  const createSession = async (sessionName: string): Promise<string> => {
    if (!sessionName) {
      throw new Error("Require session name.");
    }

    setLoading(true);
    setError(null);

    try {
      const sessionId = generateUniqueId();
      const userId = generateUniqueId();
      const timestamp = new Date().toISOString();

      const newSession: Session = {
        id: sessionId,
        name: sessionName,
        hostId: userId,
        status: "collecting",
        selectedCardId: null,
        createdAt: timestamp,
        lastActivity: timestamp,
      };

      const newUser: User = {
        id: userId,
        isHost: true,
        sessionId,
      };

      const hostParticipant: Participant = {
        id: userId,
        isHost: true,
        joinedAt: timestamp,
      };

      // Save session to Supabase
      const { error: sessionError } = await supabase.from("sessions").insert([
        {
          id: sessionId,
          name: sessionName,
          host_id: userId,
          status: "collecting",
          selected_card_id: null,
          created_at: timestamp,
          last_activity: timestamp,
        },
      ]);

      if (sessionError) {
        throw new Error(`Failed to create session: ${sessionError.message}`);
      }

      // Save host participant
      const { error: participantError } = await supabase
        .from("participants")
        .insert([
          {
            id: userId,
            session_id: sessionId,
            is_host: true,
            joined_at: timestamp,
          },
        ]);

      if (participantError) {
        throw new Error(
          `Failed to create participant: ${participantError.message}`
        );
      }

      setUser(newUser);
      setSession(newSession);
      setParticipants([hostParticipant]);
      setCards([]);
      setSelectedCard(null);

      setLoading(false);
      return sessionId;
    } catch (error) {
      console.error("Session creation failed:", error);
      setError("Session creation failed...");
      setLoading(false);
      throw error;
    }
  };

  const joinSession = async (sessionId: string): Promise<void> => {
    if (!sessionId) {
      throw new Error("Require session ID.");
    }

    setLoading(true);
    setError(null);

    try {
      // Check if session exists
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sessionError) {
        throw new Error("Session not found");
      }

      const userId = generateUniqueId();
      const timestamp = new Date().toISOString();

      const newUser: User = {
        id: userId,
        isHost: false,
        sessionId,
      };

      // Save the participant
      const { error: participantError } = await supabase
        .from("participants")
        .insert([
          {
            id: userId,
            session_id: sessionId,
            is_host: false,
            joined_at: timestamp,
          },
        ]);

      if (participantError) {
        throw new Error(
          `Failed to create participant: ${participantError.message}`
        );
      }

      // Create session object from DB data
      const mappedSession: Session = {
        id: sessionData.id,
        name: sessionData.name,
        hostId: sessionData.host_id,
        status: sessionData.status,
        selectedCardId: sessionData.selected_card_id,
        createdAt: sessionData.created_at,
        lastActivity: sessionData.last_activity,
      };

      // セッション参加時に現在の参加者リストを取得
      const { data: existingParticipants, error: participantsError } =
        await supabase
          .from("participants")
          .select("*")
          .eq("session_id", sessionId);

      if (participantsError) {
        console.error("Error fetching participants:", participantsError);
      } else if (existingParticipants) {
        // Supabaseから取得した参加者データをアプリの型に変換
        const mappedParticipants: Participant[] = existingParticipants.map(
          (p) => ({
            id: p.id,
            isHost: p.is_host,
            joinedAt: p.joined_at,
          })
        );

        setParticipants(mappedParticipants);
        console.log(
          `Loaded ${mappedParticipants.length} participants from database`
        );
      }

      setUser(newUser);
      setSession(mappedSession);

      setLoading(false);
    } catch (error) {
      console.error("Session Join Error:", error);
      setError("Session Join Error...");
      setLoading(false);
      throw error;
    }
  };

  const leaveSession = async (): Promise<void> => {
    if (!user || !session) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await handleUserLeave();

      // ローカルのセッションデータをクリア
      setSession(null);
      setParticipants([]);
      setCards([]);
      setSelectedCard(null);
      setUser(null);

      // ローカルストレージからもクリア
      localStorage.removeItem("dark-pot-user");

      setLoading(false);
    } catch (error) {
      console.error("Error leaving session:", error);
      setError("Failed to leave session");
      setLoading(false);
      throw error;
    }
  };

  const submitCard = async (content: string): Promise<void> => {
    if (!content.trim() || !user || !session) {
      throw new Error("カード内容が空か、ユーザー情報がありません");
    }

    try {
      const cardId = generateUniqueId();
      const timestamp = new Date().toISOString();

      // Create new card
      const newCard: Card = {
        id: cardId,
        authorId: user.id,
        content: content.trim(),
        selected: false,
        createdAt: timestamp,
      };

      // Save card to Supabase
      const { error: cardError } = await supabase.from("cards").insert([
        {
          id: cardId,
          session_id: session.id,
          author_id: user.id,
          content: content.trim(),
          selected: false,
          created_at: timestamp,
        },
      ]);

      if (cardError) {
        throw new Error(`Failed to save card: ${cardError.message}`);
      }

      // Add to local state
      setCards((prev) => [...prev, newCard]);

      // Notify others
      broadcastToAll({
        type: "CARD_ADDED",
        senderId: user.id,
        timestamp,
        data: {
          card: newCard,
        },
      } as CardAddedMessage);
    } catch (error) {
      console.error("カード投稿エラー:", error);
      throw new Error("カードの投稿に失敗しました");
    }
  };

  const pickRandomCard = async (): Promise<void> => {
    if (!user?.isHost || !session) {
      throw new Error("Only the host can draw the cards..");
    }

    const unselectedCards = cards.filter((card) => !card.selected);
    if (unselectedCards.length === 0) {
      throw new Error("There are no unselected cards..");
    }

    try {
      // 抽選開始を表示するために先にRandomPickerを表示
      setShowRandomPicker(true);

      const randomIndex = Math.floor(Math.random() * unselectedCards.length);
      const pickedCard = unselectedCards[randomIndex];
      const newStatus: SessionStatus =
        unselectedCards.length === 1 ? "finished" : "picking";

      // Update card in Supabase
      const { error: cardError } = await supabase
        .from("cards")
        .update({ selected: true })
        .eq("id", pickedCard.id);

      if (cardError) {
        throw new Error(`Failed to update card: ${cardError.message}`);
      }

      // Update session in Supabase
      const { error: sessionError } = await supabase
        .from("sessions")
        .update({
          status: newStatus,
          selected_card_id: pickedCard.id,
          last_activity: new Date().toISOString(),
        })
        .eq("id", session.id);

      if (sessionError) {
        throw new Error(`Failed to update session: ${sessionError.message}`);
      }

      // Update local state
      setCards((prev) =>
        prev.map((card) =>
          card.id === pickedCard.id ? { ...card, selected: true } : card
        )
      );

      setSelectedCard(pickedCard);

      setSession({
        ...session,
        status: newStatus,
        selectedCardId: pickedCard.id,
      });

      // 抽選結果を他の参加者に通知
      broadcastToAll({
        type: "CARD_SELECTED",
        senderId: user.id,
        timestamp: new Date().toISOString(),
        data: {
          cardId: pickedCard.id,
          newStatus,
        },
      } as CardSelectedMessage);

      // RandomPickerはコンポーネント内部で自身を閉じる処理を持っているため、
      // ここでは明示的に閉じる処理は行わない
    } catch (error) {
      console.error("Card lottery error:", error);
      // エラーが発生した場合はRandomPickerを閉じる
      setShowRandomPicker(false);
      throw new Error("Card lottery error...");
    }
  };

  const newSession = async (sessionName: string): Promise<string> => {
    if (!user?.isHost || !session) {
      throw new Error("Only the host can reset the session...");
    }

    try {
      const timestamp = new Date().toISOString();
      const newSessionId = generateUniqueId();

      const oldSessionId = session.id;

      // 1. 新しいセッションを作成
      const { error: newSessionError } = await supabase
        .from("sessions")
        .insert([
          {
            id: newSessionId,
            name: sessionName,
            host_id: user.id,
            status: "collecting",
            selected_card_id: null,
            created_at: timestamp,
            last_activity: timestamp,
          },
        ]);

      if (newSessionError) {
        throw new Error(
          `Failed to create new session: ${newSessionError.message}`
        );
      }

      // 2. 現在の参加者情報を取得
      const { data: currentParticipants, error: participantsError } =
        await supabase
          .from("participants")
          .select("*")
          .eq("session_id", oldSessionId);

      if (participantsError) {
        throw new Error(
          `Failed to get participants: ${participantsError.message}`
        );
      }

      // 3. 参加者の対応マップを作成（古いID -> 新しいID）
      const participantIdMap = new Map<string, string>();

      // ホストの場合は同じIDを使用
      participantIdMap.set(user.id, user.id);

      // それ以外の参加者には新しいIDを生成
      currentParticipants
        .filter((p) => p.id !== user.id)
        .forEach((p) => {
          participantIdMap.set(p.id, generateUniqueId());
        });

      // 4. 新しい参加者データを作成
      const newParticipantsData = currentParticipants.map((p) => ({
        id: participantIdMap.get(p.id) || generateUniqueId(), // マップから新しいIDを取得
        session_id: newSessionId,
        is_host: p.is_host,
        joined_at: timestamp,
      }));

      const { error: newParticipantsError } = await supabase
        .from("participants")
        .insert(newParticipantsData);

      if (newParticipantsError) {
        throw new Error(
          `Failed to update participants: ${newParticipantsError.message}`
        );
      }

      // 4. 古いセッションのデータを削除
      await supabase.from("cards").delete().eq("session_id", oldSessionId);
      await supabase
        .from("participants")
        .delete()
        .eq("session_id", oldSessionId);
      await supabase.from("sessions").delete().eq("id", oldSessionId);

      // 5. クライアントの状態を更新
      const newSessionObj: Session = {
        id: newSessionId,
        name: sessionName,
        hostId: user.id,
        status: "collecting",
        selectedCardId: null,
        createdAt: timestamp,
        lastActivity: timestamp,
      };

      // 新しいセッションIDでユーザー情報も更新
      const updatedUser = {
        ...user,
        sessionId: newSessionId,
      };
      setUser(updatedUser);

      setSession(newSessionObj);
      setCards([]);
      setSelectedCard(null);

      // 6. 参加者のクライアント状態も更新
      const mappedParticipants = currentParticipants.map((p) => ({
        id: participantIdMap.get(p.id) || p.id,
        isHost: p.is_host,
        joinedAt: timestamp,
      }));
      setParticipants(mappedParticipants);

      // 7. 全参加者に新しいセッション情報を通知
      broadcastToAll({
        type: "SESSION_NEW",
        senderId: user.id,
        timestamp,
        data: {
          sessionName,
          newSessionId,
          oldSessionId,
          participantIdMap: Object.fromEntries(participantIdMap),
        },
      } as SessionNewMessage);

      // 8. チャネルを新しいセッションIDに更新
      if (channel) {
        channel.unsubscribe();
        await setupNewChannel(newSessionId);
      }
      return newSessionId;
    } catch (error) {
      console.error("Error creating new session:", error);
      throw new Error("Error creating new session...");
    }
  };

  const handleCardDeleted = (message: CardDeletedMessage) => {
    const { cardId } = message.data;

    // 削除されたカードをカードリストから削除
    setCards((prev) => prev.filter((card) => card.id !== cardId));

    // 選択中のカードが削除された場合は選択を解除
    if (selectedCard && selectedCard.id === cardId) {
      setSelectedCard(null);

      // セッション状態も更新
      if (session) {
        const newStatus: SessionStatus = "collecting";
        setSession({
          ...session,
          status: newStatus,
          selectedCardId: null,
        });

        // サーバー側も更新
        if (user?.isHost) {
          supabase
            .from("sessions")
            .update({
              status: newStatus,
              selected_card_id: null,
              last_activity: new Date().toISOString(),
            })
            .eq("id", session.id)
            .then(({ error }) => {
              if (error) {
                console.error("Error updating session status:", error);
              }
            });
        }
      }
    }
  };

  // deleteCardメソッドの実装
  const deleteCard = async (cardId: string): Promise<void> => {
    if (!user || !session) {
      throw new Error("ユーザー情報またはセッション情報がありません");
    }

    // カードの所有者チェック（自分のカードまたはホストのみ削除可能）
    const card = cards.find((c) => c.id === cardId);
    if (!card) {
      throw new Error("対象のカードが見つかりません");
    }

    // 自分のカードかホストかどうかチェック
    const isOwner = card.authorId === user.id;
    const isHost = user.isHost;

    if (!isOwner && !isHost) {
      throw new Error("他のユーザーのカードは削除できません");
    }

    try {
      // Supabaseからカードを削除
      const { error } = await supabase.from("cards").delete().eq("id", cardId);

      if (error) {
        throw new Error(`カード削除エラー: ${error.message}`);
      }

      // ローカルステートからカードを削除
      setCards((prev) => prev.filter((c) => c.id !== cardId));

      // 選択中のカードが削除された場合は選択を解除
      if (selectedCard && selectedCard.id === cardId) {
        setSelectedCard(null);

        // セッション状態も更新
        if (session) {
          const newStatus: SessionStatus = "collecting";

          // Supabaseのセッション状態も更新
          await supabase
            .from("sessions")
            .update({
              status: newStatus,
              selected_card_id: null,
              last_activity: new Date().toISOString(),
            })
            .eq("id", session.id);

          setSession({
            ...session,
            status: newStatus,
            selectedCardId: null,
          });
        }
      }

      // 他の参加者に通知
      broadcastToAll({
        type: "CARD_DELETED",
        senderId: user.id,
        timestamp: new Date().toISOString(),
        data: {
          cardId,
        },
      } as CardDeletedMessage);
    } catch (error) {
      console.error("カード削除エラー:", error);
      throw error;
    }
  };

  const contextValue: PeerContextType = {
    user,
    setUser,
    session,
    participants,
    cards,
    selectedCard,
    loading,
    error,
    showRandomPicker,
    setShowRandomPicker,
    createSession,
    joinSession,
    submitCard,
    pickRandomCard,
    newSession,
    leaveSession,
    handleRandomPickerClose,
    deleteCard,
  };

  return (
    <PeerContext.Provider value={contextValue}>{children}</PeerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePeer() {
  const context = useContext(PeerContext);
  if (context === undefined) {
    throw new Error("usePeer must be used within a PeerProvider");
  }
  return context;
}
