# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Coach IA API

Coach IA calls `https://represent-five-lynn-page.trycloudflare.com/v1/chat` by default and checks `GET /health` when the page opens. The API receives `{ message, user_id, language: "auto" }`; no OpenRouter key is ever sent by the browser.

For a deployed Coach API, set its public HTTPS base URL before building the storefront:

```ini
VITE_COACH_API_BASE_URL=https://coach-api.example.com
```

`COACH_API_HOST`, `COACH_API_PORT`, and `OPENROUTER_API_KEY` belong only in the Coach API server's `.env`. Configure the API's `COACH_API_ALLOWED_ORIGIN` to allow the storefront origin.
