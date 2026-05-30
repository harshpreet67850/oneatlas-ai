import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import generateRoute from './routes/generate.route';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api', generateRoute);

export default app;

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend running on ${PORT}`);
  });
}
