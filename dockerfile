FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    sqlite-dev

RUN npm install

COPY . .

# Reconstruir módulos nativos após a cópia
RUN npm rebuild sqlite3

EXPOSE 3000

# Para iniciar o container, use o comando:
# docker build -t nome-da-imagem . && docker run -p 3000:3000 nome-da-imagem
CMD ["npm", "start"]