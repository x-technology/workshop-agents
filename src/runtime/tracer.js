import fs from 'node:fs';
import path from 'node:path';

export function createTrace({ logPath } = {}) {
  const runs = new Map();
  let runCounter = 0;

  function writeLog(entry) {
    if (!logPath) return;
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`);
  }

  return {
    startRun(meta) {
      const id = `run-${++runCounter}`;
      runs.set(id, { meta, spans: [] });
      const entry = { type: 'run.start', id, time: Date.now(), meta };
      writeLog(entry);
      return id;
    },

    endRun(id, meta) {
      const entry = { type: 'run.end', id, time: Date.now(), meta };
      writeLog(entry);
    },

    startSpan(runId, name, meta) {
      const spanId = `${runId}-span-${runs.get(runId).spans.length + 1}`;
      runs.get(runId).spans.push({ spanId, name, meta });
      const entry = { type: 'span.start', runId, spanId, time: Date.now(), name, meta };
      writeLog(entry);
      return spanId;
    },

    endSpan(runId, spanId, meta) {
      const entry = { type: 'span.end', runId, spanId, time: Date.now(), meta };
      writeLog(entry);
    },

    log(runId, event, meta) {
      const entry = { type: 'event', runId, time: Date.now(), event, meta };
      writeLog(entry);
    }
  };
}
