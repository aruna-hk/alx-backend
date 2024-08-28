import { createClient } from 'redis';

const client = createClient();
const EXIT = 'KILL_SERVER';

client.on('error', (err) => {
  console.log('Redis client not connected to the server:', err.toString());
});

client.on('connect', () => {
  console.log('Redis client connected to the server');
});

client.subscribe('holberton school channel');

client.on('message', (err, msg) => {
  console.log(msg);
  if (msg === EXIT) {
    client.unsubscribe();
    client.quit();
  }
});
