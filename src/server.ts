import express, { Request, Response } from 'express';
import path from 'path';
import { PlatformRegister } from './platform/PlatformRegister';
import { search } from './service/Search';
import { SSEPromise } from './base/PartPromise';
import { SearchRequest, SearchResponse } from './service/types/Search';
import config from './base/config';



const app = express();

const platformRegister = new PlatformRegister();

app.use(express.json());

app.get('/api', (req: Request, res: Response) => {
  res.send({ message: 'Hello from the server!' });
});

app.get('/api/platforms', async (req: Request, res: Response) => {
  try {
    const platforms = platformRegister.getPlatforms();
    res.send({
      data: platforms,
      code: 0,
    });
  } catch (err: any) {
    res.status(500).send({ msg: (err as Error).message, code: 500 });
  }
});

app.get('/api/search', async (req: Request, res: Response) => {

  req.on('close', () => {
    res.end();
  });
  
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sse = new SSEPromise<SearchResponse>();
  sse.then(
    (data) => {
      res.write('data: ' + JSON.stringify(data) + '\n\n');
    },
    _ => {
      res.write('data: ' + '[DONE]' + '\n\n');
      res.end();
    }
  );

  const query = req.query;
  const q = query.q as string;
  await search({q}, sse);
})

if (process.env.NODE_ENV === 'production') {
  console.log('Production mode');
  app.use(express.static(path.join(__dirname, '../client')));

  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../client', 'index.html'));
  });
}

app.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`);
});
