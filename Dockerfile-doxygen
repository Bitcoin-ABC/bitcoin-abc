FROM ubuntu:16.04

RUN apt-get update && apt-get install -y doxygen graphviz

COPY doc /abc/doc
COPY src /abc/src

WORKDIR /abc

RUN doxygen doc/Doxyfile

FROM nginx:alpine

COPY --from=0 /abc/doc/doxygen/html /usr/share/nginx/html
