import React, { useEffect, useRef, useState } from "react";
import { Bot, Send, User, RefreshCw } from "lucide-react";
import { coachApi } from "../services/coachApi";

const COACH_USER_ID_STORAGE_KEY = "nutri_beast_coach_user_id";

const createMessage = (sender, text) => ({
  id: `${sender}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  sender,
  text,
});

const getCoachUserId = () => {
  try {
    const existingId = window.localStorage.getItem(COACH_USER_ID_STORAGE_KEY);
    if (existingId) return existingId;

    const newId = typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(COACH_USER_ID_STORAGE_KEY, newId);
    return newId;
  } catch {
    return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

const initialMessages = () => [
  createMessage("ai", "Bonjour Athlete ! Posez une question à Coach Max sur vos objectifs, votre entraînement ou votre nutrition."),
];

export const CoachIaPage = () => {
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [apiStatus, setApiStatus] = useState("checking");
  const messagesContainerRef = useRef(null);
  const userIdRef = useRef(getCoachUserId());
  const requestControllerRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    coachApi.health(controller.signal)
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isTyping]);

  useEffect(() => () => requestControllerRef.current?.abort(), []);

  const handleSendMessage = async (textToSend = null) => {
    const text = String(textToSend ?? inputText).trim();
    if (!text || isTyping) return;

    setMessages((previousMessages) => [...previousMessages, createMessage("user", text)]);
    setInputText("");
    setIsTyping(true);

    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      const response = await coachApi.sendMessage({
        message: text,
        userId: userIdRef.current,
        language: "auto",
        signal: controller.signal,
      });
      setMessages((previousMessages) => [...previousMessages, createMessage("ai", response.reply)]);
      setApiStatus("online");
    } catch (error) {
      if (error.name !== "AbortError") {
        setMessages((previousMessages) => [
          ...previousMessages,
          createMessage("ai", "Le Coach IA est momentanément indisponible. Vérifiez que son serveur est démarré, puis réessayez."),
        ]);
        setApiStatus("offline");
      }
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
        setIsTyping(false);
      }
    }
  };

  const resetConversation = () => {
    requestControllerRef.current?.abort();
    setIsTyping(false);
    setInputText("");
    setMessages([
      createMessage("ai", "Conversation réinitialisée ! Quel est votre objectif aujourd'hui ?"),
    ]);
  };

  const sampleQuestions = [
    "Fais-moi un programme débutant sur 3 jours",
    "Comment consommer la créatine ?",
    "Quelle protéine pour une sèche ?",
    "Quand prendre mon pre-workout ?",
  ];

  const statusStyles = {
    online: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    checking: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    offline: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  const statusLabels = { online: "EN LIGNE", checking: "VÉRIFICATION", offline: "INDISPONIBLE" };

  return (
    <div className="w-full max-w-5xl mx-auto min-h-[calc(100dvh-11rem)] px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col justify-center gap-4 sm:gap-6">
      <div className="bg-gradient-to-r from-surface-dark via-surface-high to-surface-dark border border-accent-gold/40 p-4 sm:p-6 rounded-2xl flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-gold/20 text-accent-gold flex items-center justify-center border border-accent-gold/40 shadow-lg">
            <Bot className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-black text-base sm:text-xl text-white uppercase truncate">COACH IA</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusStyles[apiStatus]}`}>
                {statusLabels[apiStatus]}
              </span>
            </div>
            <p className="text-xs text-gray-300">Conseils personnalisés avec Coach Max.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={resetConversation}
          className="text-gray-400 hover:text-white p-2 rounded-lg bg-surface border border-white/10"
          title="Réinitialiser le chat"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-gray-400 shrink-0 font-heading">Sujets fréquents :</span>
        {sampleQuestions.map((question) => (
          <button
            key={question}
            type="button"
            disabled={isTyping}
            onClick={() => handleSendMessage(question)}
            className="bg-surface-low border border-white/10 hover:border-accent-gold text-gray-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-full shrink-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {question}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-white/10 rounded-2xl h-[min(480px,calc(100dvh-18rem))] min-h-[360px] flex flex-col justify-between overflow-hidden shadow-2xl">
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.sender === "ai" && (
                <div className="w-8 h-8 rounded-full bg-accent-gold text-background flex items-center justify-center shrink-0 font-bold shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-lg p-3 sm:p-4 rounded-2xl text-xs sm:text-sm ${
                  message.sender === "user"
                    ? "bg-primary text-white rounded-br-none shadow-md shadow-primary/20 font-medium"
                    : "bg-surface-high border border-white/10 text-on-surface rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
              </div>

              {message.sender === "user" && (
                <div className="w-8 h-8 rounded-full bg-surface-high text-white flex items-center justify-center shrink-0 border border-white/10">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-full bg-accent-gold text-background flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-surface-high border border-white/10 px-4 py-3 rounded-2xl text-xs text-gray-400 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-accent-gold rounded-full animate-ping" />
                <span>Coach Max prépare sa réponse...</span>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSendMessage();
          }}
          className="p-3 sm:p-4 bg-surface-dark border-t border-white/10 flex flex-col sm:flex-row gap-2 sm:gap-3"
        >
          <input
            type="text"
            placeholder="Posez votre question à Coach Max..."
            value={inputText}
            disabled={isTyping}
            onChange={(event) => setInputText(event.target.value)}
            className="w-full flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-gold disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="w-full sm:w-auto bg-accent-gold hover:bg-yellow-400 text-background font-heading font-bold px-5 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>ENVOYER</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
