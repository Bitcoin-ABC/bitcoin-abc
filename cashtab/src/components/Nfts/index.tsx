// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect, useContext } from 'react';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import { SwitchLabel, Alert, PageHeader } from 'components/Common/Atoms';
import Spinner from 'components/Common/Spinner';
import { toHex } from 'ecash-lib';
import { AgoraOffer } from 'ecash-agora';
import { NftsCtn, SubHeader, NftListCtn } from './styled';
import { SwitchHolder, NftOfferWrapper } from 'components/Etokens/Token/styled';
import { getUserLocale } from 'helpers';
import appConfig from 'config/app';
import Switch from 'components/Common/Switch';
import Collection, {
    OneshotSwiper,
    OneshotOffer,
} from 'components/Agora/Collection';
import { NftIcon } from 'components/Common/CustomIcons';
import { CashtabPathInfo } from 'wallet';

const Nfts: React.FC = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const { fiatPrice, chronik, agora, cashtabState, chaintipBlockheight } =
        ContextValue;
    const { wallets, settings, cashtabCache } = cashtabState;
    const wallet = wallets[0];
    // We get public key when wallet changes
    const pk = (wallet.paths.get(appConfig.derivationPath) as CashtabPathInfo)
        .pk;

    const userLocale = getUserLocale(navigator);

    const [chronikQueryError, setChronikQueryError] = useState<null | boolean>(
        null,
    );
    const [manageMyNfts, setManageMyNfts] = useState<boolean>(false);
    const [offeredCollections, setOfferedCollections] = useState<
        null | string[]
    >(null);
    const [offeredNftsThisWallet, setOfferedNftsThisWallet] = useState<
        null | OneshotOffer[]
    >(null);

    const getMyNfts = async () => {
        // 2. Get all NFTs listed from the active wallet
        let activeOffersByPubKey: AgoraOffer[];
        let activeOneshotOffersByPubKey: OneshotOffer[];
        try {
            activeOffersByPubKey = await agora.activeOffersByPubKey(toHex(pk));
            // Filter for ONESHOT offers
            activeOneshotOffersByPubKey = activeOffersByPubKey.filter(
                offer => offer.variant.type === 'ONESHOT',
            ) as OneshotOffer[];
        } catch (err) {
            console.error(`Error getting agora.activeOffersByPubKey()`, err);
            return setChronikQueryError(true);
        }

        // TODO organize this wallets nfts by pubkey and collection
        // prob best to wait for cache to have this info
        setOfferedNftsThisWallet(activeOneshotOffersByPubKey);
    };

    const getListedNfts = async () => {
        // 1. Get all offered group token IDs
        let offeredGroupTokenIds;
        try {
            offeredGroupTokenIds = await agora.offeredGroupTokenIds();
            setOfferedCollections(offeredGroupTokenIds);
        } catch (err) {
            console.error(`Error getting agora.offeredGroupTokenIds()`, err);
            return setChronikQueryError(true);
        }

        // Handy to check this in Cashtab
        console.info(
            `${offeredGroupTokenIds.length} collections with active listings.`,
        );
    };

    useEffect(() => {
        getListedNfts();
    }, []);

    useEffect(() => {
        getMyNfts();
    }, [wallet.name]);

    return (
        <NftsCtn>
            <PageHeader>
                Listed NFTs <NftIcon />
            </PageHeader>
            {offeredCollections === null && chronikQueryError === null && (
                <Spinner />
            )}
            {chronikQueryError && (
                <Alert>
                    Error querying listed NFTs. Please try again later.
                </Alert>
            )}
            {!chronikQueryError && (
                <>
                    <SwitchHolder>
                        <Switch
                            name="Toggle NFTs"
                            on=""
                            off=""
                            checked={manageMyNfts}
                            handleToggle={() => {
                                setManageMyNfts(() => !manageMyNfts);
                            }}
                        />
                        <SwitchLabel>Toggle Buy / Manage Listings</SwitchLabel>
                    </SwitchHolder>
                    {manageMyNfts ? (
                        <>
                            <SubHeader>Manage Your NFT Listings</SubHeader>
                            {Array.isArray(offeredNftsThisWallet) && (
                                <NftOfferWrapper>
                                    {offeredNftsThisWallet.length > 0 ? (
                                        <OneshotSwiper
                                            offers={offeredNftsThisWallet}
                                            activePk={pk}
                                            chronik={chronik}
                                            chaintipBlockheight={
                                                chaintipBlockheight
                                            }
                                            wallet={wallet}
                                            cashtabCache={cashtabCache}
                                            userLocale={userLocale}
                                            fiatPrice={fiatPrice}
                                            settings={settings}
                                            setOffers={setOfferedNftsThisWallet}
                                        />
                                    ) : (
                                        <p>You have no listed NFTs</p>
                                    )}
                                </NftOfferWrapper>
                            )}
                        </>
                    ) : (
                        <>
                            <SubHeader>Listed Collections</SubHeader>
                            {Array.isArray(offeredCollections) && (
                                <NftListCtn>
                                    {offeredCollections.length > 0 ? (
                                        offeredCollections.map(groupTokenId => {
                                            return (
                                                <Collection
                                                    key={groupTokenId}
                                                    groupTokenId={groupTokenId}
                                                    agora={agora}
                                                    chronik={chronik}
                                                    cashtabCache={cashtabCache}
                                                    settings={settings}
                                                    fiatPrice={fiatPrice}
                                                    userLocale={userLocale}
                                                    wallet={wallet}
                                                    activePk={pk}
                                                    chaintipBlockheight={
                                                        chaintipBlockheight
                                                    }
                                                    loadOnClick
                                                />
                                            );
                                        })
                                    ) : (
                                        <p>No listed collections</p>
                                    )}
                                </NftListCtn>
                            )}
                        </>
                    )}
                </>
            )}
        </NftsCtn>
    );
};

export default Nfts;
