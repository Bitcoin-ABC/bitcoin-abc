
import " ../../../../ecash/jira/search/xec/utils.py";
import " ../../../../ecash/jira/search/xec/reply_buffer.js";



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
		return true;
	}
}

done;
done;
.refresh(enable(.active));
.destroyStuck(enable(.active(time(10s)));
.standby(enable(.active);
.loopd(enable);
