#ifndef BITCOIN_SEEDER_BITCOIN_H
#define BITCOIN_SEEDER_BITCOIN_H

#include "protocol.h"

bool TestNode(const CService &cip, int &ban, int &client, std::string &clientSV,
              int &blocks, std::vector<CAddress> *vAddr);

#endif
