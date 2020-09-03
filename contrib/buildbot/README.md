# ABCBot

This is a microservice designed to sit along side teamcity and take requests from the TCWebHook plugin and act upon them.

## Install

Install virtualenvwrapper:
```
sudo pip3 install virtualenvwrapper
source /usr/local/bin/virtualenvwrapper.sh
```

Presuming you have virtualenvwrapper and python 3.6+ installed already:

```sh
mkvirtualenv abcbot
workon abcbot
pip3 install -r requirements.txt
```

## Tests

Install pytest:
```
pip3 install pytest
```

Run tests:
```
pytest -v
```

## Deployment

The bot is deployed to a secure environment where the necessary secrets are provided to it.
For example, if using docker:

Setup the .env file:
```
cp .template.env .env
vim .env  # Edit as needed
```

Build:
```
docker build -t my-docker-tag .
```

Use the .env file when running the container:
```
docker run -it --env-file=.env my-docker-tag
```

## Running the server locally

Running the tests is your best bet for local development. But, if you insist on running a server locally:
```
./abcbot.py [-l --log-file LOG_FILE] [-p --port PORT]
```
