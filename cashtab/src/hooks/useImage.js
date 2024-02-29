// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const useImage = () => {
    const createImage = url =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', error => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getResizedImg = async (imageSrc, callback, fileName) => {
        const image = await createImage(imageSrc);

        const width = 128;
        const height = 128;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.drawImage(image, 0, 0, width, height);
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
                        callback(
                            new Blob([arr], { type: type || 'image/png' }),
                        );
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
                        callback({ file, url: resultReader.result }),
                    );
                    resolve();
                },
                'image/png',
                1,
            );
        });
    };

    const getRoundImg = async (imageSrc, fileName) => {
        const image = await createImage(imageSrc);
        console.log('image :', image);
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
                        callback(
                            new Blob([arr], { type: type || 'image/png' }),
                        );
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
    };

    const getRadianAngle = degreeValue => {
        return (degreeValue * Math.PI) / 180;
    };

    const getCroppedImg = async (
        imageSrc,
        pixelCrop,
        rotation = 0,
        fileName,
    ) => {
        const image = await createImage(imageSrc);
        console.log('image :', image);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const maxSize = Math.max(image.width, image.height);
        const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

        canvas.width = safeArea;
        canvas.height = safeArea;

        ctx.translate(safeArea / 2, safeArea / 2);
        ctx.rotate(getRadianAngle(rotation));
        ctx.translate(-safeArea / 2, -safeArea / 2);

        ctx.drawImage(
            image,
            safeArea / 2 - image.width * 0.5,
            safeArea / 2 - image.height * 0.5,
        );
        const data = ctx.getImageData(0, 0, safeArea, safeArea);

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.putImageData(
            data,
            0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x,
            0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y,
        );

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
                        callback(
                            new Blob([arr], { type: type || 'image/png' }),
                        );
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
    };

    return {
        getCroppedImg,
        getRadianAngle,
        getRoundImg,
        getResizedImg,
    };
};

export default useImage;
