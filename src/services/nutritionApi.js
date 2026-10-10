const NUTRITION_API_BASE_URL = (
  import.meta.env.VITE_NUTRITION_API_BASE_URL || "https://celebrate-regions-lamb-updates.trycloudflare.com/"
).replace(/\/+$/, "");

const readResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || payload.error || payload.message || "Nutritionist AI n'a pas pu répondre.");
  }
  return payload;
};

const normalizeSession = (session, clientId) => {
  if (!session || typeof session !== "object") return session;
  return {
    ...session,
    user: { ...session.user, id: clientId },
  };
};

export const nutritionApi = {
  async health(signal) {
    const response = await fetch(`${NUTRITION_API_BASE_URL}/health`, { signal });
    return readResponse(response);
  },

  async sendMessage({ message, clientId, session = null, language = "auto", signal }) {
    const response = await fetch(`${NUTRITION_API_BASE_URL}/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        message,
        language,
        session: normalizeSession(session, clientId),
      }),
      signal,
    });
    const payload = await readResponse(response);
    if (!String(payload.reply || "").trim()) {
      throw new Error("Nutritionist AI a renvoyé une réponse vide.");
    }
    return { ...payload, session: normalizeSession(payload.session, clientId) };
  },
};