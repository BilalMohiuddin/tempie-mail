FROM node:20-alpine
RUN apk add --no-cache python3 make g++ && \
    npm install -g Haraka && \
    npm install -g pg && \
    adduser -D haraka
USER haraka
WORKDIR /home/haraka
RUN haraka -i /home/haraka/tempiemail
WORKDIR /home/haraka/tempiemail
COPY config ./config
COPY plugins ./plugins
EXPOSE 25
CMD ["haraka", "-c", "/home/haraka/tempiemail"]
