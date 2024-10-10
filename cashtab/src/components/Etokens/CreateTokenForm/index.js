// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import Modal from 'components/Common/Modal';
import { WalletContext } from 'wallet/context';
import {
    isValidTokenName,
    isValidTokenTicker,
    isValidTokenDecimals,
    isValidTokenMintAmount,
    getTokenDocumentUrlError,
    isProbablyNotAScam,
} from 'validation';
import PrimaryButton from 'components/Common/Buttons';
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
import {
    getSlpGenesisTargetOutput,
    getMaxMintAmount,
    getNftParentGenesisTargetOutputs,
    getNftChildGenesisTargetOutputs,
} from 'slpv1';
import { sendXec } from 'transactions';
import { TokenNotificationIcon } from 'components/Common/CustomIcons';
import { explorer } from 'config/explorer';
import { getWalletState } from 'utils/cashMethods';
import { hasEnoughToken, undecimalizeTokenAmount } from 'wallet';
import { toast } from 'react-toastify';
import Switch from 'components/Common/Switch';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Form,
    SwitchRow,
    SwitchLabel,
    EditIcon,
    TokenCreatedLink,
    IconModalForm,
    IconModalRow,
    SliderLabel,
    SliderBox,
    CropperContainer,
    CreateTokenTitle,
    TokenCreationSummaryTable,
    SummaryRow,
    TokenParam,
    ButtonDisabledMsg,
} from 'components/Etokens/CreateTokenForm/styles';
import { sha256 } from 'js-sha256';
import { getUserLocale } from 'helpers';
import { decimalizedTokenQtyToLocaleFormat } from 'utils/formatting';

