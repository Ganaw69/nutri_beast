import React, { useEffect, useRef, useState } from "react";
import { useCart } from "../context/CartContext";
import { productService, resolveProductImage } from "../services/api";
import { Bot, Send, User, RefreshCw } from "lucide-react";

const normalizeProduct = (p) => ({
  id: p.id,
  name: p.name,
  price: parseFloat(p.price || 0),
  image: resolveProductImage(p, null),
});

export const NutritionistAIPage = () => {
  const { viewProductDetails } = useCart();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: "Bonjour Athlete ! Posez une question nutrition et je vous recommanderai les meilleurs produits du catalogue.",
      recommendedProduct: null,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    productService
      .getAll({ isActive: true, itemsPerPage: 100 }, true)
      .then((data) =>
        Promise.all(
          (data?.["hydra:member"] || []).map((product) =>
            productService.getOne(product.id, true).catch(() => product)
          )
        )
      )
      .then((detailedProducts) => setCatalog(detailedProducts.map(normalizeProduct)))
      .catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const getRecommendation = (text) => {
    const lower = text.toLowerCase();
    const whey = catalog.find((p) => /whey|protein|proteine|protéine/i.test(p.name)) || catalog[0];
    const gainer = catalog.find((p) => /gainer|mass|bulk/i.test(p.name)) || catalog[1] || catalog[0];
    const recovery = catalog.find((p) => /recovery|creatine|créatine|force/i.test(p.name)) || catalog[2] || catalog[0];
    const preWorkout = catalog.find((p) => /pre|pre-workout|booster|energy|energie/i.test(p.name)) || catalog[3] || catalog[0];

    if (lower.includes("masse") || lower.includes("grossir") || lower.includes("bulk")) {
      return {
        text: "Pour une prise de masse, visez un apport calorique cohérent et un support gainer ou protein plus nourrissant.",
        product: gainer || whey,
      };
    }

    if (lower.includes("créatine") || lower.includes("creatine") || lower.includes("force")) {
      return {
        text: "Pour la force, un support autour de la créatine et de la récupération est souvent pertinent.",
        product: recovery || whey,
      };
    }

    if (lower.includes("sèche") || lower.includes("seche") || lower.includes("maigrir") || lower.includes("isolat") || lower.includes("cut")) {
      return {
        text: "En sèche, privilégiez une protéine propre avec peu de calories inutiles.",
        product: whey || catalog[0],
      };
    }

    if (lower.includes("énergie") || lower.includes("energie") || lower.includes("preworkout") || lower.includes("booster") || lower.includes("fatigue")) {
      return {
        text: "Pour plus d'énergie avant l'entraînement, un pre-workout adapté peut aider.",
        product: preWorkout || whey,
      };
    }

    return {
      text: "Pour optimiser vos résultats, gardez une routine constante, un apport protidique suffisant et un bon sommeil.",
      product: whey || catalog[0],
    };
  };

  const handleSendMessage = (textToSend = null) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg = { id: Date.now(), sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText("");
    setIsTyping(true);

    setTimeout(() => {
      const response = getRecommendation(text);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: response.text,
          recommendedProduct: response.product,
        },
      ]);
      setIsTyping(false);
    }, 900);
  };

  const sampleQuestions = [
    "Quelle proteine pour prendre de la masse ?",
    "Comment consommer la creatine ?",
    "Quelle est la meilleure whey pour secher ?",
    "Quand prendre mon pre-workout ?",
  ];

  return (
    <div className="w-full max-w-5xl mx-auto min-h-[calc(100dvh-11rem)] px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col justify-center gap-4 sm:gap-6">
      <div className="bg-gradient-to-r from-surface-dark via-surface-high to-surface-dark border border-accent-gold/40 p-4 sm:p-6 rounded-2xl flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-gold/20 text-accent-gold flex items-center justify-center border border-accent-gold/40 shadow-lg">
            <Bot className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-black text-base sm:text-xl text-white uppercase truncate">NUTRITIONIST AI</h1>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                EN LIGNE
              </span>
            </div>
            <p className="text-xs text-gray-300">Posez vos questions nutrition et recevez une recommandation du catalogue.</p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: 1,
                sender: "ai",
                text: "Conversation réinitialisée ! Quel est votre objectif aujourd'hui ?",
                recommendedProduct: null,
              },
            ])
          }
          className="text-gray-400 hover:text-white p-2 rounded-lg bg-surface border border-white/10"
          title="Réinitialiser le chat"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-gray-400 shrink-0 font-heading">Sujets Fréquents:</span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            className="bg-surface-low border border-white/10 hover:border-accent-gold text-gray-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-full shrink-0 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-white/10 rounded-2xl h-[min(480px,calc(100dvh-18rem))] min-h-[360px] flex flex-col justify-between overflow-hidden shadow-2xl">
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "ai" && (
                <div className="w-8 h-8 rounded-full bg-accent-gold text-background flex items-center justify-center shrink-0 font-bold shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-lg p-3 sm:p-4 rounded-2xl text-xs sm:text-sm space-y-3 ${
                  msg.sender === "user"
                    ? "bg-primary text-white rounded-br-none shadow-md shadow-primary/20 font-medium"
                    : "bg-surface-high border border-white/10 text-on-surface rounded-bl-none"
                }`}
              >
                <p className="leading-relaxed">{msg.text}</p>

                {msg.recommendedProduct && (
                  <div className="bg-surface-dark border border-white/10 p-3 rounded-xl flex items-center justify-between gap-3 mt-3">
                    <img
                      src={msg.recommendedProduct.image}
                      alt={msg.recommendedProduct.name}
                      className="w-12 h-12 object-contain"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-heading font-bold text-xs text-white truncate">
                        {msg.recommendedProduct.name}
                      </h4>
                      <span className="font-heading font-black text-xs text-primary">
                        {msg.recommendedProduct.price.toFixed(2)} TND
                      </span>
                    </div>
                    <button
                      onClick={() => viewProductDetails(msg.recommendedProduct.id)}
                      className="bg-primary text-white text-[11px] font-heading font-bold px-3 py-1.5 rounded-lg hover:bg-primary-dark shrink-0"
                    >
                      VOIR
                    </button>
                  </div>
                )}
              </div>

              {msg.sender === "user" && (
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
                <span>Nutritionist AI prepare your recommendation...</span>
              </div>
            </div>
          )}

        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 sm:p-4 bg-surface-dark border-t border-white/10 flex flex-col sm:flex-row gap-2 sm:gap-3"
        >
          <input
            type="text"
            placeholder="Posez votre question nutrition au Nutritionist AI..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-gold"
          />
          <button
            type="submit"
            className="w-full sm:w-auto bg-accent-gold hover:bg-yellow-400 text-background font-heading font-bold px-5 py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-xs"
          >
            <span>ENVOYER</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
