require('dotenv').config();

const OpenAI = require('openai');


async function main() {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say OK.' }
    ]
  });
  console.log(res.output_text);
}
main();
