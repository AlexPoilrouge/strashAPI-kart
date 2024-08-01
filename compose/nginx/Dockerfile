# This docker file is used for testing puposes only
# Aimed to be used with the docker-compose.yml found aside
#  and in the context of the project's root dir

FROM alpine:latest

RUN apk add --no-cache nginx
RUN apk add --no-cache python3 py3-yaml py3-jinja2

COPY ./compose/nginx/variables.yaml /var/app/install/
COPY ./config/ansible/templates/nginx-strash-api.conf.j2 /var/app/install/
COPY ./compose/fromTemplates.py /var/app/install/

RUN rm -vf /etc/nginx/http.d/*.conf

WORKDIR /var/app/install

RUN python3 ./fromTemplates.py ./variables.yaml ./nginx-strash-api.conf.j2 \
                /etc/nginx/http.d/nginx-strash-api.conf

EXPOSE 80
EXPOSE 81
EXPOSE 443


CMD [ "nginx", "-g", "daemon off;"]
