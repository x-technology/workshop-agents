# AI SDK (Vercel)

This step replaces the custom SDK layer with the official AI SDK (`ai` npm package).

- Uses `generateText` with a model provider.
- Keeps prompts and parsing explicit for teaching purposes.
- The model is selected in `src/ai/model.js`.

If you have an API key set, the real model is used. Otherwise a mock model is used for offline demos.
