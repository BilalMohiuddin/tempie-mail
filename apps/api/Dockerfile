FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY tsconfig.json ./
COPY src ./src
EXPOSE 4000
CMD ["npx", "tsx", "src/index.ts"]
