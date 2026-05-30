import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import generateRoute from './routes/generate.route';

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use('/api', generateRoute);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`OneAtlas AI backend listening on port ${PORT}`);
});
