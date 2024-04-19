// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BN } from 'slp-mdm';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import PrimaryButton, { SecondaryLink } from 'components/Common/Buttons';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import {
    isValidTokenId,
    isValidXecAirdrop,
    isValidAirdropExclusionArray,
} from 'validation';
import { SwitchLabel } from 'components/Common/Atoms';
import { getAirdropTx, getEqualAirdropTx } from 'airdrop';
import Communist from 'assets/communist.png';
import { toast } from 'react-toastify';
import CashtabSwitch from 'components/Common/Switch';
import { Input, TextArea, InputFlex } from 'components/Common/Inputs';
import { CopyPasteIcon } from 'components/Common/CustomIcons';
import { getTokenGenesisInfo } from 'chronik';
import cashaddr from 'ecashaddrjs';
import Spinner from 'components/Common/Spinner';

const AirdropForm = styled.div`
    margin-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    svg {
        height: 24px;
        width: 24px;
    }
`;
const FormRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: ${props => props.theme.contrast};
`;
const SwitchHolder = styled.div`
    display: flex;
    align-content: center;
    gap: 12px;
`;
const AirdropTitle = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    text-align: center;
    justify-content: center;
`;

const Airdrop = () => {
    const ContextValue = React.useContext(WalletContext);
    const { chronik, cashtabState, updateCashtabState } = ContextValue;
    const { wallets, cashtabCache } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    const location = useLocation();

    const [calculatingAirdrop, setCalculatingAirdrop] = useState(false);
    const [formData, setFormData] = useState({
        tokenId: '',
        totalAirdrop: '',
    });

    const [tokenInfo, setTokenInfo] = useState(undefined);
    const [mintAddress, setMintAddress] = useState(undefined);

    const [equalDistributionRatio, setEqualDistributionRatio] = useState(false);
    const [tokenIdIsValid, setTokenIdIsValid] = useState(null);
    const [totalAirdropIsValid, setTotalAirdropIsValid] = useState(null);
    const [airdropRecipients, setAirdropRecipients] = useState('');
    const [showAirdropOutputs, setShowAirdropOutputs] = useState(false);
    const [ignoreOwnAddress, setIgnoreOwnAddress] = useState(false);
    const [ignoreMintAddress, setIgnoreMintAddress] = useState(false);

    // flag to reflect the exclusion list checkbox
    const [ignoreCustomAddresses, setIgnoreCustomAddresses] = useState(false);
    // the exclusion list values
    const [ignoreCustomAddressesList, setIgnoreCustomAddressesList] =
        useState('');
    const [
        ignoreCustomAddressesListIsValid,
        setIgnoreCustomAddressesListIsValid,
    ] = useState(false);
    const [ignoreCustomAddressListError, setIgnoreCustomAddressListError] =
        useState(false);

    // flag to reflect the ignore minimum etoken balance switch
    const [ignoreMinEtokenBalance, setIgnoreMinEtokenBalance] = useState(false);
    const [ignoreMinEtokenBalanceAmount, setIgnoreMinEtokenBalanceAmount] =
        useState(new BN(0));
    const [
        ignoreMinEtokenBalanceAmountIsValid,
        setIgnoreMinEtokenBalanceAmountIsValid,
    ] = useState(false);
    const [
        ignoreMinEtokenBalanceAmountError,
        setIgnoreMinEtokenBalanceAmountError,
    ] = useState(false);

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
            });
        }
    }, []);

    useEffect(() => {
        if (tokenIdIsValid) {
            // If we have a valid tokenId in the input field

            // See if we have this token info already available in cache
            let thisTokenInfo = cashtabCache.tokens.get(formData.tokenId);

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
                const mintAddress = cashaddr.encodeOutputScript(
                    genesisOutputScripts[0],
                );
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

    const getTokenInfo = async tokenId => {
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
            updateCashtabState('cashtabCache', {
                ...cashtabState.cashtabCache,
                tokens: cashtabState.cashtabCache.tokens,
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

    const handleTokenIdInput = e => {
        const { name, value } = e.target;
        setTokenIdIsValid(isValidTokenId(value));
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleTotalAirdropInput = e => {
        const { name, value } = e.target;
        setTotalAirdropIsValid(isValidXecAirdrop(value));
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    const handleMinEtokenBalanceChange = e => {
        const { value } = e.target;

        if (new BN(value).gt(new BN(0))) {
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

        let tokenUtxos;
        try {
            tokenUtxos = await chronik.tokenId(formData.tokenId).utxos();
        } catch (err) {
            console.error(`Error getting token utxos from chronik`, err);
            toast.error('Error retrieving airdrop recipients');
            // Clear result field from earlier calc, if present, on any error
            setAirdropRecipients('');
            return setCalculatingAirdrop(false);
        }

        const excludedAddresses = [];
        if (ignoreOwnAddress) {
            excludedAddresses.push(wallet.paths.get(1899).address);
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
            undecimalizedMinTokenAmount = new BN(ignoreMinEtokenBalanceAmount)
                .times(10 ** tokenInfo.genesisInfo.decimals)
                .toString();
        }

        // Get the csv
        let csv;

        try {
            csv = equalDistributionRatio
                ? getEqualAirdropTx(
                      tokenUtxos,
                      excludedAddresses,
                      formData.totalAirdrop,
                      undecimalizedMinTokenAmount,
                  )
                : getAirdropTx(
                      tokenUtxos,
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

    const handleIgnoreMinEtokenBalanceAmt = e => {
        setIgnoreMinEtokenBalance(e);
        // Also reset the balance amount
        setIgnoreMinEtokenBalanceAmount(new BN(0));
    };

    const handleIgnoreOwnAddress = e => {
        setIgnoreOwnAddress(e);
    };

    const handleIgnoreMintAddress = e => {
        setIgnoreMintAddress(e);
    };

    const handleIgnoreCustomAddresses = e => {
        setIgnoreCustomAddresses(e);
    };

    const handleIgnoreCustomAddressesList = e => {
        // if the checkbox is not checked then skip the input validation
        if (!ignoreCustomAddresses) {
            return;
        }

        let customAddressList = e.target.value;

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
                                rows="10"
                                readOnly
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
