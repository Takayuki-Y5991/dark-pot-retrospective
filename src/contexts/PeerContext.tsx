import { nanoid } from "nanoid";
import Peer, { DataConnection } from "peerjs";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  Card,
  CardAddedMessage,
  CardSelectedMessage,
  JoinAcceptedMessage,
  JoinRequestMessage,
  Message,
  Participant,
  ParticipantJoinedMessage,
  Session,
  SessionNewMessage,
  SessionStateMessage,
  SessionStatus,
  User,
} from "../types";

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
  newSession: (sessionName: string) => Promise<void>;
}

const PeerContext = createContext<PeerContextType | undefined>(undefined);

export function PeerProvider({ children }: { children: ReactNode }) {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showRandomPicker, setShowRandomPicker] = useState<boolean>(false);

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

  // ユーザー情報が変更されたらローカルストレージに保存
  useEffect(() => {
    if (user) {
      localStorage.setItem("dark-pot-user", JSON.stringify(user));
    } else {
      localStorage.removeItem("dark-pot-user");
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const newPeer = new Peer(user.id);

    newPeer.on("open", (id) => {
      console.log("My peer ID is:", id);
      setPeer(newPeer);
    });

    newPeer.on("error", (err) => {
      console.error("Peer connection error:", err);
      setError("ピア接続エラー: " + err.message);
    });

    // 新規接続を受け付ける（ホストの場合）
    if (user.isHost) {
      newPeer.on("connection", handleNewConnection);
    }

    return () => {
      connections.forEach((conn) => conn.close());
      newPeer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleNewConnection = (conn: DataConnection) => {
    console.log("New connection from:", conn.peer);

    setConnections((prev) => [...prev, conn]);

    setupConnectionHandlers(conn);
  };

  const setupConnectionHandlers = (conn: DataConnection) => {
    conn.on("open", () => {
      console.log("Connection opened with:", conn.peer);
    });

    conn.on("data", (data) => {
      handleIncomingMessage(conn, data as Message);
    });

    conn.on("close", () => {
      console.log("Connection closed with:", conn.peer);

      setConnections((prev) => prev.filter((c) => c.peer !== conn.peer));

      if (user?.isHost) {
        const participantId = conn.peer;
        setParticipants((prev) => prev.filter((p) => p.id !== participantId));

        broadcastToAll({
          type: "PARTICIPANT_LEFT",
          senderId: user.id,
          timestamp: new Date().toISOString(),
          data: { participantId },
        });
      }
    });

    conn.on("error", (err) => {
      console.error("Connection error:", err);
    });
  };

  const handleIncomingMessage = (conn: DataConnection, message: Message) => {
    console.log("Received message:", message.type, message);

    switch (message.type) {
      case "JOIN_REQUEST":
        handleJoinRequest(conn);
        break;
      case "JOIN_ACCEPTED":
        handleJoinAccepted(message as JoinAcceptedMessage);
        break;
      case "PARTICIPANT_JOINED":
        handleParticipantJoined(message as ParticipantJoinedMessage);
        break;
      case "CARD_ADDED":
        handleCardAdded(message as CardAddedMessage);
        break;
      case "CARD_SELECTED":
        handleCardSelected(message as CardSelectedMessage);
        break;
      case "SESSION_RESET":
        handleSessionReset();
        break;
      case "SESSION_STATE":
        handleSessionState(message as SessionStateMessage);
        break;
      case "SESSION_NEW":
        handleSessionNew(message as SessionNewMessage);
        break;
      default:
        console.warn("Unknown message type:", message.type);
    }
  };

  const handleJoinRequest = (conn: DataConnection) => {
    if (!user?.isHost || !session) return;

    const newParticipantId = conn.peer;
    const timestamp = new Date().toISOString();

    const newParticipant: Participant = {
      id: newParticipantId,
      isHost: false,
      joinedAt: timestamp,
    };

    setParticipants((prev) => [...prev, newParticipant]);

    conn.send({
      type: "JOIN_ACCEPTED",
      senderId: user.id,
      timestamp,
      data: {
        participantId: newParticipantId,
        session,
        participants: [...participants, newParticipant],
        cards,
      },
    } as JoinAcceptedMessage);

    broadcastToOthers(conn.peer, {
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
    setParticipants((prev) => [...prev, participant]);
  };

  const handleCardAdded = (message: CardAddedMessage) => {
    const { card } = message.data;
    setCards((prev) => [...prev, card]);
  };

  const handleCardSelected = (message: CardSelectedMessage) => {
    const { cardId, newStatus } = message.data;

    setCards((prev) =>
      prev.map((card) =>
        card.id === cardId ? { ...card, selected: true } : card
      )
    );

    const selectedCard = cards.find((card) => card.id === cardId) || null;
    setSelectedCard(selectedCard);

    if (session) {
      setSession({
        ...session,
        status: newStatus,
        selectedCardId: cardId,
      });
    }

    setShowRandomPicker(true);
  };

  // Refresh selected cards
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
    const { sessionName } = message.data;

    setCards([]);
    setSelectedCard(null);

    setSession((prevSession) =>
      prevSession
        ? {
            ...prevSession,
            name: sessionName,
            status: "collecting",
            selectedCardId: null,
          }
        : null
    );
  };

  // セッション状態の処理（新規参加者への同期用）
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
    connections.forEach((conn) => conn.send(message));
  };

  const broadcastToOthers = (excludePeerId: string, message: Message) => {
    connections
      .filter((conn) => conn.peer !== excludePeerId)
      .forEach((conn) => conn.send(message));
  };

  const connectToHost = async (hostId: string): Promise<DataConnection> => {
    if (!peer) {
      throw new Error("Peer connection is not initialized");
    }

    return new Promise((resolve, reject) => {
      const conn = peer.connect(hostId);

      conn.on("open", () => {
        // 接続リストに追加
        setConnections((prev) => [...prev, conn]);
        setupConnectionHandlers(conn);
        resolve(conn);
      });

      conn.on("error", (err) => {
        reject(err);
      });
    });
  };

  const createSession = async (sessionName: string): Promise<string> => {
    if (!session) {
      throw new Error("Require session name.");
    }

    setLoading(true);
    setError(null);

    try {
      const sessionId = nanoid(10);
      const userId = nanoid(10);
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
      // SessionId =  host PeerID + Any identifier
      const hostId = sessionId;

      const userId = nanoid(10);
      const newUser: User = {
        id: userId,
        isHost: false,
        sessionId,
      };

      setUser(newUser);

      // ホストとの接続を確立（PeerJSの初期化を待つ）
      const waitForPeer = async (): Promise<Peer> => {
        return new Promise((resolve) => {
          if (peer) {
            resolve(peer);
          } else {
            const newPeer = new Peer(userId);
            newPeer.on("open", () => {
              setPeer(newPeer);
              resolve(newPeer);
            });
          }
        });
      };

      // PeerJSの準備ができるまで待機
      await waitForPeer();

      // ホストに接続
      const conn = await connectToHost(hostId);

      // 参加リクエストを送信
      conn.send({
        type: "JOIN_REQUEST",
        senderId: userId,
        timestamp: new Date().toISOString(),
      } as JoinRequestMessage);

      setLoading(false);
    } catch (error) {
      console.error("Session Join Error:", error);
      setError("Session Join Error...");
      setLoading(false);
      throw error;
    }
  };

  const submitCard = async (content: string): Promise<void> => {
    if (!content.trim() || !user || !session) {
      throw new Error("カード内容が空か、ユーザー情報がありません");
    }

    try {
      const cardId = nanoid(10);
      const timestamp = new Date().toISOString();

      // 新しいカード
      const newCard: Card = {
        id: cardId,
        authorId: user.id,
        content: content.trim(),
        selected: false,
        createdAt: timestamp,
      };

      // ローカルステートに追加
      setCards((prev) => [...prev, newCard]);

      // ホストの場合は全参加者に通知
      if (user.isHost) {
        broadcastToAll({
          type: "CARD_ADDED",
          senderId: user.id,
          timestamp,
          data: {
            card: newCard,
          },
        } as CardAddedMessage);
      } else {
        // 参加者の場合はホストにのみ通知
        const hostConn = connections.find(
          (conn) => conn.peer === session.hostId
        );
        if (hostConn) {
          hostConn.send({
            type: "CARD_ADDED",
            senderId: user.id,
            timestamp,
            data: {
              card: newCard,
            },
          } as CardAddedMessage);
        }
      }
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
      const randomIndex = Math.floor(Math.random() * unselectedCards.length);
      const pickedCard = unselectedCards[randomIndex];

      setShowRandomPicker(true);

      setCards((prev) =>
        prev.map((card) =>
          card.id === pickedCard.id ? { ...card, selected: true } : card
        )
      );

      setSelectedCard(pickedCard);

      const newStatus: SessionStatus =
        unselectedCards.length === 1 ? "finished" : "picking";
      setSession({
        ...session,
        status: newStatus,
        selectedCardId: pickedCard.id,
      });

      // Notify participants
      broadcastToAll({
        type: "CARD_SELECTED",
        senderId: user.id,
        timestamp: new Date().toISOString(),
        data: {
          cardId: pickedCard.id,
          newStatus,
        },
      } as CardSelectedMessage);
    } catch (error) {
      console.error("Card lottery error:", error);
      throw new Error("Card lottery error...");
    }
  };

  const newSession = async (sessionName: string): Promise<void> => {
    if (!user?.isHost || !session) {
      throw new Error("Only the host can reset the session...");
    }

    try {
      const timestamp = new Date().toISOString();

      setCards([]);
      setSelectedCard(null);

      setSession({
        ...session,
        name: sessionName,
        status: "collecting",
        selectedCardId: null,
        lastActivity: timestamp,
      });

      broadcastToAll({
        type: "SESSION_NEW",
        senderId: user.id,
        timestamp,
        data: {
          sessionName,
        },
      } as SessionNewMessage);
    } catch (error) {
      console.error("Error creating new session:", error);
      throw new Error("Error creating new session...");
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
  };

  return (
    <PeerContext.Provider value={contextValue}>{children}</PeerContext.Provider>
  );
}

// 使いやすいようにフックとして提供

// eslint-disable-next-line react-refresh/only-export-components
export function usePeer() {
  const context = useContext(PeerContext);
  if (context === undefined) {
    throw new Error("usePeer must be used within a PeerProvider");
  }
  return context;
}
