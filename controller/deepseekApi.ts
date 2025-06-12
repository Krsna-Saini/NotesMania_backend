import axios from 'axios';
import { Request, Response } from 'express';
require('dotenv').config()


const handleChatWithAi = async (req: Request, res: Response) => {
  try {
    const aiResponse = await axios.post(
      'https://api.aimlapi.com/v1/chat/completions',
      req.body,
      {
        responseType: 'stream',
        headers: {
          Authorization: `Bearer ${process.env.AI_API_KEY_3}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Set headers so client knows it's a stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    aiResponse.data.on('data', (chunk: Buffer) => {
      const lines = chunk
        .toString('utf8')
        .split('\n')
        .filter((line) => line.trim() !== '' && line.startsWith('data:'));

      for (const line of lines) {
        const jsonStr = line.replace(/^data: /, '');
        if (jsonStr === '[DONE]') {
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
        res.write(`data: ${jsonStr}\n\n`);
      }
    });

    aiResponse.data.on('end', () => {
      res.end();
    });

    aiResponse.data.on('error', (err: any) => {
      console.error('Stream error:', err);
      res.end();
    });
  } catch (error: any) {
    console.error('Error forwarding stream:', error);
    res.status(500).json({ error: error.message });
  }
};

export default handleChatWithAi;
