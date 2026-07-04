// Small pure helpers extracted from agent.js so they can be unit-tested.

export const DEFAULT_PROMPT = "Summarize what we've done so far.";

/**
 * Resolve the prompt to run from CLI arguments.
 * Falls back to DEFAULT_PROMPT when no (non-empty) argument is given.
 *
 * @param {string} [arg] - the raw CLI argument (e.g. process.argv[2])
 * @returns {string}
 */
export function resolvePrompt(arg) {
  if (typeof arg !== "string") return DEFAULT_PROMPT;
  const trimmed = arg.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_PROMPT;
}
