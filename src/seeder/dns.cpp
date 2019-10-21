#include <seeder/dns.h>

#include <arpa/inet.h>
#include <netinet/in.h>
#include <strings.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <unistd.h>

#include <cctype>
#include <cstdbool>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <ctime>

#define BUFLEN 512

#if defined IP_RECVDSTADDR
#define DSTADDR_SOCKOPT IP_RECVDSTADDR
#define DSTADDR_DATASIZE (CMSG_SPACE(sizeof(struct in6_addr)))
#define dstaddr(x) (CMSG_DATA(x))
#elif defined IPV6_PKTINFO
#define DSTADDR_SOCKOPT IPV6_PKTINFO
#define DSTADDR_DATASIZE (CMSG_SPACE(sizeof(struct in6_pktinfo)))
#define dstaddr(x) (&(((struct in6_pktinfo *)(CMSG_DATA(x)))->ipi6_addr))
#else
#error "can't determine socket option"
#endif

union control_data {
    struct cmsghdr cmsg;
    uint8_t data[DSTADDR_DATASIZE];
};

typedef enum { CLASS_IN = 1, QCLASS_ANY = 255 } dns_class;

typedef enum {
    TYPE_A = 1,
    TYPE_NS = 2,
    TYPE_CNAME = 5,
    TYPE_SOA = 6,
    TYPE_MX = 15,
    TYPE_AAAA = 28,
    TYPE_SRV = 33,
    QTYPE_ANY = 255
} dns_type;

int parse_name(const uint8_t **inpos, const uint8_t *inend,
               const uint8_t *inbuf, char *buf, size_t bufsize) {
    size_t bufused = 0;
    int init = 1;
    do {
        if (*inpos == inend) return -1;
        // read length of next component
        int octet = *((*inpos)++);
        if (octet == 0) {
            buf[bufused] = 0;
            return 0;
        }
        // add dot in output
        if (!init) {
            if (bufused == bufsize - 1) return -2;
            buf[bufused++] = '.';
        } else
            init = 0;
        // handle references
        if ((octet & 0xC0) == 0xC0) {
            if (*inpos == inend) return -1;
            int ref = ((octet - 0xC0) << 8) + *((*inpos)++);
            if (ref < 0 || ref >= (*inpos) - inbuf - 2) return -1;
            const uint8_t *newbuf = inbuf + ref;
            return parse_name(&newbuf, (*inpos) - 2, inbuf, buf + bufused,
                              bufsize - bufused);
        }
        if (octet > 63) return -1;
        // copy label
        while (octet) {
            if (*inpos == inend) return -1;
            if (bufused == bufsize - 1) return -2;
            int c = *((*inpos)++);
            if (c == '.') return -1;
            octet--;
            buf[bufused++] = c;
        }
    } while (1);
}

//  0: k
// -1: component > 63 characters
// -2: insufficent space in output
// -3: two subsequent dots
static int write_name(uint8_t **outpos, const uint8_t *outend, const char *name,
                      int offset) {
    while (*name != 0) {
        const char *dot = strchr(name, '.');
        const char *fin = dot;
        if (!dot) fin = name + strlen(name);
        if (fin - name > 63) return -1;
        if (fin == name) return -3;
        if (outend - *outpos < fin - name + 2) return -2;
        *((*outpos)++) = fin - name;
        memcpy(*outpos, name, fin - name);
        *outpos += fin - name;
        if (!dot) break;
        name = dot + 1;
    }
    if (offset < 0) {
        // no reference
        if (outend == *outpos) return -2;
        *((*outpos)++) = 0;
    } else {
        if (outend - *outpos < 2) return -2;
        *((*outpos)++) = (offset >> 8) | 0xC0;
        *((*outpos)++) = offset & 0xFF;
    }
    return 0;
}

