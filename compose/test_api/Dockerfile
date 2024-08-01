FROM archlinux:latest

COPY ./docker/mirrorlist /etc/pacman.d/mirrorlist


RUN pacman-db-upgrade

RUN pacman -Syyu --noconfirm npm nodejs \
                        python python-yaml python-jinja


COPY ./test/package.json /test/package.json
RUN npm install --prefix /test

COPY ./test /test
COPY ./compose/fromTemplates.py /test/
COPY ./compose/test_api/variables.yaml /test/
COPY ./test/config/test_config.json.j2 ./config/ansible/templates/key.json.j2 /test/templates/

WORKDIR /test

RUN python3 ./fromTemplates.py ./variables.yaml ./templates/test_config.json.j2 /test/config/test_config.json
RUN python3 ./fromTemplates.py ./variables.yaml ./templates/key.json.j2 /test/config/key.json

CMD [ "sh", "-c", "sleep 3 && npm test" ]
