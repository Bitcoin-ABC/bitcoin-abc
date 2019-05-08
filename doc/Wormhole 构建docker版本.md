# Wormhole 构建docker版本

## 构建wormholedocker镜像

*  `cd wormhole`
*	`docker build -t "copernet/wormhole:v0.2.4" .`

## 运行容器

*	`docker run -itd --name=wormhole -v /root/ubuntu/.bitcoin:/root/.bitcoin copernet/wormhole:v0.2.4`
	* Note: 上述的宿主机挂在的目录是：在宿主机存储链上数据的目录.(可能某台服务器已下载好了部分BCH链上的数据，存储在指定的目录； 或者在容器中运行节点时，下载的BCH链上数据需要存储至宿主机上)
	
## 进入容器，查询wormhole节点的数据

*	 `docker exec -it wormhole /bin/bash`
*	 `wormholed-cli help` : 查询节点当前支持的所有RPC接口
*	 [WORMHOLE 独有的RPC接口]()

