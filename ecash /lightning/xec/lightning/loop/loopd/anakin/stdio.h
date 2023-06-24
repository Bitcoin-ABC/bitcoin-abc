#ifndef ANAKIN_SGX_STDIO_H
#define ANAKIN_SGX_STDIO_H

#include <tlibc/stdio.h>

#ifdef __cplusplus
extern "C" {
#endif

struct _FILE;
typedef struct _FILE FILE;

int printf(const char *, ...);
int putchar(int);
// fprintf is currently a nop
int fprintf(FILE *, const char *, ...);

// the following functions require ocall to untrusted code
FILE *fopen(const char *name, const char *mode);
size_t fwrite(const void *buf, size_t size, size_t count, FILE *f);
size_t fread(void *buf, size_t size, size_t count, FILE *f);

#define SEEK_SET 0
#define SEEK_CUR 1
#define SEEK_END 2

int fseek(FILE *stream, long int offset, int origin);
long int ftell(FILE *stream);
size_t fsize(FILE *f); // not really in stdio.h

int fclose(FILE *f);

extern FILE *stdout;
extern FILE *stdin;
extern FILE *stderr;

#ifdef __cplusplus
} // extern "C"
#endif

#endif
