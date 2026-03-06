export class MemoryStore {
  constructor() {
    this.shortTerm = [];
    this.longTerm = new Map();
  }

  remember(key, value) {
    this.longTerm.set(key, value);
  }

  recall(key) {
    return this.longTerm.get(key);
  }
}
