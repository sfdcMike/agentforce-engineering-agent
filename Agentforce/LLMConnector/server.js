fastify.post('/chat/completions', async (request, reply) => {
  console.log("POST /chat/completions route hit");
  console.log("Request headers:", request.headers);
  console.log("Request body:", request.body);
  try {
      // Remove the authentication check for now (TEMPORARY)
      // if (request.headers['api-key'] !== process.env.API_TOKEN) {
      //   reply.status(401).send({ error: 'Unauthorized' });
      //   return;
      // }

      const { messages } = request.body;
      const systemMessages = messages.filter((message) => message.role === 'system');
      const userMessages = messages.filter((message) => message.role === 'user');

      console.log("Calling Hugging Face API");
      const response = await hf.chatCompletion({
          model: 'codellama/CodeLlama-7b-Instruct-hf',
          messages: [...systemMessages, ...userMessages],
          provider: 'hf-inference',
          max_tokens: 500,
      });

      console.log("Hugging Face API response:", response);
      reply.send(response);
  } catch (error) {
      console.error("Error in /chat/completions:", error);
      console.error(error); // Log the entire error object
      reply.status(500).send({ error: error.message });
  }
});