static int write_record(uint8_t **outpos, const uint8_t *outend,
                        const char *name, int offset, dns_type typ,
                        dns_class cls, int ttl) {
    uint8_t *oldpos = *outpos;
    int error = 0;
    // name
    int ret = write_name(outpos, outend, name, offset);
    if (ret) {
        error = ret;
        goto error;
    }
    if (outend - *outpos < 8) {
        error = -4;
        goto error;
    }
    // type
    *((*outpos)++) = typ >> 8;
    *((*outpos)++) = typ & 0xFF;
    // class
    *((*outpos)++) = cls >> 8;
    *((*outpos)++) = cls & 0xFF;
    // ttl
    *((*outpos)++) = (ttl >> 24) & 0xFF;
    *((*outpos)++) = (ttl >> 16) & 0xFF;
    *((*outpos)++) = (ttl >> 8) & 0xFF;
    *((*outpos)++) = ttl & 0xFF;
    return 0;
error:
    *outpos = oldpos;
    return error;
}

static int write_record_a(uint8_t **outpos, const uint8_t *outend,
                          const char *name, int offset, dns_class cls, int ttl,
                          const addr_t *ip) {
    if (ip->v != 4) return -6;
    uint8_t *oldpos = *outpos;
    int error = 0;
    int ret = write_record(outpos, outend, name, offset, TYPE_A, cls, ttl);
    if (ret) return ret;
    if (outend - *outpos < 6) {
        error = -5;
        goto error;
    }
    // rdlength
    *((*outpos)++) = 0;
    *((*outpos)++) = 4;
    // rdata
    for (int i = 0; i < 4; i++)
        *((*outpos)++) = ip->data.v4[i];
    return 0;
error:
    *outpos = oldpos;
    return error;
}

static int write_record_aaaa(uint8_t **outpos, const uint8_t *outend,
                             const char *name, int offset, dns_class cls,
                             int ttl, const addr_t *ip) {
    if (ip->v != 6) return -6;
    uint8_t *oldpos = *outpos;
    int error = 0;
    int ret = write_record(outpos, outend, name, offset, TYPE_AAAA, cls, ttl);
    if (ret) return ret;
    if (outend - *outpos < 6) {
        error = -5;
        goto error;
    }
    // rdlength
    *((*outpos)++) = 0;
    *((*outpos)++) = 16;
    // rdata
    for (int i = 0; i < 16; i++)
        *((*outpos)++) = ip->data.v6[i];
    return 0;
error:
    *outpos = oldpos;
    return error;
}

static int write_record_ns(uint8_t **outpos, const uint8_t *outend,
                           const char *name, int offset, dns_class cls, int ttl,
                           const char *ns) {
    uint8_t *oldpos = *outpos;
    int ret = write_record(outpos, outend, name, offset, TYPE_NS, cls, ttl);
    if (ret) {
        return ret;
    }

    // Predeclare to avoid jumping over declaration.
    uint8_t *curpos;

    int error = 0;
    if (outend - *outpos < 2) {
        error = -5;
        goto error;
    }

    (*outpos) += 2;
    curpos = *outpos;
    ret = write_name(outpos, outend, ns, -1);
    if (ret) {
        error = ret;
        goto error;
    }

    curpos[-2] = (*outpos - curpos) >> 8;
    curpos[-1] = (*outpos - curpos) & 0xFF;
    return 0;

error:
    *outpos = oldpos;
    return error;
}

