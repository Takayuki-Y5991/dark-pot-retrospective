export type SessionStatus = "collecting" | "picking" | "finished";

export interface Session {
  id: string;
  name: string;
  /* Require for connection control. */
  hostId: string;
  status: SessionStatus;
  selectedCardId: string | null;
  createdAt: string;
  lastActivity: string;
}

export interface Participant {
  id: string;
  isHost: boolean;
  joinedAt: string;
}

export interface Card {
  id: string;
  authorId: string;
  content: string;
  selected: boolean;
  createdAt: string;
}

export type MessageType =
  | "JOIN_REQUEST"
  | "JOIN_ACCEPTED"
  | "JOIN_REJECTED"
  | "PARTICIPANT_JOINED"
  | "PARTICIPANT_LEFT"
  | "CARD_ADDED"
  | "CARD_SELECTED"
  | "SESSION_RESET"
  | "SESSION_STATE"
  | "SESSION_NEW"
  | "PING"
  | "PONG";

export interface Message {
  type: MessageType;
  senderId: string;
  timestamp: string;
  data?: unknown;
}

export interface JoinRequestMessage extends Message {
  type: "JOIN_REQUEST";
  data?: unknown;
}

export interface JoinAcceptedMessage extends Message {
  type: "JOIN_ACCEPTED";
  data: {
    participantId: string;
    session: Session;
    participants: Participant[];
    cards: Card[];
  };
}

export interface ParticipantJoinedMessage extends Message {
  type: "PARTICIPANT_JOINED";
  data: {
    participant: Participant;
  };
}

export interface CardAddedMessage extends Message {
  type: "CARD_ADDED";
  data: {
    card: Card;
  };
}

export interface CardSelectedMessage extends Message {
  type: "CARD_SELECTED";
  data: {
    cardId: string;
    newStatus: SessionStatus;
  };
}

export interface SessionResetMessage extends Message {
  type: "SESSION_RESET";
}

export interface SessionStateMessage extends Message {
  type: "SESSION_STATE";
  data: {
    session: Session;
    participants: Participant[];
    cards: Card[];
  };
}

export interface SessionNewMessage extends Message {
  type: "SESSION_NEW";
  data: {
    sessionName: string;
  };
}

export interface User {
  id: string;
  isHost: boolean;
  sessionId: string;
}
