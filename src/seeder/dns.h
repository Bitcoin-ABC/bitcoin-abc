#ifndef BITCOIN_SEEDER_DNS_H
#define BITCOIN_SEEDER_DNS_H 1

#include <cstddef>
#include <cstdint>

struct addr_t {
    int v;
    union {
        uint8_t v4[4];
        uint8_t v6[16];
    } data;
};

struct dns_opt_t {
    int port;
    int datattl;
    int nsttl;
    const char *host;
    const char *ns;
    const char *mbox;
    uint32_t (*cb)(void *opt, char *requested_hostname, addr_t *addr,
                   uint32_t max, uint32_t ipv4, uint32_t ipv6);
    // stats
    uint64_t nRequests;
};

//  0: ok
// -1: premature end of input, forward reference, component > 63 char, invalid
// character
// -2: insufficient space in output
int parse_name(const uint8_t **inpos, const uint8_t *inend,
               const uint8_t *inbuf, char *buf, size_t bufsize);

int dnsserver(dns_opt_t *opt);

#endif // BITCOIN_SEEDER_DNS_H