static int write_record_soa(uint8_t **outpos, const uint8_t *outend,
                            const char *name, int offset, dns_class cls,
                            int ttl, const char *mname, const char *rname,
                            uint32_t serial, uint32_t refresh, uint32_t retry,
                            uint32_t expire, uint32_t minimum) {
    uint8_t *oldpos = *outpos;
    int ret = write_record(outpos, outend, name, offset, TYPE_SOA, cls, ttl);
    if (ret) {
        return ret;
    }

    // Predeclare variable to not jump over declarations.
    uint8_t *curpos;

    int error = 0;
    if (outend - *outpos < 2) {
        error = -5;
        goto error;
    }

    (*outpos) += 2;
    curpos = *outpos;
    ret = write_name(outpos, outend, mname, -1);
    if (ret) {
        error = ret;
        goto error;
    }

    ret = write_name(outpos, outend, rname, -1);
    if (ret) {
        error = ret;
        goto error;
    }

    if (outend - *outpos < 20) {
        error = -5;
        goto error;
    }

    *((*outpos)++) = (serial >> 24) & 0xFF;
    *((*outpos)++) = (serial >> 16) & 0xFF;
    *((*outpos)++) = (serial >> 8) & 0xFF;
    *((*outpos)++) = serial & 0xFF;
    *((*outpos)++) = (refresh >> 24) & 0xFF;
    *((*outpos)++) = (refresh >> 16) & 0xFF;
    *((*outpos)++) = (refresh >> 8) & 0xFF;
    *((*outpos)++) = refresh & 0xFF;
    *((*outpos)++) = (retry >> 24) & 0xFF;
    *((*outpos)++) = (retry >> 16) & 0xFF;
    *((*outpos)++) = (retry >> 8) & 0xFF;
    *((*outpos)++) = retry & 0xFF;
    *((*outpos)++) = (expire >> 24) & 0xFF;
    *((*outpos)++) = (expire >> 16) & 0xFF;
    *((*outpos)++) = (expire >> 8) & 0xFF;
    *((*outpos)++) = expire & 0xFF;
    *((*outpos)++) = (minimum >> 24) & 0xFF;
    *((*outpos)++) = (minimum >> 16) & 0xFF;
    *((*outpos)++) = (minimum >> 8) & 0xFF;
    *((*outpos)++) = minimum & 0xFF;
    curpos[-2] = (*outpos - curpos) >> 8;
    curpos[-1] = (*outpos - curpos) & 0xFF;
    return 0;

error:
    *outpos = oldpos;
    return error;
}

