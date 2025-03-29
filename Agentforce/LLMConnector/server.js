const fastify = require('fastify')({ logger: true });
const { HfInference } = require('@huggingface/inference');
require('dotenv').config();

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

fastify.post('/chat/completions', async (request, reply) => {
  if (request.headers['api-key'] !== process.env.API_TOKEN) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
  try {
    const { messages } = request.body;
    const systemMessages = messages.filter((message) => message.role === 'system');
    const userMessages = messages.filter((message) => message.role === 'user');

    const response = await hf.chatCompletion({
      model: 'codellama/CodeLlama-7b-Instruct-hf', // Replace with your model
      messages: [...systemMessages, ...userMessages],
      provider: 'hf-inference',
      max_tokens: 500,
    });

    reply.send(response);
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/health', async (request, reply) => {
  reply.send({ status: 'ok' });
});

const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();