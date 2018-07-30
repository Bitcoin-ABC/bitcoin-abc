

## RPC 的业务整理
name        |  callfunction | param | return value  |
---- |  ---| ---- | --- | 
`listblocktransactions_MP` | `whc_listblocktransactions` | 指定的块高度 | 列出指定块号的区块，包含的所有omni交易的哈希列表
`whc_listpendingtransactions` | `whc_listpendingtransactions` | 可选的过滤地址 |  列出系统中还在交易池的所有/过滤地址相关的omni详细信息列表
`whc_getpayload` | `whc_getpayload` | 交易哈希 | 返回指定交易的omni数据结果，对于非omni交易，抛异常
`getsto_MP` | `whc_getsto` | 指定的空投交易哈希 |   |
`getcrowdsale_MP` | `whc_getcrowdsale` | 参1：众筹资产ID，参2：可选，是否获取参与者的详细信息|  返回指定众筹资产的详细信息；对于非众筹的资产，直接报错|
`getgrants_MP` | `whc_getgrants` | 管理资产的ID | 返回管理资产的所有信息，包括增发和销毁的历史数据。
`getproperty_MP` | `whc_getproperty` | 资产ID | 返回资产的所有基础信息 |
`whc_createpayload_issuancefixed` | `whc_createpayload_issuancefixed` | 参1:生态体系；参2: Token类型；参3: 是否为派生资产; 参4: 资产的自定义类别; 参5: 资产的子类别；参6: 资产的名称；参7: 资产的官网；参8: 新资产的描述数据；参9：发行的资产总金额| omni协议序列化后的数据 |
`whc_createpayload_issuancecrowdsale` | `whc_createpayload_issuancecrowdsale` | 前8个参数，与上述相同；参9: 期望参与者使用的Token；参10: 期望资产与众筹资产的兑换比例；参11: 众筹的截止时间；参12: 参与者的早鸟奖励； 参13: 按参与者购买的数量，授予发行者代币的比例| omni协议序列化后的数据 |
`whc_createpayload_issuancemanaged`|`whc_createpayload_issuancemanaged`|该RPC8个参数，与上述前8个参数意义相同| omni协议序列化后的数据 |
`whc_createpayload_burnbch` |  `whc_createpayload_burnbch` |  无 | 创建基础货币的载荷数据
`whc_createpayload_simplesend` | `whc_createpayload_simplesend` | 参1: 资产ID； 参2: 转账的Token数量| 创建发送货币的omni载荷数据|
`whc_createpayload_grant` | `whc_createpayload_grant` | 参1:增发的资产ID；参2:增发的金额；参3:增发的原因(可选) | omni协议序列化后的数据
`whc_createpayload_revoke` | `whc_createpayload_revoke` | 参1:销毁的资产ID；参2:销毁的金额；参3:销毁的原因(可选) | omni协议序列化后的数据
`whc_createpayload_sto`| `whc_createpayload_sto` | 参1: 将要进行空投的资产ID；参2: 进行空投的金额；参3: 给哪种资产的持有人进行空投| omni协议序列化后的数据|
`whc_createpayload_sendall` | `whc_createpayload_sendall`|参数1:资产的生态 |omni协议序列化后的数据 |
`whc_createpayload_changeissuer` | `whc_createpayload_changeissuer` |参1:资产ID | omni协议序列化后的数据|
`whc_createrawtx_input` |`whc_createrawtx_input` |向参1所在的交易添加一个交易输入；参1: 16进制的未签名交易(可以传空字符串); 参2:txid; 参3:输出索引 | 添加交易输入后的未签名交易的16进制数据|
`whc_createrawtx_reference` | `whc_createrawtx_reference` | 向参1所在的交易添加一个输出；参1: 16进制的未签名交易(可以传空字符串)；参2: 输出的目的地址；参3: 指定的输出金额(可选)| 添加交易输出后的未签名交易的16进制数据|
`whc_createrawtx_opreturn` | `whc_createrawtx_opreturn` | 添加一个omni C类交易输出至参1所在的交易；参1: 16进制的未签名交易(可以传空字符串)； 参2: 将要添加至输出的C类载荷数据 | 添加交易输出后的未签名交易的16进制数据|
`whc_createrawtx_change` | `whc_createrawtx_change` | 添加一个输出，一般用来添加一个找零输出；参1:未签名的交易；参2:该交易所使用的交易输入；参3: 添加输出的锁定脚本；参4: 参1交易期望的交易费；参5: 该找零输出期望插入的位置；| 添加交易输出后的未签名交易的16进制数据|
`whc_burnbchgetwhc`|`whc_burnbchgetwhc`|参1:燃烧的BCH金额；参2:多余的赎回资金地址(可选)|生成的获取WHC的交易哈希|
`whc_send`|`whc_send`|参1:发送者地址；参2:接收者地址；参3:要发送的资产ID；参4:发送的Token数量；参5:多余的sh|生成的转账交易哈希|
`whc_sendall`|`whc_sendall`|参1:发送者地址；参2:接收者地址；参3:生态体系(强制为1)|生成的转账交易哈希|
`whc_sendrawtx`| `whc_sendrawtx`|**注意:本RPC不可以用来操作燃烧BCH获取WHC**。参1:发送者地址；参2:wormhole协议载荷数据；参3:接收者地址；参4:赎回BCH的地址；参5:给接收者地址的金额| 生成的wormhole交易的ID|
`whc_sendissuancecrowdsale`|`whc_sendissuancecrowdsale`|与上述`whc_createpayload_issuancecrowdsale`参数列表相同|生成的创建众筹资产的交易哈希|
`whc_sendissuancefixed`|`whc_sendissuancefixed`|与上述`whc_createpayload_issuancefixed`参数列表相同|生成的创建固定资产的交易哈希|
`whc_sendissuancemanaged`|`whc_sendissuancemanaged`|与上述`whc_createpayload_issuancefixed`参数列表相同| 生成的创建可管理资产的交易哈希|
`whc_sendchangeissuer`|`whc_sendchangeissuer`|参1:原资产的发行者；参2:将拥有该资产的所有者；参3:转移的资产ID|生成的转移资产所有者的交易哈希|
`whc_sendclosecrowdsale`|`whc_sendclosecrowdsale`|参1:资产的发行者； 参2:资产ID|生成的关闭众筹的交易哈希|
`whc_sendgrant`|`whc_sendgrant`|参1:资产的发行者；参2:给指定的地址增发金额；参3:资产ID；参4:增发的金额；参5:增发原因(可选)|生成的增发交易的哈希|
`whc_sendrevoke`|`whc_sendrevoke`|参1:资产的发行者；参2:资产ID；参3:销毁的金额；参4:销毁原因(可选)|生成的销毁资金交易哈希|
`whc_sendsto`|`whc_sendsto`|参1:空投发行人的地址；参2:空投的资产ID；参3:空投的金额；参4:赎回的BCH的地址(可选)；参5:给某种资产的持有人进行空投(可选)|生成的空投交易哈希|

