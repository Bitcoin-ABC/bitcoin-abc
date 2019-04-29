#include "bitcoin.h"

#include "db.h"
#include "hash.h"
#include "netbase.h"
#include "serialize.h"
#include "streams.h"
#include "uint256.h"

#include <algorithm>

// Weither we are on testnet or mainnet.
bool fTestNet;

// The network magic to use.
CMessageHeader::MessageMagic netMagic = {{0xe3, 0xe1, 0xf3, 0xe8}};

#define BITCOIN_SEED_NONCE 0x0539a019ca550825ULL

static const uint32_t allones(-1);

class CSeederNode {
    SOCKET sock;
    CDataStream vSend;
    CDataStream vRecv;
    uint32_t nHeaderStart;
    uint32_t nMessageStart;
    int nVersion;
    std::string strSubVer;
    int nStartingHeight;
    std::vector<CAddress> *vAddr;
    int ban;
    int64_t doneAfter;
    CAddress you;

    int GetTimeout() { return you.IsTor() ? 120 : 30; }

    void BeginMessage(const char *pszCommand) {
        if (nHeaderStart != allones) {
            AbortMessage();
        }
        nHeaderStart = vSend.size();
        vSend << CMessageHeader(netMagic, pszCommand, 0);
        nMessageStart = vSend.size();
        // printf("%s: SEND %s\n", ToString(you).c_str(), pszCommand);
    }

    void AbortMessage() {
        if (nHeaderStart == allones) {
            return;
        }
        vSend.resize(nHeaderStart);
        nHeaderStart = allones;
        nMessageStart = allones;
    }

    void EndMessage() {
        if (nHeaderStart == allones) {
            return;
        }
        uint32_t nSize = vSend.size() - nMessageStart;
        memcpy((char *)&vSend[nHeaderStart] +
                   offsetof(CMessageHeader, nMessageSize),
               &nSize, sizeof(nSize));
        if (vSend.GetVersion() >= 209) {
            uint256 hash = Hash(vSend.begin() + nMessageStart, vSend.end());
            unsigned int nChecksum = 0;
            memcpy(&nChecksum, &hash, sizeof(nChecksum));
            assert(nMessageStart - nHeaderStart >=
                   offsetof(CMessageHeader, pchChecksum) + sizeof(nChecksum));
            memcpy((char *)&vSend[nHeaderStart] +
                       offsetof(CMessageHeader, pchChecksum),
                   &nChecksum, sizeof(nChecksum));
        }
        nHeaderStart = allones;
        nMessageStart = allones;
    }

    void Send() {
        if (sock == INVALID_SOCKET) {
            return;
        }
        if (vSend.empty()) {
            return;
        }
        int nBytes = send(sock, &vSend[0], vSend.size(), 0);
        if (nBytes > 0) {
            vSend.erase(vSend.begin(), vSend.begin() + nBytes);
        } else {
            close(sock);
            sock = INVALID_SOCKET;
        }
    }

    void PushVersion() {
        int64_t nTime = time(nullptr);
        uint64_t nLocalNonce = BITCOIN_SEED_NONCE;
        int64_t nLocalServices = 0;
        CService myService;
        CAddress me(myService, ServiceFlags(NODE_NETWORK | NODE_BITCOIN_CASH));
        BeginMessage("version");
        int nBestHeight = GetRequireHeight();
        std::string ver = "/bitcoin-cash-seeder:0.15/";
        vSend << PROTOCOL_VERSION << nLocalServices << nTime << you << me
              << nLocalNonce << ver << nBestHeight;
        EndMessage();
    }

    void GotVersion() {
        // printf("\n%s: version %i\n", ToString(you).c_str(), nVersion);
        if (vAddr) {
            BeginMessage("getaddr");
            EndMessage();
            doneAfter = time(nullptr) + GetTimeout();
        } else {
            doneAfter = time(nullptr) + 1;
        }
    }

