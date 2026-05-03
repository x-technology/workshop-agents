# Google ADK (Agent Development Kit)

This step uses the Google ADK (`@google/adk`) to run a small set of reusable email agents.

- Uses an `LlmAgent` + `InMemoryRunner` for a minimal, inspectable flow.
- Uses `runner.runEphemeral(...)` because the demo only needs a one-shot session per email.
- Keeps prompts and parsing explicit for teaching purposes.
- The script uses Gemini when a key is present and otherwise falls back to a local keyword-based `BaseLlm` implementation, so the ADK path stays the same.

The step exposes three reusable agent roles:

- classify email as `task`, `event`, or `no_action`
- simulate task creation for actionable emails
- simulate agenda item creation for event emails

These agents are reused directly by:

- `src/03-orchestrator/` for the monolithic orchestration example
- `src/04-n8n/` for the visual workflow example
- `src/05-security-observability/` after wrapping them with guardrails and monitoring

## Model selection

Choose a provider via `SDK_PROVIDER` (`auto` by default, which picks Gemini if available, otherwise OpenAI):

- `SDK_PROVIDER=gemini` (default if a Gemini key is present)
  - `GOOGLE_API_KEY` or `GEMINI_API_KEY` required
  - Optional: `GEMINI_MODEL` (defaults to `gemini-2.5-flash`)
- `SDK_PROVIDER=openai`
  - `OPENAI_API_KEY` required
  - Optional: `OPENAI_MODEL` (defaults to `gpt-4o-mini`)
  - Optional: `OPENAI_BASE_URL` (defaults to `https://api.openai.com/v1`)
- `SDK_PROVIDER=local` (OpenAI-compatible endpoint)
  - Optional: `LOCAL_API_KEY` if your local server requires it
  - Optional: `LOCAL_BASE_URL` (defaults to `http://localhost:11434/v1`)
  - Optional: `LOCAL_MODEL` (defaults to `llama3.1`)

If no credentials are available, the script still runs through ADK using a local keyword-based `BaseLlm` fallback.
