import { handleApi } from '../../lib/serverless.js';

export default function handler(req, res) {
  req.query = { ...req.query, path: ['users', 'search'] };
  return handleApi(req, res);
}
