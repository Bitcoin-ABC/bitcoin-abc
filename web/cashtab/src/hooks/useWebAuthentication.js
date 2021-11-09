import { useState, useEffect } from 'react';
import localforage from 'localforage';
import { currency } from '@components/Common/Ticker';
import {
    convertBase64ToArrayBuffer,
    convertArrayBufferToBase64,
} from '@utils/convertArrBuffBase64';

// return an Authentication Object
// OR null if user device does not support Web Authentication
const useWebAuthentication = () => {
    const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);
    // Possible values of isAuthenticationRequired:
    //   true - YES, authentication is required
    //   false - NO, authentication is not required
    //   undefined - has not been set, this is the first time the app runs
    const [isAuthenticationRequired, setIsAuthenticationRequired] =
        useState(undefined);
    const [credentialId, setCredentialId] = useState(null);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [userId, setUserId] = useState(Date.now().toString(16));
    const [loading, setLoading] = useState(true);

    const loadAuthenticationConfigFromLocalStorage = async () => {
        // try to load authentication configuration from local storage
        try {
            return await localforage.getItem('authenticationConfig');
        } catch (err) {
            console.error(
                'Error is localforange.getItem("authenticatonConfig") in loadAuthenticationConfigFromLocalStorage() in useWebAuthentication()',
            );
            // Should stop when attempting to read from localstorage failed
            // countinuing would prompt user to register new credential
            // that would risk overrididing existing credential
            throw err;
        }
    };

    const saveAuthenticationConfigToLocalStorage = () => {
        try {
            return localforage.setItem('authenticationConfig', {
                isAuthenticationRequired,
                userId,
                credentialId,
            });
        } catch (err) {
            console.error(
                'Error is localforange.setItem("authenticatonConfig") in saveAuthenticationConfigToLocalStorage() in useWebAuthentication()',
            );
            throw err;
        }
    };

    // Run Once
    useEffect(async () => {
        // check to see if user device supports User Verification
        const available =
            await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        // only attempt to save/load authentication configuration from local storage if web authetication is supported
        if (available) {
            const authenticationConfig =
                await loadAuthenticationConfigFromLocalStorage();
            // if this is the first time the app is run, then save the default config value
            if (authenticationConfig === null) {
                saveAuthenticationConfigToLocalStorage();
            } else {
                setUserId(authenticationConfig.userId);
                setCredentialId(authenticationConfig.credentialId);
                setIsAuthenticationRequired(
                    authenticationConfig.isAuthenticationRequired,
                );
            }
            // signout the user when the app is not visible (minimize the browser, switch tab, switch app window)
            const handleDocVisibilityChange = () => {
                if (document.visibilityState !== 'visible')
                    setIsSignedIn(false);
            };
            document.addEventListener(
                'visibilitychange',
                handleDocVisibilityChange,
            );

            setIsWebAuthnSupported(available);
            setLoading(false);

            return () => {
                document.removeEventListener(
                    'visibilitychange',
                    handleDocVisibilityChange,
                );
            };
        }
    }, []);

    // save the config whenever it is changed
    useEffect(async () => {
        if (isAuthenticationRequired === undefined) return;
        await saveAuthenticationConfigToLocalStorage();
    }, [isAuthenticationRequired, credentialId]);

    // options for PublicKeyCredentialCreation
    const publicKeyCredentialCreationOptions = {
        // hardcode for now
        // consider generating random string and then verifying it against the reponse from authenticator
        challenge: Uint8Array.from('cashtab-wallet-for-ecash', c =>
            c.charCodeAt(0),
        ),
        rp: {
            name: currency.name,
            id: document.domain,
        },
        user: {
            id: Uint8Array.from(userId, c => c.charCodeAt(0)),
            name: `Local User`,
            displayName: 'Local User',
        },
        pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -35, type: 'public-key' },
            { alg: -36, type: 'public-key' },
            { alg: -257, type: 'public-key' },
            { alg: -258, type: 'public-key' },
            { alg: -259, type: 'public-key' },
            { alg: -37, type: 'public-key' },
            { alg: -38, type: 'public-key' },
            { alg: -39, type: 'public-key' },
            { alg: -8, type: 'public-key' },
        ],
        authenticatorSelection: {
            userVerification: 'required',
            authenticatorAttachment: 'platform',
            requireResidentKey: false,
        },
        timeout: 60000,
        attestation: 'none',
        excludeCredentials: [],
        extensions: {},
    };

    // options for PublicKeyCredentialRequest
    const publickKeyRequestOptions = {
        // hardcode for now
        // consider generating random string and then verifying it against the reponse from authenticator
        challenge: Uint8Array.from('cashtab-wallet-for-ecash', c =>
            c.charCodeAt(0),
        ),
        timeout: 60000,
        // rpId: document.domain,
        allowCredentials: [
            {
                type: 'public-key',
                // the credentialId is stored as base64
                // need to convert it to ArrayBuffer
                id: convertBase64ToArrayBuffer(credentialId),
                transports: ['internal'],
            },
        ],
        userVerification: 'required',
        extensions: {},
    };

    const authentication = {
        isAuthenticationRequired,
        credentialId,
        isSignedIn,
        loading,
        turnOnAuthentication: () => {
            // Need to make sure that the credetialId is set
            // before turning on the authentication requirement
            // otherwise, user will be locked out of the app
            // in other words, user must sign up / register first
            if (credentialId) {
                setIsAuthenticationRequired(true);
            }
        },
        turnOffAuthentication: () => {
            setIsAuthenticationRequired(false);
        },

        signUp: async () => {
            try {
                const publicKeyCredential = await navigator.credentials.create({
                    publicKey: publicKeyCredentialCreationOptions,
                });
                if (publicKeyCredential) {
                    // convert the rawId from ArrayBuffer to base64 String
                    const base64Id = convertArrayBufferToBase64(
                        publicKeyCredential.rawId,
                    );
                    setIsSignedIn(true);
                    setCredentialId(base64Id);
                    setIsAuthenticationRequired(true);
                } else {
                    throw new Error(
                        'Error: navigator.credentials.create() returns null, in signUp()',
                    );
                }
            } catch (err) {
                throw err;
            }
        },

        signIn: async () => {
            try {
                const assertion = await navigator.credentials.get({
                    publicKey: publickKeyRequestOptions,
                });
                if (assertion) {
                    // convert rawId from ArrayBuffer to base64 String
                    const base64Id = convertArrayBufferToBase64(
                        assertion.rawId,
                    );
                    if (base64Id === credentialId) setIsSignedIn(true);
                } else {
                    throw new Error(
                        'Error: navigator.credentials.get() returns null, signIn()',
                    );
                }
            } catch (err) {
                throw err;
            }
        },

        signOut: () => {
            setIsSignedIn(false);
        },
    };

    // Web Authentication support on a user's device may become unavailable due to various reasons
    // (hardware failure, OS problems, the behaviour of some authenticators after several failed authentication attempts, etc)
    // If this is the case, and user has previous enabled the lock, the decision here is to lock up the wallet.
    // Otherwise, malicious user needs to simply disbale the platform authenticator to gain access to the wallet
    return !isWebAuthnSupported && !isAuthenticationRequired
        ? null
        : authentication;
};

export default useWebAuthentication;
