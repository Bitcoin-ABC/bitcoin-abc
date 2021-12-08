import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { AntdFormWrapper } from '@components/Common/EnhancedInputs';
import { TokenCollapse } from '@components/Common/StyledCollapse';
import { currency } from '@components/Common/Ticker.js';
import {
    CropControlModal,
    CropperContainer,
    ControlsContainer,
} from '../Common/CropControlModal';
import { WalletContext } from '@utils/context';
import {
    isValidTokenName,
    isValidTokenTicker,
    isValidTokenDecimals,
    isValidTokenInitialQty,
    isValidTokenDocumentUrl,
} from '@utils/validation';
import {
    PlusSquareOutlined,
    UploadOutlined,
    PaperClipOutlined,
} from '@ant-design/icons';
import { SmartButton } from '@components/Common/PrimaryButton';
import {
    notification,
    Collapse,
    Form,
    Input,
    Modal,
    Button,
    Slider,
    Tooltip,
    Upload,
    Typography,
    Switch,
} from 'antd';
const { Panel } = Collapse;
import { TokenParamLabel } from '@components/Common/Atoms';
import {
    createTokenNotification,
    tokenIconSubmitSuccess,
    errorNotification,
} from '@components/Common/Notifications';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@utils/icons/cropImage';
import getRoundImg from '@utils/icons/roundImage';
import getResizedImage from '@utils/icons/resizeImage';
const { Dragger } = Upload;

