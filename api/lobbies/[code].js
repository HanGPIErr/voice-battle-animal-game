import { handleApi } from '../../lib/serverless.js';

export default function handler(req, res) {
  req.query = { ...req.query, path: ['lobbies', req.query.code] };
  return handleApi(req, res);
}
