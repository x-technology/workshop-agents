import { AgentRuntime } from './core.js';
import { Planner } from './planner.js';
import { MemoryStore } from './memory.js';

export function createAgent({ name, tools, policy, tracer }) {
  const planner = new Planner({ tools });
  const memory = new MemoryStore();
  return new AgentRuntime({ name, planner, memory, tools, policy, tracer });
}
