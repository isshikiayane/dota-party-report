FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY public ./public
COPY server ./server
COPY work/build_dota_report.js work/od_heroes.json work/official_hero_names.json ./work/
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["node", "server/index.js"]
