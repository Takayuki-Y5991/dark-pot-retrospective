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

// Supabase connection setup
// Replace with your Supabase URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const generateUniqueId = (): string => {
  // ランダムな文字列 + タイムスタンプ + ランダムな数値
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
  newSession: (sessionName: string) => Promise<void>;
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

  useEffect(() => {
    if (!user || !session) return;

    // Setup Supabase real-time channel
    const newChannel = supabase.channel(`session:${session.id}`, {
      config: { broadcast: { self: false } },
    });

    // Handle incoming messages based on type
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
        const { participantId } = payload.data;
        setParticipants((prev) => prev.filter((p) => p.id !== participantId));
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

    // Subscribe to the channel
    newChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`Subscribed to session channel: ${session.id}`);
        setChannel(newChannel);

        // If not host, send join request
        if (!user.isHost) {
          sendJoinRequest();
        }
      }
    });

    return () => {
      newChannel.unsubscribe();
    };
  }, [session?.id, user?.id]);

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

    setParticipants((prev) => [...prev, newParticipant]);

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

    const cardSelected = cards.find((card) => card.id === cardId) || null;
    setSelectedCard(cardSelected);

    if (session) {
      setSession({
        ...session,
        status: newStatus,
        selectedCardId: cardId,
      });
    }

    setShowRandomPicker(true);
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

  //   const broadcastToOthers = (excludePeerId: string, message: Message) => {
  //     // In Supabase, we can't exclude specific clients, so we broadcast to all
  //     // and filter on the client side if needed
  //     broadcastToAll(message);
  //   };

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
        // If not host, send specifically to host (in Supabase we just broadcast)
        broadcastToAll({
          type: "CARD_ADDED",
          senderId: user.id,
          timestamp,
          data: {
            card: newCard,
          },
        } as CardAddedMessage);
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

      // Notify others
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

      // Update session in Supabase
      const { error: sessionError } = await supabase
        .from("sessions")
        .update({
          name: sessionName,
          status: "collecting",
          selected_card_id: null,
          last_activity: timestamp,
        })
        .eq("id", session.id);

      if (sessionError) {
        throw new Error(`Failed to update session: ${sessionError.message}`);
      }

      // Delete all cards for this session
      const { error: deleteCardsError } = await supabase
        .from("cards")
        .delete()
        .eq("session_id", session.id);

      if (deleteCardsError) {
        throw new Error(`Failed to delete cards: ${deleteCardsError.message}`);
      }

      // Update local state
      setCards([]);
      setSelectedCard(null);

      setSession({
        ...session,
        name: sessionName,
        status: "collecting",
        selectedCardId: null,
        lastActivity: timestamp,
      });

      // Notify others
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
