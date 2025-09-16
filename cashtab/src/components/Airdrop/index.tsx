// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import BigNumber from 'bignumber.js';
import { WalletContext, isWalletContextLoaded } from 'wallet/context';
import PrimaryButton, { SecondaryLink } from 'components/Common/Buttons';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import {
    isValidTokenId,
    isValidXecAirdrop,
    isValidAirdropExclusionArray,
} from 'validation';
import { SwitchLabel, PageHeader } from 'components/Common/Atoms';
import {
    getAirdropTx,
    getEqualAirdropTx,
    getAgoraHolders,
    getP2pkhHolders,
} from 'airdrop';
import Communist from 'assets/communist.png';
import { toast } from 'react-toastify';
import CashtabSwitch from 'components/Common/Switch';
import { Input, TextArea, InputFlex } from 'components/Common/Inputs';
import { CopyPasteIcon, AirdropIcon } from 'components/Common/CustomIcons';
import { getTokenGenesisInfo } from 'chronik';
import { encodeOutputScript } from 'ecashaddrjs';
import Spinner from 'components/Common/Spinner';
import { AirdropForm, FormRow, SwitchHolder, AirdropTitle } from './styled';
import { CashtabCachedTokenInfo } from 'config/CashtabCache';

const Airdrop = () => {
    const ContextValue = useContext(WalletContext);
    if (!isWalletContextLoaded(ContextValue)) {
        // Confirm we have all context required to load the page
        return null;
    }
    const { chronik, agora, cashtabState, updateCashtabState } = ContextValue;
    const { cashtabCache, activeWallet } = cashtabState;
    if (!activeWallet) {
        return null;
    }
    const wallet = activeWallet;
    const location = useLocation();

    const [calculatingAirdrop, setCalculatingAirdrop] =
        useState<boolean>(false);

    interface AirdropFormData {
        tokenId: string;
        totalAirdrop: string;
    }
    const [formData, setFormData] = useState<AirdropFormData>({
        tokenId: '',
        totalAirdrop: '',
    });

    const [tokenInfo, setTokenInfo] = useState<
        undefined | CashtabCachedTokenInfo
    >(undefined);
    const [mintAddress, setMintAddress] = useState<undefined | string>(
        undefined,
    );

    const [equalDistributionRatio, setEqualDistributionRatio] =
        useState<boolean>(false);
    const [tokenIdIsValid, setTokenIdIsValid] = useState<null | boolean>(null);
    const [totalAirdropIsValid, setTotalAirdropIsValid] = useState<
        null | boolean
    >(null);
    const [airdropRecipients, setAirdropRecipients] = useState<string>('');
    const [showAirdropOutputs, setShowAirdropOutputs] =
        useState<boolean>(false);
    const [ignoreOwnAddress, setIgnoreOwnAddress] = useState<boolean>(false);
    const [ignoreMintAddress, setIgnoreMintAddress] = useState<boolean>(false);

    // flag to reflect the exclusion list checkbox
    const [ignoreCustomAddresses, setIgnoreCustomAddresses] =
        useState<boolean>(false);
    // the exclusion list values
    const [ignoreCustomAddressesList, setIgnoreCustomAddressesList] =
        useState<string>('');
    const [
        ignoreCustomAddressesListIsValid,
        setIgnoreCustomAddressesListIsValid,
    ] = useState<boolean>(false);
    const [ignoreCustomAddressListError, setIgnoreCustomAddressListError] =
        useState<false | string>(false);

    // flag to reflect the ignore minimum etoken balance switch
    const [ignoreMinEtokenBalance, setIgnoreMinEtokenBalance] =
        useState<boolean>(false);
    const [ignoreMinEtokenBalanceAmount, setIgnoreMinEtokenBalanceAmount] =
        useState<string>('0');
    const [
        ignoreMinEtokenBalanceAmountIsValid,
        setIgnoreMinEtokenBalanceAmountIsValid,
    ] = useState<boolean>(false);
    const [
        ignoreMinEtokenBalanceAmountError,
        setIgnoreMinEtokenBalanceAmountError,
    ] = useState<false | string>(false);

    useEffect(() => {
        if (location && location.state && location.state.airdropEtokenId) {
            setFormData({
                ...formData,
                tokenId: location.state.airdropEtokenId,
            });
            handleTokenIdInput({
                target: {
                    value: location.state.airdropEtokenId,
                },
            } as React.ChangeEvent<HTMLInputElement>);
        }
    }, []);

    useEffect(() => {
        if (tokenIdIsValid) {
            // If we have a valid tokenId in the input field

            // See if we have this token info already available in cache
            const thisTokenInfo = cashtabCache.tokens.get(formData.tokenId);

            // If not, get it
            if (typeof thisTokenInfo === 'undefined') {
                console.info(
                    `We do not have cached token info for ${formData.tokenId}`,
                );
                // If we do not have this info in cache, put it there
                // Note that we cannot use 'await' inside a useEffect, so we must call this function separately
                // Note also we cannot return a function call inside a useEffect except for a cleanup function
                getTokenInfo(formData.tokenId);
            } else {
                // If we already have it, set it to state to enable form functions that depend on this info
                setTokenInfo(thisTokenInfo);
            }
        }
    }, [formData.tokenId, tokenIdIsValid]);

    useEffect(() => {
        if (typeof tokenInfo !== 'undefined') {
            // Calculate the mint address from cached token info
            // Assume it is the first outputscript of genesisOutputScripts
            try {
                const { genesisOutputScripts, genesisInfo } = tokenInfo;
                // For SLP1 tokens, there will only be one genesis address
                // For ALP or others, assume it is the first genesis address, though it may not exist
                // based on how we calculate this address
                const mintAddress = encodeOutputScript(genesisOutputScripts[0]);
                console.info(
                    `Mint address for ${genesisInfo.tokenName} is ${mintAddress}`,
                );
                setMintAddress(mintAddress);
            } catch (err) {
                // If we can't get it, just toast notification
                // Form fields that depend on this info will be disabled
                // This will happen if the genesis outputscript is not a valid p2pkh or p2sh address
                toast.error(`Error determining mint address for token: ${err}`);
            }
        }
    }, [tokenInfo]);

    const getTokenInfo = async (tokenId: string) => {
        let tokenCacheInfo;
        try {
            tokenCacheInfo = await getTokenGenesisInfo(chronik, tokenId);
            console.info(
                `Fetched tokenCacheInfo for ${tokenId}`,
                tokenCacheInfo,
            );
            const { genesisInfo } = tokenCacheInfo;
            const { tokenName, tokenTicker } = genesisInfo;
            setTokenInfo(tokenCacheInfo);
            // Add token info for this token to cache
            cashtabCache.tokens.set(tokenId, tokenCacheInfo);
            // Update cashtabCache.tokens in state and localforage
            updateCashtabState({
                cashtabCache: {
                    ...cashtabState.cashtabCache,
                    tokens: cashtabState.cashtabCache.tokens,
                },
            });
            toast.success(
                `Token info for ${tokenName} (${tokenTicker}) fetched and cached.`,
            );
        } catch (err) {
            // Toast error
            // Input settings that depend on this info will be disabled as it will be undefined
            // in state unless it is successfully added
            toast.error(`Error getting token info from chronik: ${err}`);
        }
    };

    const handleTokenIdInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTokenIdIsValid(isValidTokenId(value));
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleTotalAirdropInput = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const { name, value } = e.target;
        setTotalAirdropIsValid(isValidXecAirdrop(value));
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleMinEtokenBalanceChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const { value } = e.target;

        if (new BigNumber(value).gt(0)) {
            setIgnoreMinEtokenBalanceAmountIsValid(true);
            setIgnoreMinEtokenBalanceAmountError(false);
        } else {
            setIgnoreMinEtokenBalanceAmountError(
                'Minimum eToken balance must be greater than 0',
            );
            setIgnoreMinEtokenBalanceAmountIsValid(false);
        }

        setIgnoreMinEtokenBalanceAmount(value);
    };

    const calculateXecAirdrop = async () => {
        // Airdrop txs are instant for most tokens, but can take some time for
        // tokens with a large amount of holders
        setCalculatingAirdrop(true);
        // hide any previous airdrop outputs
        setShowAirdropOutputs(false);

        const excludedAddresses = [];
        if (ignoreOwnAddress) {
            excludedAddresses.push(wallet.address);
        }
        if (ignoreMintAddress) {
            if (typeof mintAddress === 'undefined') {
                // Should never happen as the switch is disabled if we do not have this info
                toast.error(
                    'Mint address not available, please retry without ignoring the mint address',
                );
                // Clear result field from earlier calc, if present, on any error
                setAirdropRecipients('');
                return setCalculatingAirdrop(false);
            }
            excludedAddresses.push(mintAddress);
        }
        if (ignoreCustomAddresses && ignoreCustomAddressesListIsValid) {
            const addressStringArray = ignoreCustomAddressesList.split(',');
            for (const address of addressStringArray) {
                excludedAddresses.push(address);
            }
        }

        // By default, this is 0
        let undecimalizedMinTokenAmount = '0';
        if (ignoreMinEtokenBalanceAmount) {
            if (typeof tokenInfo === 'undefined') {
                // Should never happen as the calculate button is disabled if we do not have this info
                toast.error(
                    `Error determining decimals for minimum balance to ignore. Try again without ignoring a min balance, or refresh the page and try again.`,
                );
                // Clear result field from earlier calc, if present, on any error
                setAirdropRecipients('');
                return setCalculatingAirdrop(false);
            }
            undecimalizedMinTokenAmount = new BigNumber(
                ignoreMinEtokenBalanceAmount,
            )
                .times(10 ** tokenInfo.genesisInfo.decimals)
                .toString();
        }

        // Get the holder map

        let tokenHolderMap;
        try {
            const agoraHolders = await getAgoraHolders(agora, formData.tokenId);
            const p2pkhHolders = await getP2pkhHolders(
                chronik,
                formData.tokenId,
            );
            tokenHolderMap = new Map(
                [...agoraHolders].concat(
                    [...p2pkhHolders].map(([k, v]) => [
                        k,
                        (agoraHolders.get(k) || 0n) + v,
                    ]),
                ),
            );
        } catch (err) {
            console.error(
                `Error getting token holders from chronik and agora`,
                err,
            );
            toast.error('Error retrieving airdrop recipients');
            // Clear result field from earlier calc, if present, on any error
            setAirdropRecipients('');
            return setCalculatingAirdrop(false);
        }

        // Get the csv
        let csv;

        try {
            csv = equalDistributionRatio
                ? getEqualAirdropTx(
                      tokenHolderMap,
                      excludedAddresses,
                      formData.totalAirdrop,
                      undecimalizedMinTokenAmount,
                  )
                : getAirdropTx(
                      tokenHolderMap,
                      excludedAddresses,
                      formData.totalAirdrop,
                      undecimalizedMinTokenAmount,
                  );
            setAirdropRecipients(csv);
            // display the airdrop outputs TextArea
            setShowAirdropOutputs(true);
        } catch (err) {
            // Clear result field from earlier calc, if present, on any error
            setAirdropRecipients('');
            toast.error(`${err}`);
        }
        return setCalculatingAirdrop(false);
    };

    const handleIgnoreMinEtokenBalanceAmt = (
        updater: (prev: boolean) => boolean,
    ) => {
        setIgnoreMinEtokenBalance(updater);
        // Also reset the balance amount
        setIgnoreMinEtokenBalanceAmount('0');
    };

    const handleIgnoreOwnAddress = (updater: (prev: boolean) => boolean) => {
        setIgnoreOwnAddress(updater);
    };

    const handleIgnoreMintAddress = (updater: (prev: boolean) => boolean) => {
        setIgnoreMintAddress(updater);
    };

    const handleIgnoreCustomAddresses = (
        updater: (prev: boolean) => boolean,
    ) => {
        setIgnoreCustomAddresses(updater);
    };

    const handleIgnoreCustomAddressesList = (
        e: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        // if the checkbox is not checked then skip the input validation
        if (!ignoreCustomAddresses) {
            return;
        }

        const customAddressList = e.target.value;

        // validate the exclusion list input
        const addressListIsValid =
            isValidAirdropExclusionArray(customAddressList);
        setIgnoreCustomAddressesListIsValid(addressListIsValid);

        if (!addressListIsValid) {
            setIgnoreCustomAddressListError(
                'Must be a comma-separated list of valid ecash-prefixed addresses with no spaces',
            );
        } else {
            setIgnoreCustomAddressListError(false); // needs to be explicitly set in order to refresh the error state from prior invalidation
        }

        // commit the ignore list to state
        setIgnoreCustomAddressesList(customAddressList);
    };

    let airdropCalcInputIsValid = tokenIdIsValid && totalAirdropIsValid;

    // if the ignore min etoken balance and exclusion list options are in use, add the relevant validation to the total pre-calculation validation
    if (ignoreMinEtokenBalance && ignoreCustomAddresses) {
        // both enabled
        airdropCalcInputIsValid =
            ignoreMinEtokenBalanceAmountIsValid &&
            tokenIdIsValid &&
            totalAirdropIsValid &&
            ignoreCustomAddressesListIsValid;
    } else if (ignoreMinEtokenBalance && !ignoreCustomAddresses) {
        // ignore minimum etoken balance option only
        airdropCalcInputIsValid =
            ignoreMinEtokenBalanceAmountIsValid &&
            tokenIdIsValid &&
            totalAirdropIsValid;
    } else if (!ignoreMinEtokenBalance && ignoreCustomAddresses) {
        // ignore custom addresses only
        airdropCalcInputIsValid =
            tokenIdIsValid &&
            totalAirdropIsValid &&
            ignoreCustomAddressesListIsValid;
    }

    return (
        <>
            <PageHeader>
                Airdrop <AirdropIcon />
            </PageHeader>
            {calculatingAirdrop && <Spinner />}
            <AirdropForm>
                <FormRow>
                    <InputFlex>
                        <Input
                            placeholder="Enter the eToken ID"
                            name="tokenId"
                            value={formData.tokenId}
                            handleInput={handleTokenIdInput}
                            error={
                                tokenIdIsValid === false
                                    ? 'Invalid eToken ID'
                                    : false
                            }
                        />
                    </InputFlex>
                </FormRow>
                <FormRow>
                    <InputFlex>
                        <Input
                            placeholder="Enter the total XEC airdrop"
                            name="totalAirdrop"
                            type="number"
                            value={formData.totalAirdrop}
                            handleInput={handleTotalAirdropInput}
                            error={
                                totalAirdropIsValid === false
                                    ? 'Invalid total XEC airdrop'
                                    : false
                            }
                        />
                    </InputFlex>
                </FormRow>

                <FormRow>
                    <SwitchHolder>
                        <CashtabSwitch
                            name="Toggle Communism"
                            on="Pro-Rata"
                            width={120}
                            right={86}
                            bgImageOff={Communist}
                            checked={!equalDistributionRatio}
                            handleToggle={() => {
                                setEqualDistributionRatio(prev => !prev);
                            }}
                        />
                        <SwitchLabel>
                            {equalDistributionRatio
                                ? ` Airdrop
                                the same for everyone`
                                : ` Airdrop
                                scaled to token balance`}
                        </SwitchLabel>
                    </SwitchHolder>
                </FormRow>
                <FormRow>
                    <SwitchHolder>
                        <CashtabSwitch
                            name="ignoreOwnAddress"
                            checked={ignoreOwnAddress}
                            handleToggle={() =>
                                handleIgnoreOwnAddress(prev => !prev)
                            }
                        />
                        <SwitchLabel>Ignore my own address</SwitchLabel>
                    </SwitchHolder>
                </FormRow>
                <FormRow>
                    <SwitchHolder>
                        <CashtabSwitch
                            name="Toggle Ignore Mint Address"
                            checked={ignoreMintAddress}
                            disabled={typeof mintAddress === 'undefined'}
                            handleToggle={() =>
                                handleIgnoreMintAddress(prev => !prev)
                            }
                        />
                        <SwitchLabel>Ignore eToken minter address</SwitchLabel>
                    </SwitchHolder>
                </FormRow>
                <FormRow>
                    <SwitchHolder>
                        <CashtabSwitch
                            name="Toggle Minimum Token Balance"
                            checked={ignoreMinEtokenBalance}
                            disabled={typeof tokenInfo === 'undefined'}
                            handleToggle={() =>
                                handleIgnoreMinEtokenBalanceAmt(prev => !prev)
                            }
                        />
                        <SwitchLabel>Minimum eToken holder balance</SwitchLabel>
                    </SwitchHolder>
                    {ignoreMinEtokenBalance && (
                        <Input
                            name="ignoreMinEtokenBalanceAmount"
                            error={ignoreMinEtokenBalanceAmountError}
                            placeholder="Minimum eToken balance"
                            handleInput={handleMinEtokenBalanceChange}
                            value={ignoreMinEtokenBalanceAmount}
                        />
                    )}
                </FormRow>
                <FormRow>
                    <SwitchHolder>
                        <CashtabSwitch
                            name="Toggle Ignore Custom Addresses"
                            checked={ignoreCustomAddresses}
                            handleToggle={() =>
                                handleIgnoreCustomAddresses(prev => !prev)
                            }
                        />
                        <SwitchLabel>Ignore custom addresses</SwitchLabel>
                    </SwitchHolder>
                    {ignoreCustomAddresses && (
                        <TextArea
                            placeholder={`If more than one XEC address, separate them by comma \ne.g. \necash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8,ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed`}
                            error={ignoreCustomAddressListError}
                            value={ignoreCustomAddressesList}
                            name="address"
                            handleInput={handleIgnoreCustomAddressesList}
                            disabled={!ignoreCustomAddresses}
                        />
                    )}
                </FormRow>
                <FormRow>
                    <PrimaryButton
                        onClick={() => calculateXecAirdrop()}
                        disabled={
                            !airdropCalcInputIsValid ||
                            !tokenIdIsValid ||
                            (ignoreMintAddress &&
                                typeof mintAddress === 'undefined') ||
                            (ignoreMinEtokenBalance &&
                                typeof tokenInfo === 'undefined')
                        }
                    >
                        Calculate Airdrop
                    </PrimaryButton>
                </FormRow>
                {showAirdropOutputs && (
                    <>
                        <FormRow>
                            <AirdropTitle>
                                One to Many Airdrop Payment Outputs
                                <CopyToClipboard
                                    data={airdropRecipients}
                                    showToast
                                    customMsg={
                                        'Airdrop recipients copied to clipboard'
                                    }
                                >
                                    <CopyPasteIcon />
                                </CopyToClipboard>
                            </AirdropTitle>
                            <TextArea
                                name="airdropRecipients"
                                placeholder="Please input parameters above."
                                value={airdropRecipients}
                                disabled
                            />
                        </FormRow>
                        <FormRow>
                            <SecondaryLink
                                type="text"
                                to="/send"
                                state={{
                                    airdropRecipients: airdropRecipients,
                                    airdropTokenId: formData.tokenId,
                                }}
                                disabled={!airdropRecipients}
                            >
                                Copy to Send screen
                            </SecondaryLink>
                        </FormRow>
                    </>
                )}
            </AirdropForm>
        </>
    );
};

export default Airdrop;