const CreateTokenForm = ({
    BCH,
    getRestUrl,
    createToken,
    disabled,
    passLoadingStatus,
}) => {
    const { wallet } = React.useContext(WalletContext);

    // eToken icon adds
    const [tokenIcon, setTokenIcon] = useState('');
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState('');
    const [tokenIconFileList, setTokenIconFileList] = useState();
    const [rawImageUrl, setRawImageUrl] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [showCropModal, setShowCropModal] = useState(false);
    const [roundSelection, setRoundSelection] = useState(true);

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

                const width = 128;
                const height = 128;
                reader.readAsDataURL(imgFile);

                reader.addEventListener('load', () =>
                    setRawImageUrl(reader.result),
                );

                reader.onload = event => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        const elem = document.createElement('canvas');
                        //console.log(`Canvas created`);
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
                                console.log(imgFile.name);

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
                console.log(`Error in handleTokenIconImage()`);
                console.log(err);
                reject(err);
            }
        });

    const transformTokenIconFile = file => {
        return new Promise((resolve, reject) => {
            reject();
            // setLoading(false);
        });
    };

    const beforeTokenIconUpload = file => {
        const approvedFileTypes = ['image/png', 'image/jpg', 'image/jpeg'];
        try {
            if (!approvedFileTypes.includes(file.type)) {
                throw new Error('Only jpg or png image files are accepted');
            } else {
                setLoading(true);
                handleTokenIconImage(file, imageUrl => setImageUrl(imageUrl));
            }
        } catch (e) {
            console.error('error', e);

            Modal.error({
                title: 'Icon Upload Error',
                content: e.message || e.error || JSON.stringify(e),
            });
            setTokenIconFileList(undefined);
            setTokenIcon(undefined);
            setImageUrl('');
            return false;
        }
    };

    const handleChangeTokenIconUpload = info => {
        let list = [...info.fileList];

        if (info.file.type.split('/')[0] !== 'image') {
            setTokenIconFileList(undefined);
            setImageUrl('');
        } else {
            setTokenIconFileList(list.slice(-1));
        }
    };

    //end eToken icon adds

    // New Token Name
    const [newTokenName, setNewTokenName] = useState('');
    const [newTokenNameIsValid, setNewTokenNameIsValid] = useState(null);
    const handleNewTokenNameInput = e => {
        const { value } = e.target;
        // validation
        setNewTokenNameIsValid(isValidTokenName(value));
        setNewTokenName(value);
    };

    // New Token Ticker
    const [newTokenTicker, setNewTokenTicker] = useState('');
    const [newTokenTickerIsValid, setNewTokenTickerIsValid] = useState(null);
    const handleNewTokenTickerInput = e => {
        const { value } = e.target;
        // validation
        setNewTokenTickerIsValid(isValidTokenTicker(value));
        setNewTokenTicker(value);
    };

    // New Token Decimals
    const [newTokenDecimals, setNewTokenDecimals] = useState(0);
    const [newTokenDecimalsIsValid, setNewTokenDecimalsIsValid] =
        useState(true);
    const handleNewTokenDecimalsInput = e => {
        const { value } = e.target;
        // validation
        setNewTokenDecimalsIsValid(isValidTokenDecimals(value));
        // Also validate the supply here if it has not yet been set
        if (newTokenInitialQtyIsValid !== null) {
            setNewTokenInitialQtyIsValid(
                isValidTokenInitialQty(value, newTokenDecimals),
            );
        }

        setNewTokenDecimals(value);
    };

    // New Token Initial Quantity
    const [newTokenInitialQty, setNewTokenInitialQty] = useState('');
    const [newTokenInitialQtyIsValid, setNewTokenInitialQtyIsValid] =
        useState(null);
    const handleNewTokenInitialQtyInput = e => {
        const { value } = e.target;
        // validation
        setNewTokenInitialQtyIsValid(
            isValidTokenInitialQty(value, newTokenDecimals),
        );
        setNewTokenInitialQty(value);
    };
    // New Token document URL
    const [newTokenDocumentUrl, setNewTokenDocumentUrl] = useState('');
    // Start with this as true, field is not required
    const [newTokenDocumentUrlIsValid, setNewTokenDocumentUrlIsValid] =
        useState(true);

    const handleNewTokenDocumentUrlInput = e => {
        const { value } = e.target;
        // validation
        setNewTokenDocumentUrlIsValid(isValidTokenDocumentUrl(value));
        setNewTokenDocumentUrl(value);
    };

    // New Token fixed supply
    // Only allow creation of fixed supply tokens until Minting support is added

    // New Token document hash
    // Do not include this; questionable value to casual users and requires significant complication

    // Only enable CreateToken button if all form entries are valid
    let tokenGenesisDataIsValid =
        newTokenNameIsValid &&
        newTokenTickerIsValid &&
        newTokenDecimalsIsValid &&
        newTokenInitialQtyIsValid &&
        newTokenDocumentUrlIsValid;

    // Modal settings
    const [showConfirmCreateToken, setShowConfirmCreateToken] = useState(false);

    const submitTokenIcon = async link => {
        // Get the tokenId from link
        const newlyMintedTokenId = link.substr(link.length - 64);

        let formData = new FormData();

        const data = {
            newTokenName,
            newTokenTicker,
            newTokenDecimals,
            newTokenDocumentUrl,
            newTokenInitialQty,
            tokenIcon,
        };
        for (let key in data) {
            formData.append(key, data[key]);
        }
        // Would get tokenId here
        //formData.append('tokenId', link.substr(link.length - 64));
        // for now, hard code it
        formData.append('tokenId', newlyMintedTokenId);

        console.log(formData);

        try {
            const tokenIconApprovalResponse = await fetch(
                currency.tokenIconSubmitApi,
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

            if (!tokenIconApprovalResponseJson.approvalRequested) {
                // If the backend returns a specific error msg along with "approvalRequested = false", throw that error
                // You may want to customize how the app reacts to different cases
                if (tokenIconApprovalResponseJson.msg) {
                    throw new Error(tokenIconApprovalResponseJson.msg);
                } else {
                    throw new Error('Error in uploading token icon');
                }
            }

            tokenIconSubmitSuccess();
        } catch (err) {
            console.error(err.message);
            errorNotification(
                err,
                err.message,
                'Submitting icon for approval while creating a new eToken',
            );
        }
    };
    const createPreviewedToken = async () => {
        passLoadingStatus(true);
        // If data is for some reason not valid here, bail out
        if (!tokenGenesisDataIsValid) {
            return;
        }

        // data must be valid and user reviewed to get here
        const configObj = {
            name: newTokenName,
            ticker: newTokenTicker,
            documentUrl:
                newTokenDocumentUrl === ''
                    ? currency.newTokenDefaultUrl
                    : newTokenDocumentUrl,
            decimals: newTokenDecimals,
            initialQty: newTokenInitialQty,
            documentHash: '',
        };

        // create token with data in state fields
        try {
            const link = await createToken(
                BCH,
                wallet,
                currency.defaultFee,
                configObj,
            );
            createTokenNotification(link);

            // If this eToken has an icon, upload to server
            if (tokenIcon !== '') {
                submitTokenIcon(link);
            }
        } catch (e) {
            // Set loading to false here as well, as balance may not change depending on where error occured in try loop
            passLoadingStatus(false);
            let message;

            if (!e.error && !e.message) {
                message = `Transaction failed: no response from ${getRestUrl()}.`;
            } else if (
                /Could not communicate with full node or other external service/.test(
                    e.error,
                )
            ) {
                message = 'Could not communicate with API. Please try again.';
            } else if (
                e.error &&
                e.error.includes(
                    'too-long-mempool-chain, too many unconfirmed ancestors [limit: 50] (code 64)',
                )
            ) {
                message = `The ${currency.ticker} you are trying to send has too many unconfirmed ancestors to send (limit 50). Sending will be possible after a block confirmation. Try again in about 10 minutes.`;
            } else {
                message = e.message || e.error || JSON.stringify(e);
            }
            errorNotification(e, message, 'Creating eToken');
        }
        // Hide the modal
        setShowConfirmCreateToken(false);
        // Stop spinner
        passLoadingStatus(false);
    };
    return (
        <>
            <Modal
                title={`Please review and confirm your token settings.`}
                visible={showConfirmCreateToken}
                onOk={createPreviewedToken}
                onCancel={() => setShowConfirmCreateToken(false)}
            >
                <TokenParamLabel>Name:</TokenParamLabel> {newTokenName}
                <br />
                <TokenParamLabel>Ticker:</TokenParamLabel> {newTokenTicker}
                <br />
                <TokenParamLabel>Decimals:</TokenParamLabel> {newTokenDecimals}
                <br />
                <TokenParamLabel>Supply:</TokenParamLabel> {newTokenInitialQty}
                <br />
                <TokenParamLabel>Document URL:</TokenParamLabel>{' '}
                {newTokenDocumentUrl === ''
                    ? currency.newTokenDefaultUrl
                    : newTokenDocumentUrl}
                <br />
            </Modal>
            <>
                <TokenCollapse
                    collapsible={disabled ? 'disabled' : true}
                    disabled={disabled}
                    style={{
                        marginBottom: '24px',
                    }}
                >
                    <Panel header="Create eToken" key="1">
                        <AntdFormWrapper>
                            <Form
                                size="small"
                                style={{
                                    width: 'auto',
                                }}
                            >
                                <Form.Item
                                    validateStatus={
                                        newTokenNameIsValid === null ||
                                        newTokenNameIsValid
                                            ? ''
                                            : 'error'
                                    }
                                    help={
                                        newTokenNameIsValid === null ||
                                        newTokenNameIsValid
                                            ? ''
                                            : 'Token name must be a string between 1 and 68 characters long'
                                    }
                                >
                                    <Input
                                        addonBefore="Name"
                                        placeholder="Enter a name for your token"
                                        name="newTokenName"
                                        value={newTokenName}
                                        onChange={e =>
                                            handleNewTokenNameInput(e)
                                        }
                                    />
                                </Form.Item>
                                <Form.Item
                                    validateStatus={
                                        newTokenTickerIsValid === null ||
                                        newTokenTickerIsValid
                                            ? ''
                                            : 'error'
                                    }
                                    help={
                                        newTokenTickerIsValid === null ||
                                        newTokenTickerIsValid
                                            ? ''
                                            : 'Ticker must be a string between 1 and 12 characters long'
                                    }
                                >
                                    <Input
                                        addonBefore="Ticker"
                                        placeholder="Enter a ticker for your token"
                                        name="newTokenTicker"
                                        value={newTokenTicker}
                                        onChange={e =>
                                            handleNewTokenTickerInput(e)
                                        }
                                    />
                                </Form.Item>
                                <Form.Item
                                    validateStatus={
                                        newTokenDecimalsIsValid === null ||
                                        newTokenDecimalsIsValid
                                            ? ''
                                            : 'error'
                                    }
                                    help={
                                        newTokenDecimalsIsValid === null ||
                                        newTokenDecimalsIsValid
                                            ? ''
                                            : 'Token decimals must be an integer between 0 and 9'
                                    }
                                >
                                    <Input
                                        addonBefore="Decimals"
                                        placeholder="Enter number of decimal places"
                                        name="newTokenDecimals"
                                        type="number"
                                        value={newTokenDecimals}
                                        onChange={e =>
                                            handleNewTokenDecimalsInput(e)
                                        }
                                    />
                                </Form.Item>
                                <Form.Item
                                    validateStatus={
                                        newTokenInitialQtyIsValid === null ||
                                        newTokenInitialQtyIsValid
                                            ? ''
                                            : 'error'
                                    }
                                    help={
                                        newTokenInitialQtyIsValid === null ||
                                        newTokenInitialQtyIsValid
                                            ? ''
                                            : 'Token supply must be greater than 0 and less than 100,000,000,000. Token supply decimal places cannot exceed token decimal places.'
                                    }
                                >
                                    <Input
                                        addonBefore="Supply"
                                        placeholder="Enter the fixed supply of your token"
                                        name="newTokenInitialQty"
                                        type="number"
                                        value={newTokenInitialQty}
                                        onChange={e =>
                                            handleNewTokenInitialQtyInput(e)
                                        }
                                    />
                                </Form.Item>
                                <Form.Item
                                    validateStatus={
                                        newTokenDocumentUrlIsValid === null ||
                                        newTokenDocumentUrlIsValid
                                            ? ''
                                            : 'error'
                                    }
                                    help={
                                        newTokenDocumentUrlIsValid === null ||
                                        newTokenDocumentUrlIsValid
                                            ? ''
                                            : 'Must be valid URL. Cannot exceed 68 characters.'
                                    }
                                >
                                    <Input
                                        addonBefore="Document URL"
                                        placeholder="Enter a website for your token"
                                        name="newTokenDocumentUrl"
                                        value={newTokenDocumentUrl}
                                        onChange={e =>
                                            handleNewTokenDocumentUrlInput(e)
                                        }
                                    />
                                </Form.Item>
                                <Form.Item>
                                    <Dragger
                                        multiple={false}
                                        transformFile={transformTokenIconFile}
                                        beforeUpload={beforeTokenIconUpload}
                                        onChange={handleChangeTokenIconUpload}
                                        onRemove={() => false}
                                        fileList={tokenIconFileList}
                                        name="tokenIcon"
                                        style={{
                                            backgroundColor: '#f4f4f4',
                                        }}
                                    >
                                        {imageUrl ? (
                                            <img
                                                src={imageUrl}
                                                alt="avatar"
                                                style={{ width: '128px' }}
                                            />
                                        ) : (
                                            <>
                                                {' '}
                                                <UploadOutlined />
                                                <p>
                                                    Click, or drag file to this
                                                    area to upload
                                                </p>
                                                <p style={{ fontSize: '12px' }}>
                                                    Only jpg or png accepted
                                                </p>
                                            </>
                                        )}
                                    </Dragger>

                                    {!loading && tokenIcon && (
                                        <>
                                            <Tooltip title={tokenIcon.name}>
                                                <Typography.Paragraph
                                                    ellipsis
                                                    style={{
                                                        lineHeight: 'normal',
                                                        textAlign: 'center',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() =>
                                                        setShowCropModal(true)
                                                    }
                                                >
                                                    <PaperClipOutlined />
                                                    {tokenIcon.name}
                                                </Typography.Paragraph>
                                                <Typography.Paragraph
                                                    ellipsis
                                                    style={{
                                                        lineHeight: 'normal',
                                                        textAlign: 'center',
                                                        marginBottom: '10px',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() =>
                                                        setShowCropModal(true)
                                                    }
                                                >
                                                    Click here to crop or zoom
                                                    your icon
                                                </Typography.Paragraph>
                                            </Tooltip>{' '}
                                        </>
                                    )}

                                    <CropControlModal
                                        style={{
                                            textAlign: 'left',
                                        }}
                                        expand={showCropModal}
                                        onClick={() => null}
                                        renderExpanded={() => (
                                            <>
                                                {' '}
                                                <CropperContainer>
                                                    <Cropper
                                                        showGrid={false}
                                                        zoomWithScroll={false}
                                                        image={rawImageUrl}
                                                        crop={crop}
                                                        zoom={zoom}
                                                        rotation={rotation}
                                                        cropShape={
                                                            roundSelection
                                                                ? 'round'
                                                                : 'rect'
                                                        }
                                                        aspect={1 / 1}
                                                        onCropChange={setCrop}
                                                        onCropComplete={
                                                            onCropComplete
                                                        }
                                                        onZoomChange={setZoom}
                                                        onRotationChange={
                                                            setRotation
                                                        }
                                                        style={{ top: '80px' }}
                                                    />
                                                </CropperContainer>
                                                <ControlsContainer>
                                                    <Switch
                                                        id="cropSwitch"
                                                        checkedChildren="Square"
                                                        unCheckedChildren="Round"
                                                        name="cropShape"
                                                        onChange={checked =>
                                                            setRoundSelection(
                                                                !checked,
                                                            )
                                                        }
                                                    />{' '}
                                                    <br />
                                                    {'Zoom:'}
                                                    <Slider
                                                        defaultValue={1}
                                                        onChange={zoom =>
                                                            setZoom(zoom)
                                                        }
                                                        min={1}
                                                        max={10}
                                                        step={0.1}
                                                    />
                                                    {'Rotation:'}
                                                    <Slider
                                                        defaultValue={0}
                                                        onChange={rotation =>
                                                            setRotation(
                                                                rotation,
                                                            )
                                                        }
                                                        min={0}
                                                        max={360}
                                                        step={1}
                                                    />
                                                    <Button
                                                        id="cropControlsConfirm"
                                                        onClick={() =>
                                                            showCroppedImage() &&
                                                            onClose()
                                                        }
                                                    >
                                                        OK
                                                    </Button>
                                                </ControlsContainer>
                                            </>
                                        )}
                                        onClose={onClose}
                                    />
                                </Form.Item>
                            </Form>
                        </AntdFormWrapper>
                        <SmartButton
                            onClick={() => setShowConfirmCreateToken(true)}
                            disabled={!tokenGenesisDataIsValid}
                        >
                            <PlusSquareOutlined />
                            &nbsp;Create eToken
                        </SmartButton>
                    </Panel>
                </TokenCollapse>
            </>
        </>
    );
};

/*
passLoadingStatus must receive a default prop that is a function
in order to pass the rendering unit test in CreateTokenForm.test.js

status => {console.log(status)} is an arbitrary stub function
*/

CreateTokenForm.defaultProps = {
    passLoadingStatus: status => {
        console.log(status);
    },
};

CreateTokenForm.propTypes = {
    BCH: PropTypes.object,
    getRestUrl: PropTypes.func,
    createToken: PropTypes.func,
    disabled: PropTypes.bool,
    passLoadingStatus: PropTypes.func,
};

export default CreateTokenForm;
