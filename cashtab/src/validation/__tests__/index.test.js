// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import {
    shouldRejectAmountInput,
    fiatToCrypto,
    isValidTokenName,
    isValidTokenTicker,
    isValidTokenDecimals,
    isValidTokenInitialQty,
    isValidTokenDocumentUrl,
    isValidCashtabSettings,
    isValidNewWalletNameLength,
    isValidXecSendAmount,
    isValidEtokenBurnAmount,
    isValidTokenId,
    isValidXecAirdrop,
    isValidAirdropOutputsArray,
    isValidAirdropExclusionArray,
    isValidContactList,
    migrateLegacyCashtabSettings,
    isValidCashtabCache,
    validateMnemonic,
    meetsAliasSpec,
    isValidAliasSendInput,
    isProbablyNotAScam,
    isValidRecipient,
    isValidSideshiftObj,
    isValidMultiSendUserInput,
    isValidOpreturnParam,
    shouldSendXecBeDisabled,
    parseAddressInput,
    isValidCashtabWallet,
} from 'validation';
import {
    validXecAirdropList,
    invalidXecAirdropList,
    invalidXecAirdropListMultipleInvalidValues,
    invalidXecAirdropListMultipleValidValues,
    validXecAirdropExclusionList,
    invalidXecAirdropExclusionList,
} from 'validation/fixtures/mocks';
import vectors from 'validation/fixtures/vectors';
import { when } from 'jest-when';
import appConfig from 'config/app';
import aliasSettings from 'config/alias';
import { toXec } from 'wallet';

