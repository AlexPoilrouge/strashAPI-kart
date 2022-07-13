# Strash-API Kart

## About

This about creating an API for Strashbot's SRB2Kart related stuff.


## Install

Use the `install/intall.sh` script.

To configure stuff that is configurable, use a *value script* alongside the install script.

### Value script

It provided the necessary values for configuration the installation.

To use it, copy the `install/values.default.sh` file into a `values.sh` file
(located either at the project's root dir or in the `install` dir)
and edit the values within.
```
cp install/values/default/sh values.sh
nano values.sh

/bin/bash install/install.sh
```

Finally run the install script

### Docker

A dockerfile aimed at testing or running the API project is available.
Use it as any other Dockerfile.

### Docker-Compose

The `compose/docker-compose.yml` aims at providing a working API
behind a Ngnix reverse proxy (`compose/Dockerfile.nginx`):
```
cd compose
docker-compose up
```


## Run & use

```
node kart.js
```

A swagger UI is available at the `/docs` entrypoint.
