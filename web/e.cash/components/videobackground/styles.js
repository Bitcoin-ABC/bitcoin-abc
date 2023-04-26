import styled from 'styled-components';

export const VideoCtn = styled.div`
    width: 100%;
    height: 100vh;
    min-height: 600px;
    position: absolute;
    z-index: 0;
    video {
        height: 100%;
        width: 100%;
        object-fit: cover;
        position: absolute;
        margin: auto;
        z-index: -100;
        ${props => props.theme.filters.grayscale};
    }

    .video_gradient {
        background: ${props => props.theme.colors.videocover};
        width: 100%;
        height: 100%;
    }
`;
