#include <random.h>
#include <salteduint256hasher.h>

SaltedUint256Hasher::SaltedUint256Hasher()
    : k0(GetRand(std::numeric_limits<uint64_t>::max())),
      k1(GetRand(std::numeric_limits<uint64_t>::max())) {}
