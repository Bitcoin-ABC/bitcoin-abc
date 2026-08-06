FROM nginx

COPY . /usr/share/nginx/html/

# Serve index.html for the /token agora action path, which is not a file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx.conf must stay in the build context for the COPY above, but it should
# not also be publicly downloadable from the web root that `COPY .` populated.
RUN rm -f /usr/share/nginx/html/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
