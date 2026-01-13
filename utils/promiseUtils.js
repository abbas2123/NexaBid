
exports.withTimeout = (promise, ms = 5000, errorMessage = 'Operation timed out') => {
    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(errorMessage)), ms);
    });

    return Promise.race([promise, timeout]);
};
