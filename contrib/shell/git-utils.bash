#!/usr/bin/env bash

export LC_ALL=C.UTF-8

git_root() {
    git rev-parse --show-toplevel 2> /dev/null
}

git_head_version() {
    local recent_tag
    if recent_tag="$(git describe --exact-match HEAD 2> /dev/null)"; then
        echo "${recent_tag#v}"
    else
        git rev-parse --short=12 HEAD
    fi
}
