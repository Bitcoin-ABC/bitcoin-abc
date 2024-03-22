---
sidebar_position: 3
---

# Host Chronik

It is recommended to use a reverse-proxy to host Chronik, like [Apache](https://httpd.apache.org/) or [NGINX](https://www.nginx.com/).

## NGINX

Click [here](https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-open-source/) to install NGINX, or if you are on Ubuntu, it is simply:

```bash
sudo apt update
sudo apt install nginx
```

Update the NGINX config file, in this example Chronik will be hosted under /xec:

```nginx title="/etc/nginx/sites-enabled/default"
server {
    server_name chronik.yourapp.com;

    location /xec/ {
        proxy_pass http://127.0.0.1:8331/;
        proxy_set_header Host $http_host;
        add_header "Access-Control-Allow-Origin"  *;
        add_header "Access-Control-Allow-Methods" "GET, POST, OPTIONS, HEAD";
    }

    location /xec/ws {
        proxy_pass http://127.0.0.1:8331/ws;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

## HTTPS Support

To enable HTTPS support, you can use Certbot:

```bash
certbot --nginx -d chronik.yourapp.com
```

It will automatically generate TLS certificates and update your NGINX config to use them. When asked if you want to create redirects, it is recommended to set this to "yes"