## WormHole 查询RPC
name        |  callfunction | param | return value  |
----|----|----|----|----|
`whc_decodetransaction`|`whc_decodetransaction`|参1:交易的原始数据；|WormHole的数据解析
`whc_gettransaction`|`whc_gettransaction`|txid|WormHole的数据解析；如果该交易被确认，会返回执行结果；

## RPC的调用流程
### 燃烧BCH，获取基础货币RPC调用流程
1. 添加交易输入：   `wormholed-cli whc_createrawtx_input `
2. 创建输出，向指定的燃烧地址打币： `wormholed-cli whc_createrawtx_reference`
3. 创建燃烧BCH的omni载荷数据：  `wormholed-cli whc_createpayload_burnbch`
4. 创建输出，将创建的omni载荷数据添加进交易输出： `wormholed-cli whc_createrawtx_opreturn`
5. 创建输出，进行找零： `wormholed-cli whc_createrawtx_reference` 
6. 对创建的交易进行签名：`wormholed-cli signrawtransaction`
7. 发送交易：`wormholed-cli sendrawtransaction`

### 转币
1. 添加交易输入：   `wormholed-cli whc_createrawtx_input `
2. 创建发送Token的载荷数据：    `wormholed-cli whc_createpayload_simplesend`
3. 创建交易输出，将创建的omni载荷数据添加进交易输出：   `wormholed-cli whc_createrawtx_opreturn`
4. 创建输出，进行找零：`wormholed-cli whc_createrawtx_reference`
5. 创建输出，将Token转入该地址：`wormholed-cli whc_createrawtx_reference`
6. 对创建的交易进行签名：`wormholed-cli signrawtransaction`
7. 发送交易：`wormholed-cli sendrawtransaction`

