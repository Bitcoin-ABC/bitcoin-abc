// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState } from 'react';
import Modal from 'components/Common/Modal';
import styled from 'styled-components';
import TokenIcon from 'components/Etokens/TokenIcon';
import PropTypes from 'prop-types';
import { explorer } from 'config/explorer';
import { CopyIconButton } from 'components/Common/Buttons';
import { NftTokenIdAndCopyIcon } from 'components/Etokens/Token/styled';
import { toXec } from 'wallet';
import { supportedFiatCurrencies } from 'config/CashtabSettings';
import PrimaryButton, { SecondaryButton } from 'components/Common/Buttons';

const Table = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: center;
    width: 100%;
`;
const Row = styled.div`
    display: flex;
    flex-direction: row;
    color: ${props => props.theme.contrast};
    margin: auto;
`;
const Col = styled.div`
    display: flex;
    flex-direction: column;
`;
const ButtonHolder = styled.div`
    padding: 24px 0 0;
    display: flex;
    flex-direction: row;
    color: ${props => props.theme.contrast};
    margin: auto;
    width: 100%;
`;

const AreYouSureTitle = styled(Row)`
    font-weight: bold;
    margin-top: 24px;
    font-size: 24px;
    color: ${props => props.theme.eCashBlue};
`;
const ConfirmationButtonHolder = styled.div`
    padding-top: 24px;
    display: flex;
    flex-direction: row;
    gap: 12px;
`;

const NftListingActions = ({
    isMyNft,
    tokenId,
    cachedNftInfo,
    offerInfo,
    fiatPrice,
    settings,
    userLocale,
    title,
    description,
    handleOk,
    handleCancel,
}) => {
    const [areYouSure, setAreYouSure] = useState(false);

    const tokenName =
        typeof cachedNftInfo !== 'undefined'
            ? cachedNftInfo.genesisInfo.tokenName
            : `${tokenId.slice(0, 3)}...${tokenId.slice(-3)}`;

    let nftPriceXec, nftPriceFiat;
    if (typeof offerInfo !== 'undefined') {
        nftPriceXec = toXec(
            parseInt(offerInfo.variant.params.enforcedOutputs[1].value),
        );
        nftPriceFiat =
            fiatPrice !== null
                ? `${supportedFiatCurrencies[settings.fiatCurrency].symbol}
                  ${(fiatPrice * nftPriceXec).toLocaleString(userLocale, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                  })}`
                : '';
    }

    return (
        <Modal
            title={title}
            height={areYouSure ? 615 : 525}
            showButtons={false}
            description={description}
            handleOk={handleOk}
            handleCancel={handleCancel}
        >
            <Table>
                <Col>
                    <Row>
                        <TokenIcon size={256} tokenId={tokenId} />
                    </Row>
                    <Row>
                        <NftTokenIdAndCopyIcon>
                            <a
                                href={`${explorer.blockExplorerUrl}/tx/${tokenId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {tokenId.slice(0, 3)}
                                ...
                                {tokenId.slice(-3)}
                            </a>
                            <CopyIconButton
                                data={tokenId}
                                showToast
                                customMsg={`NFT Token ID "${tokenId}" copied to clipboard`}
                            />
                        </NftTokenIdAndCopyIcon>
                    </Row>
                    <Row>
                        <b>{tokenName}</b>
                    </Row>
                    <Row>{nftPriceXec.toLocaleString(userLocale)} XEC</Row>
                    <Row>{nftPriceFiat}</Row>
                    {!areYouSure ? (
                        <ButtonHolder>
                            <PrimaryButton onClick={() => setAreYouSure(true)}>
                                {isMyNft ? 'Cancel Listing' : 'Buy'}
                            </PrimaryButton>
                        </ButtonHolder>
                    ) : (
                        <>
                            <Row>
                                <AreYouSureTitle>Are you sure?</AreYouSureTitle>
                            </Row>
                            <ConfirmationButtonHolder>
                                <PrimaryButton onClick={handleOk}>
                                    {isMyNft
                                        ? 'Cancel this listing'
                                        : 'Buy now'}
                                </PrimaryButton>
                                <SecondaryButton
                                    onClick={() => setAreYouSure(false)}
                                >
                                    {isMyNft ? 'Never mind' : 'Cancel'}
                                </SecondaryButton>
                            </ConfirmationButtonHolder>
                        </>
                    )}
                </Col>
            </Table>
        </Modal>
    );
};

NftListingActions.propTypes = {
    isMyNft: PropTypes.bool,
    tokenId: PropTypes.string,
    cachedNftInfo: PropTypes.object,
    offerInfo: PropTypes.object,
    fiatPrice: PropTypes.number,
    settings: PropTypes.object,
    userLocale: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    handleOk: PropTypes.func,
    handleCancel: PropTypes.func.isRequired,
};

export default NftListingActions;
