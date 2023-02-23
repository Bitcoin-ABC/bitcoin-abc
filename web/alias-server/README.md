# alias-server

A node backend for validating eCash alias registrations

## To-do

[x] Template node app
[x] Install chronik and add function for getting tx history
[x] Timestamped logging

[x] **Alias parsing functions and unit tests**
[x] getAliases function
[x] util function getAddressFromHash160
[x] return addresses in parseAliasTx
[x] Complete getAliases function
[x] Refactor alias functions to accept constants as inputs, so unit tests can test different fees and addresses
[x] Handle duplicate alias registrations at different blockheights
[x] Handle duplicate alias registrations in the same blockheight
[x] unit tests for getAliases function
[x] Mocks and unit tests for sorting function
[x] Mocks with unconfirmed aliases
[x] Mocks with unconfirmed and conflicting alias registrations

[x] **Database**
[x] Initialize MongoDB
[x] Insert alias info into db
[x] Improve insert logic so that only aliases that are not already in the database are inserted

[] **App**
[x] Connect to chronik websockets for blocks and txs at registration address
[] Update database on new block
[] Finalize unit test matching with Cashtab

[] **API endpoints**
[x] Make alias info available at endpoint
[] Add validBlockheight to endpoint result, so user can know given aliases are valid up to a certain blockheight

[] **Deployment**
[x] Update README
[] CI

[] **Other Features**
[] Remove debug logging
[] IP address logging
[] Some thought around which endpoints you need vs what should be handled by requesting apps. For example, do you want to return an array of only aliases?
[] pendingAlias database logic (entries must be removed after they exist in validAliasTxs)
[] move generateMocks function to test folder
[] Refine methods for updating database. Update pending on tx. No need to update all every block, sometimes there are no txs. So you really should be updating on confirmed.
[] Telegram bot that notifies registrations of new aliases (should just be a channel)

## Requirements

You will need a local instance of MongoDB. See installation instructions [here](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/).

## Development

Run `index.js` to test current functionality

`node index.js`

Run `db.js` to test database functionality.

1. Install `mongodb`
2. `sudo systemctl start mongod`
3. `node db.js` and confirm data is successfully written.

## Production

This app is optimized for an Ubuntu 18.04.6 LTS server.

1. Follow the instructions [here](https://www.digitalocean.com/community/tutorials/how-to-install-mongodb-on-ubuntu-18-04-source) to install and start `mongodb`

2. Configure `systemd` to run the app as a process.

```
sudo nano /etc/systemd/system/alias.service
```

Sample text of `alias.service`. Note you will need to use the correct paths in the `ExecStart=` field.

You can get your `node` path by running `which node` in your server's bash prompt.

```
[Service]
ExecStart=/path/to/.nvm/versions/node/v16.13.0/bin/node /path/to/alias-server/index.js
Restart=always
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=etoken-icons
User=<user>
Group=<user>
[Install]
WantedBy=multi-user.target
```

3. Install `nginx` by following [these instructions](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-18-04-quickstart)

4. Configure your `nginx` `aliases.yourdomain.com` file to run the app on the correct port.

```
sudo nano /etc/nginx/sites-available/aliases.yourdomain.com
```

Sample text of `aliases.yourdomain.com`. Note you must replace `<port>` with the port your app is running on. The `ssl` information below should also be custom to your domain. You can use [these ssl instructions](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-18-04) as a guide.

```
upstream aliasesapi {
   server 127.0.0.1:<port>;
    keepalive 64;
}

server {

        root /var/www/yourdomain.com/html;
        index index.html index.htm index.nginx-debian.html;

        server_name yourdomain.com;

        location / {
          proxy_pass http://aliasesapi/;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For
          $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
          proxy_set_header Host $http_host;
          proxy_set_header X-NginX-Proxy true;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
        }

        listen [::]:443 ssl ipv6only=on; # managed by Certbot
        listen 443 ssl; # managed by Certbot
        ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem; # managed by Certbot
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem; # managed by Certbot
}

server {
    if ($host = yourdomain.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot
  listen 80;
  listen [::]:80;

  server_name yourdomain.com;

  return 404; # managed by Certbot
}
```

5. Activate your site with nginx

```
sudo nginx -t
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

6. Run your app

```
sudo systemctl start alias
```

Check status with `sudo systemctl status alias`

7. Check the api by navigating to `https:/yourdomain.com/aliases`. You should see a list of valid registered aliases.

### Useful commands to check logs

```
sudo journalctl -u alias.service -f #logs in realtime
sudo journalctl -u alias.service --since today #logs of last 24 hrs
```
