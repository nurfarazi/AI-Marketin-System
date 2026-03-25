FROM node:24

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY test ./test
COPY README.md ./

RUN npm run build

EXPOSE 5011

CMD ["npm", "start"]
