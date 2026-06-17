// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import { createImage, ReaderResult } from './cropImage';

export const TOKEN_ICON_SIZE = 512;

/**
 * Resize an image to the token icon dimensions.
 * The returned File is the final 512x512 PNG posted to token-server and hashed
 * for NFT documentHash. Do not hash earlier pipeline stages.
 */
export default async function getResizedImg(
    imageSrc: string,
    fileName: string,
): Promise<ReaderResult> {
    const image = await createImage(imageSrc);

    const canvas = document.createElement('canvas');
    canvas.width = TOKEN_ICON_SIZE;
    canvas.height = TOKEN_ICON_SIZE;
    const ctx = canvas.getContext('2d');

    if (ctx === null) {
        throw new Error('no ctx');
    }

    ctx.drawImage(image, 0, 0, TOKEN_ICON_SIZE, TOKEN_ICON_SIZE);

    if (!HTMLCanvasElement.prototype.toBlob) {
        Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
            value: function (
                callback: (blob: Blob) => void,
                type: string,
                quality: number,
            ) {
                const dataURL = this.toDataURL(type, quality).split(',')[1];
                setTimeout(function () {
                    const binStr = atob(dataURL),
                        len = binStr.length,
                        arr = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        arr[i] = binStr.charCodeAt(i);
                    }
                    callback(new Blob([arr], { type: type || 'image/png' }));
                });
            },
        });
    }

    const file = await new Promise<File>((resolve, reject) => {
        ctx.canvas.toBlob(
            blob => {
                if (blob === null) {
                    reject(new Error('blob is null'));
                    return;
                }
                resolve(new File([blob], fileName, { type: 'image/png' }));
            },
            'image/png',
            1,
        );
    });

    const url = await new Promise<string>((resolve, reject) => {
        const resultReader = new FileReader();
        resultReader.addEventListener('load', () =>
            resolve(resultReader.result as string),
        );
        resultReader.addEventListener('error', () =>
            reject(resultReader.error),
        );
        resultReader.readAsDataURL(file);
    });

    return { file, url };
}
