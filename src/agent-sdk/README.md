# About

A workshop module demonstrating two agentic patterns with Claude. **Native Claude Agent SDK** (`agent.ts`) runs an autonomous loop using the `query()` iterator with file-system tools. **Google ADK + Claude** (`adk-agent.ts` + `claude-llm.ts`) bridges Google's ADK framework to Anthropic's API via a custom LLM adapter, showcasing interoperability. Both patterns are containerized via Docker for portable execution.

## Run locally

```sh
# ANTR_KEY=
# source .env
docker build -t agent-sdk .
docker run -it -e ANTHROPIC_API_KEY=$ANTR_KEY -v $(pwd)/agent.ts:/app/agent.ts agent-sdk /bin/bash
# inside the container
# ls, pwd
npm run start -- "add a simple test and test environment, dir and runner command - i want to use node.js native test framework"
npm test
```

### Issues

Docker architecture environment is different from host

```bash
# inside the container
npm i @anthropic-ai/claude-agent-sdk
```