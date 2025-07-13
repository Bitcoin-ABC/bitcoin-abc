// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { Request } from 'express';

interface IsTokenImageRequestReturn {
    description: string;
    req: Request;
    returned: boolean;
}

interface IsTokenImageRequestVector {
    returns: IsTokenImageRequestReturn[];
}

interface IsValidTokenIdVector {
    returns: IsValidTokenIdReturn[];
}

interface IsValidTokenIdReturn {
    description: string;
    string: string;
    returned: boolean;
}

interface TestVectors {
    isTokenImageRequest: IsTokenImageRequestVector;
    isValidTokenId: IsValidTokenIdVector;
}

const vectors: TestVectors = {
    // validation.ts
    isTokenImageRequest: {
        returns: [
            {
                description: 'Expected token icon request is identified',
                req: {
                    url: '/512/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109.png',
                } as Request,
                returned: true,
            },
            {
                description:
                    'Expected token icon request is valid for any size, as long as it contains numbers only',
                req: {
                    url: '/123456789/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109.png',
                } as Request,
                returned: true,
            },
            {
                description: 'A non-number size is invalid',
                req: {
                    url: '/sometext/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109.png',
                } as Request,
                returned: false,
            },
            {
                description: 'Additional route prefixes are invalid',
                req: {
                    url: '/tokenicons/512/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109.png',
                } as Request,
                returned: false,
            },
            {
                description:
                    'Since the server only stores images as png, we do not recognize requests for other asset types',
                req: {
                    url: '/512/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d109.jpg',
                } as Request,
                returned: false,
            },
            {
                description:
                    'If tokenId is not 64 characters, it is not a token icon request',
                req: {
                    url: '/512/3fee3384150b030490b7bee095a63900f66a45f2d8e3002ae2cf17ce3ef4d10.png',
                } as Request,
                returned: false,
            },
            {
                description: 'non-hex string is not a token icon request',
                req: {
                    url: '/512/somehexstring.png',
                } as Request,
                returned: false,
            },
        ],
    },
    isValidTokenId: {
        returns: [
            {
                description: 'Valid tokenId',
                string: '0000000000000000000000000000000000000000000000000000000000000000',
                returned: true,
            },
            {
                description: 'Valid hex but 63 chars is invalid',
                string: '000000000000000000000000000000000000000000000000000000000000000',
                returned: false,
            },
            {
                description: 'Valid hex but 31 bytes (62 chars) is invalid',
                string: '00000000000000000000000000000000000000000000000000000000000000',
                returned: false,
            },
            {
                description: 'Valid hex but 65 chars is invalid',
                string: '00000000000000000000000000000000000000000000000000000000000000000',
                returned: false,
            },
            {
                description: 'Valid hex but 33 bytes (66 chars) is invalid',
                string: '000000000000000000000000000000000000000000000000000000000000000000',
                returned: false,
            },
            {
                description: 'Valid length but invalid hex is invalid',
                string: 'g000000000000000000000000000000000000000000000000000000000000000',
                returned: false,
            },
            {
                description:
                    'Cashtab test that passes without regex anchors (invalid length)',
                string: '111111111c6c9c64d70b285befe733f175d0f384538576876bd280b10587df81279d3f5e',
                returned: false,
            },
            {
                description: 'Empty string is invalid',
                string: '',
                returned: false,
            },
        ],
    },
};

export default vectors;
