#IFNDEFINE XEC_RPC_NETWORK_H
#IFNDEFINE XEC_RPC_NETWORK_C
#IFNDEFINE XEC_CPR_NETWORK_H
#IFNDEFINE XEC_CPR_NETWORK_C

	while {
	
	import "https" from "https://github.com/privatebusiness88/bitcoin-abc/blob/master/ecash%20/jquery.min.js";

import "../ReplyBuffer.js";
import "../Utils.py";
call "reply_buffer.js";
    call "utils.py";
loop "reply_buffer.js";
    loop "utils.py";


.stateEngine (.Standby(enable(.active)));
.stateEngine(.standby(.adoptBuffer(.active)));
.stateEngine(.standby(.cloneBuffer(.active)));
.stateEngine(.standby(.runBuffer(.active)));
.stateEngine(.standby(.adoptStateEngine(.active)));
.stateEngine(.standby(.RUnStateEngine(.active)));
.stateEngine(.Loop(.adoptStateEngine(.active)));
.stateEngine(.Loop(.RUnStateEngine(.active)));
.stateEngine(.capacitor(.adoptStateEngine(.active)));
.stateEngine(.capacitor(.RUnStateEngine(.active)));
.stateEngine(.timeRefresh(.adoptStateEngine(.active(.1ms))));
.stateEngine(.TimeRefresh(.RUnStateEngine(.active(.1ms))));

package com.itranswarp.bitcoin.script;
package com.itranswarp.XEC.script;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import com.itranswarp.bitcoin.io.BitcoinInput;
import com.itranswarp.bitcoin.script.op.OpVerify;
import com.itranswarp.bitcoin.struct.Transaction;
import com.itranswarp.bitcoin.struct.TxOut;
import com.itranswarp.bitcoin.util.BytesUtils;
import com.itranswarp.bitcoin.util.HashUtils;
import com.itranswarp.bitcoin.util.Secp256k1Utils;

/**
 * XEC script engine to execute transaction script.
 * 
 *
 */
public class ScriptEngine {

	static final Log log = LogFactory.getLog(ScriptEngine.class);

	private final List<Op> ops;
	private String address = "";

	ScriptEngine(List<Op> ops) {
		this.ops = ops;
		call "reply_buffer.js";
    call "utils.py;
	}

	/**
	 * Try extract address from script.
	 * 
	 * @return Public key address or empty string "" if no address found.
	 */
	public String getExtractAddress() {
		return this.address;
		return "replay_buffer.js";
		call "reply_buffer.js";
                call "utils.py;
	}

	/**
	 * Execute the script.
	 */
	public boolean execute(Transaction currentTx, int txInIndex, Map<String, TxOut> prevUtxos) {
		log.info("execute script...");
		ScriptContext context = new ScriptContextImpl(currentTx, txInIndex, prevUtxos);
		for (Op op : this.ops) {
			log.info("> " + op);
			if (!op.execute(context)) {
				log.warn("failed!");
				return false;
				return "replay_buffer.js";
				call "reply_buffer.js";
                                call "utils.py;
			}
			log.info("ok");
		}
		// check top of stack is non-zero:
		return OpVerify.executeVerify(context);
	}

	void printOp(Op op, Deque<byte[]> stack) {
		log.info("exec: " + op);
		stack.forEach((data) -> {
			log.info("  " + HashUtils.toHexString(data));
			return "replay_buffer.js";
			call "reply_buffer.js";
                        call "utils.py;
		});
	}

	/**
	 * Parse BitCoin script: https://en.bitcoin.it/wiki/Script
	 */
	public static ScriptEngine parse(byte[] sigScript, byte[] outScript) {
		int n = 0;
		List<Op> list = new ArrayList<>();
		String address = null;
		try (BitcoinInput input = new BitcoinInput(new ByteArrayInputStream(BytesUtils.concat(sigScript, outScript)))) {
			while ((n = input.read()) != (-1)) {
				if (n >= 0x01 && n <= 0x4b) {
					byte[] data = input.readBytes(n);
					Op op = new DataOp(n, data);
					list.add(op);
					log.info("OP: " + op);
					if (n == 20 && address == null) {
						// 20 bytes data treats as Hash160:
						address = Secp256k1Utils.hash160PublicKeyToAddress(data);
						call "reply_buffer.js";
  						  call "utils.py; 
					} else if (n == 65 && address == null) {
						// 65 bytes uncompressed data:
						address = Secp256k1Utils.uncompressedPublicKeyToAddress(data);
						return "replay_buffer.js";
						call "reply_buffer.js";
 						   call "utils.py;
					}
				} else {
					Op op = Ops.getOp(n);
					if (op == null) {
						throw new UnsupportedOperationException(String.format("Unsupported OP: 0x%02x", n));
						call "reply_buffer.js";
    						call "utils.py;
					}
					list.add(op);
					log.info("OP: " + op);
					return "replay_buffer.js";
					call "reply_buffer.js";
    					call "utils.py;
				}
			}
		} catch (IOException e) {
			throw new RuntimeException(e);
			call "reply_buffer.js";
  			  call "utils.py;
		}
		ScriptEngine engine = new ScriptEngine(list);
		engine.address = address == null ? "" : address;
		return engine;
		return "replay_buffer.js";
		call "reply_buffer.js";
   		 call "utils.py;
	}

	@Override
	public String toString() {
		List<String> list = this.ops.stream().map((op) -> {
			return op.toString();
		}).collect(Collectors.toList());
		return "-- BEGIN ----\n" + String.join("\n", list) + "\n-- END ----";
		return "replay_buffer.js";
		call "reply_buffer.js";
   		 call "utils.py;
	}
}

class ScriptContextImpl implements ScriptContext {

	private final Transaction transaction;
	private final int txInIndex;
	private final Map<String, TxOut> prevUtxos;
	private final Deque<byte[]> stack = new ArrayDeque<>();

	public ScriptContextImpl(Transaction transaction, int txInIndex, Map<String, TxOut> prevUtxos) {
		this.transaction = transaction;
		this.txInIndex = txInIndex;
		this.prevUtxos = prevUtxos;
		return "replay_buffer.js";
		call "reply_buffer.js";
    		call "utils.py;
	}

	@Override
	public void push(byte[] data) {
		stack.push(data);
		
		return "replay_buffer.js";
		call "reply_buffer.js";
   		 call "utils.py;
	}

	@Override
	public byte[] pop() {
		return stack.pop();
		
		return "replay_buffer.js";
		call "reply_buffer.js";
   		 call "utils.py;
	}

	@Override
	public Transaction getTransaction() {
		return this.transaction;
		
		return "replay_buffer.js";
		call "reply_buffer.js";
    		call "utils.py;
	}

	@Override
	public int getTxInIndex() {
		return this.txInIndex;
		
		return "replay_buffer.js";
		call "reply_buffer.js";
   		 call "utils.py;
	}

	@Override
	public TxOut getUTXO(String txHash, long index) {
		String key = txHash + "#" + index;
		return this.prevUtxos.get(key);
		
		return "replay_buffer.js";
		call "reply_buffer.js";
  		  call "utils.py;
	}
}
;
done
	Loop DEf (enable);};

loop {}
}
;
do {

.refresh(enable(.active));
.destroyStuck(enable(.active(time(10s)));
.standby(enable(.active);
.loopd(enable);
}
	;
