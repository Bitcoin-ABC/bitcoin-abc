export const convertArrayBufferToBase64 = buffer => {
    // convert the buffer from ArrayBuffer to Array of 8-bit unsigned integers
    const dataView = new Uint8Array(buffer);
    // convert the Array of 8-bit unsigned integers to a String
    const dataStr = dataView.reduce(
        (str, cur) => str + String.fromCharCode(cur),
        '',
    );
    // convert String to base64
    return window.btoa(dataStr);
};

export const convertBase64ToArrayBuffer = base64Str => {
    // convert base64 String to normal String
    const dataStr = window.atob(base64Str);
    // convert the String to an Array of 8-bit unsigned integers
    const dataView = Uint8Array.from(dataStr, char => char.charCodeAt(0));
    return dataView.buffer;
};
