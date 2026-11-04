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

Coach IA sends `POST /api/coach` through the Symfony API. The JSON body is
`{ "message": "<user message>", "language": "fr" }`; backend credentials and
model configuration never enter the browser bundle.

For local development, start the Symfony API on the origin configured by
`VITE_API_BASE_URL` (currently `http://127.0.0.1:8000`). Vite proxies `/api`
and `/uploads` to that origin, so the frontend cannot work against live data
until the API process is running.

### Production environment

Copy [`.env.example`](./.env.example) to `.env.production`, replace every
`example.com` URL with the deployed HTTPS origin for that service, and run
`npm run build`. The production build uses:

- `VITE_API_BASE_URL` for catalogue, pricing, and checkout API requests.
- `VITE_MEDIA_BASE_URL` for uploaded product media; it can match the main API
  origin when uploads are served there.
- `VITE_NUTRITION_API_BASE_URL` for the Nutritionist AI service.
Only public URLs may use the `VITE_` prefix. Keep model keys and all other
backend credentials in the Symfony server environment, never in this storefront
repository or browser bundle.
