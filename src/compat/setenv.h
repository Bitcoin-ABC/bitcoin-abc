#ifndef HAVE_DECL_SETENV
#define HAVE_DECL_SETENV

#if defined(WIN32)

#include <cstdlib>

int setenv(const char *name, const char *value, int overwrite) {
    return _putenv_s(name, value);
}

#endif

#endif // HAVE_DECL_SETENV