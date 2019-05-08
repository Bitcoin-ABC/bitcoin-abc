# 构建Wormhole镜像，运行Wormhole节点

## 构建wormholedocker镜像

*  `cd wormhole`
*	`docker build -t "copernet/wormhole:v0.2.4" .`

## 运行容器

*	`docker run -itd -v /home/ubuntu/.bitcoin:/root/.bitcoin  --name wormhole copernet/wormhole:v0.2.4`
	* Note: 上述的宿主机挂载的目录是：宿主机上存储的块链数据的目录.(可能当前宿主机已下载好了部分BCH链上的数据，存储在指定的目录； 或者在容器中运行节点时，下载的BCH链上数据需要存储至宿主机上)
	
## 进入容器，运行wormhole 节点

`docker exec -it wormhole /bin/bash`

*	运行主网节点 : `./exec_mainnet.sh`
*  运行测试网节点 : ``./exec_testnet.sh``

## 进入容器，查询节点的状态
`docker exec -it wormhole /bin/bash`

*	 `wormholed-cli help` : 查询节点当前支持的所有RPC接口
*	 [WORMHOLE 独有的RPC接口](https://github.com/copernet/spec/blob/master/wormhole-RPC.md)
