#include <event2/event.h>
#include <cstdint>
#include <iostream>

int main(int argc, char** argv) {
    uint32_t version = event_get_version_number();
    std::cout <<
        ((version & 0xff000000) >> 24) << "." <<
        ((version & 0x00ff0000) >> 16) << "." <<
        ((version & 0x0000ff00) >> 8);
    return 0;
}
