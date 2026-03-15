FROM node:18-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
COPY scripts ./scripts
COPY sql ./sql
EXPOSE 8080
CMD ["npm", "start"]