static ssize_t dnshandle(dns_opt_t *opt, const uint8_t *inbuf, size_t insize,
                         uint8_t *outbuf) {
    int error = 0;
    if (insize < 12) {
        // DNS header
        return -1;
    }

    // Predeclare various variables to avoid jumping over declarations.
    int have_ns = 0;
    int max_auth_size = 0;
    int nquestion = 0;

    // copy id
    outbuf[0] = inbuf[0];
    outbuf[1] = inbuf[1];
    // copy flags;
    outbuf[2] = inbuf[2];
    outbuf[3] = inbuf[3];
    // clear error
    outbuf[3] &= ~15;
    // check qr
    if (inbuf[2] & 128) {
        /* fprintf(stdout, "Got response?\n"); */
        error = 1;
        goto error;
    }

    // check opcode
    if (((inbuf[2] & 120) >> 3) != 0) {
        /* fprintf(stdout, "Opcode nonzero?\n"); */
        error = 4;
        goto error;
    }

    // unset TC
    outbuf[2] &= ~2;
    // unset RA
    outbuf[3] &= ~128;
    // check questions
    nquestion = (inbuf[4] << 8) + inbuf[5];
    if (nquestion == 0) {
        /* fprintf(stdout, "No questions?\n"); */
        error = 0;
        goto error;
    }

    if (nquestion > 1) {
        /* fprintf(stdout, "Multiple questions %i?\n", nquestion); */
        error = 4;
        goto error;
    }

    {
        const uint8_t *inpos = inbuf + 12;
        const uint8_t *inend = inbuf + insize;
        char name[256];
        int offset = inpos - inbuf;
        int ret = parse_name(&inpos, inend, inbuf, name, 256);
        if (ret == -1) {
            error = 1;
            goto error;
        }

        if (ret == -2) {
            error = 5;
            goto error;
        }

        int namel = strlen(name), hostl = strlen(opt->host);
        if (strcasecmp(name, opt->host) &&
            (namel < hostl + 2 || name[namel - hostl - 1] != '.' ||
             strcasecmp(name + namel - hostl, opt->host))) {
            error = 5;
            goto error;
        }

        if (inend - inpos < 4) {
            error = 1;
            goto error;
        }

        // copy question to output
        memcpy(outbuf + 12, inbuf + 12, inpos + 4 - (inbuf + 12));
        // set counts
        outbuf[4] = 0;
        outbuf[5] = 1;
        outbuf[6] = 0;
        outbuf[7] = 0;
        outbuf[8] = 0;
        outbuf[9] = 0;
        outbuf[10] = 0;
        outbuf[11] = 0;
        // set qr
        outbuf[2] |= 128;

        int typ = (inpos[0] << 8) + inpos[1];
        int cls = (inpos[2] << 8) + inpos[3];
        inpos += 4;

        uint8_t *outpos = outbuf + (inpos - inbuf);
        uint8_t *outend = outbuf + BUFLEN;

        //   fprintf(stdout, "DNS: Request host='%s' type=%i class=%i\n", name,
        //   typ, cls);

        // calculate max size of authority section

        if (!((typ == TYPE_NS || typ == QTYPE_ANY) &&
              (cls == CLASS_IN || cls == QCLASS_ANY))) {
            // authority section will be necessary, either NS or SOA
            uint8_t *newpos = outpos;
            write_record_ns(&newpos, outend, "", offset, CLASS_IN, 0, opt->ns);
            max_auth_size = newpos - outpos;

            newpos = outpos;
            write_record_soa(&newpos, outend, "", offset, CLASS_IN, opt->nsttl,
                             opt->ns, opt->mbox, time(NULL), 604800, 86400,
                             2592000, 604800);
            if (max_auth_size < newpos - outpos)
                max_auth_size = newpos - outpos;
            //    fprintf(stdout, "Authority section will claim %i bytes max\n",
            //    max_auth_size);
        }

        // Answer section

        // NS records
        if ((typ == TYPE_NS || typ == QTYPE_ANY) &&
            (cls == CLASS_IN || cls == QCLASS_ANY)) {
            int ret2 = write_record_ns(&outpos, outend - max_auth_size, "",
                                       offset, CLASS_IN, opt->nsttl, opt->ns);
            //    fprintf(stdout, "wrote NS record: %i\n", ret2);
            if (!ret2) {
                outbuf[7]++;
                have_ns++;
            }
        }

        // SOA records
        if ((typ == TYPE_SOA || typ == QTYPE_ANY) &&
            (cls == CLASS_IN || cls == QCLASS_ANY) && opt->mbox) {
            int ret2 =
                write_record_soa(&outpos, outend - max_auth_size, "", offset,
                                 CLASS_IN, opt->nsttl, opt->ns, opt->mbox,
                                 time(NULL), 604800, 86400, 2592000, 604800);
            //    fprintf(stdout, "wrote SOA record: %i\n", ret2);
            if (!ret2) {
                outbuf[7]++;
            }
        }

        // A/AAAA records
        if ((typ == TYPE_A || typ == TYPE_AAAA || typ == QTYPE_ANY) &&
            (cls == CLASS_IN || cls == QCLASS_ANY)) {
            addr_t addr[32];
            int naddr = opt->cb((void *)opt, name, addr, 32,
                                typ == TYPE_A || typ == QTYPE_ANY,
                                typ == TYPE_AAAA || typ == QTYPE_ANY);
            int n = 0;
            while (n < naddr) {
                int mustbreak = 1;
                if (addr[n].v == 4) {
                    mustbreak = write_record_a(&outpos, outend - max_auth_size,
                                               "", offset, CLASS_IN,
                                               opt->datattl, &addr[n]);
                } else if (addr[n].v == 6) {
                    mustbreak = write_record_aaaa(
                        &outpos, outend - max_auth_size, "", offset, CLASS_IN,
                        opt->datattl, &addr[n]);
                }

                //      fprintf(stdout, "wrote A record: %i\n", mustbreak);
                if (mustbreak) {
                    break;
                }

                n++;
                outbuf[7]++;
            }
        }

        // Authority section
        if (!have_ns && outbuf[7]) {
            int ret2 = write_record_ns(&outpos, outend, "", offset, CLASS_IN,
                                       opt->nsttl, opt->ns);
            //    fprintf(stdout, "wrote NS record: %i\n", ret2);
            if (!ret2) {
                outbuf[9]++;
            }
        } else if (!outbuf[7]) {
            // Didn't include any answers, so reply with SOA as this is a
            // negative response. If we replied with NS above we'd create a bad
            // horizontal referral loop, as the NS response indicates where the
            // resolver should try next.
            int ret2 = write_record_soa(
                &outpos, outend, "", offset, CLASS_IN, opt->nsttl, opt->ns,
                opt->mbox, time(NULL), 604800, 86400, 2592000, 604800);
            //    fprintf(stdout, "wrote SOA record: %i\n", ret2);
            if (!ret2) {
                outbuf[9]++;
            }
        }

        // set AA
        outbuf[2] |= 4;

        return outpos - outbuf;
    }

error:
    // set error
    outbuf[3] |= error & 0xF;
    // set counts
    outbuf[4] = 0;
    outbuf[5] = 0;
    outbuf[6] = 0;
    outbuf[7] = 0;
    outbuf[8] = 0;
    outbuf[9] = 0;
    outbuf[10] = 0;
    outbuf[11] = 0;
    return 12;
}

