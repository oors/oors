import { Router } from 'express';
import { Message } from 'octobus.js';

const router = Router();

router.post('/rpc/:topic(.*)', async (req, res) => {
  const topic = req.params && req.params.topic.replace(/\//g, '.');
  if (!topic) {
    return res.status(400).send({ error: 'Bad data!' });
  }

  const data = req.body;
  const message = new Message({ topic, data });

  try {
    const result = await req.app.modules
      .get('octobus')
      .messageBus.send(message);
    return res.json(result);
  } catch (error) {
    return res.status(500).send({ error });
  }
});

export default router;