### 转移所有的资产
1. 添加交易输入：   `wormholed-cli whc_createrawtx_input `
2. 创建发送Token的载荷数据：    `wormholed-cli whc_createpayload_sendall`
3. 创建交易输出，将创建的omni载荷数据添加进交易输出：   `wormholed-cli whc_createrawtx_opreturn`
4. 创建输出，进行找零：`wormholed-cli whc_createrawtx_reference`（这步可以省略）
5. 创建输出，将Token转入该地址：`wormholed-cli whc_createrawtx_reference`
6. 对创建的交易进行签名：`wormholed-cli signrawtransaction`
7. 发送交易：`wormholed-cli sendrawtransaction`

### 创建固定数量的Token资产
1. 添加交易输入：   `wormholed-cli whc_createrawtx_input `
2. 生成创建固定资产的载荷数据： `wormholed-cli whc_createpayload_issuancefixed`
3. 创建交易输出，将创建的omni载荷数据添加进交易输出：   `wormholed-cli whc_createrawtx_opreturn`
4. 创建输出，进行找零：`wormholed-cli whc_createrawtx_reference`
结果：此时创建新资产会在 第一个交易输入的地址上(即：在第一步引入)。
6. 对创建的交易进行签名：`wormholed-cli signrawtransaction`
7. 发送交易：`wormholed-cli sendrawtransaction`

### 创建众筹资产
1. 添加交易输入：   `wormholed-cli whc_createrawtx_input `
2. 生成创建众筹资产的载荷数据： `wormholed-cli whc_createpayload_issuancecrowdsale`
3. 创建交易输出，将创建的omni载荷数据添加进交易输出：   `wormholed-cli whc_createrawtx_opreturn`
4. 创建输出，进行找零：`wormholed-cli whc_createrawtx_reference`
结果：此时创建新资产会在 第一个交易输入的地址上(即：在第一步引入)。
6. 对创建的交易进行签名：`wormholed-cli signrawtransaction`
7. 发送交易：`wormholed-cli sendrawtransaction`

### 关闭众筹资产
1. 添加交易输入：   `wormholed-cli whc_createrawtx_input `
2. 生成创建众筹资产的载荷数据： `wormholed-cli whc_createpayload_closecrowdsale`
3. 创建交易输出，将创建的omni载荷数据添加进交易输出：   `wormholed-cli whc_createrawtx_opreturn`
4. 创建输出，进行找零：`wormholed-cli whc_createrawtx_reference`
6. 对创建的交易进行签名：`wormholed-cli signrawtransaction`
7. 发送交易：`wormholed-cli sendrawtransaction`

### 创建可管理资产
1. 添加交易输入：   `wormholed-cli whc_createrawtx_input `
2. 生成创建可管理资产的载荷数据： `wormholed-cli whc_createpayload_issuancemanaged`
3. 创建交易输出，将创建的omni载荷数据添加进交易输出：   `wormholed-cli whc_createrawtx_opreturn`
4. 创建输出，进行找零：`wormholed-cli whc_createrawtx_reference`
结果：此时创建新资产会在 第一个交易输入的地址上(即：在第一步引入)。
6. 对创建的交易进行签名：`wormholed-cli signrawtransaction`
7. 发送交易：`wormholed-cli sendrawtransaction`

### 增发资产
1. 添加交易输入：   `wormholed-cli whc_createrawtx_input `
2. 生成创建可管理资产的载荷数据： `wormholed-cli whc_createpayload_grant`
3. 创建交易输出，将创建的omni载荷数据添加进交易输出：   `wormholed-cli whc_createrawtx_opreturn`
4. 创建输出，进行找零：`wormholed-cli whc_createrawtx_reference`
6. 对创建的交易进行签名：`wormholed-cli signrawtransaction`
7. 发送交易：`wormholed-cli sendrawtransaction`