    bool ProcessMessage(std::string strCommand, CDataStream &recv) {
        // printf("%s: RECV %s\n", ToString(you).c_str(), strCommand.c_str());
        if (strCommand == "version") {
            int64_t nTime;
            CAddress addrMe;
            CAddress addrFrom;
            uint64_t nNonce = 1;
            uint64_t nServiceInt;
            recv >> nVersion >> nServiceInt >> nTime >> addrMe;
            you.nServices = ServiceFlags(nServiceInt);
            if (nVersion == 10300) nVersion = 300;
            if (nVersion >= 106 && !recv.empty()) recv >> addrFrom >> nNonce;
            if (nVersion >= 106 && !recv.empty()) recv >> strSubVer;
            if (nVersion >= 209 && !recv.empty()) recv >> nStartingHeight;

            if (nVersion >= 209) {
                BeginMessage("verack");
                EndMessage();
            }
            vSend.SetVersion(std::min(nVersion, PROTOCOL_VERSION));
            if (nVersion < 209) {
                vRecv.SetVersion(std::min(nVersion, PROTOCOL_VERSION));
                GotVersion();
            }
            return false;
        }

        if (strCommand == "verack") {
            vRecv.SetVersion(std::min(nVersion, PROTOCOL_VERSION));
            GotVersion();
            return false;
        }

        if (strCommand == "addr" && vAddr) {
            std::vector<CAddress> vAddrNew;
            recv >> vAddrNew;
            // printf("%s: got %i addresses\n", ToString(you).c_str(),
            //        (int)vAddrNew.size());
            int64_t now = time(nullptr);
            std::vector<CAddress>::iterator it = vAddrNew.begin();
            if (vAddrNew.size() > 1) {
                if (doneAfter == 0 || doneAfter > now + 1) doneAfter = now + 1;
            }
            while (it != vAddrNew.end()) {
                CAddress &addr = *it;
                // printf("%s: got address %s\n", ToString(you).c_str(),
                //        addr.ToString().c_str(), (int)(vAddr->size()));
                it++;
                if (addr.nTime <= 100000000 || addr.nTime > now + 600) {
                    addr.nTime = now - 5 * 86400;
                }
                if (addr.nTime > now - 604800) {
                    vAddr->push_back(addr);
                }
                // printf("%s: added address %s (#%i)\n", ToString(you).c_str(),
                //        addr.ToString().c_str(), (int)(vAddr->size()));
                if (vAddr->size() > 1000) {
                    doneAfter = 1;
                    return true;
                }
            }
            return false;
        }

        return false;
    }

    bool ProcessMessages() {
        if (vRecv.empty()) {
            return false;
        }

        do {
            CDataStream::iterator pstart = std::search(
                vRecv.begin(), vRecv.end(), BEGIN(netMagic), END(netMagic));
            uint32_t nHeaderSize = GetSerializeSize(
                CMessageHeader(netMagic), vRecv.GetType(), vRecv.GetVersion());
            if (vRecv.end() - pstart < nHeaderSize) {
                if (vRecv.size() > nHeaderSize) {
                    vRecv.erase(vRecv.begin(), vRecv.end() - nHeaderSize);
                }
                break;
            }
            vRecv.erase(vRecv.begin(), pstart);
            std::vector<char> vHeaderSave(vRecv.begin(),
                                          vRecv.begin() + nHeaderSize);
            CMessageHeader hdr(netMagic);
            vRecv >> hdr;
            if (!hdr.IsValidWithoutConfig(netMagic)) {
                // printf("%s: BAD (invalid header)\n", ToString(you).c_str());
                ban = 100000;
                return true;
            }
            std::string strCommand = hdr.GetCommand();
            unsigned int nMessageSize = hdr.nMessageSize;
            if (nMessageSize > MAX_SIZE) {
                // printf("%s: BAD (message too large)\n",
                // ToString(you).c_str());
                ban = 100000;
                return true;
            }
            if (nMessageSize > vRecv.size()) {
                vRecv.insert(vRecv.begin(), vHeaderSave.begin(),
                             vHeaderSave.end());
                break;
            }
            if (vRecv.GetVersion() >= 209) {
                uint256 hash =
                    Hash(vRecv.begin(), vRecv.begin() + nMessageSize);
                if (memcmp(hash.begin(), hdr.pchChecksum,
                           CMessageHeader::CHECKSUM_SIZE) != 0) {
                    continue;
                }
            }
            CDataStream vMsg(vRecv.begin(), vRecv.begin() + nMessageSize,
                             vRecv.GetType(), vRecv.GetVersion());
            vRecv.ignore(nMessageSize);
            if (ProcessMessage(strCommand, vMsg)) {
                return true;
            }
            // printf("%s: done processing %s\n", ToString(you).c_str(),
            //        strCommand.c_str());
        } while (1);
        return false;
    }

public:
    CSeederNode(const CService &ip, std::vector<CAddress> *vAddrIn)
        : sock(INVALID_SOCKET), vSend(SER_NETWORK, 0), vRecv(SER_NETWORK, 0),
          nHeaderStart(-1), nMessageStart(-1), nVersion(0), vAddr(vAddrIn),
          ban(0), doneAfter(0),
          you(ip, ServiceFlags(NODE_NETWORK | NODE_BITCOIN_CASH)) {
        if (time(nullptr) > 1329696000) {
            vSend.SetVersion(209);
            vRecv.SetVersion(209);
        }
    }

