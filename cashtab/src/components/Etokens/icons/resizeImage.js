const createImage = url =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', error => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

export default async function getResizedImg(imageSrc, callback, fileName) {
    const image = await createImage(imageSrc);

    const width = 512;
    const height = 512;
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
                    callback({ file, url: resultReader.result }),
                );
                resolve();
            },
            'image/png',
            1,
        );
    });
}