### 销毁资产
1. 添加交易输入：   `wormholed-cli whc_createrawtx_input `
2. 生成创建可管理资产的载荷数据： `wormholed-cli whc_createpayload_revoke `
3. 创建交易输出，将创建的omni载荷数据添加进交易输出：   `wormholed-cli whc_createrawtx_opreturn`
4. 创建输出，进行找零：`wormholed-cli whc_createrawtx_reference`
6. 对创建的交易进行签名：`wormholed-cli signrawtransaction`
7. 发送交易：`wormholed-cli sendrawtransaction`

### 进行空投
1. 添加交易输入：   `wormholed-cli whc_createrawtx_input `(注意：第一个输入必须含有足够的空投资产)
2. 生成创建可管理资产的载荷数据： `wormholed-cli whc_createpayload_sto`
3. 创建交易输出，将创建的omni载荷数据添加进交易输出：   `wormholed-cli whc_createrawtx_opreturn`
4. 创建输出，进行找零：`wormholed-cli whc_createrawtx_reference`
6. 对创建的交易进行签名：`wormholed-cli signrawtransaction`
7. 发送交易：`wormholed-cli sendrawtransaction`

### 更改资产发行者
1. 添加交易输入：   `wormholed-cli whc_createrawtx_input `(注意：第一个输入必须为资产的发行地址)
2. 生成创建可管理资产的载荷数据： `wormholed-cli whc_createpayload_changeissuer`
3. 创建交易输出，将创建的omni载荷数据添加进交易输出：   `wormholed-cli whc_createrawtx_opreturn`
4. 创建输出，进行找零：`wormholed-cli whc_createrawtx_reference`
5. 创建资产接收者输出：`wormholed-cli whc_createrawtx_reference`
6. 对创建的交易进行签名：`wormholed-cli signrawtransaction`
7. 发送交易：`wormholed-cli sendrawtransaction`


## 查询使用的RPC
`wormholed-cli getrawtransaction "txid"`: 获取指定交易哈希的16进制交易数据
`wormholed-cli decoderawtransaction "rawtx"`: 对获取到的16进制数据进行解码
`wormholed-cli signrawtransaction "rawtx"`: 对原始交易进行签名
`wormholed-cli sendrawtransaction "rawtx"`: 发送签名后的交易
`wormholed-cli listunspent (成熟度0, 1 ...)`: 列出当前钱包中可以使用的所有资金
`wormholed-cli whc_gettransaction "txid"`: 获取omni交易的解析
`wormholed-cli whc_getbalance  "address" propertyID `: 获取指定地址指定资产的余额
`wormholed-cli  getproperty_MP propertyID`: 列写omni系统中指定资产的基础信息
`wormholed-cli listblocktransactions_MP height`: 列出某个块高度含有的所有omni交易
`wormholed-cli whc_listpendingtransactions`: 列出当前节点的交易池中所有未确认的omni交易
`wormholed-cli whc_getpayload "txid"`: 返回指定omni交易的载荷数据
`wormholed-cli getsto_MP "txid" "*"`: 列出指定空投交易的所有参与者，以及金额信息
`wormholed-cli getgrants_MP propertyID`: 返回指定的管理资产的增发/销毁信息

## 测试的部分交易
1. 获取基础货币：53d2d2701bdca225ae4486e72854369a09499a0555c22ef1936c02924fe901cb
2. 转账：d9dd78f140691dd946175696bd312dfcfac4c5cc5c4f5eb1143dfde0db83c25e
3. 转账：2e66312a5bc2c5f984ae53f382b43ac070ff8fd3450ca6d162495b43bbbf3e90
4. 空投：9bb8eb45e5b3ba4059c38409a225216f3aaae990f07d2541f1c09571862b99d2
5. 创建可管理的资产：b85ffb2d38339b4432cd8dfe50861e05376665f1ffe08c4824dea934aadb20e1



