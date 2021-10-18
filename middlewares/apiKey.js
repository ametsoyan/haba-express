const {API_KEY} = process.env;

const apiKeys = new Map();
apiKeys.set(API_KEY, true)
const xApiKey = (req, res, next) => {
  const apiKey = req.get('X-API-KEY');
  if (apiKeys.has(apiKey)){
    next();
  } else{
    const error = new Error('Invalid API KEY');
    next(error);
  }
}
module.exports = xApiKey;
