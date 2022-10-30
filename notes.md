
# mongo crap

## On my_mongo container

In bash:

```
mongo
```

In mongo prompt:

```
use admin

db.auth(username,password)

use databasename

show collections

...
```

## have the script run

the init script in `/docker-entrypoint-initdb.d` only run when no db created.
So we have to remove everything in `/data/db`.
Have this directory to be a mounter folder, then delete content before stuff container again...

# http, api, etc

## status codes

https://www.codetinkerer.com/2015/12/04/choosing-an-http-status-code.html
