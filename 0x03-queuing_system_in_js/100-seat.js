import express from 'express';
import { promisify } from 'util';
import { createQueue } from 'kue';
import { createClient } from 'redis';

const app = express();
const client = createClient({ name: 'reserve_seat' });
const queue = createQueue();
const SEATS = 50;
let reservationEnabled = false;
const PORT = 1245;

/**
 * edit seats available
 * @param {number} number - The new number of seats.
 */
const reserveSeat = async (number) => {
  return promisify(client.SET).bind(client)('available_seats', number);
};

/**
 * Retrieves the number of available seats.
 * @returns {Promise<String>}
 */
const getCurrentAvailableSeats = async () => {
  return promisify(client.GET).bind(client)('available_seats');
};

app.get('/available_seats', (_, res) => {
  getCurrentAvailableSeats()
    .then((numberOfAvailableSeats) => {
      res.json({ numberOfAvailableSeats })
    });
});

app.get('/reserve_seat', (Req, res) => {
  if (!reservationEnabled) {
    res.json({ status: 'Reservation are blocked' });
    return;
  }
  try {
    const job = queue.create('reserve_seat');

    job.on('failed', (err) => {
      console.log(
        'Seat reservation job',
        job.id,
        'failed:',
        err.message || err.toString(),
      );
    });
    job.on('complete', () => {
      console.log(
        'Seat reservation job',
        job.id,
        'completed'
      );
    });
    job.save();
    res.json({ status: 'Reservation in process' });
  } catch {
    res.json({ status: 'Reservation failed' });
  }
});

app.get('/process', (Req, res) => {
  res.json({ status: 'Queue processing' });
  queue.process('reserve_seat', (Job, done) => {
    getCurrentAvailableSeats()
      .then((result) => Number.parseInt(result || 0))
      .then((availableSeats) => {
        reservationEnabled = availableSeats <= 1 ? false : reservationEnabled;
        if (availableSeats >= 1) {
          reserveSeat(availableSeats - 1)
            .then(() => done());
        } else {
          done(new Error('Not enough seats available'));
        }
      });
  });
});

const resetAvailableSeats = async (initialSeatsCount) => {
  return promisify(client.SET)
    .bind(client)('available_seats', Number.parseInt(initialSeatsCount));
};

app.listen(PORT, () => {
  resetAvailableSeats(process.env.SEATS || SEATS)
    .then(() => {
      reservationEnabled = true;
      console.log(`API available on localhost port ${PORT}`);
    });
});

export default app;
