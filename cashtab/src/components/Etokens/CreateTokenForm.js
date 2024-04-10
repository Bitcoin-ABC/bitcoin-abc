// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import Modal from 'components/Common/Modal';
import { WalletContext } from 'wallet/context';
import {
    isValidTokenName,
    isValidTokenTicker,
    isValidTokenDecimals,
    isValidTokenMintAmount,
    isValidTokenDocumentUrl,
    isProbablyNotAScam,
} from 'validation';
import PrimaryButton from 'components/Common/PrimaryButton';
import {
    Input,
    SendTokenInput,
    Slider,
    CashtabDragger,
} from 'components/Common/Inputs';
import CashtabSwitch from 'components/Common/Switch';
import { TokenParamLabel } from 'components/Common/Atoms';
import Cropper from 'react-easy-crop';
import getCroppedImg from 'components/Etokens/icons/cropImage';
import getRoundImg from 'components/Etokens/icons/roundImage';
import getResizedImage from 'components/Etokens/icons/resizeImage';
import { token as tokenConfig } from 'config/token';
import appConfig from 'config/app';
import { getSlpGenesisTargetOutput, getMaxMintAmount } from 'slpv1';
import { sendXec } from 'transactions';
import { TokenNotificationIcon } from 'components/Common/CustomIcons';
import { explorer } from 'config/explorer';
import { getWalletState } from 'utils/cashMethods';
import { hasEnoughToken } from 'wallet';
import { toast } from 'react-toastify';
import Switch from 'components/Common/Switch';

const Form = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;
const SwitchRow = styled.div`
    display: flex;
    flex-direction: row;
    gap: 12px;
    align-items: center;
`;
const SwitchLabel = styled.div`
    text-align: left;
    color: ${props => props.theme.contrast};
    font-size: 18px;
`;
const EditIcon = styled.div`
    cursor: pointer;
    color: ${props => props.theme.contrast};
    &:hover {
        color: ${props => props.theme.eCashBlue};
    }
    word-wrap: break-word;
`;

const TokenCreatedLink = styled.a`
    color: ${props => props.theme.walletBackground};
    text-decoration: none;
`;

const IconModalForm = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    justify-content: center;
`;
const IconModalRow = styled.div`
    display: flex;
    width: 100%;
    gap: 3px;
`;
const SliderLabel = styled.div`
    color: ${props => props.theme.contrast};
`;
const SliderBox = styled.div`
    width: 100%;
`;
const CropperContainer = styled.div`
    height: 200px;
    position: relative;
`;

const CreateTokenTitle = styled.h3`
    color: ${props => props.theme.contrast};
`;

const TokenCreationSummaryTable = styled.div`
    color: ${props => props.theme.contrast};
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    gap: 3px;
`;
const SummaryRow = styled.div`
    display: flex;
    gap: 12px;
    justify-content: flex-start;
    align-items: start;
    width: 100%;
`;
const TokenParam = styled.div`
    word-break: break-word;
