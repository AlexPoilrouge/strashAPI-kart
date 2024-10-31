ARG MODE=regular

FROM archlinux:latest AS base

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


FROM base AS buid-regular

RUN echo "Image build regular…"
RUN sh install.sh


FROM base AS build-tester

RUN echo "Image build for tests…"

COPY test test
RUN sh install.sh -d -t


FROM build-${MODE} AS final

WORKDIR /var/api/strash-api


EXPOSE 6029

CMD [ "node", "kart.js" ]
