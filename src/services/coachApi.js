const API_BASE_URL = (import.meta.env.DEV
  ? "/api"
  : (import.meta.env.VITE_API_BASE_URL || "/api")
).replace(/\/+$/, "");

const readResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || payload.error || payload.message || "Le Coach IA n'a pas pu répondre.");
  }
  return payload;
};

export const coachApi = {
  async sendMessage({ message, signal }) {
    const response = await fetch(`${API_BASE_URL}/coach`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, language: "fr" }),
      credentials: "include",
      signal,
    });
    const payload = await readResponse(response);
    if (payload.status !== "success" || !String(payload.reply_text || "").trim()) {
      if (payload.error) throw new Error(payload.error);
      throw new Error("Le Coach IA a renvoyé une réponse vide.");
    }
    return payload;
  },
};
