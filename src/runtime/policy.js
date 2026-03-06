export function enforcePolicy({ agent, tool, policy, args }) {
  if (!policy || !policy.allowedTools) return;
  if (!policy.allowedTools.includes(tool)) {
    throw new Error(`Policy denied tool: ${tool} for agent: ${agent}`);
  }

  if (policy.maxPayloadBytes) {
    const payloadSize = Buffer.from(JSON.stringify(args || {})).byteLength;
    if (payloadSize > policy.maxPayloadBytes) {
      throw new Error(`Payload too large: ${payloadSize} bytes`);
    }
  }
}
