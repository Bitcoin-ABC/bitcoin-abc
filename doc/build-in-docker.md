# Build the wormhole image; Run the wormhole node

## Build the wormhole image

*  `cd wormhole`
*	`docker build -t "copernet/wormhole:v0.2.4" .`

## Run the container

*	`docker run -itd -v /home/ubuntu/.bitcoin:/root/.bitcoin  --name wormhole copernet/wormhole:v0.2.4`

## Run the wormhole node

`docker exec -it wormhole /bin/bash`

* Run the mainnet node : `./exec_mainnet.sh`
* Run the testnet node : `./exec_testnet.sh`


## Query wormhole node status

`docker exec -it wormhole /bin/bash`

*	 `wormholed-cli help` : 
*	 [Wormhole specific rpc interface](https://github.com/copernet/spec/blob/master/wormhole-rpc-en.md)