describe('Validation utils', () => {
    it(`isValidSideshiftObj() returns true for a valid sideshift library object`, () => {
        const mockSideshift = {
            show: () => {
                return true;
            },
            hide: () => {
                return true;
            },
            addEventListener: () => {
                return true;
            },
        };
        expect(isValidSideshiftObj(mockSideshift)).toBe(true);
    });
    it(`isValidSideshiftObj() returns false if the sideshift library object failed to instantiate`, () => {
        expect(isValidSideshiftObj(null)).toBe(false);
    });
    it(`isValidSideshiftObj() returns false for an invalid sideshift library object`, () => {
        const mockSideshift = {
            show: () => {
                return true;
            },
            hide: () => {
                return true;
            },
            addEvenListener: 'not-a-function',
        };
        expect(isValidSideshiftObj(mockSideshift)).toBe(false);
    });
    it(`isValidRecipient() returns true for a valid and registered alias input`, async () => {
        const mockRegisteredAliasResponse = {
            alias: 'cbdc',
            address: 'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
            txid: 'f7d71433af9a4e0081ea60349becf2a60efed8890df7c3e8e079b3427f51d5ea',
            blockheight: 802515,
        };
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/alias/${mockRegisteredAliasResponse.alias}`;

        // mock the fetch call to alias-server's '/alias' endpoint
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(mockRegisteredAliasResponse),
            });
        expect(await isValidRecipient('cbdc.xec')).toBe(true);
    });
    it(`isValidRecipient() returns false for a valid but unregistered alias input`, async () => {
        const mockUnregisteredAliasResponse = {
            alias: 'koush',
            isRegistered: false,
            registrationFeeSats: 554,
            processedBlockheight: 803421,
        };
        const fetchUrl = `${aliasSettings.aliasServerBaseUrl}/alias/${mockUnregisteredAliasResponse.alias}`;

        // mock the fetch call to alias-server's '/alias' endpoint
        global.fetch = jest.fn();
        when(fetch)
            .calledWith(fetchUrl)
            .mockResolvedValue({
                json: () => Promise.resolve(mockUnregisteredAliasResponse),
            });
        expect(await isValidRecipient('koush.xec')).toBe(false);
    });
    it(`isValidRecipient() returns false for an invalid eCash address / alias input`, async () => {
        expect(await isValidRecipient('notvalid')).toBe(false);
    });
    it(`isValidRecipient() returns true for a valid eCash address`, async () => {
        expect(
            await isValidRecipient(
                'ecash:qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
            ),
        ).toBe(true);
    });
    it(`isValidRecipient() returns true for a valid prefix-less eCash address`, async () => {
        expect(
            await isValidRecipient(
                'qq9h6d0a5q65fgywv4ry64x04ep906mdku8f0gxfgx',
            ),
        ).toBe(true);
    });
    it(`validateMnemonic() returns true for a valid mnemonic`, () => {
        const mnemonic =
            'labor tail bulb distance estate collect lecture into smile differ yard legal';
        expect(validateMnemonic(mnemonic)).toBe(true);
    });
    it(`validateMnemonic() returns false for an invalid mnemonic`, () => {
        const mnemonic =
            'labor tail bulb not valid collect lecture into smile differ yard legal';
        expect(validateMnemonic(mnemonic)).toBe(false);
    });
    it(`validateMnemonic() returns false for an empty string mnemonic`, () => {
        const mnemonic = '';
        expect(validateMnemonic(mnemonic)).toBe(false);
    });
    it(`Returns 'false' if ${appConfig.ticker} send amount is a valid send amount`, () => {
        expect(shouldRejectAmountInput('10', appConfig.ticker, 20.0, 300)).toBe(
            false,
        );
    });
    it(`Returns 'false' if ${appConfig.ticker} send amount is a valid send amount in USD`, () => {
        // Here, user is trying to send $170 USD, where 1 BCHA = $20 USD, and the user has a balance of 15 BCHA or $300
        expect(shouldRejectAmountInput('170', 'USD', 20.0, 15)).toBe(false);
    });
    it(`Returns not a number if ${appConfig.ticker} send amount is not a number`, () => {
        const expectedValidationError = `Amount must be a number`;
        expect(
            shouldRejectAmountInput('Not a number', appConfig.ticker, 20.0, 3),
        ).toBe(expectedValidationError);
    });
    it(`Returns amount must be greater than 0 if ${appConfig.ticker} send amount is 0`, () => {
        const expectedValidationError = `Amount must be greater than 0`;
        expect(shouldRejectAmountInput('0', appConfig.ticker, 20.0, 3)).toBe(
            expectedValidationError,
        );
    });
    it(`Returns amount must be greater than 0 if ${appConfig.ticker} send amount is less than 0`, () => {
        const expectedValidationError = `Amount must be greater than 0`;
        expect(
            shouldRejectAmountInput('-0.031', appConfig.ticker, 20.0, 3),
        ).toBe(expectedValidationError);
    });
    it(`Returns balance error if ${appConfig.ticker} send amount is greater than user balance`, () => {
        const expectedValidationError = `Amount cannot exceed your ${appConfig.ticker} balance`;
        expect(shouldRejectAmountInput('17', appConfig.ticker, 20.0, 3)).toBe(
            expectedValidationError,
        );
    });
    it(`Returns balance error if ${appConfig.ticker} send amount is greater than user balance`, () => {
        const expectedValidationError = `Amount cannot exceed your ${appConfig.ticker} balance`;
        expect(shouldRejectAmountInput('17', appConfig.ticker, 20.0, 3)).toBe(
            expectedValidationError,
        );
    });
    it(`Returns error if ${appConfig.ticker} send amount is less than ${toXec(
        appConfig.dustSats,
    ).toString()} minimum`, () => {
        const expectedValidationError = `Send amount must be at least ${toXec(
            appConfig.dustSats,
        ).toString()} ${appConfig.ticker}`;
        expect(
            shouldRejectAmountInput(
                (toXec(appConfig.dustSats).toString() - 0.00000001).toString(),
                appConfig.ticker,
                20.0,
                3,
            ),
        ).toBe(expectedValidationError);
    });
    it(`Returns error if ${appConfig.ticker} send amount is less than ${toXec(
        appConfig.dustSats,
    ).toString()} minimum in fiat currency`, () => {
        const expectedValidationError = `Send amount must be at least ${toXec(
            appConfig.dustSats,
        ).toString()} ${appConfig.ticker}`;
        expect(
            shouldRejectAmountInput('0.0000005', 'USD', 0.00005, 1000000),
        ).toBe(expectedValidationError);
    });
    it(`Returns balance error if ${appConfig.ticker} send amount is greater than user balance with fiat currency selected`, () => {
        const expectedValidationError = `Amount cannot exceed your ${appConfig.ticker} balance`;
        // Here, user is trying to send $170 USD, where 1 BCHA = $20 USD, and the user has a balance of 5 BCHA or $100
        expect(shouldRejectAmountInput('170', 'USD', 20.0, 5)).toBe(
            expectedValidationError,
        );
    });
    it(`Returns precision error if ${appConfig.ticker} send amount has more than ${appConfig.cashDecimals} decimal places`, () => {
        const expectedValidationError = `${appConfig.ticker} transactions do not support more than ${appConfig.cashDecimals} decimal places`;
        expect(
            shouldRejectAmountInput('17.123456789', appConfig.ticker, 20.0, 35),
        ).toBe(expectedValidationError);
    });
    it(`Returns expected crypto amount with ${appConfig.cashDecimals} decimals of precision even if inputs have higher precision`, () => {
        expect(fiatToCrypto('10.97231694823432', 20.323134234923423, 8)).toBe(
            '0.53989295',
        );
    });
    it(`Returns expected crypto amount with ${appConfig.cashDecimals} decimals of precision even if inputs have higher precision`, () => {
        expect(fiatToCrypto('10.97231694823432', 20.323134234923423, 2)).toBe(
            '0.54',
        );
    });
    it(`Returns expected crypto amount with ${appConfig.cashDecimals} decimals of precision even if inputs have lower precision`, () => {
        expect(fiatToCrypto('10.94', 10, 8)).toBe('1.09400000');
    });
    it(`Accepts a valid ${appConfig.tokenTicker} token name`, () => {
        expect(isValidTokenName('Valid token name')).toBe(true);
    });
    it(`Accepts a valid ${appConfig.tokenTicker} token name that is a stringified number`, () => {
        expect(isValidTokenName('123456789')).toBe(true);
    });
    it(`Rejects ${appConfig.tokenTicker} token name if longer than 68 characters`, () => {
        expect(
            isValidTokenName(
                'This token name is not valid because it is longer than 68 characters which is really pretty long for a token name when you think about it and all',
            ),
        ).toBe(false);
    });
    it(`Rejects ${appConfig.tokenTicker} token name if empty string`, () => {
        expect(isValidTokenName('')).toBe(false);
    });
    it(`Accepts a 4-char ${appConfig.tokenTicker} token ticker`, () => {
        expect(isValidTokenTicker('DOGG')).toBe(true);
    });
    it(`Accepts a 12-char ${appConfig.tokenTicker} token ticker`, () => {
        expect(isValidTokenTicker('123456789123')).toBe(true);
    });
    it(`Rejects ${appConfig.tokenTicker} token ticker if empty string`, () => {
        expect(isValidTokenTicker('')).toBe(false);
    });
    it(`Rejects ${appConfig.tokenTicker} token ticker if > 12 chars`, () => {
        expect(isValidTokenTicker('1234567891234')).toBe(false);
    });
    it(`Accepts tokenDecimals if zero`, () => {
        expect(isValidTokenDecimals('0')).toBe(true);
    });
    it(`Accepts tokenDecimals if between 0 and 9 inclusive`, () => {
        expect(isValidTokenDecimals('9')).toBe(true);
    });
    it(`Rejects tokenDecimals if empty string`, () => {
        expect(isValidTokenDecimals('')).toBe(false);
    });
    it(`Rejects tokenDecimals if non-integer`, () => {
        expect(isValidTokenDecimals('1.7')).toBe(false);
    });
    it(`Accepts tokenDecimals initial genesis quantity at minimum amount for 3 decimal places`, () => {
        expect(isValidTokenInitialQty('0.001', '3')).toBe(true);
    });
    it(`Accepts initial genesis quantity at minimum amount for 9 decimal places`, () => {
        expect(isValidTokenInitialQty('0.000000001', '9')).toBe(true);
    });
    it(`Accepts initial genesis quantity at amount below 100 billion`, () => {
        expect(isValidTokenInitialQty('1000', '0')).toBe(true);
    });
    it(`Accepts highest possible initial genesis quantity at amount below 100 billion`, () => {
        expect(isValidTokenInitialQty('99999999999.999999999', '9')).toBe(true);
    });
    it(`Accepts initial genesis quantity if decimal places equal tokenDecimals`, () => {
        expect(isValidTokenInitialQty('0.123', '3')).toBe(true);
    });
    it(`Accepts initial genesis quantity if decimal places are less than tokenDecimals`, () => {
        expect(isValidTokenInitialQty('0.12345', '9')).toBe(true);
    });
    it(`Rejects initial genesis quantity of zero`, () => {
        expect(isValidTokenInitialQty('0', '9')).toBe(false);
    });
    it(`Rejects initial genesis quantity if tokenDecimals is not valid`, () => {
        expect(isValidTokenInitialQty('0', '')).toBe(false);
    });
    it(`Rejects initial genesis quantity if 100 billion or higher`, () => {
        expect(isValidTokenInitialQty('100000000000', '0')).toBe(false);
    });
    it(`Rejects initial genesis quantity if it has more decimal places than tokenDecimals`, () => {
        expect(isValidTokenInitialQty('1.5', '0')).toBe(false);
    });
    it(`Accepts a valid ${appConfig.tokenTicker} token document URL`, () => {
        expect(isValidTokenDocumentUrl('cashtabapp.com')).toBe(true);
    });
    it(`Accepts a valid ${appConfig.tokenTicker} token document URL including special URL characters`, () => {
        expect(isValidTokenDocumentUrl('https://cashtabapp.com/')).toBe(true);
    });
    it(`Accepts a blank string as a valid ${appConfig.tokenTicker} token document URL`, () => {
        expect(isValidTokenDocumentUrl('')).toBe(true);
    });
    it(`Rejects ${appConfig.tokenTicker} token name if longer than 68 characters`, () => {
        expect(
            isValidTokenDocumentUrl(
                'http://www.ThisTokenDocumentUrlIsActuallyMuchMuchMuchMuchMuchMuchMuchMuchMuchMuchMuchMuchMuchMuchMuchMuchMuchMuchTooLong.com/',
            ),
        ).toBe(false);
    });
    it(`Accepts a domain input with https protocol as ${appConfig.tokenTicker} token document URL`, () => {
        expect(isValidTokenDocumentUrl('https://google.com')).toBe(true);
    });
    it(`Accepts a domain input with http protocol as ${appConfig.tokenTicker} token document URL`, () => {
        expect(isValidTokenDocumentUrl('http://test.com')).toBe(true);
    });
    it(`Accepts a domain input with a primary and secondary top level domain as ${appConfig.tokenTicker} token document URL`, () => {
        expect(isValidTokenDocumentUrl('http://test.co.uk')).toBe(true);
    });
    it(`Accepts a domain input with just a subdomain as ${appConfig.tokenTicker} token document URL`, () => {
        expect(isValidTokenDocumentUrl('www.test.co.uk')).toBe(true);
    });
    it(`Rejects a domain input with no top level domain, protocol or subdomain  ${appConfig.tokenTicker} token document URL`, () => {
        expect(isValidTokenDocumentUrl('mywebsite')).toBe(false);
    });
    it(`Rejects a domain input as numbers ${appConfig.tokenTicker} token document URL`, () => {
        expect(isValidTokenDocumentUrl(12345)).toBe(false);
    });
    it(`isValidXecSendAmount accepts the dust minimum`, () => {
        const testXecSendAmount = toXec(appConfig.dustSats).toString();
        expect(isValidXecSendAmount(testXecSendAmount)).toBe(true);
    });
    it(`isValidXecSendAmount accepts arbitrary number above dust minimum`, () => {
        const testXecSendAmount = (toXec(appConfig.dustSats) + 1.75).toString();
        expect(isValidXecSendAmount(testXecSendAmount)).toBe(true);
    });
    it(`isValidXecSendAmount rejects zero`, () => {
        const testXecSendAmount = '0';
        expect(isValidXecSendAmount(testXecSendAmount)).toBe(false);
    });
    it(`isValidXecSendAmount accepts a string with 1 decimal place`, () => {
        expect(isValidXecSendAmount('100.1')).toBe(true);
    });
    it(`isValidXecSendAmount accepts a string with 2 decimal places`, () => {
        expect(isValidXecSendAmount('100.12')).toBe(true);
    });
    it(`isValidXecSendAmount rejects a string with more than 2 decimal places`, () => {
        expect(isValidXecSendAmount('100.123')).toBe(false);
    });
    it(`isValidXecSendAmount rejects a non-number string`, () => {
        const testXecSendAmount = 'not a number';
        expect(isValidXecSendAmount(testXecSendAmount)).toBe(false);
    });
    it(`isValidXecSendAmount accepts arbitrary number above dust minimum as a string`, () => {
        const testXecSendAmount = `${toXec(appConfig.dustSats) + 1.75}`;
        expect(isValidXecSendAmount(testXecSendAmount)).toBe(true);
    });
    it(`isValidXecSendAmount rejects null`, () => {
        const testXecSendAmount = null;
        expect(isValidXecSendAmount(testXecSendAmount)).toBe(false);
    });
    it(`isValidXecSendAmount rejects undefined`, () => {
        const testXecSendAmount = undefined;
        expect(isValidXecSendAmount(testXecSendAmount)).toBe(false);
    });
    it(`isValidXecSendAmount rejects a value including non-numerical characters`, () => {
        const testXecSendAmount = '12a17';
        expect(isValidXecSendAmount(testXecSendAmount)).toBe(false);
    });
    it(`isValidXecSendAmount rejects a value including decimal marker that is not a period`, () => {
        const testXecSendAmount = '12500,17';
        expect(isValidXecSendAmount(testXecSendAmount)).toBe(false);
    });
    it(`isValidEtokenBurnAmount rejects null`, () => {
        const testEtokenBurnAmount = null;
        expect(isValidEtokenBurnAmount(testEtokenBurnAmount)).toBe(false);
    });
    it(`isValidEtokenBurnAmount rejects undefined`, () => {
        const testEtokenBurnAmount = undefined;
        expect(isValidEtokenBurnAmount(testEtokenBurnAmount)).toBe(false);
    });
    it(`isValidEtokenBurnAmount rejects a burn amount that is 0`, () => {
        const testEtokenBurnAmount = 0;
        expect(isValidEtokenBurnAmount(testEtokenBurnAmount, 100)).toBe(false);
    });
    it(`isValidEtokenBurnAmount rejects a burn amount that is negative`, () => {
        const testEtokenBurnAmount = -50;
        expect(isValidEtokenBurnAmount(testEtokenBurnAmount, 100)).toBe(false);
    });
    it(`isValidEtokenBurnAmount rejects a burn amount that is more than the maxAmount param`, () => {
        const testEtokenBurnAmount = 1000;
        expect(isValidEtokenBurnAmount(testEtokenBurnAmount, 100)).toBe(false);
    });
    it(`isValidEtokenBurnAmount accepts a valid burn amount`, () => {
        const testEtokenBurnAmount = 50;
        expect(isValidEtokenBurnAmount(testEtokenBurnAmount, 100)).toBe(true);
    });
    it(`isValidEtokenBurnAmount accepts a valid burn amount with decimal points`, () => {
        const testEtokenBurnAmount = 10.545454;
        expect(isValidEtokenBurnAmount(testEtokenBurnAmount, 100)).toBe(true);
    });
    it(`isValidEtokenBurnAmount accepts a valid burn amount that is the same as the maxAmount`, () => {
        const testEtokenBurnAmount = 100;
        expect(isValidEtokenBurnAmount(testEtokenBurnAmount, 100)).toBe(true);
    });
    it(`isValidTokenId accepts valid token ID that is 64 chars in length`, () => {
        const testValidTokenId =
            '1c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e';
        expect(isValidTokenId(testValidTokenId)).toBe(true);
    });
    it(`isValidTokenId rejects a token ID that is less than 64 chars in length`, () => {
        const testValidTokenId = '111111thisisaninvalidtokenid';
        expect(isValidTokenId(testValidTokenId)).toBe(false);
    });
    it(`isValidTokenId rejects a token ID that is more than 64 chars in length`, () => {
        const testValidTokenId =
            '111111111c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e';
        expect(isValidTokenId(testValidTokenId)).toBe(false);
    });
    it(`isValidTokenId rejects a token ID number that is 64 digits in length`, () => {
        // eslint-disable-next-line no-loss-of-precision
        const testValidTokenId = 8912345678912345678912345678912345678912345678912345678912345679;
        expect(isValidTokenId(testValidTokenId)).toBe(false);
    });
    it(`isValidTokenId rejects null`, () => {
        const testValidTokenId = null;
        expect(isValidTokenId(testValidTokenId)).toBe(false);
    });
    it(`isValidTokenId rejects undefined`, () => {
        const testValidTokenId = undefined;
        expect(isValidTokenId(testValidTokenId)).toBe(false);
    });
    it(`isValidTokenId rejects empty string`, () => {
        const testValidTokenId = '';
        expect(isValidTokenId(testValidTokenId)).toBe(false);
    });
    it(`isValidTokenId rejects special character input`, () => {
        const testValidTokenId = '^&$%@&^$@&%$!';
        expect(isValidTokenId(testValidTokenId)).toBe(false);
    });
    it(`isValidTokenId rejects non-alphanumeric input`, () => {
        const testValidTokenId = 99999999999;
        expect(isValidTokenId(testValidTokenId)).toBe(false);
    });
    it(`isValidXecAirdrop accepts valid Total Airdrop Amount`, () => {
        const testAirdropTotal = '1000000';
        expect(isValidXecAirdrop(testAirdropTotal)).toBe(true);
    });
    it(`isValidXecAirdrop rejects null`, () => {
        const testAirdropTotal = null;
        expect(isValidXecAirdrop(testAirdropTotal)).toBe(false);
    });
    it(`isValidXecAirdrop rejects undefined`, () => {
        const testAirdropTotal = undefined;
        expect(isValidXecAirdrop(testAirdropTotal)).toBe(false);
    });
    it(`isValidXecAirdrop rejects empty string`, () => {
        const testAirdropTotal = '';
        expect(isValidXecAirdrop(testAirdropTotal)).toBe(false);
    });
    it(`isValidTokenId rejects an alphanumeric input`, () => {
        const testAirdropTotal = 'a73hsyujs3737';
        expect(isValidXecAirdrop(testAirdropTotal)).toBe(false);
    });
    it(`isValidTokenId rejects a number !> 0 in string format`, () => {
        const testAirdropTotal = '0';
        expect(isValidXecAirdrop(testAirdropTotal)).toBe(false);
    });
    it(`isValidAirdropOutputsArray accepts an airdrop list with valid XEC values`, () => {
        // Tools.js logic removes the EOF newline before validation
        const outputArray = validXecAirdropList.substring(
            0,
            validXecAirdropList.length - 1,
        );
        expect(isValidAirdropOutputsArray(outputArray)).toBe(true);
    });
    it(`isValidAirdropOutputsArray rejects an airdrop list with invalid XEC values`, () => {
        // Tools.js logic removes the EOF newline before validation
        const outputArray = invalidXecAirdropList.substring(
            0,
            invalidXecAirdropList.length - 1,
        );
        expect(isValidAirdropOutputsArray(outputArray)).toBe(false);
    });
    it(`isValidAirdropOutputsArray rejects null`, () => {
        const testAirdropListValues = null;
        expect(isValidAirdropOutputsArray(testAirdropListValues)).toBe(false);
    });
    it(`isValidAirdropOutputsArray rejects undefined`, () => {
        const testAirdropListValues = undefined;
        expect(isValidAirdropOutputsArray(testAirdropListValues)).toBe(false);
    });
    it(`isValidAirdropOutputsArray rejects empty string`, () => {
        const testAirdropListValues = '';
        expect(isValidAirdropOutputsArray(testAirdropListValues)).toBe(false);
    });
    it(`isValidAirdropOutputsArray rejects an airdrop list with multiple invalid XEC values per row`, () => {
        // Tools.js logic removes the EOF newline before validation
        const addressStringArray =
            invalidXecAirdropListMultipleInvalidValues.substring(
                0,
                invalidXecAirdropListMultipleInvalidValues.length - 1,
            );

        expect(isValidAirdropOutputsArray(addressStringArray)).toBe(false);
    });
    it(`isValidAirdropOutputsArray rejects an airdrop list with multiple valid XEC values per row`, () => {
        // Tools.js logic removes the EOF newline before validation
        const addressStringArray =
            invalidXecAirdropListMultipleValidValues.substring(
                0,
                invalidXecAirdropListMultipleValidValues.length - 1,
            );

        expect(isValidAirdropOutputsArray(addressStringArray)).toBe(false);
    });
    it(`isValidAirdropExclusionArray accepts a valid airdrop exclusion list`, () => {
        expect(isValidAirdropExclusionArray(validXecAirdropExclusionList)).toBe(
            true,
        );
    });
    it(`isValidAirdropExclusionArray rejects an invalid airdrop exclusion list`, () => {
        expect(
            isValidAirdropExclusionArray(invalidXecAirdropExclusionList),
        ).toBe(false);
    });
    it(`isValidAirdropExclusionArray rejects an empty airdrop exclusion list`, () => {
        expect(isValidAirdropExclusionArray([])).toBe(false);
    });
    it(`isValidAirdropExclusionArray rejects a null airdrop exclusion list`, () => {
        expect(isValidAirdropExclusionArray(null)).toBe(false);
    });
    it(`accepts a valid wallet name`, () => {
        expect(isValidNewWalletNameLength('Apollo')).toBe(true);
    });
    it(`rejects wallet name that is too long`, () => {
        expect(
            isValidNewWalletNameLength(
                'this string is far too long to be used as a wallet name...',
            ),
        ).toBe(false);
    });
    it(`rejects blank string as new wallet name`, () => {
        expect(isValidNewWalletNameLength('')).toBe(false);
    });
    it(`rejects wallet name of the wrong type`, () => {
        expect(isValidNewWalletNameLength(['newWalletName'])).toBe(false);
    });
    it(`isProbablyNotAScam recognizes "bitcoin" is probably a scam token name`, () => {
        expect(isProbablyNotAScam('bitcoin')).toBe(false);
    });
    it(`isProbablyNotAScam recognizes "ebitcoin" is probably a scam token name`, () => {
        expect(isProbablyNotAScam('ebitcoin')).toBe(false);
    });
    it(`isProbablyNotAScam recognizes "Lido Staked Ether", from coingeckoTop500Names, is probably a scam token name`, () => {
        expect(isProbablyNotAScam('Lido Staked Ether')).toBe(false);
    });
    it(`isProbablyNotAScam recognizes 'matic-network', from coingeckoTop500Ids, is probably a scam token name`, () => {
        expect(isProbablyNotAScam('matic-network')).toBe(false);
    });
    it(`isProbablyNotAScam recognizes 'Australian Dollar', from Cashtab supported fiat currencies, is probably a scam token name`, () => {
        expect(isProbablyNotAScam('Australian Dollar')).toBe(false);
    });
    it(`isProbablyNotAScam recognizes 'ebtc', from bannedTickers, is probably a scam token name`, () => {
        expect(isProbablyNotAScam('ebtc')).toBe(false);
    });
    it(`isProbablyNotAScam recognizes 'gbp', from bannedTickers, is probably a scam`, () => {
        expect(isProbablyNotAScam('gbp')).toBe(false);
    });
    it(`isProbablyNotAScam recognizes 'Hong Kong Dollar', from fiatNames, is probably a scam`, () => {
        expect(isProbablyNotAScam('gbp')).toBe(false);
    });
    it(`isProbablyNotAScam recognizes '₪', from fiat symbols, is probably a scam`, () => {
        expect(isProbablyNotAScam('₪')).toBe(false);
    });
    it(`isProbablyNotAScam recognizes an ordinary token name as acceptable`, () => {
        expect(isProbablyNotAScam('just a normal token name')).toBe(true);
    });
    it(`isProbablyNotAScam accepts a token name with fragments of banned potential scam names`, () => {
        expect(
            isProbablyNotAScam(
                'This token is not Ethereum or bitcoin or USD $',
            ),
        ).toBe(true);
    });
    it(`isValidMultiSendUserInput accepts correctly formed multisend output`, () => {
        expect(
            isValidMultiSendUserInput(
                `ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr, 22\necash:qqxrrls4u0znxx2q7e5m4en4z2yjrqgqeucckaerq3, 33\necash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 55`,
            ),
        ).toBe(true);
    });
    it(`isValidMultiSendUserInput accepts correctly formed multisend output even if address has extra spaces`, () => {
        expect(
            isValidMultiSendUserInput(
                `   ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr   , 22\necash:qqxrrls4u0znxx2q7e5m4en4z2yjrqgqeucckaerq3, 33\necash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 55`,
            ),
        ).toBe(true);
    });
    it(`isValidMultiSendUserInput returns expected error msg for invalid address`, () => {
        expect(
            isValidMultiSendUserInput(
                `ecash:notValid, 22\necash:qqxrrls4u0znxx2q7e5m4en4z2yjrqgqeucckaerq3, 33\necash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 55`,
            ),
        ).toBe(`Invalid address "ecash:notValid" at line 1`);
    });
    it(`isValidMultiSendUserInput returns expected error msg for invalid value (dust)`, () => {
        expect(
            isValidMultiSendUserInput(
                `ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr, 1\necash:qqxrrls4u0znxx2q7e5m4en4z2yjrqgqeucckaerq3, 33\necash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 55`,
            ),
        ).toBe(
            `Invalid value 1. Amount must be >= ${(
                appConfig.dustSats / 100
            ).toFixed(2)} XEC and <= 2 decimals.`,
        );
    });
    it(`isValidMultiSendUserInput returns expected error msg for invalid value (too many decimals)`, () => {
        expect(
            isValidMultiSendUserInput(
                `ecash:qplkmuz3rx480u6vc4xgc0qxnza42p0e7vll6p90wr, 10.123\necash:qqxrrls4u0znxx2q7e5m4en4z2yjrqgqeucckaerq3, 33\necash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 55`,
            ),
        ).toBe(
            `Invalid value 10.123. Amount must be >= ${(
                appConfig.dustSats / 100
            ).toFixed(2)} XEC and <= 2 decimals.`,
        );
    });
    it(`isValidMultiSendUserInput returns expected error msg for a blank input`, () => {
        expect(isValidMultiSendUserInput(`    `)).toBe(
            `Input must not be blank`,
        );
    });
    it(`isValidMultiSendUserInput returns expected error msg for extra spaces on a particular line`, () => {
        expect(
            isValidMultiSendUserInput(
                `\n,  ecash:qqxrrls4u0znxx2q7e5m4en4z2yjrqgqeucckaerq3, 33\necash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 55`,
            ),
        ).toBe(`Remove empty row at line 1`);
    });
    it(`isValidMultiSendUserInput returns expected error for non-string input`, () => {
        expect(isValidMultiSendUserInput(undefined)).toBe(
            `Input must be a string`,
        );
    });
    it(`isValidMultiSendUserInput returns expected error msg for input without only an address`, () => {
        expect(
            isValidMultiSendUserInput(
                `ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y`,
            ),
        ).toBe(`Line 1 must have address and value, separated by a comma`);
    });
    it(`isValidMultiSendUserInput returns expected error msg if line has more than one comma`, () => {
        expect(
            isValidMultiSendUserInput(
                `ecash:qphlhe78677sz227k83hrh542qeehh8el5lcjwk72y, 170,23`,
            ),
        ).toBe(`Line 1: Comma can only separate address and value.`);
    });
    it(`isValidOpreturnParam rejects a string that starts with 6a`, () => {
        expect(isValidOpreturnParam('6a')).toBe(false);
    });
    it(`isValidOpreturnParam rejects a string that starts with invalid pushdata`, () => {
        expect(isValidOpreturnParam('4d')).toBe(false);
    });
    it(`isValidOpreturnParam rejects non-string input`, () => {
        expect(isValidOpreturnParam(null)).toBe(false);
    });
    it(`isValidOpreturnParam rejects non-hex input`, () => {
        expect(isValidOpreturnParam('nothexvaluesinthisstring')).toBe(false);
    });
    it(`isValidOpreturnParam supports a valid hex string under max length`, () => {
        expect(
            isValidOpreturnParam(
                '042e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
            ),
        ).toBe(true);
    });
    it(`isValidOpreturnParam supports a valid hex string under max length with mixed capitalization`, () => {
        expect(
            isValidOpreturnParam(
                '042E786563000474657374150095e79F51D4260bc0dc3ba7fb77c7be92d0fbdd1d',
            ),
        ).toBe(true);
    });
    it(`isValidOpreturnParam supports a valid hex string of max length`, () => {
        expect(
            isValidOpreturnParam(
                '04007461624cd73030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313132333435',
            ),
        ).toBe(true);
    });
    it(`isValidOpreturnParam rejects a string with empty spaces`, () => {
        expect(
            isValidOpreturnParam(
                '04 2e786563000474657374150095e79f51d4260bc0dc3ba7fb77c7be92d0fbdd1d',
            ),
        ).toBe(false);
    });
    it(`isValidOpreturnParam rejects an empty string`, () => {
        expect(isValidOpreturnParam('')).toBe(false);
    });
    it(`isValidOpreturnParam rejects a valid hex string exceeding max length`, () => {
        expect(
            isValidOpreturnParam(
                '04007461624cd7303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031303030303030303030313030303030303030303130303030303030303031313233343501',
            ),
        ).toBe(false);
    });
    it(`isValidOpreturnParam rejects a valid hex string that has uneven length (i.e., half a byte)`, () => {
        expect(isValidOpreturnParam('042e7')).toBe(false);
    });
});

describe('Determining whether Send button should be disabled on SendXec screen', () => {
    const { expectedReturns } = vectors.shouldDisableXecSend;

    // Successfully created targetOutputs
    expectedReturns.forEach(expectedReturn => {
        const {
            description,
            formData,
            balances,
            apiError,
            sendBchAmountError,
            sendBchAddressError,
            isMsgError,
            priceApiError,
            isOneToManyXECSend,
            sendDisabled,
        } = expectedReturn;
        it(`shouldSendXecBeDisabled: ${description}`, () => {
            expect(
                shouldSendXecBeDisabled(
                    formData,
                    balances,
                    apiError,
                    sendBchAmountError,
                    sendBchAddressError,
                    isMsgError,
                    priceApiError,
                    isOneToManyXECSend,
                ),
            ).toBe(sendDisabled);
        });
    });
});

describe('Parses user input address strings with parseAddressInput', () => {
    const { expectedReturns } = vectors.parseAddressInputCases;

    // Successfully created targetOutputs
    expectedReturns.forEach(expectedReturn => {
        const { description, addressInput, parsedAddressInput } =
            expectedReturn;
        it(`parseAddressInput: ${description}`, () => {
            expect(parseAddressInput(addressInput)).toStrictEqual(
                parsedAddressInput,
            );
        });
    });
});

describe('Returns true if a given input meets alias spec or expected error msg if it does not', () => {
    const { expectedReturns } = vectors.meetsAliasSpecInputCases;

    // Successfully created targetOutputs
    expectedReturns.forEach(expectedReturn => {
        const { description, inputStr, response } = expectedReturn;
        it(`meetsAliasSpec: ${description}`, () => {
            expect(meetsAliasSpec(inputStr)).toBe(response);
        });
    });
});

describe('Validates user alias input on Send and SendToken screens', () => {
    const { expectedReturns } = vectors.validAliasSendInputCases;

    // Successfully created targetOutputs
    expectedReturns.forEach(expectedReturn => {
        const { description, sendToAliasInput, response } = expectedReturn;
        it(`isValidAliasSendInput: ${description}`, () => {
            expect(isValidAliasSendInput(sendToAliasInput)).toBe(response);
        });
    });
});

describe('Validating Cashtab Contact Lists', () => {
    const { expectedReturns } = vectors.isValidContactList;
    expectedReturns.forEach(expectedReturn => {
        const { description, contactList, isValid } = expectedReturn;
        it(`isValidContactList: ${description}`, () => {
            expect(isValidContactList(contactList)).toBe(isValid);
        });
    });
});

describe('Appropriately migrates users with legacy settings', () => {
    const { expectedReturns } = vectors.migrateLegacyCashtabSettings;
    expectedReturns.forEach(expectedReturn => {
        const { description, legacySettings, migratedSettings } =
            expectedReturn;
        it(`migrateLegacyCashtabSettings: ${description}`, () => {
            expect(migrateLegacyCashtabSettings(legacySettings)).toStrictEqual(
                migratedSettings,
            );
        });
    });
});

describe('Determines if the user has valid cashtab settings', () => {
    const { expectedReturns } = vectors.isValidCashtabSettings;
    expectedReturns.forEach(expectedReturn => {
        const { description, settings, isValid } = expectedReturn;
        it(`isValidCashtabSettings: ${description}`, () => {
            expect(isValidCashtabSettings(settings)).toBe(isValid);
        });
    });
});

describe('Determines if cashtabCache is valid or invalid', () => {
    const { expectedReturns } = vectors.isValidCashtabCache;
    expectedReturns.forEach(expectedReturn => {
        const { description, cashtabCache, isValid } = expectedReturn;
        it(`isValidCashtabCache: ${description}`, () => {
            expect(isValidCashtabCache(cashtabCache)).toBe(isValid);
        });
    });
});

describe('Determines if a cashtab wallet is valid or invalid', () => {
    const { expectedReturns } = vectors.isValidCashtabWallet;
    expectedReturns.forEach(expectedReturn => {
        const { description, wallet, returned } = expectedReturn;
        it(`isValidCashtabWallet: ${description}`, () => {
            expect(isValidCashtabWallet(wallet)).toBe(returned);
        });
    });
});
