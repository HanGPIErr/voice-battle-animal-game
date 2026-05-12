import { handleApi } from '../../lib/serverless.js';

export default function handler(req, res) {
  req.query = { ...req.query, path: ['auth', 'register'] };
  return handleApi(req, res);
}