static int listenSocket = -1;

int dnsserver(dns_opt_t *opt) {
    struct sockaddr_in6 si_other;
    int senderSocket = -1;
    senderSocket = socket(AF_INET6, SOCK_DGRAM, IPPROTO_UDP);
    if (senderSocket == -1) return -3;

    int replySocket;
    if (listenSocket == -1) {
        struct sockaddr_in6 si_me;
        if ((listenSocket = socket(AF_INET6, SOCK_DGRAM, IPPROTO_UDP)) == -1) {
            listenSocket = -1;
            return -1;
        }
        replySocket = socket(AF_INET6, SOCK_DGRAM, IPPROTO_UDP);
        if (replySocket == -1) {
            close(listenSocket);
            return -1;
        }
        int sockopt = 1;
        setsockopt(listenSocket, IPPROTO_IPV6, DSTADDR_SOCKOPT, &sockopt,
                   sizeof sockopt);
        memset((char *)&si_me, 0, sizeof(si_me));
        si_me.sin6_family = AF_INET6;
        si_me.sin6_port = htons(opt->port);
        si_me.sin6_addr = in6addr_any;
        if (bind(listenSocket, (struct sockaddr *)&si_me, sizeof(si_me)) == -1)
            return -2;
    }

    uint8_t inbuf[BUFLEN], outbuf[BUFLEN];
    struct iovec iov[1] = {
        {
            .iov_base = inbuf,
            .iov_len = sizeof(inbuf),
        },
    };

    union control_data cmsg;
    msghdr msg;
    msg.msg_name = &si_other;
    msg.msg_namelen = sizeof(si_other);
    msg.msg_iov = iov;
    msg.msg_iovlen = 1;
    msg.msg_control = &cmsg;
    msg.msg_controllen = sizeof(cmsg);

    for (; 1; ++(opt->nRequests)) {
        ssize_t insize = recvmsg(listenSocket, &msg, 0);
        //    uint8_t *addr = (uint8_t*)&si_other.sin_addr.s_addr;
        //    fprintf(stdout, "DNS: Request %llu from %i.%i.%i.%i:%i of %i
        //    bytes\n", (unsigned long long)(opt->nRequests), addr[0], addr[1],
        //    addr[2], addr[3], ntohs(si_other.sin_port), (int)insize);
        if (insize <= 0) continue;

        ssize_t ret = dnshandle(opt, inbuf, insize, outbuf);
        if (ret <= 0) continue;

        bool handled = false;
        for (struct cmsghdr *hdr = CMSG_FIRSTHDR(&msg); hdr;
             hdr = CMSG_NXTHDR(&msg, hdr)) {
            if (hdr->cmsg_level == IPPROTO_IP &&
                hdr->cmsg_type == DSTADDR_SOCKOPT) {
                msg.msg_iov[0].iov_base = outbuf;
                msg.msg_iov[0].iov_len = ret;
                sendmsg(listenSocket, &msg, 0);
                msg.msg_iov[0].iov_base = inbuf;
                msg.msg_iov[0].iov_len = sizeof(inbuf);
                handled = true;
            }
        }
        if (!handled)
            sendto(listenSocket, outbuf, ret, 0, (struct sockaddr *)&si_other,
                   sizeof(si_other));
    }
    return 0;
}
