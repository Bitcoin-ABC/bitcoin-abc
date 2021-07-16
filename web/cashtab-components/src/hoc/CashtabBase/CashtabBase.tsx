import * as React from 'react';

import debounce from 'lodash/debounce';

import {
    fiatToSatoshis,
    adjustAmount,
    getAddressUnconfirmed,
    getTokenInfo,
} from '../../utils/cashtab-helpers';

import Ticker from '../../atoms/Ticker';

import type { CurrencyCode } from '../../utils/currency-helpers';

declare global {
    interface Window {
        bitcoinAbc: any;
    }
}

interface sendParamsArr {
    to: string;
    protocol: ValidCoinTypes;
    value?: string;
    assetId?: string;
    opReturn?: string[];
}

const SECOND = 1000;

const PRICE_UPDATE_INTERVAL = 60 * SECOND;
const REPEAT_TIMEOUT = 4 * SECOND;
const URI_CHECK_INTERVAL = 10 * SECOND;

// Whitelist of valid coinType.
type ValidCoinTypes = string;

// TODO - Install is a Cashtab state, others are payment states.  Separate them to be independent
type ButtonStates = 'fresh' | 'pending' | 'complete' | 'expired' | 'install';

type CashtabBaseProps = {
    to: string;
    stepControlled?: ButtonStates;

    // Both present to price in fiat equivalent
    currency: CurrencyCode;
    price?: number;

    // Both present to price in coinType absolute amount
    coinType: ValidCoinTypes;
    tokenId?: string;
    amount?: number;

    isRepeatable: boolean;
    repeatTimeout: number;
    watchAddress: boolean;

    opReturn?: string[];
    showQR: boolean; // Intent to show QR.  Only show if amount is BCH or fiat as OP_RETURN and SLP do not work with QR

    successFn?: Function;
    failFn?: Function;
};

interface IState {
    step: ButtonStates;
    errors: string[];

    satoshis?: number; // Used when converting fiat to BCH

    coinSymbol?: string;
    coinName?: string;
    coinDecimals?: number;
    unconfirmedCount?: number;

    intervalPrice?: NodeJS.Timeout;
    intervalUnconfirmed?: NodeJS.Timeout;
    intervalTimer?: NodeJS.Timeout;
}

