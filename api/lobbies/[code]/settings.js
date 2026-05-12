import { handleApi } from '../../../lib/serverless.js';

export default function handler(req, res) {
  req.query = { ...req.query, path: ['lobbies', req.query.code, 'settings'] };
  return handleApi(req, res);
}
