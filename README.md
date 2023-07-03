# KTH Biblioteket Bookingsystem Tasks

## Skicka påminnelsemail etc

## Funktioner
Startas i en Dockercontainer

###
Deploy via github actions som anropar en webhook

#### Dependencies
node:16.13.2-alpine

##### Installation

1.  Skapa folder på server med namnet på repot: "/local/docker/bookingsystem-tasks"
2.  Skapa och anpassa docker-compose.yml i foldern
```
version: "3.6"

services:
  bookingsystem-tasks:
    container_name: "bookingsystem-tasks"
    image: ghcr.io/kth-biblioteket/bookingsystem-tasks:${REPO_TYPE}
    env_file:
      - bookingsystem-tasks.env
    restart: "always"
    networks:
      - "apps-net"

networks:
  apps-net:
    external: true
```
3.  Skapa och anpassa .env(för composefilen) i foldern
```
SMTP_HOST=relayhost.sys.kth.se
MAILFROM_NAME_SV=KTH Bibliotekets
MAILFROM_NAME_EN=KTH Library
MAILFROM_ADDRESS=noreply@kth.se
MAILFROM_SUBJECT_SV=Bekräfta ditt grupprum!
MAILFROM_SUBJECT_EN=Confirm your group study room!
LDAP_USER=sys-bibliometri@ug.kth.se
LDAP_PWD="xxxxxx"
API_KEY_WRITE=xxxxxx
BOOKINGSSYSTEM_API_URL=bookingsystem-api/v1
CONFIRM_URL=https://api-ref.lib.kth.se/entry/confirm
EDIT_ENTRY_URL=https://apps-ref.lib.kth.se/mrbsgrupprum/edit_entry.php
CRON_REMINDER_GRB_RS=45 * * * *
CRON_REMINDER_HL_TB=0 20 * * *
ENVIRONMENT=development
LOG_LEVEL=debug
```
3. Skapa deploy_ref.yml i github actions
4. Skapa deploy_prod.yml i github actions
5. Github Actions bygger en dockerimage i github packages
6. Starta applikationen med docker compose up -d --build i "local/docker/bookingsystem-tasks