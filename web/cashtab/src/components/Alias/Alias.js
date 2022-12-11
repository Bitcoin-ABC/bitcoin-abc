import React, { useState } from 'react';
import styled from 'styled-components';
import { WalletContext } from 'utils/context';
import PropTypes from 'prop-types';
import WalletLabel from 'components/Common/WalletLabel.js';
import {
    ZeroBalanceHeader,
    SidePaddingCtn,
    WalletInfoCtn,
} from 'components/Common/Atoms';
import { AntdFormWrapper } from 'components/Common/EnhancedInputs';
import { Form, Input } from 'antd';
import { SmartButton } from 'components/Common/PrimaryButton';
import BalanceHeader from 'components/Common/BalanceHeader';
import BalanceHeaderFiat from 'components/Common/BalanceHeaderFiat';
import { Row, Col } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { getWalletState } from 'utils/cashMethods';
import { currency } from 'components/Common/Ticker.js';

export const NamespaceCtn = styled.div`
    width: 100%;
    margin-top: 50px;
    margin-bottom: 20px;
    h2 {
        color: ${props => props.theme.contrast};
        margin: 0 0 20px;
    }
    h3 {
        color: ${props => props.theme.contrast};
        margin: 0 0 10px;
    }
`;

const Alias = ({ passLoadingStatus }) => {
    const ContextValue = React.useContext(WalletContext);
    const {
        wallet,
        fiatPrice,
        cashtabSettings,
        // chronik,
        changeCashtabSettings,
    } = ContextValue;
    const walletState = getWalletState(wallet);
    const { balances } = walletState;
    const [formData, setFormData] = useState({
        aliasName: '',
    });
    const [alias, setAlias] = useState([]); // stores the alias name array
    // const [hasValidAlias, setHasValidAlias] = useState(false);

    const registerAlias = async () => {
        passLoadingStatus(true);

        // validate alias input i.e. not empty, no weird symbols
        // if invalid input, exit with error notification

        const fullAlias = formData.aliasName;

        if (isAliasAvailable(fullAlias)) {
            // call sendXec() passing in:
            // currency.aliasSettings.aliasPaymentAddress as destinationAddress
            // fullAlias as optionalOpReturnMsg
            // registration fee as sendAmount
            // true for optionalAliasRegistrationFlag
            // ** Utilize websockets to only trigger success notification upon 1 conf of the registration tx **
        } else {
            // error notificationon alias being unavailable
        }

        // set alias as pending until subsequent websocket notification on 1 conf on the registration tx
        setAlias(fullAlias + ' (Pending)');
        passLoadingStatus(false);
    };

    // potentially move this to transaction.js in later diffs
    const isAliasAvailable = alias => {
        alias; // linting bypass

        // if isLocalAliasStateLatest() is true then retrieve incoming tx history from localStorage
        // else retrieve via chronik and update localStorage

        // for each incoming tx with OP_RETURN outputs that paid at least currency.aliasSettings.aliasMinFee
        // filter for currency.opReturn.appPrefixesHex.aliasRegistration
        // filter for valid payment fee in output[1]
        // add opReturnMsg (the alias) to an aliasArray

        // if alias is in aliasArray
        // return false
        return true;
    };

    const handleAliasNameInput = e => {
        const { name, value } = e.target;
        setFormData(p => ({
            ...p,
            [name]: value,
        }));
    };

    return (
        <>
            <WalletInfoCtn>
                <WalletLabel
                    name={wallet.name}
                    cashtabSettings={cashtabSettings}
                    changeCashtabSettings={changeCashtabSettings}
                ></WalletLabel>
                {!balances.totalBalance ? (
                    <ZeroBalanceHeader>
                        You currently have 0 {currency.ticker}
                        <br />
                        Deposit some funds to use this feature
                    </ZeroBalanceHeader>
                ) : (
                    <>
                        <BalanceHeader
                            balance={balances.totalBalance}
                            ticker={currency.ticker}
                            cashtabSettings={cashtabSettings}
                        />
                        {fiatPrice !== null && (
                            <BalanceHeaderFiat
                                balance={balances.totalBalance}
                                settings={cashtabSettings}
                                fiatPrice={fiatPrice}
                            />
                        )}
                    </>
                )}
            </WalletInfoCtn>
            <SidePaddingCtn>
                <Row type="flex">
                    <Col span={24}>
                        <NamespaceCtn>
                            <h2>eCash Namespace Alias</h2>
                            <h3>
                                <UserOutlined />
                                {/*TODO: alias array to be rendered appropriately in later diffs*/}
                                &emsp;
                                {alias.length > 0
                                    ? alias.map(alias => (
                                          <li key={alias}>{alias}</li>
                                      ))
                                    : 'N/A'}
                            </h3>
                        </NamespaceCtn>
                        <SidePaddingCtn>
                            <AntdFormWrapper>
                                <Form
                                    style={{
                                        width: 'auto',
                                    }}
                                >
                                    <Form.Item>
                                        <Input
                                            addonAfter=" . xec"
                                            placeholder="Enter a desired alias"
                                            name="aliasName"
                                            onChange={e =>
                                                handleAliasNameInput(e)
                                            }
                                        />
                                    </Form.Item>
                                    <Form.Item>
                                        <SmartButton
                                            onClick={() => registerAlias()}
                                        >
                                            Register Alias
                                        </SmartButton>
                                    </Form.Item>
                                </Form>
                            </AntdFormWrapper>
                        </SidePaddingCtn>
                    </Col>
                </Row>
            </SidePaddingCtn>
        </>
    );
};

/*
passLoadingStatus must receive a default prop that is a function
in order to pass the rendering unit test in Alias.test.js

status => {console.log(status)} is an arbitrary stub function
*/

Alias.defaultProps = {
    passLoadingStatus: status => {
        console.log(status);
    },
};

Alias.propTypes = {
    passLoadingStatus: PropTypes.func,
};

export default Alias;
