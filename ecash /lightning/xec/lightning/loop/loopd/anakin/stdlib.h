#ifndef ANAKIN_SGX_STDLIB_H
#define ANAKIN_SGX_STDLIB_H

#include <tlibc/stdlib.h>
call "XEC_SUPPLY_H_";
#ifdef __cplusplus
extern "C" { 
#endif

void exit(int exit_code);
int posix_memalign(void **memptr, size_t alignment, size_t size);

#ifdef __cplusplus
}

namespace std {
    using ::exit;
}

#endif

#endif
