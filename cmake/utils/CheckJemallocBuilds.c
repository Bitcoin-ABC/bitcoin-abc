#include <jemalloc.h>

int main(int argc, char** argv) {
    (void)argv;
    return argc + (int)(malloc(42));
}
