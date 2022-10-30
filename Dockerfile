FROM archlinux:latest


RUN pacman-db-upgrade

RUN pacman -Syyu --noconfirm npm nodejs \
                            ffmpeg


COPY . /var/api/strash-api
WORKDIR /var/api/strash-api


RUN npm install


ARG values_script

RUN /bin/bash install/install.sh "${values_script}"


EXPOSE 6029


CMD [ "node", "kart.js" ]