`;

const CreateTokenForm = () => {
    const { chronik, chaintipBlockheight, cashtabState } =
        React.useContext(WalletContext);
    const { settings, wallets } = cashtabState;

    const wallet = wallets.length > 0 ? wallets[0] : false;

    const walletState = getWalletState(wallet);
    const { tokens } = walletState;

    // eToken icon adds
    const [tokenIcon, setTokenIcon] = useState('');
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [tokenIconFileName, setTokenIconFileName] = useState(undefined);
    const [rawImageUrl, setRawImageUrl] = useState('');
    const [imageUrl, setImageUrl] = useState(false);
    const [showCropModal, setShowCropModal] = useState(false);
    const [roundSelection, setRoundSelection] = useState(true);
    const [createWithMintBatonAtIndexTwo, setCreateWithMintBatonAtIndexTwo] =
        useState(false);

    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const showCroppedImage = useCallback(async () => {
        setLoading(true);

        try {
            let imageToResize;

            const croppedResult = await getCroppedImg(
                rawImageUrl,
                croppedAreaPixels,
                rotation,
                fileName,
            );

            if (roundSelection) {
                imageToResize = await getRoundImg(croppedResult.url, fileName);
            } else {
                imageToResize = croppedResult;
            }

            await getResizedImage(
                imageToResize.url,
                resizedResult => {
                    setTokenIcon(resizedResult.file);
                    setImageUrl(resizedResult.url);
                },
                fileName,
            );
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [croppedAreaPixels, fileName, rawImageUrl, rotation, roundSelection]);

    const onClose = useCallback(() => {
        setShowCropModal(false);
    }, []);

    const handleTokenIconImage = (imgFile, callback) =>
        new Promise((resolve, reject) => {
            setLoading(true);
            try {
                const reader = new FileReader();

                const width = 512;
                const height = 512;
                reader.readAsDataURL(imgFile);

                reader.addEventListener('load', () =>
                    setRawImageUrl(reader.result),
                );

                reader.onload = event => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        const elem = document.createElement('canvas');
                        elem.width = width;
                        elem.height = height;
                        const ctx = elem.getContext('2d');
                        // img.width and img.height will contain the original dimensions
                        ctx.drawImage(img, 0, 0, width, height);
                        if (!HTMLCanvasElement.prototype.toBlob) {
                            Object.defineProperty(
                                HTMLCanvasElement.prototype,
                                'toBlob',
                                {
                                    value: function (callback, type, quality) {
                                        var dataURL = this.toDataURL(
                                            type,
                                            quality,
                                        ).split(',')[1];
                                        setTimeout(function () {
                                            var binStr = atob(dataURL),
                                                len = binStr.length,
                                                arr = new Uint8Array(len);
                                            for (var i = 0; i < len; i++) {
                                                arr[i] = binStr.charCodeAt(i);
                                            }
                                            callback(
                                                new Blob([arr], {
                                                    type: type || 'image/png',
                                                }),
                                            );
                                        });
                                    },
                                },
                            );
                        }

                        ctx.canvas.toBlob(
                            blob => {
                                let fileNameParts = imgFile.name.split('.');
                                fileNameParts.pop();
                                let fileNamePng =
                                    fileNameParts.join('.') + '.png';

                                const file = new File([blob], fileNamePng, {
                                    type: 'image/png',
                                });
                                setFileName(fileNamePng);
                                const resultReader = new FileReader();

                                resultReader.readAsDataURL(file);
                                setTokenIcon(file);
                                resultReader.addEventListener('load', () =>
                                    callback(resultReader.result),
                                );
                                setLoading(false);
                                setShowCropModal(true);
                                resolve();
                            },
                            'image/png',
                            1,
                        );
                    };
                };
            } catch (err) {
                console.error(`Error in handleTokenIconImage()`, err);
                reject(err);
            }
        });

    const validateTokenIconUpload = file => {
        const approvedFileTypes = ['image/png', 'image/jpg', 'image/jpeg'];
        try {
            if (!approvedFileTypes.includes(file.type)) {
                throw new Error('Only jpg or png image files are accepted');
            }
            setLoading(true);
            handleTokenIconImage(file, imageUrl => setImageUrl(imageUrl));
        } catch (e) {
            toast.error(
                `Cashtab can only process jpg or png files for token icon uploads.`,
            );
            setTokenIconFileName(undefined);
            setTokenIcon(undefined);
            setImageUrl('');
            return false;
        }
    };

    // Token name
    const [name, setName] = useState('');
    const [newTokenNameIsValid, setNewTokenNameIsValid] = useState(null);
    const [newTokenNameIsProbablyNotAScam, setNewTokenNameIsProbablyNotAScam] =
        useState(null);
    const [tokenNameError, setTokenNameError] = useState(false);
    const handleNewTokenNameInput = e => {
        const { value } = e.target;
        // validation
        const validTokenName = isValidTokenName(value);
        const probablyNotScam = isProbablyNotAScam(value);

        setNewTokenNameIsValid(validTokenName);
        setNewTokenNameIsProbablyNotAScam(probablyNotScam);

        if (!validTokenName) {
            setTokenNameError(
                'Token name must be a valid string between 1 and 68 characters long.',
            );
        }
        if (!probablyNotScam) {
            setTokenNameError(
                'Token name must not conflict with existing crypto or fiat',
            );
        }
        if (validTokenName && probablyNotScam) {
            setTokenNameError(false);
        }

        setName(value);
    };

    // New Token Ticker
    const [ticker, setTicker] = useState('');
    const [newTokenTickerIsValid, setNewTokenTickerIsValid] = useState(null);
    const [
        newTokenTickerIsProbablyNotAScam,
        setNewTokenTickerIsProbablyNotAScam,
    ] = useState(null);
    const [tokenTickerError, setTokenTickerError] = useState(false);
    const handleNewTokenTickerInput = e => {
        const { value } = e.target;
        // validation
        const validTokenTicker = isValidTokenTicker(value);
        const probablyNotScamTicker = isProbablyNotAScam(value);
        setNewTokenTickerIsValid(validTokenTicker);
        setNewTokenTickerIsProbablyNotAScam(probablyNotScamTicker);

        if (!validTokenTicker) {
            setTokenTickerError(
                'Ticker must be a valid string between 1 and 12 characters long',
            );
        }
        if (!probablyNotScamTicker) {
            setTokenTickerError(
                'Token ticker must not conflict with existing crypto or fiat',
            );
        }
        if (validTokenTicker && probablyNotScamTicker) {
            setTokenTickerError(false);
        }

        setTicker(value);
    };

    // New Token Decimals
    const [decimals, setDecimals] = useState('');
    const [decimalsError, setDecimalsError] = useState(false);
    const handleNewTokenDecimalsInput = e => {
        const { value } = e.target;
        // validation
        setDecimalsError(
            isValidTokenDecimals(value)
                ? false
                : 'Token decimals must be an integer between 0 and 9',
        );

        // Also validate the supply here if the form has been touched
        // Supply validation may change when decimals changes
        if (initialQty !== '') {
            const isValidOrErrorMsg = isValidTokenMintAmount(
                initialQty,
                parseInt(value),
            );
            setGenesisSupplyError(
                typeof isValidOrErrorMsg === 'string'
                    ? isValidOrErrorMsg
                    : false,
            );
        }

        setDecimals(value);
    };

    const onMaxGenesis = () => {
        // Use 0 for decimals if user has not input decimals yet
        const usedDecimals = decimals === '' ? 0 : parseInt(decimals);
        const maxGenesisAmount = getMaxMintAmount(usedDecimals);

        handleNewTokenInitialQtyInput({
            target: {
                name: 'initialQty',
                value: maxGenesisAmount,
            },
        });
    };

    // New Token Initial Quantity
    const [initialQty, setInitialQty] = useState('');
    const [genesisSupplyError, setGenesisSupplyError] = useState(null);
    const handleNewTokenInitialQtyInput = e => {
        const { value } = e.target;
        // If user has not yet input decimals, assume 0 decimals
        const usedDecimalsValue = decimals === '' ? 0 : parseInt(decimals);

        // validation
        const isValidOrErrorMsg = isValidTokenMintAmount(
            value,
            usedDecimalsValue,
        );
        setGenesisSupplyError(
            typeof isValidOrErrorMsg === 'string' ? isValidOrErrorMsg : false,
        );
        setInitialQty(value);
    };
    // New Token document URL
    const [url, setUrl] = useState('');
    const [urlError, setUrlError] = useState(false);

    const handleNewTokenDocumentUrlInput = e => {
        const { value } = e.target;
        // validation
        setUrlError(
            isValidTokenDocumentUrl(value)
                ? false
                : 'Must be a valid URL. Cannot exceed 68 characters.',
        );
        setUrl(value);
    };

    // New Token fixed supply
    // Only allow creation of fixed supply tokens until Minting support is added

    // New Token document hash
    // Do not include this; questionable value to casual users and requires significant complication

    // Only enable CreateToken button if all form entries are valid
    let tokenGenesisDataIsValid =
        newTokenNameIsValid &&
        newTokenTickerIsValid &&
        !decimalsError &&
        !genesisSupplyError &&
        !urlError &&
        newTokenNameIsProbablyNotAScam &&
        newTokenTickerIsProbablyNotAScam;

    // Modal settings
    const [showConfirmCreateToken, setShowConfirmCreateToken] = useState(false);

    const submitTokenIcon = async tokenId => {
        let formData = new FormData();

        const data = {
            name,
            ticker,
            decimals,
            url,
            initialQty,
            tokenIcon,
        };
        for (let key in data) {
            formData.append(key, data[key]);
        }

        // This function is called after the genesis tx is broadcast, using tokenId as a calling param
        formData.append('tokenId', tokenId);

        try {
            const tokenIconApprovalResponse = await fetch(
                tokenConfig.tokenIconSubmitApi,
                {
                    method: 'POST',
                    //Note: fetch automatically assigns correct header for multipart form based on formData obj
                    headers: {
                        Accept: 'application/json',
                    },
                    body: formData,
                },
            );

            const tokenIconApprovalResponseJson =
                await tokenIconApprovalResponse.json();

            if (
                typeof tokenIconApprovalResponseJson.status === 'undefined' ||
                tokenIconApprovalResponseJson.status !== 'ok'
            ) {
                // Let the user know there was an issue with submitting the token icon
                if (tokenIconApprovalResponseJson.msg) {
                    throw new Error(tokenIconApprovalResponseJson.msg);
                } else {
                    throw new Error(
                        'Error uploading token icon. Please email icons@e.cash for support.',
                    );
                }
            }

            toast.success(`Successfully uploaded token icon`);
        } catch (err) {
            console.error(err.message);
            toast.error(
                `Error submitting token icon for approval, please contact icons@e.cash for support`,
            );
        }
    };
    const createPreviewedToken = async () => {
        // If data is for some reason not valid here, bail out
        if (!tokenGenesisDataIsValid) {
            return;
        }

        // data must be valid and user reviewed to get here
        const configObj = {
            name,
            ticker,
            documentUrl: url === '' ? tokenConfig.newTokenDefaultUrl : url,
            decimals,
            initialQty,
            documentHash: '',
            mintBatonVout: createWithMintBatonAtIndexTwo ? 2 : null,
        };

        // create token with data in state fields
        try {
            // Get target outputs for an SLP v1 genesis tx
            const targetOutputs = getSlpGenesisTargetOutput(
                configObj,
                wallet.paths.get(1899).address,
            );
            const { response } = await sendXec(
                chronik,
                wallet,
                targetOutputs,
                settings.minFeeSends &&
                    hasEnoughToken(
                        tokens,
                        appConfig.vipSettingsTokenId,
                        appConfig.vipSettingsTokenQty,
                    )
                    ? appConfig.minFee
                    : appConfig.defaultFee,
                chaintipBlockheight,
            );

            toast(
                <TokenCreatedLink
                    href={`${explorer.blockExplorerUrl}/tx/${response.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Token created!
                </TokenCreatedLink>,
                {
                    icon: TokenNotificationIcon,
                },
            );

            // If this eToken has an icon, upload to server
            if (tokenIcon !== '') {
                submitTokenIcon(response.txid);
            }
        } catch (e) {
            toast.error(`${e}`);
        }
        // Hide the modal
        setShowConfirmCreateToken(false);
    };
    return (
        <>
            {showConfirmCreateToken && (
                <Modal
                    title={`Your Token`}
                    handleOk={createPreviewedToken}
                    handleCancel={() => setShowConfirmCreateToken(false)}
                    showCancelButton
                    height={260}
                >
                    <TokenCreationSummaryTable>
                        <SummaryRow>
                            <TokenParamLabel>Name:</TokenParamLabel>
                            <TokenParam>{name}</TokenParam>
                        </SummaryRow>
                        <SummaryRow>
                            <TokenParamLabel>Ticker:</TokenParamLabel>{' '}
                            <TokenParam>{ticker}</TokenParam>
                        </SummaryRow>
                        <SummaryRow>
                            <TokenParamLabel>Decimals:</TokenParamLabel>
                            <TokenParam> {decimals}</TokenParam>
                        </SummaryRow>
                        <SummaryRow>
                            <TokenParamLabel>Supply:</TokenParamLabel>
                            <TokenParam>{initialQty}</TokenParam>
                        </SummaryRow>
                        <SummaryRow>
                            <TokenParamLabel>URL:</TokenParamLabel>
                            <TokenParam>
                                {url === ''
                                    ? tokenConfig.newTokenDefaultUrl
                                    : url}
                            </TokenParam>
                        </SummaryRow>
                    </TokenCreationSummaryTable>
                </Modal>
            )}
            <CreateTokenTitle>Create a Token</CreateTokenTitle>

            <Form>
                <Input
                    placeholder="Enter a name for your token"
                    name="name"
                    value={name}
                    handleInput={handleNewTokenNameInput}
                    error={tokenNameError}
                />
                <Input
                    placeholder="Enter a ticker for your token"
                    name="ticker"
                    value={ticker}
                    handleInput={handleNewTokenTickerInput}
                    error={tokenTickerError}
                />
                <Input
                    placeholder="Enter number of decimal places"
                    name="decimals"
                    type="number"
                    value={decimals}
                    handleInput={handleNewTokenDecimalsInput}
                    error={decimalsError}
                />
                <SendTokenInput
                    placeholder="Enter the supply of your token"
                    name="initialQty"
                    type="string"
                    value={initialQty}
                    decimals={decimals}
                    handleInput={handleNewTokenInitialQtyInput}
                    error={genesisSupplyError}
                    handleOnMax={onMaxGenesis}
                />
                <Input
                    placeholder="Enter a website for your token"
                    name="url"
                    value={url}
                    handleInput={handleNewTokenDocumentUrlInput}
                    error={urlError}
                />
                <SwitchRow>
                    <Switch
                        name="mint-baton-switch"
                        on="Variable"
                        off="Fixed"
                        width={110}
                        right={74}
                        checked={createWithMintBatonAtIndexTwo}
                        handleToggle={() => {
                            setCreateWithMintBatonAtIndexTwo(
                                !createWithMintBatonAtIndexTwo,
                            );
                        }}
                    />
                    <SwitchLabel>Token supply</SwitchLabel>
                </SwitchRow>
                <CashtabDragger
                    name="Cashtab Dragger"
                    handleFile={validateTokenIconUpload}
                    imageUrl={imageUrl}
                />
                {typeof tokenIconFileName === 'string' && (
                    <p>{tokenIconFileName.name}</p>
                )}

                {!loading && tokenIcon && (
                    <EditIcon onClick={() => setShowCropModal(true)}>
                        {tokenIcon.name} [edit]
                    </EditIcon>
                )}

                {showCropModal && (
                    <Modal
                        handleCancel={onClose}
                        handleOk={() => showCroppedImage() && onClose()}
                        height={400}
                    >
                        <IconModalForm>
                            <CropperContainer>
                                <Cropper
                                    showGrid={true}
                                    zoomWithScroll={true}
                                    image={rawImageUrl}
                                    crop={crop}
                                    zoom={zoom}
                                    rotation={rotation}
                                    cropShape={
                                        roundSelection ? 'round' : 'rect'
                                    }
                                    aspect={1 / 1}
                                    onCropChange={setCrop}
                                    onRotationChange={setRotation}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </CropperContainer>
                            <IconModalRow>
                                <CashtabSwitch
                                    off="Square"
                                    on="Round"
                                    name="cropShape"
                                    width={100}
                                    right={66}
                                    checked={roundSelection}
                                    handleToggle={() =>
                                        setRoundSelection(!roundSelection)
                                    }
                                />
                            </IconModalRow>
                            <IconModalRow>
                                <SliderLabel>Zoom:</SliderLabel>
                                <SliderBox>
                                    <Slider
                                        name="zoom"
                                        value={zoom}
                                        handleSlide={setZoom}
                                        min={1}
                                        max={10}
                                        step={0.01}
                                    />
                                </SliderBox>
                            </IconModalRow>
                            <IconModalRow>
                                <SliderLabel>Rotation:</SliderLabel>
                                <SliderBox>
                                    <Slider
                                        name="rotation"
                                        value={rotation}
                                        handleSlide={setRotation}
                                        min={0}
                                        max={360}
                                        step={1}
                                    />
                                </SliderBox>
                            </IconModalRow>
                        </IconModalForm>
                    </Modal>
                )}

                <PrimaryButton
                    onClick={() => setShowConfirmCreateToken(true)}
                    disabled={!tokenGenesisDataIsValid}
                    style={{ marginTop: '30px' }}
                >
                    Create eToken
                </PrimaryButton>
            </Form>
        </>
    );
};

export default CreateTokenForm;
