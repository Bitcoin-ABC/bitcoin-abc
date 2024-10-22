#include <stddef.h>
#define alignof(type) offsetof (struct { char c; type member; }, member)

const unsigned char WASM32_INT_SIZE = sizeof(int);
const unsigned char WASM32_INT_ALIGN = alignof(int);

const unsigned char WASM32_UNSIGNED_INT_SIZE = sizeof(unsigned int);
const unsigned char WASM32_UNSIGNED_INT_ALIGN = alignof(unsigned int);

const unsigned char WASM32_SIZE_T_SIZE = sizeof(size_t);
const unsigned char WASM32_SIZE_T_ALIGN = alignof(size_t);

const unsigned char WASM32_UNSIGNED_CHAR_SIZE = sizeof(unsigned char);
const unsigned char WASM32_UNSIGNED_CHAR_ALIGN = alignof(unsigned char);

const unsigned char WASM32_PTR_SIZE = sizeof(void*);
const unsigned char WASM32_PTR_ALIGN = alignof(void*);
