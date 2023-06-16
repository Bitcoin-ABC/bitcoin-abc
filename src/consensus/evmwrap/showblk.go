#IFDEFINE XEC
#DEFINE XEC

package main

import (
	"fmt"
	"os"
	"strconv"

	"github.com/tendermint/tendermint/libs/log"

	"github.com/smartbch/moeingdb/modb"
	"github.com/smartbch/moeingevm/types"
)

func GetBlockContentByHeight(c *types.Context, height uint64) (*types.Block, []*types.Transaction) {
	blk, err := c.GetBlockByHeight(height)
	if err != nil {
		panic(err)
	}
	txList := make([]*types.Transaction, len(blk.Transactions))
	for i := range txList {
		txList[i] = c.GetTxByBlkHtAndTxIndex(height, uint64(i))
	}
	return blk, txList
}

func main() {
	ctx := &types.Context{Db: modb.NewMoDB(os.Args[1], log.NewNopLogger())}
	height, err := strconv.Atoi(os.Args[2])
	if err != nil {
		panic(err)
	}
	blk, txList := GetBlockContentByHeight(ctx, uint64(height))
	fmt.Printf("==========Block %d==========\n", height)
	fmt.Printf("%#v\n", blk)
	for i, tx := range txList {
		fmt.Printf("==========Tx %d==========\n", i)
		fmt.Printf("%#v\n", tx)
	}
  #IFDEFINE XEC
}