const CashtabBase = (Wrapped: React.ComponentType<any>) => {
    return class extends React.Component<CashtabBaseProps, IState> {
        static defaultProps = {
            currency: 'USD',
            coinType: Ticker.coinSymbol,

            isRepeatable: false,
            watchAddress: false,
            showQR: true,
            repeatTimeout: REPEAT_TIMEOUT,
        };

        state = {
            step: 'fresh' as ButtonStates,

            satoshis: undefined,
            coinSymbol: undefined,
            coinDecimals: undefined,
            coinName: undefined,

            unconfirmedCount: undefined,

            intervalPrice: undefined,
            intervalUnconfirmed: undefined,
            intervalTimer: undefined,
            errors: [],
        };

        addError = (error: string) => {
            const { errors } = this.state;
            this.setState({ errors: [...errors, error] });
        };

        startRepeatable = () => {
            const { repeatTimeout } = this.props;
            setTimeout(() => this.setState({ step: 'fresh' }), repeatTimeout);
        };

        paymentSendSuccess = () => {
            const { isRepeatable } = this.props;
            const { intervalUnconfirmed, unconfirmedCount } = this.state;

            let unconfirmedCountInt;

            if (typeof unconfirmedCount === 'undefined') {
                unconfirmedCountInt = 0;
            } else {
                unconfirmedCountInt = unconfirmedCount;
            }

            this.setState({
                step: 'complete',
                unconfirmedCount: unconfirmedCountInt
                    ? unconfirmedCountInt + 1
                    : 1,
            });

            if (isRepeatable) {
                this.startRepeatable();
            } else {
                intervalUnconfirmed && clearInterval(intervalUnconfirmed);
            }
        };

        getCashTabProviderStatus = () => {
            console.log(window.bitcoinAbc);
            if (
                window &&
                window.bitcoinAbc &&
                window.bitcoinAbc === 'cashtab'
            ) {
                return true;
            }
            return false;
        };

        handleClick = () => {
            const { amount, to, opReturn, coinType, tokenId } = this.props;

            const { satoshis } = this.state;

            // Satoshis might not set be set during server rendering
            if (!amount && !satoshis) {
                return;
            }

            const walletProviderStatus = this.getCashTabProviderStatus();

            if (typeof window === `undefined` || !walletProviderStatus) {
                this.setState({ step: 'install' });

                if (typeof window !== 'undefined') {
                    window.open(Ticker.installLink);
                }
                return;
            }

            if (walletProviderStatus) {
                this.setState({ step: 'fresh' });

                // Do not pass a token quantity to send, this is not yet supported in Cashtab
                if (coinType === Ticker.tokenName) {
                    return;
                }

                return window.postMessage(
                    {
                        type: 'FROM_PAGE',
                        text: 'CashTab',
                        txInfo: {
                            address: to,
                            value: satoshis
                                ? parseFloat(
                                      (
                                          satoshis! *
                                          10 ** (-1 * Ticker.coinDecimals)
                                      ).toFixed(2),
                                  )
                                : amount,
                        },
                    },
                    '*',
                );
            }

            const sendParams: sendParamsArr = {
                to,
                protocol: coinType,
                value: amount?.toString() || adjustAmount(satoshis, 8, true),
            };
            if (coinType === Ticker.tokenTicker) {
                sendParams.assetId = tokenId;
            }

            if (opReturn && opReturn.length) {
                sendParams.opReturn = opReturn;
            }

            this.setState({ step: 'pending' });
            /* May match this functionality later, may handle differently as above for Cashtab
            console.info('Cashtab sendAssets begin', sendParams);
            sendAssets(sendParams)
                .then(({ txid }: any) => {
                    console.info('Cashtab send success:', txid);
                    successFn && successFn(txid);
                    this.paymentSendSuccess();
                })
                .catch((err: any) => {
                    console.info('Cashtab send cancel', err);
                    failFn && failFn(err);
                    this.setState({ step: 'fresh' });
                });
                */
        };

        updateSatoshisFiat = debounce(
            async () => {
                const { price, currency } = this.props;

                if (!price) return;
                const satoshis = await fiatToSatoshis(currency, price);
                this.setState({ satoshis });
            },
            250,
            { leading: true, trailing: true },
        );

        setupSatoshisFiat = () => {
            const { intervalPrice } = this.state;
            intervalPrice && clearInterval(intervalPrice);

            this.updateSatoshisFiat();
            const intervalPriceNext = setInterval(
                () => this.updateSatoshisFiat(),
                PRICE_UPDATE_INTERVAL,
            );

            this.setState({ intervalPrice: intervalPriceNext });
        };

        setupWatchAddress = async () => {
            const { to } = this.props;
            const { intervalUnconfirmed } = this.state;

            intervalUnconfirmed && clearInterval(intervalUnconfirmed);

            const initialUnconfirmed = await getAddressUnconfirmed(to);
            this.setState({ unconfirmedCount: initialUnconfirmed.length });

            // Watch UTXO interval
            const intervalUnconfirmedNext = setInterval(async () => {
                const prevUnconfirmedCount = this.state.unconfirmedCount;
                const targetTransactions = await getAddressUnconfirmed(to);
                const unconfirmedCount = targetTransactions.length;

                this.setState({ unconfirmedCount });
                if (
                    prevUnconfirmedCount != null &&
                    unconfirmedCount > prevUnconfirmedCount
                ) {
                    this.paymentSendSuccess();
                }
            }, URI_CHECK_INTERVAL);

            this.setState({ intervalUnconfirmed: intervalUnconfirmedNext });
        };

        setupCoinMeta = async () => {
            const { coinType, tokenId } = this.props;

            if (coinType === Ticker.coinSymbol) {
                this.setState({
                    coinSymbol: Ticker.coinSymbol,
                    coinDecimals: Ticker.coinDecimals,
                    coinName: Ticker.coinName,
                });
            } else if (coinType === Ticker.tokenTicker && tokenId) {
                this.setState({
                    coinSymbol: undefined,
                    coinName: undefined,
                    coinDecimals: undefined,
                });
                const tokenInfo = await getTokenInfo(tokenId);

                const { symbol, decimals, name } = tokenInfo;
                this.setState({
                    coinSymbol: symbol,
                    coinDecimals: decimals,
                    coinName: name,
                });
            }
        };

        confirmCashTabProviderStatus = () => {
            const cashTabStatus = this.getCashTabProviderStatus();
            if (cashTabStatus) {
                this.setState({ step: 'fresh' });
            }
        };

        async componentDidMount() {
            if (typeof window !== 'undefined') {
                const { price, watchAddress } = this.props;

                // setup state, intervals, and listeners
                watchAddress && this.setupWatchAddress();
                price && this.setupSatoshisFiat();
                this.setupCoinMeta(); // normal call for setupCoinMeta()

                // Occasionially the cashtab window object is not available on componentDidMount, check later
                // TODO make this less hacky
                setTimeout(this.confirmCashTabProviderStatus, 750);

                // Detect CashTab and determine if button should show install CTA
                const walletProviderStatus = this.getCashTabProviderStatus();
                if (walletProviderStatus) {
                    this.setState({ step: 'fresh' });
                } else {
                    this.setState({ step: 'install' });
                }
            }
        }

        componentWillUnmount() {
            const {
                intervalPrice,
                intervalUnconfirmed,
                intervalTimer,
            } = this.state;
            intervalPrice && clearInterval(intervalPrice);
            intervalUnconfirmed && clearInterval(intervalUnconfirmed);
            intervalTimer && clearInterval(intervalTimer);
        }

        componentDidUpdate(prevProps: CashtabBaseProps, prevState: IState) {
            if (typeof window !== 'undefined') {
                const {
                    currency,
                    price,
                    isRepeatable,
                    watchAddress,
                } = this.props;

                const prevCurrency = prevProps.currency;
                const prevPrice = prevProps.price;
                const prevIsRepeatable = prevProps.isRepeatable;
                const prevWatchAddress = prevProps.watchAddress;

                // Fiat price or currency changes
                if (currency !== prevCurrency || price !== prevPrice) {
                    this.setupSatoshisFiat();
                }

                if (isRepeatable && isRepeatable !== prevIsRepeatable) {
                    this.startRepeatable();
                }

                if (watchAddress !== prevWatchAddress) {
                    if (watchAddress) {
                        this.setupWatchAddress();
                    } else {
                        const { intervalUnconfirmed } = this.state;
                        intervalUnconfirmed &&
                            clearInterval(intervalUnconfirmed);
                    }
                }
            }
        }

        render() {
            const {
                amount,
                showQR,
                opReturn,
                coinType,
                stepControlled,
            } = this.props;
            const {
                step,
                satoshis,
                coinDecimals,
                coinSymbol,
                coinName,
            } = this.state;

            let calculatedAmount =
                adjustAmount(amount, coinDecimals, false) || satoshis;

            // Only show QR if all requested features can be encoded in the BIP44 URI
            const shouldShowQR =
                showQR &&
                coinType === Ticker.coinSymbol &&
                (!opReturn || !opReturn.length);

            return (
                <Wrapped
                    {...this.props}
                    coinType={coinType}
                    showQR={shouldShowQR}
                    handleClick={this.handleClick}
                    step={stepControlled || step}
                    amount={calculatedAmount}
                    coinDecimals={coinDecimals}
                    coinSymbol={coinSymbol}
                    coinName={coinName}
                />
            );
        }
    };
};

export type { CashtabBaseProps, ButtonStates, ValidCoinTypes, IState };

export default CashtabBase;
