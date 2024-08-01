FROM archlinux:latest

COPY ./docker/mirrorlist /etc/pacman.d/mirrorlist

RUN pacman-db-upgrade

RUN pacman -Syyu --noconfirm npm nodejs \
                            ffmpeg \
                            base-devel sudo python git ansible yq


RUN mkdir -p /var/kartapi_source

COPY config /var/kartapi_source/config  
COPY src /var/kartapi_source/src
COPY package.json install.sh kart.js /var/kartapi_source/


WORKDIR /var/kartapi_source

ARG VALUES_FILE=config/ansible/variables.yaml
COPY ${VALUES_FILE}  /var/kartapi_source/config/ansible/variables.yaml

RUN sh install.sh -d

COPY test/config/admin_jwtRS256.key.pub test/config/jwtRS256.key.pub \
                /var/api/strash-api/config/

WORKDIR /var/api/strash-api


EXPOSE 6029

CMD [ "node", "kart.js" ]
