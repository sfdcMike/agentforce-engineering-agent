process.env.TRANSFORMERS_CACHE = '/tmp/transformers_cache'; // Or any other writable directory
        const fs = require('fs');
        if (!fs.existsSync('/tmp/transformers_cache')){
            fs.mkdirSync('/tmp/transformers_cache', { recursive: true });
        }
const fastify = require('fastify')({ logger: true });
const { HfInference } = require('@huggingface/inference');
const { AutoTokenizer } = require('@huggingface/transformers'); // Import AutoTokenizer
require('dotenv').config();

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
const tokenizer = AutoTokenizer.from_pretrained('gg-hf/gemma-2b-it'); // Initialize tokenizer

fastify.get('/', async (request, reply) => {
  console.log('GET / route hit');
  reply.send({ message: 'LLM Connector is running' });
});

fastify.post('/chat/completions', async (request, reply) => {
  console.log('POST /chat/completions route hit');
  console.log('Request headers:', request.headers);
  console.log('Request body:', request.body);

  if (request.headers['api-key'] !== process.env.API_TOKEN) {
    console.log('Authentication failed');
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
  try {
    console.log('Authentication successful');
    const { messages } = request.body;
    let prompt = '';
    for (const message of messages) {
      prompt += `<start_of_turn>${message.role}\n${message.content}<end_of_turn>\n`;
    }
    prompt += `<start_of_turn>model\n`; // Add generation prompt

    console.log('Formatted prompt:', prompt); // Log the formatted prompt

    const response = await hf.chatCompletion({
      model: 'gg-hf/gemma-2b-it',
      messages: [{ role: 'user', content: prompt }], // Send formatted prompt as user message
      provider: 'hf-inference',
      max_tokens: 500,
    });

    console.log('Hugging Face API response:', response);
    reply.send(response);
  } catch (error) {
    console.error('Error in /chat/completions:', error);
    console.error(error);
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/health', async (request, reply) => {
  console.log('GET /health route hit');
  reply.send({ status: 'ok' });
});

const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0' });
    console.log('Server started');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();