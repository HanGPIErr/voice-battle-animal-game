import { handleApi } from '../../lib/serverless.js';

export default function handler(req, res) {
  req.query = { ...req.query, path: ['friends', 'request'] };
  return handleApi(req, res);
}
