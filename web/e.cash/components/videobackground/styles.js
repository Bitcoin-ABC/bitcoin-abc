// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import styled from 'styled-components';

export const VideoCtn = styled.div`
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: 0;
    top: 0;
    left: 0;
    video {
        height: 100%;
        width: 100%;
        object-fit: cover;
        position: absolute;
        margin: auto;
        left: 0;
        z-index: -100;
        ${props => props.theme.filters.grayscale};
    }

    .static_frame_mobile {
        width: 100%;
        height: 100%;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        position: absolute;
        margin: auto;
        z-index: -100;
    }

    .video_gradient {
        background: ${props => props.theme.colors.videocover};
        width: 100%;
        height: 100%;
    }
`;
