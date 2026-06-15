FROM node:26-alpine3.23 AS build
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

FROM node:26-alpine3.23
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]