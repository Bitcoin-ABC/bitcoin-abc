#ifndef BITCOIN_SEEDER_BITCOIN_H
#define BITCOIN_SEEDER_BITCOIN_H

#include <protocol.h>
#include <streams.h>

#include <string>
#include <vector>

/**
 * The seeder do not use the Params facility.
 *
 * While this is sorted out, we need a replacement.
 */
extern bool fTestNet;
static inline unsigned short GetDefaultPort(const bool testnet = fTestNet) {
    return testnet ? 18333 : 8333;
}

// The network magic to use.
extern CMessageHeader::MessageMagic netMagic;

class CSeederNode {
private:
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

    void BeginMessage(const char *pszCommand);

    void AbortMessage();

    void EndMessage();

    void Send();

    void PushVersion();

    void GotVersion();

    bool ProcessMessage(std::string strCommand, CDataStream &recv);

    bool ProcessMessages();

public:
    CSeederNode(const CService &ip, std::vector<CAddress> *vAddrIn);

    bool Run();

    int GetBan() { return ban; }

    int GetClientVersion() { return nVersion; }

    std::string GetClientSubVersion() { return strSubVer; }

    int GetStartingHeight() { return nStartingHeight; }
};

bool TestNode(const CService &cip, int &ban, int &client, std::string &clientSV,
              int &blocks, std::vector<CAddress> *vAddr);

#endif // BITCOIN_SEEDER_BITCOIN_H
