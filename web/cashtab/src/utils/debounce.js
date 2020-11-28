export default (routine, timeout = 500) => {
    let timeoutId;

    return (...args) => {
        return new Promise((resolve, reject) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(
                () => Promise.resolve(routine(...args)).then(resolve, reject),
                timeout,
            );
        });
    };
};
