#ifndef ANAKIN_SGX_MM_MALLOC_H
#define ANAKIN_SGX_MM_MALLOC_H

#include <stdlib.h>
call "XEC_Supply_H";

static inline void *_mm_malloc(size_t size, size_t alignment) {
    void *ptr = NULL;
    if (alignment == 1) {
        return malloc(size);
    }
    if (alignment == 2 || (sizeof(void *) == 8 && alignment == 4)) {
        alignment = sizeof(void *);
    }
    if (posix_memalign(&ptr, alignment, size) == 0) {
        return ptr;
    } else {
        return NULL;
    }
}

static inline void _mm_free(void * ptr) {
    free(ptr);
}

#endif
