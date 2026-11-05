import React, { useEffect, useRef, useState } from "react";
import { Bot, Send, User, RefreshCw, ExternalLink, ShoppingBag } from "lucide-react";
import { coachApi } from "../services/coachApi";
import { resolveProductImage } from "../services/api";
import { useCart } from "../context/CartContext";

const createMessage = (sender, text, extra = {}) => ({
  id: `${sender}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  sender,
  text,
  ...extra,
});

const initialMessages = () => [
  createMessage("ai", "Bonjour Athlete ! Posez une question à Coach Max sur vos objectifs, votre entraînement ou votre nutrition."),
];

export const CoachIaPage = () => {
  const { viewProductDetails } = useCart();
  const [messages, setMessages] = useState(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [apiStatus, setApiStatus] = useState("online");
  const messagesContainerRef = useRef(null);
  const newestMessageRef = useRef(null);
  const requestControllerRef = useRef(null);

  useEffect(() => {
    const container = messagesContainerRef.current;
    const newestMessage = newestMessageRef.current;
    if (!container || !newestMessage) return;

    const { top, bottom } = container.getBoundingClientRect();
    if (bottom <= 0 || top >= window.innerHeight) return;
    newestMessage.scrollIntoView({ behavior: "smooth", block: "nearest", container: "nearest" });
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
      const response = await coachApi.sendMessage({ message: text, signal: controller.signal });
      const recommendedProducts = Array.isArray(response.recommended_products)
        ? response.recommended_products
        : [];
      setMessages((previousMessages) => [
        ...previousMessages,
        createMessage("ai", response.reply_text, { recommendedProducts }),
      ]);
      setApiStatus("online");
    } catch (error) {
      if (error.name !== "AbortError") {
        setMessages((previousMessages) => [
          ...previousMessages,
          createMessage("ai", error.message || "Le Coach IA est momentanément indisponible."),
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
              <h1 className="font-heading font-black text-lg sm:text-2xl text-white uppercase truncate">COACH IA</h1>
              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${statusStyles[apiStatus]}`}>
                {statusLabels[apiStatus]}
              </span>
            </div>
            <p className="text-sm text-gray-300">Conseils personnalisés avec Coach Max.</p>
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
        <span className="text-sm font-bold text-gray-300 shrink-0 font-heading">Sujets fréquents :</span>
        {sampleQuestions.map((question) => (
          <button
            key={question}
            type="button"
            disabled={isTyping}
            onClick={() => handleSendMessage(question)}
            className="bg-surface-low border border-white/10 hover:border-accent-gold text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-full shrink-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {question}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-white/10 rounded-2xl h-[min(480px,calc(100dvh-18rem))] min-h-[360px] flex flex-col justify-between overflow-hidden shadow-2xl">
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              ref={index === messages.length - 1 && !isTyping ? newestMessageRef : null}
              className={`flex gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.sender === "ai" && (
                <div className="w-8 h-8 rounded-full bg-accent-gold text-background flex items-center justify-center shrink-0 font-bold shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
              )}

              <div
                className={`max-w-[90%] sm:max-w-2xl p-4 sm:p-5 rounded-2xl text-sm sm:text-base ${
                  message.sender === "user"
                    ? "bg-primary text-white rounded-br-none shadow-md shadow-primary/20 font-medium"
                    : "bg-surface-high border border-white/10 text-on-surface rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                {message.recommendedProducts?.length > 0 && (
                  <div className="mt-3 space-y-2">
                  {message.recommendedProducts.map((product, productIndex) => {
                    const productId = product.id ?? product.product_id ?? product.productId;
                    const productName = product.name ?? product.product_name ?? "Produit recommandé";
                    const productImage = resolveProductImage({
                      ...product,
                      image: product.image ?? product.image_url ?? product.imageUrl,
                    });
                    const productHref = product.href || (productId ? `#product/${productId}` : null);
                    return (
                  <a
                    key={`${productId || productName}-${productIndex}`}
                    href={productHref || "#"}
                    onClick={(event) => {
                      event.preventDefault();
                      if (productId) viewProductDetails(productId);
                    }}
                    className="flex items-center gap-3 rounded-xl border border-accent-gold/40 bg-surface-low p-3 transition-colors hover:border-accent-gold hover:bg-surface"
                    aria-label={`Voir le produit ${productName}`}
                  >
                    {productImage ? (
                      <img src={productImage} alt="" className="h-12 w-12 rounded-lg bg-white object-contain" />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent-gold/15 text-accent-gold">
                        <ShoppingBag className="h-5 w-5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-bold text-white">{productName}</span>
                      <span className="block truncate text-sm text-gray-300">
                        {[product.brand, product.category].filter(Boolean).join(" · ") || "Produit Nutri Beast"}
                      </span>
                      {product.price !== undefined && product.price !== null && (
                        <span className="mt-1 block text-sm font-bold text-accent-gold">{Number(product.price).toFixed(2)} TND</span>
                      )}
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-accent-gold" aria-hidden="true" />
                  </a>
                    );
                  })}
                  </div>
                )}
              </div>

              {message.sender === "user" && (
                <div className="w-8 h-8 rounded-full bg-surface-high text-white flex items-center justify-center shrink-0 border border-white/10">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div ref={newestMessageRef} className="flex gap-3 justify-start items-center">
              <div className="w-8 h-8 rounded-full bg-accent-gold text-background flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-surface-high border border-white/10 px-4 py-3 rounded-2xl text-sm text-gray-300 flex items-center gap-1.5">
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
            className="w-full flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm sm:text-base text-white placeholder-gray-400 focus:outline-none focus:border-accent-gold disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="w-full sm:w-auto bg-[#ff003b] hover:bg-[#e00034] text-white font-heading font-bold px-5 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>ENVOYER</span>
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
};
