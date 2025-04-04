const fastify = require('fastify')({ logger: true });
const { HfInference } = require('@huggingface/inference');
require('dotenv').config();

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

fastify.get('/', async (request, reply) => {
  console.log("GET / route hit"); // Added log
  reply.send({ message: 'LLM Connector is running' });
});

fastify.post('/chat/completions', async (request, reply) => {
  console.log("POST /chat/completions route hit"); // Added log
  console.log("Request headers:", request.headers); // Log headers
  console.log("Request body:", request.body); // Log body

  if (request.headers['api-key'] !== process.env.API_TOKEN) {
    console.log("Authentication failed"); // Added log
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
  try {
    console.log("Authentication successful"); // Added log
    const { messages } = request.body;
    const systemMessages = messages.filter((message) => message.role === 'system');
    const userMessages = messages.filter((message) => message.role === 'user');

    console.log("Calling Hugging Face API"); // Added log
    const response = await hf.chatCompletion({
      model: 'google/gemma-2b-it',//widdle baby model.
      //model: 'codellama/CodeLlama-7b-Instruct-hf', // big fat 13 GB chonky model.
      messages: [...systemMessages, ...userMessages],
      provider: 'hf-inference',
      max_tokens: 500,
    });

    console.log("Hugging Face API response:", response); // Added log
    reply.send(response);
  } catch (error) {
    console.error("Error in /chat/completions:", error); // Detailed error log
    console.error(error); // Log the entire error object
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/health', async (request, reply) => {
  console.log("GET /health route hit"); // Added log
  reply.send({ status: 'ok' });
});

const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' }); // Use process.env.PORT
    console.log("Server started"); // Added log
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();