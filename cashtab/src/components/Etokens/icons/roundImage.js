// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const createImage = url =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', error => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

export default async function getRoundImg(imageSrc, fileName) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(image, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(
        image.width / 2,
        image.height / 2,
        image.height / 2,
        0,
        Math.PI * 2,
    );
    ctx.closePath();
    ctx.fill();
    if (!HTMLCanvasElement.prototype.toBlob) {
        Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
            value: function (callback, type, quality) {
                var dataURL = this.toDataURL(type, quality).split(',')[1];
                setTimeout(function () {
                    var binStr = atob(dataURL),
                        len = binStr.length,
                        arr = new Uint8Array(len);
                    for (var i = 0; i < len; i++) {
                        arr[i] = binStr.charCodeAt(i);
                    }
                    callback(new Blob([arr], { type: type || 'image/png' }));
                });
            },
        });
    }
    return new Promise(resolve => {
        ctx.canvas.toBlob(
            blob => {
                const file = new File([blob], fileName, {
                    type: 'image/png',
                });
                const resultReader = new FileReader();

                resultReader.readAsDataURL(file);

                resultReader.addEventListener('load', () =>
                    resolve({ file, url: resultReader.result }),
                );
            },
            'image/png',
            1,
        );
    });
}
