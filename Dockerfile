FROM archlinux:latest

COPY ./docker/mirrorlist /etc/pacman.d/mirrorlist

RUN pacman-db-upgrade

RUN pacman -Syyu --noconfirm npm nodejs \
                            ffmpeg


COPY package.json /var/api/strash-api/package.json
RUN npm install --prefix /var/api/strash-api/

COPY . /var/api/strash-api
WORKDIR /var/api/strash-api


ARG values_script

RUN /bin/bash install/install.sh "${values_script}"


EXPOSE 6029


CMD [ "node", "kart.js" ]
