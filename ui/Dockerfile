FROM node:23.3.0 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine

ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx

WORKDIR /usr/share/nginx/

RUN rm -rf html
RUN mkdir html

WORKDIR /

COPY ./nginx/nginx.conf /etc/nginx/templates/nginx.conf.template
COPY --from=builder ./app/dist /usr/share/nginx/html


CMD ["nginx", "-g", "daemon off;"]


