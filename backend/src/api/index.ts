import serverless from 'serverless-http';
import app from '../index';

export default serverless(app as any);
