import crypto from 'crypto'; // Built-in module for generating request IDs

/**
 * Adaptive request logging middleware for Express.
 * Logs plain text in development and structured JSON in production.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {Function} next - Next middleware function.
 */
function requestLogger(req, res, next) {
    const isProduction = process.env.NODE_ENV === 'production';
    const startTime = process.hrtime.bigint();
    const timestamp = new Date().toISOString();

    // Generate a unique Request ID using the built-in crypto module
    const requestId = crypto.randomUUID();
// @ts-ignore
    req.id = requestId; // Make ID available on the request object
    res.setHeader('X-Request-Id', requestId); // Set header for client/proxy awareness

    const { method, originalUrl, ip  } = req;
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Function to log request details
    const logRequest = () => {
        res.removeListener('finish', logRequest);
        res.removeListener('error', logOnError);

        const endTime = process.hrtime.bigint();
        const durationMs = Number(endTime - startTime) / 1_000_000;
        const { statusCode } = res;
        const requestSize = req.get('content-length') ? parseInt(String(req.get('content-length')), 10) : 0;
        const responseSize = res.getHeader('Content-Length') ? parseInt(String(res.getHeader('Content-Length')), 10) : 0;

        /**
         * convert bytes to human-readable format
         * @param {number} bytes 
         * @returns {string}
         */
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const formattedRequestSize = formatBytes(requestSize);
        const formattedResponseSize = formatBytes(responseSize);
        if (isProduction) {
            const logEntry = {
                level: statusCode >= 400 ? 'warn' : 'info',
                timestamp,
                requestId,
                method,
                url: originalUrl,
                status: statusCode,
                responseTimeMs: parseFloat(durationMs.toFixed(3)),
                remoteAddress: ip,
                userAgent,
                message: ${method} ${originalUrl} ${statusCode} ${durationMs.toFixed(3)}ms,
            };
            console.log(JSON.stringify(logEntry));
        } else {
            const logPrefix = 'DEV ::';
            const shortRequestId = requestId.substring(0, 8);
            console.log(
                ${logPrefix} ${method} ${originalUrl} - ${statusCode} (${durationMs.toFixed(2)} ms) (${formattedRequestSize} ${formattedResponseSize}) [ReqID: ${shortRequestId}]
            );
        }
    };

    // Function to handle response stream errors
    /**
     * 
     * @param {string} err 
     */
    const logOnError = (err) => {
        res.removeListener('finish', logRequest);
        res.removeListener('error', logOnError);
        console.error([RequestLogger] Response stream error for Request ID ${requestId}:, err);
        logRequest();
    };

    res.on('finish', logRequest);
    res.on('error', logOnError);

    next();
}

export { requestLogger };