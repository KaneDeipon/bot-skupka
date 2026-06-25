# Используем официальный образ Node.js
FROM node:20-alpine

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install --production

# Копируем весь код
COPY index.js ./

# Команда запуска
CMD ["npm", "start"]
