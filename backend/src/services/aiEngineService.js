const axios = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');
const logger = require('../utils/logger');

const pythonClient = axios.create({
  baseURL: process.env.PYTHON_ENGINE_URL || 'http://localhost:8000',
  timeout: 2000,
  headers: { 'Content-Type': 'application/json' }
});

// Configure robust retry logic (3 retries with exponential backoff)
axiosRetry(pythonClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
  },
  onRetry: (retryCount, error, requestConfig) => {
    logger.warn(`Retrying Python AI Engine request attempt #${retryCount} to ${requestConfig.url}: ${error.message}`);
  }
});

const callOptimizeRoute = async (payload) => {
  try {
    const response = await pythonClient.post('/optimize-route', payload);
    return response.data;
  } catch (error) {
    logger.error(`Python AI Service call failed: ${error.message}`);
    throw error;
  }
};

// Rule-based sell/hold context scorer (weather + demand/supply). See
// ai-engine/app/services/price_service.py SECTION 2.
const callPriceContext = async (payload) => {
  try {
    const response = await pythonClient.post('/price-context', payload);
    return response.data;
  } catch (error) {
    logger.error(`Python price-context call failed: ${error.message}`);
    throw error;
  }
};

// Trained XGBoost 7-period price forecast + chart series. SECTION 3.
const callPriceForecast = async (payload) => {
  try {
    const response = await pythonClient.post('/price-forecast', payload);
    return response.data;
  } catch (error) {
    logger.error(`Python price-forecast call failed: ${error.message}`);
    throw error;
  }
};

// Status + crop coverage of the forecast model and the rule-based scorer.
const callModelInfo = async () => {
  try {
    const response = await pythonClient.get('/model-info', { 'axios-retry': { retries: 0 } });
    return response.data;
  } catch (error) {
    return { trained: true, available: false, status: { reason: `ai engine unreachable: ${error.message}` } };
  }
};

const checkAiEngineHealth = async () => {
  try {
    const res = await pythonClient.get('/health', { 'axios-retry': { retries: 0 } });
    return res.data;
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
};

module.exports = {
  callOptimizeRoute,
  callPriceContext,
  callPriceForecast,
  callModelInfo,
  checkAiEngineHealth
};
