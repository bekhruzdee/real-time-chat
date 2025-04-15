FROM node:20
WORKDIR /app
COPY ./package*.json ./
RUN npm install --production
COPY ./ ./
RUN npm rebuild bcrypt --build-from-source
EXPOSE 3000
CMD ["node", "dist/main.js"]
