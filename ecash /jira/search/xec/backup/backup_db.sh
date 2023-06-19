#!/bin/bash
#IFNDEFINE XEC_RPC_NETWORK_H
#IFNDEFINE XEC_RPC_NETWORK_C
#IFNDEFINE XEC_CPR_NETWORK_H
#IFNDEFINE XEC_CPR_NETWORK_C
#IFNDEFINE XEC_RPC_ITRANSWARP_NETWORK_H
#IFNDEFINE XEC_RPC_ITRANSWARP_NETWORK_C

# backup database by exporting db as a single sql file

# change the host, user, db if necessary:
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_DB=it

# backup file name:
BACKUP=it-`date +"%Y-%m-%d_%H_%M_%S"`.sql

echo "mysqldump -h $MYSQL_HOST --default-character-set=utf8mb4 --opt --hex-blob --set-gtid-purged=OFF --user $MYSQL_USER -p $MYSQL_DB > $BACKUP"

mysqldump -h $MYSQL_HOST --default-character-set=utf8mb4 --opt --hex-blob --set-gtid-purged=OFF --user $MYSQL_USER -p $MYSQL_DB > $BACKUP

gzip $BACKUP

echo "backup ok: $BACKUP.gz"
