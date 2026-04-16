FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
# Source is mounted via bind mount in docker-compose for hot-reload
CMD ["npm", "run", "dev"]
