const COACH_API_BASE_URL = (
  import.meta.env.VITE_COACH_API_BASE_URL || "https://has-array-areas-retirement.trycloudflare.com/"
).replace(/\/+$/, "");

const readResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || payload.error || payload.message || "Le Coach IA n'a pas pu répondre.");
  }
  return payload;
};

export const coachApi = {
  async health(signal) {
    const response = await fetch(`${COACH_API_BASE_URL}/health`, { signal });
    return readResponse(response);
  },

  async sendMessage({ message, userId, language = "auto", signal }) {
    const response = await fetch(`${COACH_API_BASE_URL}/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        user_id: userId,
        language,
      }),
      signal,
    });
    const payload = await readResponse(response);
    if (!String(payload.reply || "").trim()) {
      throw new Error("Le Coach IA a renvoyé une réponse vide.");
    }
    return payload;
  },
};
