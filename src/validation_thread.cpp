#include "chainparams.h"
#include "validation.h"
#include "validationinterface.h"
#include "net.h"
#include "config.h" // For GetConfig();

std::atomic<bool> fActivateChain(true);

void CConnman::ThreadValidation()
{
    int nSleep;
    while (!flagInterruptMsgProc) {
        if (fActivateChain && !fActivatingChain) {
            fActivateChain = false;
            FormBestChain(GetConfig());
        }
        if (!pindexBestHeader || pindexBestHeader->nChainWork == chainActive.Tip()->nChainWork)
            nSleep = 1000;
        else
            nSleep = 100;
        if (!fActivateChain)
            MilliSleep(nSleep);
        else
            nSleep = 0;
    }
}

