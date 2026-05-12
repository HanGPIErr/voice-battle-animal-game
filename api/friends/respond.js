import { handleApi } from '../../lib/serverless.js';

export default function handler(req, res) {
  req.query = { ...req.query, path: ['friends', 'respond'] };
  return handleApi(req, res);
}
