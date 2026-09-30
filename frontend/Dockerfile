FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && sha256sum package-lock.json | cut -d' ' -f1 > node_modules/.package-lock.sha256

COPY . .

# Metro / Expo web dev server
EXPOSE 8081

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npx", "expo", "start", "--web", "--port", "8081"]
