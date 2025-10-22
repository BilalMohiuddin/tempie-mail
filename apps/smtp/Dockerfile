FROM node:20-alpine
RUN npm install -g Haraka && adduser -D haraka
USER haraka
WORKDIR /home/haraka
RUN haraka -i /home/haraka/tempiemail
WORKDIR /home/haraka/tempiemail
COPY config ./config
EXPOSE 25
CMD ["haraka", "-c", "/home/haraka/tempiemail"]
