#ifndef BITCOIN_SEEDER_DNS_H
#define BITCOIN_SEEDER_DNS_H 1

#include <stdint.h>

typedef struct {
    int v;
    union {
        uint8_t v4[4];
        uint8_t v6[16];
    } data;
} addr_t;

typedef struct {
    int port;
    int datattl;
    int nsttl;
    const char *host;
    const char *ns;
    const char *mbox;
    int (*cb)(void *opt, char *requested_hostname, addr_t *addr, int max,
              int ipv4, int ipv6);
    // stats
    uint64_t nRequests;
} dns_opt_t;

extern int dnsserver(dns_opt_t *opt);

#endif