    bool Run() {
        // FIXME: This logic is duplicated with CConnman::ConnectNode for no
        // good reason.
        bool connected = false;
        proxyType proxy;

        if (you.IsValid()) {
            bool proxyConnectionFailed = false;

            if (GetProxy(you.GetNetwork(), proxy)) {
                sock = CreateSocket(proxy.proxy);
                if (sock == INVALID_SOCKET) {
                    return false;
                }
                connected = ConnectThroughProxy(
                    proxy, you.ToStringIP(), you.GetPort(), sock,
                    nConnectTimeout, &proxyConnectionFailed);
            } else {
                // no proxy needed (none set for target network)
                sock = CreateSocket(you);
                if (sock == INVALID_SOCKET) {
                    return false;
                }
                // no proxy needed (none set for target network)
                connected = ConnectSocketDirectly(you, sock, nConnectTimeout);
            }
        }

        if (!connected) {
            // printf("Cannot connect to %s\n", ToString(you).c_str());
            CloseSocket(sock);
            return false;
        }

        PushVersion();
        Send();

        bool res = true;
        int64_t now;
        while (now = time(nullptr), ban == 0 &&
                                        (doneAfter == 0 || doneAfter > now) &&
                                        sock != INVALID_SOCKET) {
            char pchBuf[0x10000];
            fd_set set;
            FD_ZERO(&set);
            FD_SET(sock, &set);
            struct timeval wa;
            if (doneAfter) {
                wa.tv_sec = doneAfter - now;
                wa.tv_usec = 0;
            } else {
                wa.tv_sec = GetTimeout();
                wa.tv_usec = 0;
            }
            int ret = select(sock + 1, &set, nullptr, &set, &wa);
            if (ret != 1) {
                if (!doneAfter) res = false;
                break;
            }
            int nBytes = recv(sock, pchBuf, sizeof(pchBuf), 0);
            int nPos = vRecv.size();
            if (nBytes > 0) {
                vRecv.resize(nPos + nBytes);
                memcpy(&vRecv[nPos], pchBuf, nBytes);
            } else if (nBytes == 0) {
                // printf("%s: BAD (connection closed prematurely)\n",
                //        ToString(you).c_str());
                res = false;
                break;
            } else {
                // printf("%s: BAD (connection error)\n",
                // ToString(you).c_str());
                res = false;
                break;
            }
            ProcessMessages();
            Send();
        }
        if (sock == INVALID_SOCKET) res = false;
        close(sock);
        sock = INVALID_SOCKET;
        return (ban == 0) && res;
    }

    int GetBan() { return ban; }

    int GetClientVersion() { return nVersion; }

    std::string GetClientSubVersion() { return strSubVer; }

    int GetStartingHeight() { return nStartingHeight; }
};

bool TestNode(const CService &cip, int &ban, int &clientV,
              std::string &clientSV, int &blocks,
              std::vector<CAddress> *vAddr) {
    try {
        CSeederNode node(cip, vAddr);
        bool ret = node.Run();
        if (!ret) {
            ban = node.GetBan();
        } else {
            ban = 0;
        }
        clientV = node.GetClientVersion();
        clientSV = node.GetClientSubVersion();
        blocks = node.GetStartingHeight();
        // printf("%s: %s!!!\n", cip.ToString().c_str(), ret ? "GOOD" : "BAD");
        return ret;
    } catch (std::ios_base::failure &e) {
        ban = 0;
        return false;
    }
}
