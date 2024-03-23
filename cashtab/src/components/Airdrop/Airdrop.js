// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { BN } from 'slp-mdm';
import styled from 'styled-components';
import { WalletContext } from 'wallet/context';
import {
    AntdFormWrapper,
    DestinationAddressMulti,
    InputAmountSingle,
} from 'components/Common/EnhancedInputs';
import { Form, Input } from 'antd';
import { Switch } from 'antd';
import PrimaryButton from 'components/Common/PrimaryButton';
import CopyToClipboard from 'components/Common/CopyToClipboard';
import { getMintAddress } from 'chronik';
import {
    isValidTokenId,
    isValidXecAirdrop,
    isValidAirdropExclusionArray,
} from 'validation';
import { SidePaddingCtn } from 'components/Common/Atoms';
import { Link } from 'react-router-dom';
import { getAirdropTx, getEqualAirdropTx } from 'airdrop';
import Communist from 'assets/communist.png';
import { toast } from 'react-toastify';

const { TextArea } = Input;
const Gulag = styled.img`
    width: 20px;
    height: 20px;
`;
const SwitchContentHolder = styled.div`
    display: flex;
    align-items: center;
`;
const AirdropActions = styled.div`
    text-align: center;
    width: 100%;
    padding: 10px;
    border-radius: 5px;
    display: flex;
    justify-content: center;
    a {
        color: ${props => props.theme.contrast};
        margin: 0;
        font-size: 11px;
        border: 1px solid ${props => props.theme.contrast};
        border-radius: 5px;
        padding: 2px 10px;
        opacity: 0.6;
    }
    a:hover {
        opacity: 1;
        border-color: ${props => props.theme.eCashBlue};
        color: ${props => props.theme.contrast};
        background: ${props => props.theme.eCashBlue};
    }
    ${({ received, ...props }) =>
        received &&
        `
        text-align: left;    
        background: ${props.theme.receivedMessage};
    `}
`;

