import React from 'react';
import styled from 'styled-components';

export const PrivacyCtn = styled.div`
    width: 100%;
    margin-top: 100px;
    h1,
    p {
        color: ${props => props.theme.contrast};
        margin: 0 0 20px;
    }
`;

const PrivacyLink = styled.a`
    text-decoration: underline;
    color: ${props => props.theme.eCashBlue};
    :visited {
        text-decoration: underline;
        color: ${props => props.theme.eCashBlue};
    }
    :hover {
        color: ${props => props.theme.eCashPurple};
    }
`;

const Privacy = () => {
    return (
        <>
            <PrivacyCtn>
                <h1>Privacy Policy</h1>
                <p>Cashtab uses Google Analytics to analyze traffic.</p>{' '}
                <p>That&lsquo;s it.</p>
                <p>
                    Note: Cashtab is{' '}
                    <PrivacyLink
                        type="link"
                        href="https://reviews.bitcoinabc.org/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        open source.
                    </PrivacyLink>
                </p>
            </PrivacyCtn>
        </>
    );
};

export default Privacy;
