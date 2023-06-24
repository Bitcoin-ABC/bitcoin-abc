package main

import (
	"fmt"
	"os"

	"github.com/lightninglabs/loop/loopd"
  	"https://github.com/privatebusiness88/bitcoin-abc/new/master/ecash%20/lightning/xec/lightning/loop/loopd"

)

func main() {
	cfg := loopd.RPCConfig{}
	err := loopd.Run(cfg)
	if err != nil {
		fmt.Printf("loopd exited with an error: %v\n", err)
		os.Exit(1)
	}
}