const AirdropOptions = styled.div`
    text-align: left;
    color: ${props => props.theme.contrast};
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
        useState(false);
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
            console.log(`Error getting token utxos from chronik`, err);
            toast.error('Error retrieving airdrop recipients');
            return passLoadingStatus(false);
        }

        const excludedAddresses = [];
        if (ignoreOwnAddress) {
            excludedAddresses.push(
                wallet.paths.find(pathInfo => pathInfo.path === 1899).address,
            );
        }
        if (ignoreMintAddress) {
            let mintAddress;
            try {
                mintAddress = await getMintAddress(chronik, formData.tokenId);
                excludedAddresses.push(mintAddress);
            } catch (err) {
                console.log(`Error getting mint address from chronik`, err);
                toast.error(
                    `Error determining mint address for ${formData.tokenId}`,
                );
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
                console.log(`Error getting token utxos from chronik`, err);
                toast.error(
                    `Error determining mint address for ${formData.tokenId}`,
                );
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

        // remove all whitespaces via regex
        customAddressList = customAddressList.replace(/ /g, '');

        // validate the exclusion list input
        const addressListIsValid =
            isValidAirdropExclusionArray(customAddressList);
        setIgnoreCustomAddressesListIsValid(addressListIsValid);

        if (!addressListIsValid) {
            setIgnoreCustomAddressListError(
                'Invalid address detected in ignore list',
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
                <AntdFormWrapper>
                    <Form
                        style={{
                            width: 'auto',
                        }}
                    >
                        <Form.Item
                            validateStatus={
                                tokenIdIsValid === null || tokenIdIsValid
                                    ? ''
                                    : 'error'
                            }
                            help={
                                tokenIdIsValid === null || tokenIdIsValid
                                    ? ''
                                    : 'Invalid eToken ID'
                            }
                        >
                            <Input
                                addonBefore="eToken ID"
                                placeholder="Enter the eToken ID"
                                name="tokenId"
                                value={formData.tokenId}
                                onChange={e => handleTokenIdInput(e)}
                            />
                        </Form.Item>
                        <Form.Item
                            validateStatus={
                                totalAirdropIsValid === null ||
                                totalAirdropIsValid
                                    ? ''
                                    : 'error'
                            }
                            help={
                                totalAirdropIsValid === null ||
                                totalAirdropIsValid
                                    ? ''
                                    : 'Invalid total XEC airdrop'
                            }
                        >
                            <Input
                                addonBefore="Total XEC airdrop"
                                placeholder="Enter the total XEC airdrop"
                                name="totalAirdrop"
                                type="number"
                                value={formData.totalAirdrop}
                                onChange={e => handleTotalAirdropInput(e)}
                            />
                        </Form.Item>
                        <Form.Item>
                            <AirdropOptions>
                                <Switch
                                    data-testid="communist-airdrop"
                                    checkedChildren={
                                        <>
                                            <SwitchContentHolder>
                                                &quot;Equal&quot;{' '}
                                                <Gulag src={Communist} />
                                            </SwitchContentHolder>
                                        </>
                                    }
                                    unCheckedChildren="Pro-Rata"
                                    defaultunchecked="true"
                                    checked={equalDistributionRatio}
                                    onChange={() => {
                                        setEqualDistributionRatio(
                                            prev => !prev,
                                        );
                                    }}
                                />
                                {equalDistributionRatio
                                    ? ` Airdrop qty
                                the same for everyone`
                                    : ` Airdrop qty
                                scaled to token balance`}
                            </AirdropOptions>
                        </Form.Item>
                        <Form.Item>
                            <AirdropOptions>
                                <Switch
                                    onChange={() =>
                                        handleIgnoreOwnAddress(prev => !prev)
                                    }
                                    defaultunchecked="true"
                                    checked={ignoreOwnAddress}
                                />
                                &ensp;Ignore my own address
                            </AirdropOptions>
                        </Form.Item>
                        <Form.Item>
                            <AirdropOptions>
                                <Switch
                                    data-testid="ignore-mint-address"
                                    onChange={() =>
                                        handleIgnoreMintAddress(prev => !prev)
                                    }
                                    defaultunchecked="true"
                                    checked={ignoreMintAddress}
                                />
                                &ensp;Ignore eToken minter address
                            </AirdropOptions>
                        </Form.Item>
                        <Form.Item>
                            <AirdropOptions>
                                <Switch
                                    data-testid="minimum-etoken-holder-balance"
                                    onChange={() =>
                                        handleIgnoreMinEtokenBalanceAmt(
                                            prev => !prev,
                                        )
                                    }
                                    defaultunchecked="true"
                                    checked={ignoreMinEtokenBalance}
                                    style={{
                                        marginBottom: '5px',
                                    }}
                                />
                                &ensp;Minimum eToken holder balance
                                {ignoreMinEtokenBalance && (
                                    <InputAmountSingle
                                        validateStatus={
                                            ignoreMinEtokenBalanceAmountError
                                                ? 'error'
                                                : ''
                                        }
                                        help={
                                            ignoreMinEtokenBalanceAmountError
                                                ? ignoreMinEtokenBalanceAmountError
                                                : ''
                                        }
                                        inputProps={{
                                            placeholder:
                                                'Minimum eToken balance',
                                            onChange: e =>
                                                handleMinEtokenBalanceChange(e),
                                            value: ignoreMinEtokenBalanceAmount,
                                        }}
                                    />
                                )}
                            </AirdropOptions>
                        </Form.Item>
                        <Form.Item>
                            <AirdropOptions>
                                <Switch
                                    data-testid="ignore-custom-addresses"
                                    onChange={() =>
                                        handleIgnoreCustomAddresses(
                                            prev => !prev,
                                        )
                                    }
                                    defaultunchecked="true"
                                    checked={ignoreCustomAddresses}
                                    style={{
                                        marginBottom: '5px',
                                    }}
                                />
                                &ensp;Ignore custom addresses
                                {ignoreCustomAddresses && (
                                    <DestinationAddressMulti
                                        validateStatus={
                                            ignoreCustomAddressListError
                                                ? 'error'
                                                : ''
                                        }
                                        help={
                                            ignoreCustomAddressListError
                                                ? ignoreCustomAddressListError
                                                : ''
                                        }
                                        inputProps={{
                                            placeholder: `If more than one XEC address, separate them by comma \ne.g. \necash:qpatql05s9jfavnu0tv6lkjjk25n6tmj9gkpyrlwu8,ecash:qzvydd4n3lm3xv62cx078nu9rg0e3srmqq0knykfed`,
                                            name: 'address',
                                            onChange: e =>
                                                handleIgnoreCustomAddressesList(
                                                    e,
                                                ),
                                            required: ignoreCustomAddresses,
                                            disabled: !ignoreCustomAddresses,
                                        }}
                                    />
                                )}
                            </AirdropOptions>
                        </Form.Item>
                        <Form.Item>
                            <PrimaryButton
                                onClick={() => calculateXecAirdrop()}
                                disabled={
                                    !airdropCalcInputIsValid || !tokenIdIsValid
                                }
                            >
                                Calculate Airdrop
                            </PrimaryButton>
                        </Form.Item>
                        {showAirdropOutputs && (
                            <>
                                <Form.Item>
                                    One to Many Airdrop Payment Outputs
                                    <TextArea
                                        name="airdropRecipients"
                                        placeholder="Please input parameters above."
                                        value={airdropRecipients}
                                        rows="10"
                                        readOnly
                                    />
                                </Form.Item>
                                <Form.Item>
                                    <AirdropActions>
                                        <Link
                                            type="text"
                                            to="/send"
                                            state={{
                                                airdropRecipients:
                                                    airdropRecipients,
                                                airdropTokenId:
                                                    formData.tokenId,
                                            }}
                                            disabled={!airdropRecipients}
                                        >
                                            Copy to Send screen
                                        </Link>
                                        &nbsp;&nbsp;
                                        <CopyToClipboard
                                            data={airdropRecipients}
                                            showToast
                                            customMsg={
                                                'Airdrop recipients copied to clipboard'
                                            }
                                        >
                                            <Link
                                                type="text"
                                                disabled={!airdropRecipients}
                                                to={'#'}
                                            >
                                                Copy to Clipboard
                                            </Link>
                                        </CopyToClipboard>
                                    </AirdropActions>
                                </Form.Item>
                            </>
                        )}
                    </Form>
                </AntdFormWrapper>
            </SidePaddingCtn>
        </>
    );
};

/*
passLoadingStatus must receive a default prop that is a function
in order to pass the rendering unit test in Airdrop.test.js

status => {console.log(status)} is an arbitrary stub function
*/

Airdrop.defaultProps = {
    passLoadingStatus: status => {
        console.log(status);
    },
};

Airdrop.propTypes = {
    passLoadingStatus: PropTypes.func,
};

export default Airdrop;
