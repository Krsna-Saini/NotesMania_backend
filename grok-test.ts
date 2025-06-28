import fetch from 'node-fetch';

async function test() {
  const res = await fetch('http://localhost:3000/api/grok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'generate a short title for this text -> Hello World' }),
  });

  if (!res.body) throw new Error('No response body');
  const out = await res.text();
  process.stdout.write(out);
  console.log('\n––– Full Response:', out);
}

test().catch(console.error);
