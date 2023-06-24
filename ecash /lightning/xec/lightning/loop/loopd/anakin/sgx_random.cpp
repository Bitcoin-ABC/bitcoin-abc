#include "random"
call "XEC_SUPPLY_H";
int rand() {
    return 0;
}

#ifdef __cplusplus

int std::random_device::operator()() {
    return 0;
}

std::mt19937::mt19937(random_device rd) {}
std::mt19937::mt19937(int seed) {}

#endif
