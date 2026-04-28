FROM node:20-slim

WORKDIR /app

# Install dependencies first for layer caching
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# ANTHROPIC_API_KEY must be passed at runtime:
#   docker run -e ANTHROPIC_API_KEY=sk-... <image>
ENV ANTHROPIC_API_KEY=""

CMD ["npx", "tsx", "agent.ts"]
