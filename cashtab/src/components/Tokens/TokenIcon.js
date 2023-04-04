import React from 'react';
import PropTypes from 'prop-types';
import makeBlockie from 'ethereum-blockies-base64';
import { Img } from 'react-image';
import { currency } from 'components/Common/Ticker';

const TokenIcon = ({ size, tokenId }) => {
    return (
        <>
            <Img
                src={`${currency.tokenIconsUrl}/${size}/${tokenId}.png`}
                width={size}
                height={size}
                unloader={
                    <img
                        alt={`identicon of tokenId ${tokenId} `}
                        height="32"
                        width="32"
                        style={{
                            borderRadius: '50%',
                        }}
                        key={`identicon-${tokenId}`}
                        src={makeBlockie(tokenId)}
                    />
                }
            />
        </>
    );
};
TokenIcon.propTypes = {
    size: PropTypes.oneOf([32, 64, 128, 256, 512]),
    tokenId: PropTypes.string,
};

export default TokenIcon;
