#include <jemalloc.h>

int main(int argc, char** argv) {
    void *volatile dummyPtr = malloc(42);
    (void)argv;
    return argc;
}
