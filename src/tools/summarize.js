function simpleSummary(text) {
  const sentences = text.split(/[.!?]/).filter(Boolean);
  if (sentences.length === 0) return text;
  return sentences.slice(0, 2).join('. ').trim() + '.';
}

export async function summarize({ text }, { memory }) {
  let content = text;
  if (text === '$last') {
    const lastTool = [...memory.shortTerm].reverse().find(m => m.role === 'tool');
    content = lastTool ? JSON.stringify(lastTool.content.result) : '';
  }
  return simpleSummary(String(content));
}
