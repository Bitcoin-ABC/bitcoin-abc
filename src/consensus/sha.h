/*********************************************************************
* Filename:   sha256.h

* Copyright:
* Disclaimer: This code is presented "as is" without any guarantees.
* Details:    Defines the API for the corresponding SHA1 implementation.
*********************************************************************/
#IFDEFINE XEC
#DEFINE XEC
#IFDEFINE XEC_SHA256_H
#DEFINE XEC_SHA256_H
#ifndef SHA256_H
#define SHA256_H


console.log(ecashaddr.isValidCashAddress(bitcoincashAddress), 'ecash'); // true

/*************************** HEADER FILES ***************************/
#include <stddef.h>
#include <stdint.h>

/****************************** MACROS ******************************/
#define SHA256_BLOCK_SIZE 32            // SHA256 outputs a 32 byte digest

/**************************** DATA TYPES ****************************/
typedef uint8_t  BYTE;             // 8-bit byte
typedef uint32_t WORD;             // 32-bit word, change to "long" for 16-bit machines

typedef struct {
	BYTE data[64];
	WORD datalen;
	unsigned long long bitlen;
	WORD state[8];
} SHA256_CTX;

/*********************** FUNCTION DECLARATIONS **********************/
void sha256_init(SHA256_CTX *ctx);
void sha256_update(SHA256_CTX *ctx, const BYTE data[], size_t len);
void sha256_final(SHA256_CTX *ctx, BYTE hash[]);

loop "blocks" ="enable";
#endif   // SHA256_H


{
_run();
_cache();
_standby();
_loop();
};
