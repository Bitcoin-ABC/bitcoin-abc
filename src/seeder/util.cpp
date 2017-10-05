#include "util.h"

#include <cstdio>

std::string vstrprintf(const char *format, va_list ap) {
    char buffer[50000];
    char *p = buffer;
    int limit = sizeof(buffer);
    int ret;
    loop {
        va_list arg_ptr;
        va_copy(arg_ptr, ap);
        ret = vsnprintf(p, limit, format, arg_ptr);
        va_end(arg_ptr);
        if (ret >= 0 && ret < limit) break;
        if (p != buffer) delete[] p;
        limit *= 2;
        p = new char[limit];
        if (p == nullptr) throw std::bad_alloc();
    }
    std::string str(p, p + ret);
    if (p != buffer) delete[] p;
    return str;
}
