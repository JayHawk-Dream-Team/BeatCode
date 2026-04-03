import React, { useEffect, useRef, useState } from "react";
import { firestore, auth } from "@/firebase/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";

interface ChatMessage {
  id?: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp?: any;
}

interface ChatProps {
  matchId: string;
  opponentName: string;
  selfName: string;
  isOpen: boolean;
  onClose: () => void;
  onNewMessage: () => void;
}


const Chat: React.FC<ChatProps> = ({ matchId, opponentName, selfName, isOpen, onClose, onNewMessage }) => {
  const [user] = useAuthState(auth);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use refs so the snapshot callback always reads the latest values
  // without causing the subscription to rebuild on every open/close toggle.
  const isOpenRef = useRef(isOpen);
  const lastSeenMsgIdRef = useRef<string | null>(null);

  // Keep isOpenRef in sync, and mark all current messages as seen when opening.
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen && messages.length) {
      lastSeenMsgIdRef.current = messages[messages.length - 1].id || null;
    }
  }, [isOpen, messages]);

  useEffect(() => {
    if (!matchId || !user) return;
    const q = query(
      collection(firestore, "chats", matchId, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(msgs);
      if (msgs.length) {
        const lastMsg = msgs[msgs.length - 1];
        // Only notify unread when chat is closed, message is from opponent, and it's new.
        if (!isOpenRef.current && lastMsg.senderId !== user.uid && lastMsg.id !== lastSeenMsgIdRef.current) {
          onNewMessage();
        }
        lastSeenMsgIdRef.current = lastMsg.id || null;
      }
    }, (error) => {
      console.error("[Chat] onSnapshot error:", error.code, error.message);
    });
    return () => unsubscribe();
  // isOpen intentionally omitted — we read it via isOpenRef to avoid rebuilding
  // the subscription on every open/close, which would reset lastSeenMsgIdRef.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, user, onNewMessage]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    await addDoc(collection(firestore, "chats", matchId, "messages"), {
      text: input,
      senderId: user.uid,
      senderName: selfName,
      timestamp: serverTimestamp(),
    });
    setInput("");
  };

  if (!isOpen) return null;

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span>Chat with {opponentName}</span>
        <button onClick={onClose}>×</button>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={msg.senderId === user?.uid ? "chat-message self" : "chat-message opponent"}>
            <span className="chat-sender">{msg.senderId === user?.uid ? "You" : opponentName}</span>
            <span className="chat-text">{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input" onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default Chat;
