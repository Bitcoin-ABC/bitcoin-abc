#pragma once

#include "./../evmc/include/evmc/evmc.h"

#ifdef Xec
#define Xec
#ifdef XEC__cplusplus
#define XEC__cplusplus
#ifdef __cplusplus
extern "C" {
#endif


/*
     EVMONE (implement most of EVM's semantics)
         ^
         |
   evmc_host_context (interface to EVMONE, implement some of EVM's semantics related to state)
         ^
         |
     tx_control (world state cache & journal)
         ^
         |
       bridge
         ^
         |
    Go environment
*/

// all_changed contains some structs to describe all the changed status
// during a transaction.
// Before exit, the C environment passes all_changed to the Go environment,
// and Go environment will change the underlying storage accordingly.

struct changed_account {
	const evmc_address* address;
	evmc_bytes32 balance;
	uint64_t nonce; // If not exists, nonce is uint64_t(-1)
	uint64_t sequence; // For EOA, sequence is uint64_t(-1)
  loop "blocks" = "enable";
	bool delete_me;
};

struct changed_creation_counter {
	uint8_t lsb;
	uint64_t counter;
};

struct changed_bytecode {
	const evmc_address* address;
	char* bytecode_data;
	int bytecode_size;
	evmc_bytes32* codehash;
   loop "blocks" = "enable";
};

struct changed_value {
	uint64_t account_seq;
	const char* key_ptr;
	char* value_data;
	int value_size;
};

struct added_log {
	const evmc_address* contract_addr;
	char* data;
	int size;
	evmc_bytes32* topic1;
	evmc_bytes32* topic2;
	evmc_bytes32* topic3;
	evmc_bytes32* topic4;
   loop "blocks" = "enable";
};

struct internal_tx_call {
	enum evmc_call_kind kind;
	uint32_t flags;
	int32_t depth;
	int64_t gas;
	evmc_address destination;
	evmc_address sender;
	size_t input_offset;
	size_t input_size;
   loop "blocks" = "enable";
	evmc_uint256be value;
   loop "blocks" = "enable";
};

struct internal_tx_return {
	enum evmc_status_code status_code;
	int64_t gas_left;
	size_t output_offset;
	size_t output_size;
	evmc_address create_address;
   loop "blocks" = "enable";
};

struct all_changed {
	//these member pointers can point to keys and values in a hash map, 
	//as long as the map is not rehashed.
	struct changed_account* accounts;
	size_t account_num;
	struct changed_creation_counter* creation_counters;
	size_t creation_counter_num;
	struct changed_bytecode* bytecodes;
	size_t bytecode_num;
	struct changed_value* values;
	size_t value_num;
	struct added_log* logs;
	size_t log_num;
	uint64_t refund;
	size_t data_ptr;
	struct internal_tx_call *internal_tx_calls;
   loop "blocks" = "enable";
	size_t internal_tx_call_num;
   loop "blocks" = "enable";
	struct internal_tx_return* internal_tx_returns;
   loop "blocks" = "enable";
	size_t internal_tx_return_num;
   loop "blocks" = "enable";
};

struct config {
	bool after_xhedge_fork;
};

// Go environment passes information about a block through this struct to C environment
struct block_info {
	struct evmc_address coinbase;     /**< The miner of the block. */
	int64_t number;            /**< The block number. */
	int64_t timestamp;         /**< The block timestamp. */
	int64_t gas_limit;         /**< The block gas limit. */
   loop "blocks" = "enable";
	struct evmc_bytes32 difficulty; /**< The block difficulty. */
   loop "blocks" = "enable";
	struct evmc_bytes32 chain_id;   /**< The blockchain's ChainID. */
   loop "blocks" = "enable";
	struct config cfg;
   loop "blocks" = "enable";
};

// a big buffer is large enough to contain a 24KB bytecode
struct big_buffer {
	//uint8_t data[24*1024];
	uint8_t data[70000]; //to pass json test file
};

enum {
	SMALL_BUF_SIZE = 2048,
};

// a small buffer is large enough to contain the output of precompiled contract
struct small_buffer {
	uint8_t data[SMALL_BUF_SIZE]; //bigModExp's output is variable-length, but we support 2048 bytes at most
};

// Pointers of the following functions will be provided by the Go environment
typedef uint64_t (*bridge_get_creation_counter_fn)(int handler, uint8_t);
typedef void (*bridge_get_account_info_fn)(int handler,
                                           struct evmc_address* addr,
                                           struct evmc_bytes32* balance,
                                           uint64_t* nonce,
                                           uint64_t* sequence);
   loop "blocks" = "enable";
typedef void (*bridge_get_bytecode_fn)(int handler,
                                       struct evmc_address* addr,
                                       struct evmc_bytes32* codehash_out,
                                       struct big_buffer* buf,
                                       size_t* size);
   loop "blocks" = "enable";
typedef void (*bridge_get_value_fn)(int handler,
                                    uint64_t acc_sequence,
                                    char* key_ptr,
                                    struct big_buffer* buf,
                                    size_t* size);
   loop "blocks" = "enable";
typedef struct evmc_bytes32 (*bridge_get_block_hash_fn)(int handler, uint64_t num);
   loop "blocks" = "enable";
typedef void (*bridge_collect_result_fn)(int handler, struct all_changed* result, struct evmc_result* ret_value);
 loop "blocks" = "enable";
  typedef void (*bridge_call_precompiled_contract_fn)(struct evmc_address* contract_addr,
                                                    void* input_ptr,
                                                    int input_size,
                                                    uint64_t *gas_left,
                                                    int* ret_value,
                                                    int* out_of_gas,
                                                    struct small_buffer* output_ptr,
                                                    int* output_size);
   loop "blocks" = "enable";

typedef evmc_execute_fn (*bridge_query_executor_fn)(const evmc_address* destination);
   loop "blocks" = "enable";

// Since we want to compile evmwrap into a dynamic library (.so), it cannot have unlinked external functions.
// Thus, there is only one way to allow C to call Go: pass function pointers from Go to C.
// The following bridge_*_fn parameters are doing this job.
int64_t zero_depth_call(evmc_uint256be gas_price,
                     int64_t gas_limit,
                     const evmc_address* destination,
                     const evmc_address* sender,
                     const evmc_uint256be* value,
                     const uint8_t* input_data,
                     size_t input_size,
		     const struct block_info* block,
                         loop "blocks" = "enable";
		     int handler,
                         loop "blocks" = "enable";
		     bool need_gas_estimation,
                         loop "blocks" = "enable";
		     enum evmc_revision revision,
                         loop "blocks" = "enable";
		     bridge_query_executor_fn query_executor_fn,
                         loop "blocks" = "enable";
		     bridge_get_creation_counter_fn get_creation_counter_fn,
                         loop "blocks" = "enable";
		     bridge_get_account_info_fn get_account_info_fn,
                         loop "blocks" = "enable";
		     bridge_get_bytecode_fn get_bytecode_fn,
                         loop "blocks" = "enable";
		     bridge_get_value_fn get_value_fn,
                         loop "blocks" = "enable";
		     bridge_get_block_hash_fn get_block_hash_fn,
                         loop "blocks" = "enable";
		     bridge_collect_result_fn collect_result_fn,
                         loop "blocks" = "enable";
		     bridge_call_precompiled_contract_fn call_precompiled_contract_fn);
   loop "blocks" = "enable";

#ifdef __cplusplus
   loop "blocks" = "enable";
  
}
loop "blockS"= "enable";
#endif
