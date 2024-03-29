// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { BN } from 'slp-mdm';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import PrimaryButton, { SecondaryLink } from 'components/Common/PrimaryButton';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import { getMintAddress } from 'chronik';
import {
    isValidTokenId,
    isValidXecAirdrop,
    isValidAirdropExclusionArray,
} from 'validation';
import { SidePaddingCtn, SwitchLabel } from 'components/Common/Atoms';
import { getAirdropTx, getEqualAirdropTx } from 'airdrop';
import Communist from 'assets/communist.png';
import { toast } from 'react-toastify';
import CashtabSwitch from 'components/Common/Switch';
import { Input, TextArea, InputFlex } from 'components/Common/Inputs';
import { ThemedCopySolid } from 'components/Common/CustomIcons';

const AirdropForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
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

const Airdrop = ({ passLoadingStatus }) => {
    const ContextValue = React.useContext(WalletContext);
    const { chronik, cashtabState } = ContextValue;
    const { wallets, cashtabCache } = cashtabState;
    const wallet = wallets.length > 0 ? wallets[0] : false;
    const location = useLocation();
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

    const [formData, setFormData] = useState({
        tokenId: '',
        totalAirdrop: '',
    });

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
        passLoadingStatus(true);
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
            return passLoadingStatus(false);
        }

        const excludedAddresses = [];
        if (ignoreOwnAddress) {
            excludedAddresses.push(wallet.paths.get(1899).address);
        }
        if (ignoreMintAddress) {
            let mintAddress;
            try {
                mintAddress = await getMintAddress(chronik, formData.tokenId);
                excludedAddresses.push(mintAddress);
            } catch (err) {
                console.error(`Error getting mint address from chronik`, err);
                toast.error(
                    `Error determining mint address for ${formData.tokenId}`,
                );
                // Clear result field from earlier calc, if present, on any error
                setAirdropRecipients('');
                return passLoadingStatus(false);
            }
        }
        if (ignoreCustomAddresses && ignoreCustomAddressesListIsValid) {
            const addressStringArray = ignoreCustomAddressesList.split(',');
            for (const address of addressStringArray) {
                excludedAddresses.push(address);
            }
        }

        // Convert user-entered ignoreMinEtokenBalanceAmount to correct decimals
        // i.e., "undecimalize it" so it is on the same basis as other amounts in getAirdropTx
        const tokenInfo = cashtabCache.tokens.get(formData.tokenId);
        let undecimalizedMinTokenAmount;
        if (typeof tokenInfo === 'undefined') {
            // User may be airdropping to a token they do not hold
            // In this case, we must get decimals from chronik
            let tokenInfo;
            try {
                tokenInfo = await chronik.token(formData.tokenId);
                undecimalizedMinTokenAmount = new BN(
                    ignoreMinEtokenBalanceAmount,
                )
                    .times(10 ** tokenInfo.genesisInfo.decimals)
                    .toString();
            } catch (err) {
                console.error(`Error getting token utxos from chronik`, err);
                toast.error(
                    `Error determining mint address for ${formData.tokenId}`,
                );
                // Clear result field from earlier calc, if present, on any error
                setAirdropRecipients('');
                return passLoadingStatus(false);
            }
        } else {
            // get it from cache if available
            undecimalizedMinTokenAmount = new BN(ignoreMinEtokenBalanceAmount)
                .times(10 ** tokenInfo.decimals)
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
        return passLoadingStatus(false);
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
            <br />
            <SidePaddingCtn data-testid="airdrop-ctn">
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
                                name="communist-airdrop"
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
                                name="ignore-mint-address"
                                checked={ignoreMintAddress}
                                handleToggle={() =>
                                    handleIgnoreMintAddress(prev => !prev)
                                }
                            />
                            <SwitchLabel>
                                Ignore eToken minter address
                            </SwitchLabel>
                        </SwitchHolder>
                    </FormRow>
                    <FormRow>
                        <SwitchHolder>
                            <CashtabSwitch
                                name="minimum-etoken-holder-balance"
                                checked={ignoreMinEtokenBalance}
                                handleToggle={() =>
                                    handleIgnoreMinEtokenBalanceAmt(
                                        prev => !prev,
                                    )
                                }
                            />
                            <SwitchLabel>
                                Minimum eToken holder balance
                            </SwitchLabel>
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
                                name="ignore-custom-addresses"
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
                                !airdropCalcInputIsValid || !tokenIdIsValid
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
                                        <ThemedCopySolid />
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
            </SidePaddingCtn>
        </>
    );
};

/*
passLoadingStatus must receive a default prop that is a function
in order to pass the rendering unit test in Airdrop.test.js

status => {console.info(status)} is an arbitrary stub function
*/

Airdrop.defaultProps = {
    passLoadingStatus: status => {
        console.info(status);
    },
};

Airdrop.propTypes = {
    passLoadingStatus: PropTypes.func,
};

export default Airdrop;