const CreateTokenForm = ({ nftChildGenesisInput }) => {
    // Constant to handle rendering of CreateTokenForm for NFT Minting
    const isNftMint = Array.isArray(nftChildGenesisInput);
    const NFT_DECIMALS = 0;
    const NFT_GENESIS_QTY = '1';
    const ICON_MAX_UPLOAD_BYTES = 1000000;
    const navigate = useNavigate();
    const location = useLocation();
    const userLocale = getUserLocale(navigator);
    const { chronik, ecc, chaintipBlockheight, cashtabState } =
        React.useContext(WalletContext);
    const { settings, wallets } = cashtabState;

    const wallet = wallets.length > 0 ? wallets[0] : false;

    const walletState = getWalletState(wallet);
    const { tokens } = walletState;

    // eToken icon adds
    const [tokenIcon, setTokenIcon] = useState('');
    const [createdTokenId, setCreatedTokenId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [tokenIconFileName, setTokenIconFileName] = useState(undefined);
    const [rawImageUrl, setRawImageUrl] = useState('');
    const [imageUrl, setImageUrl] = useState(false);
    const [showCropModal, setShowCropModal] = useState(false);
    const [roundSelection, setRoundSelection] = useState(true);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // NFT handling
    const [createNftCollection, setCreateNftCollection] = useState(false);

    // Modal settings
    const [showConfirmCreateToken, setShowConfirmCreateToken] = useState(false);

    // Token form items
    const emptyFormData = {
        name: '',
        ticker: '',
        decimals: '',
        genesisQty: '',
        url: '',
        hash: '',
        createWithMintBatonAtIndexTwo: false,
    };
    const initialFormDataErrors = {
        name: false,
        ticker: false,
        decimals: false,
        genesisQty: false,
        url: false,
        // No error for hash as this is only generated
    };
    const [formData, setFormData] = useState(emptyFormData);
    const [formDataErrors, setFormDataErrors] = useState(initialFormDataErrors);
    // This switch is form data, but since it is a bool and not a string, keep it with its own state field
    const [createWithMintBatonAtIndexTwo, setCreateWithMintBatonAtIndexTwo] =
        useState(true);

    // Note: We do not include a UI input for token document hash
    // Questionable value to casual users and requires significant complication

    useEffect(() => {
        // If we routed here from the Create NFT Collection link, toggle NFT switch to true
        if (location?.pathname?.includes('create-nft-collection')) {
            setCreateNftCollection(true);
        }
    }, []);

    useEffect(() => {
        // After the user has created a token, we wait until the wallet has updated its balance
        // and the page is available, then we navigate to the page
        if (createdTokenId === null || isNftMint) {
            // If we do not have a created tokenId or if this was an NFT Mint,
            // do not navigate anywhere
            return;
        }
        if (typeof tokens.get(createdTokenId) !== 'undefined') {
            navigate(`/token/${createdTokenId}`);
        }
    }, [createdTokenId, tokens]);

    useEffect(() => {
        if (createNftCollection === true) {
            // Cashtab only creates NFT1 Parent tokens (aka NFT Collections) with 0 decimals
            setFormData(previous => ({
                ...previous,
                decimals: 0,
            }));
        }
    }, [createNftCollection]);

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
                // Get the sha256 hash of the user's original uploaded file
                // For an NFT, this will be set as the document hash
                // Note that this will not match the hash of the image on the token server due to resizing
                // and renaming
                // The hash should be of the creator's original file
                const hashreader = new FileReader();
                hashreader.readAsArrayBuffer(imgFile);
                hashreader.addEventListener('load', () => {
                    // Handle Input expects an event with key target
                    // target to have keys name and hash
                    handleInput({
                        target: {
                            name: 'hash',
                            value: sha256(hashreader.result),
                        },
                    });
                });

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

    const handleInput = e => {
        const { name, value } = e.target;
        switch (name) {
            case 'name': {
                // Handle validation and state updates for new token name
                // validation
                const validTokenName = isValidTokenName(value);
                const probablyNotScam = isProbablyNotAScam(value);
                setFormDataErrors(previous => ({
                    ...previous,
                    [name]: !validTokenName
                        ? `Token name must be a valid string between 1 and 68 characters long.`
                        : !probablyNotScam
                        ? 'Token name must not conflict with existing crypto or fiat'
                        : false,
                }));
                break;
            }
            case 'ticker': {
                // validation
                const validTokenTicker = isValidTokenTicker(value);
                const probablyNotScamTicker = isProbablyNotAScam(value);
                setFormDataErrors(previous => ({
                    ...previous,
                    [name]: !validTokenTicker
                        ? `Token ticker must be a valid string between 1 and 12 characters long`
                        : !probablyNotScamTicker
                        ? 'Token ticker must not conflict with existing crypto or fiat'
                        : false,
                }));
                break;
            }
            case 'decimals': {
                setFormDataErrors(previous => ({
                    ...previous,
                    [name]: isValidTokenDecimals(value)
                        ? false
                        : 'Token decimals must be an integer between 0 and 9',
                }));

                // Also validate the supply here if the form has been touched
                // Supply validation may change when decimals changes
                if (formData.genesisQty !== '') {
                    const isValidOrStringErrorMsg = isValidTokenMintAmount(
                        formData.genesisQty,
                        // Note that, in this code block, value is formData.decimals
                        parseInt(value),
                    );
                    setFormDataErrors(previous => ({
                        ...previous,
                        genesisQty:
                            typeof isValidOrStringErrorMsg === 'string'
                                ? isValidOrStringErrorMsg
                                : false,
                    }));
                }
                break;
            }
            case 'genesisQty': {
                const isValidOrStringErrorMsg = isValidTokenMintAmount(
                    value,
                    // If user has not yet input decimals, assume 0 decimals
                    formData.decimals === '' ? 0 : parseInt(formData.decimals),
                );
                setFormDataErrors(previous => ({
                    ...previous,
                    [name]:
                        typeof isValidOrStringErrorMsg === 'string'
                            ? isValidOrStringErrorMsg
                            : false,
                }));
                break;
            }
            case 'url': {
                setFormDataErrors(previous => ({
                    ...previous,
                    [name]: getTokenDocumentUrlError(value),
                }));
                break;
            }
            case 'hash': {
                // Do nothing, we disable user input for this field
                // Input can only come from a user uploaded image
                break;
            }
            default:
                break;
        }
        setFormData(previous => ({
            ...previous,
            [name]: value,
        }));
    };

    const onMaxGenesis = () => {
        // Use 0 for decimals if user has not input decimals yet
        const usedDecimals =
            formData.decimals === '' ? 0 : parseInt(formData.decimals);
        const maxGenesisAmount = getMaxMintAmount(usedDecimals);

        handleInput({
            target: {
                name: 'genesisQty',
                value: maxGenesisAmount,
            },
        });
    };

    // Only enable CreateToken button if all form entries are valid
    let tokenGenesisDataIsValid =
        // No formdata errors
        formDataErrors.name === false &&
        formDataErrors.ticker === false &&
        formDataErrors.decimals === false &&
        formDataErrors.genesisQty === false &&
        formDataErrors.url === false &&
        // Name must not be empty
        formData.name !== '' &&
        // Ticker must not be empty
        formData.ticker !== '' &&
        // If this is an nft mint, we need an NFT Mint Input
        ((isNftMint && nftChildGenesisInput.length === 1) || !isNftMint) &&
        (tokenIcon === '' ||
            (tokenIcon !== '' && tokenIcon.size <= ICON_MAX_UPLOAD_BYTES));

    const submitTokenIcon = async tokenId => {
        let submittedFormData = new FormData();

        const data = {
            name: formData.name,
            ticker: formData.ticker,
            decimals: isNftMint ? NFT_DECIMALS : formData.decimals,
            url: formData.url,
            genesisQty: isNftMint ? NFT_GENESIS_QTY : formData.genesisQty,
            tokenIcon,
        };
        for (let key in data) {
            submittedFormData.append(key, data[key]);
        }

        // This function is called after the genesis tx is broadcast, using tokenId as a calling param
        submittedFormData.append('tokenId', tokenId);

        try {
            const tokenIconApprovalResponse = await fetch(
                tokenConfig.tokenIconSubmitApi,
                {
                    method: 'POST',
                    //Note: fetch automatically assigns correct header for multipart form based on formData obj
                    headers: {
                        Accept: 'application/json',
                    },
                    body: submittedFormData,
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
        const genesisInfo = {
            tokenName: formData.name,
            tokenTicker: formData.ticker,
            url:
                formData.url === ''
                    ? tokenConfig.newTokenDefaultUrl
                    : formData.url,
            // Support documentHash for NFT Collection, but only for uploaded image file
            hash: createNftCollection || isNftMint ? formData.hash : '',
            decimals: isNftMint ? NFT_DECIMALS : parseInt(formData.decimals),
        };

        // Create type 1 slp token per specified user data
        try {
            // Get target outputs for an SLP v1 genesis tx
            const targetOutputs = createNftCollection
                ? getNftParentGenesisTargetOutputs(
                      genesisInfo,
                      BigInt(
                          undecimalizeTokenAmount(
                              formData.genesisQty,
                              parseInt(formData.decimals),
                          ),
                      ),
                      createWithMintBatonAtIndexTwo ? 2 : undefined,
                  )
                : isNftMint
                ? getNftChildGenesisTargetOutputs(genesisInfo)
                : getSlpGenesisTargetOutput(
                      genesisInfo,
                      BigInt(
                          undecimalizeTokenAmount(
                              formData.genesisQty,
                              parseInt(formData.decimals),
                          ),
                      ),
                      createWithMintBatonAtIndexTwo ? 2 : undefined,
                  );
            const { response } = isNftMint
                ? await sendXec(
                      chronik,
                      ecc,
                      wallet,
                      targetOutputs,
                      settings.minFeeSends &&
                          (hasEnoughToken(
                              tokens,
                              appConfig.vipTokens.grumpy.tokenId,
                              appConfig.vipTokens.grumpy.vipBalance,
                          ) ||
                              hasEnoughToken(
                                  tokens,
                                  appConfig.vipTokens.cachet.tokenId,
                                  appConfig.vipTokens.cachet.vipBalance,
                              ))
                          ? appConfig.minFee
                          : appConfig.defaultFee,
                      chaintipBlockheight,
                      // per spec, this must be at index 0
                      // https://github.com/simpleledger/slp-specifications/blob/master/slp-nft-1.md
                      nftChildGenesisInput,
                  )
                : await sendXec(
                      chronik,
                      ecc,
                      wallet,
                      targetOutputs,
                      settings.minFeeSends &&
                          (hasEnoughToken(
                              tokens,
                              appConfig.vipTokens.grumpy.tokenId,
                              appConfig.vipTokens.grumpy.vipBalance,
                          ) ||
                              hasEnoughToken(
                                  tokens,
                                  appConfig.vipTokens.cachet.tokenId,
                                  appConfig.vipTokens.cachet.vipBalance,
                              ))
                          ? appConfig.minFee
                          : appConfig.defaultFee,
                      chaintipBlockheight,
                  );

            const { txid } = response;
            setCreatedTokenId(txid);

            toast(
                <TokenCreatedLink
                    href={`${explorer.blockExplorerUrl}/tx/${txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {createNftCollection
                        ? 'NFT Collection created!'
                        : isNftMint
                        ? 'NFT Minted!'
                        : 'Token created!'}
                </TokenCreatedLink>,
                {
                    icon: TokenNotificationIcon,
                },
            );

            // If this eToken/NFT Collection/NFT has an icon, upload to server
            if (tokenIcon !== '') {
                submitTokenIcon(txid);
            }
        } catch (e) {
            toast.error(`${e}`);
        }
        // Hide the modal
        setShowConfirmCreateToken(false);
        // If this is an NFT, clear the form
        if (isNftMint) {
            setFormData(emptyFormData);
            setFormDataErrors(initialFormDataErrors);
            setTokenIcon('');
            setTokenIconFileName(undefined);
            setRawImageUrl('');
            setImageUrl(false);
        }
    };
    return (
        <>
            {showConfirmCreateToken && (
                <Modal
                    title={`Your ${
                        createNftCollection
                            ? 'NFT Collection'
                            : isNftMint
                            ? 'NFT'
                            : 'Token'
                    }`}
                    handleOk={createPreviewedToken}
                    handleCancel={() => setShowConfirmCreateToken(false)}
                    showCancelButton
                    height={260}
                >
                    <TokenCreationSummaryTable>
                        <SummaryRow>
                            <TokenParamLabel>Name:</TokenParamLabel>
                            <TokenParam>{formData.name}</TokenParam>
                        </SummaryRow>
                        <SummaryRow>
                            <TokenParamLabel>Ticker:</TokenParamLabel>{' '}
                            <TokenParam>{formData.ticker}</TokenParam>
                        </SummaryRow>
                        {!isNftMint && (
                            <>
                                <SummaryRow>
                                    <TokenParamLabel>Decimals:</TokenParamLabel>
                                    <TokenParam>
                                        {' '}
                                        {formData.decimals}
                                    </TokenParam>
                                </SummaryRow>
                                <SummaryRow>
                                    <TokenParamLabel>Supply:</TokenParamLabel>
                                    <TokenParam>
                                        {decimalizedTokenQtyToLocaleFormat(
                                            formData.genesisQty,
                                            userLocale,
                                        )}
                                        {createWithMintBatonAtIndexTwo
                                            ? ' (variable)'
                                            : ' (fixed)'}
                                    </TokenParam>
                                </SummaryRow>
                            </>
                        )}

                        <SummaryRow>
                            <TokenParamLabel>URL:</TokenParamLabel>
                            <TokenParam>
                                {formData.url === ''
                                    ? tokenConfig.newTokenDefaultUrl
                                    : formData.url}
                            </TokenParam>
                        </SummaryRow>
                        {createNftCollection ||
                            (isNftMint && (
                                <SummaryRow>
                                    <TokenParamLabel>Hash:</TokenParamLabel>
                                    <TokenParam>{formData.hash}</TokenParam>
                                </SummaryRow>
                            ))}
                    </TokenCreationSummaryTable>
                </Modal>
            )}
            {!isNftMint && (
                <CreateTokenTitle>
                    Create {createNftCollection ? 'NFT Collection' : 'Token'}
                </CreateTokenTitle>
            )}

            <Form>
                <Input
                    placeholder={`Enter a name for your ${
                        createNftCollection
                            ? 'NFT collection'
                            : isNftMint
                            ? 'NFT'
                            : 'token'
                    }`}
                    name="name"
                    value={formData.name}
                    handleInput={handleInput}
                    error={formDataErrors.name}
                />
                <Input
                    placeholder={`Enter a ticker for your ${
                        createNftCollection
                            ? 'NFT collection'
                            : isNftMint
                            ? 'NFT'
                            : 'token'
                    }`}
                    name="ticker"
                    value={formData.ticker}
                    handleInput={handleInput}
                    error={formDataErrors.ticker}
                />
                {!isNftMint && (
                    <>
                        <Input
                            placeholder="Enter number of decimal places"
                            name="decimals"
                            type="number"
                            disabled={createNftCollection}
                            value={formData.decimals}
                            handleInput={handleInput}
                            error={formDataErrors.decimals}
                        />
                        <SendTokenInput
                            placeholder={`Enter ${
                                createNftCollection
                                    ? 'NFT collection size'
                                    : 'initial token supply'
                            }`}
                            name="genesisQty"
                            type="string"
                            value={formData.genesisQty}
                            decimals={formData.decimals}
                            handleInput={handleInput}
                            error={formDataErrors.genesisQty}
                            handleOnMax={onMaxGenesis}
                        />
                    </>
                )}
                <Input
                    placeholder={`Enter a website for your ${
                        createNftCollection
                            ? 'NFT collection'
                            : isNftMint
                            ? 'NFT'
                            : 'token'
                    }`}
                    name="url"
                    value={formData.url}
                    handleInput={handleInput}
                    error={formDataErrors.url}
                />
                {createNftCollection ||
                    (isNftMint && (
                        <Input
                            placeholder={`Upload a jpg or png to generate document hash`}
                            name="hash"
                            value={formData.hash}
                            disabled={true}
                            handleInput={handleInput}
                        />
                    ))}
                {!isNftMint && (
                    <SwitchRow>
                        <Switch
                            name="Toggle Mint Baton"
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
                        <SwitchLabel>
                            {createNftCollection
                                ? 'NFT Collection Size'
                                : 'Token supply'}
                        </SwitchLabel>
                    </SwitchRow>
                )}
                <CashtabDragger
                    name="Cashtab Dragger"
                    handleFile={validateTokenIconUpload}
                    imageUrl={imageUrl}
                    nft={isNftMint}
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
                    style={{ marginTop: '30px', marginBottom: '0px' }}
                >
                    {createNftCollection
                        ? 'Create NFT Collection'
                        : isNftMint
                        ? 'Mint NFT'
                        : 'Create eToken'}
                </PrimaryButton>
                {formData.name === '' ||
                    (formData.ticker === '' && (
                        <ButtonDisabledMsg>
                            {isNftMint
                                ? 'NFT'
                                : createNftCollection
                                ? 'NFT Collection'
                                : 'Token'}{' '}
                            must have a name and a ticker
                        </ButtonDisabledMsg>
                    ))}
                {tokenIcon !== '' && tokenIcon.size > ICON_MAX_UPLOAD_BYTES && (
                    <ButtonDisabledMsg>
                        Icon exceeds max upload size of{' '}
                        {ICON_MAX_UPLOAD_BYTES.toLocaleString()} bytes
                    </ButtonDisabledMsg>
                )}
            </Form>
        </>
    );
};

CreateTokenForm.propTypes = {
    nftChildGenesisInput: PropTypes.array,
};

export default CreateTokenForm;
