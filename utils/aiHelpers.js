/**
 * AI Helper utilities for handling timeouts, retries, and resilience
 */

/**
 * Wrap a promise with a timeout
 * @param {Promise} promise - The promise to wrap
 * @param {number} ms - Timeout in milliseconds
 * @param {string} operationName - Name of operation for error message
 * @returns {Promise} - Resolves with promise result or rejects on timeout
 */
const withTimeout = (promise, ms, operationName = 'Operation') => {
  const timeout = new Promise((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`${operationName} timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]);
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay between retries (default: 10000)
 * @param {Function} options.shouldRetry - Function to determine if error is retryable
 * @param {Function} options.onRetry - Callback called before each retry
 * @returns {Promise} - Result of the function
 */
const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = isRetryableError,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if max attempts reached or error is not retryable
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );

      console.log(
        `[Retry] Attempt ${attempt + 1}/${maxRetries} failed. ` +
        `Retrying in ${Math.round(delay)}ms... Error: ${error.message}`
      );

      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }

      await sleep(delay);
    }
  }

  throw lastError;
};

/**
 * Determine if an error is retryable
 * @param {Error} error - The error to check
 * @returns {boolean} - True if error is retryable
 */
const isRetryableError = (error) => {
  // Network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // OpenAI specific errors that are retryable
  if (error.status) {
    // Rate limiting (429) - should retry
    if (error.status === 429) return true;
    // Server errors (5xx) - should retry
    if (error.status >= 500 && error.status < 600) return true;
    // Bad gateway, service unavailable
    if ([502, 503, 504].includes(error.status)) return true;
  }

  // Timeout errors
  if (error.message && error.message.includes('timed out')) {
    return true;
  }

  // OpenAI overloaded
  if (error.message && error.message.includes('overloaded')) {
    return true;
  }

  return false;
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute an AI operation with timeout and retry
 * Combines both utilities for convenience
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Options
 * @param {number} options.timeout - Timeout in ms (default: 30000)
 * @param {number} options.maxRetries - Max retries (default: 3)
 * @param {string} options.operationName - Name for logging
 * @returns {Promise} - Result of the operation
 */
const executeWithResilience = async (fn, options = {}) => {
  const {
    timeout = 30000,
    maxRetries = 3,
    operationName = 'AI operation',
    onRetry = null
  } = options;

  return retryWithBackoff(
    () => withTimeout(fn(), timeout, operationName),
    {
      maxRetries,
      onRetry: onRetry || ((attempt, error, delay) => {
        console.log(`[${operationName}] Retry ${attempt}/${maxRetries} after error: ${error.message}`);
      })
    }
  );
};

/**
 * Timeout configurations for different AI operations
 */
const AI_TIMEOUTS = {
  RECIPE_GENERATION: 45000,    // GPT-4 can be slow
  CHAT_RESPONSE: 15000,        // GPT-3.5 is faster
  IMAGE_ANALYSIS: 30000,       // GPT-4V
  IMAGE_GENERATION: 60000,     // DALL-E 3 can take time
  CLOUDINARY_UPLOAD: 30000,    // Image upload
};

/**
 * Retry configurations for different scenarios
 */
const RETRY_CONFIGS = {
  DEFAULT: { maxRetries: 3, baseDelay: 1000 },
  AGGRESSIVE: { maxRetries: 5, baseDelay: 500 },
  CONSERVATIVE: { maxRetries: 2, baseDelay: 2000 },
};

module.exports = {
  withTimeout,
  retryWithBackoff,
  isRetryableError,
  sleep,
  executeWithResilience,
  AI_TIMEOUTS,
  RETRY_CONFIGS
};

