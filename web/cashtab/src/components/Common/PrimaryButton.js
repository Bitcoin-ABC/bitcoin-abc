import styled from 'styled-components';

const PrimaryButton = styled.button`
    border: none;
    color: #fff;
    background-image: linear-gradient(270deg, #ff8d00 0%, #bb5a00 100%);
    transition: all 0.5s ease;
    background-size: 200% auto;
    font-size: 18px;
    width: 100%;
    padding: 20px 0;
    border-radius: 4px;
    margin-bottom: 20px;
    cursor: pointer;
    :hover {
        background-position: right center;
        -webkit-box-shadow: 0px 3px 10px -5px rgba(0, 0, 0, 0.75);
        -moz-box-shadow: 0px 3px 10px -5px rgba(0, 0, 0, 0.75);
        box-shadow: 0px 3px 10px -5px rgba(0, 0, 0, 0.75);
    }
    svg {
        fill: #fff;
    }
    @media (max-width: 768px) {
        font-size: 16px;
        padding: 15px 0;
    }
`;

const SecondaryButton = styled.button`
    border: none;
    color: #444;
    background: #e9eaed;
    transition: all 0.5s ease;
    font-size: 18px;
    width: 100%;
    padding: 15px 0;
    border-radius: 4px;
    cursor: pointer;
    outline: none;
    margin-bottom: 20px;
    :hover {
        -webkit-box-shadow: 0px 3px 10px -5px rgba(0, 0, 0, 0.75);
        -moz-box-shadow: 0px 3px 10px -5px rgba(0, 0, 0, 0.75);
        box-shadow: 0px 3px 10px -5px rgba(0, 0, 0, 0.75);
    }
    svg {
        fill: #444;
    }
    @media (max-width: 768px) {
        font-size: 16px;
        padding: 12px 0;
    }
`;

const SmartButton = styled.button`
    background-image: ${({ disabled = false }) =>
        disabled === true
            ? 'none'
            : 'linear-gradient(270deg, #ff8d00 0%, #bb5a00 100%);'};
    color: ${({ disabled = false }) => (disabled === true ? '#444;' : '#fff;')};
    background: ${({ disabled = false }) =>
        disabled === true ? '#e9eaed;' : ''};
    border: none;
    transition: all 0.5s ease;
    font-size: 18px;
    width: 100%;
    padding: 15px 0;
    border-radius: 4px;
    cursor: pointer;
    outline: none;
    margin-bottom: 20px;
    :hover {
        -webkit-box-shadow: 0px 3px 10px -5px rgba(0, 0, 0, 0.75);
        -moz-box-shadow: 0px 3px 10px -5px rgba(0, 0, 0, 0.75);
        box-shadow: 0px 3px 10px -5px rgba(0, 0, 0, 0.75);
    }
    svg {
        fill: #444;
    }
    @media (max-width: 768px) {
        font-size: 16px;
        padding: 12px 0;
    }
`;

export default PrimaryButton;
export { SecondaryButton, SmartButton };
