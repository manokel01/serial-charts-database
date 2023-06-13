const express = require('express');
const app = express();
const SerialPort = require('serialport');
const parsers = SerialPort.parsers;
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const dotenv = require('dotenv');
const getSerialPorts = require('./config/serialport');

const SENSOR1_ID = 'Arduino-Nano-Sense';
const SENSOR2_ID = 'RPi4';        // emulate second sensor
const SENSOR3_ID = 'Jetson2';     // emulate third sensor
const SENSOR4_ID = 'ESP32';       // emulate forth sensor
const SENSOR5_ID = 'ESP28';       // emulate fifth sensor
const SENSOR6_ID = 'Arduin-UNO';  // emulate sixth sensor

dotenv.config();

// InfluxDB configuration
dotenv.config();
const token = process.env.INFLUX_TOKEN;
const url = process.env.INFLUXDB_URL;
const org = process.env.INFLUXDB_ORG;
const bucket = process.env.INFLUXDB_BUCKET;

const influxClient = new InfluxDB({ url, token });
const writeApi = influxClient.getWriteApi(org, bucket, 'ns');

// Parsing one line at a time
const parser = new parsers.Readline({
  delimiter: '\r\n'
});

// List available serial ports in console
getSerialPorts().then(availablePorts => {
  console.log('Available serial ports:');
  availablePorts.forEach(port => {
    console.log(`${port.path} - ${port.manufacturer}`);
  });
});

// Create route to get serial ports (lists both /dev/tty and /dev/cu)
app.get('/serialports', async (req, res) => {
  const availablePorts = await getSerialPorts();
  const cuPorts = availablePorts.map(port => {
    if (port.path.startsWith('/dev/tty.')) {
      return {
        ...port,
        path: port.path.replace('/dev/tty.', '/dev/cu.'),
      };
    }
    return null;
  }).filter(Boolean);
  const allPorts = [...availablePorts, ...cuPorts];
  res.json(allPorts);
});

// Middleware
app.use(express.static('public'));

// Serve index.html and style.css
app.get(['/', '/style.css'], function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

// Open server port 5000
const server = app.listen(5000, function () {
  console.log('Server is listening on port 5000!');
});

// Listen for serial port properties selected by user
const io = require('socket.io')(server);

io.on('connection', function (socket) {
  console.log('Node is listening to port');

  socket.on('open-port', (data) => {
    const { port, baudRate, dataBits, stopBits, parity } = data;
    console.log('Opening port: ' + port);
    console.log('Baud rate: ' + baudRate);
    console.log('Data bits: ' + dataBits);
    console.log('Parity: ' + parity);
    console.log('Stop bits: ' + stopBits);

    // Open port
    const chosenPort = new SerialPort(port, {
      baudRate: parseInt(baudRate),
      dataBits: parseInt(dataBits),
      stopBits: parseInt(stopBits),
      parity: parity
    });
    chosenPort.on('open', () => {
      console.log(`Serial port ${port} opened successfully`);
    });


    // Create Point for InfluxDB
    const weatherPoint = (weather) => {
      const point = new Point(weather.sensorId)
      .tag('type', 'weather-sensor')
      .floatField('temperature', weather.temperature)
      .floatField('humidity', weather.humidity)
      .floatField('pressure', weather.pressure)
      .stringField('weatherDesc', weather.weatherDesc)
      .stringField('sensorId', weather.sensorId)
      .floatField('location_x', weather.location[0])
      .floatField('location_y', weather.location[1])
      .floatField('battery', weather.battery)
      .stringField('timestamp', weather.timestamp);

      return point;
    };

    // The object to hold the serial data
    let jsonData = {};

    // Read JSON data from serial port
    chosenPort.pipe(parser);
    parser.on('data', (line) => {
      try {
        jsonData = JSON.parse(line);
        // Emit the keys of the JSON object
        io.emit('keys', Object.keys(jsonData));
        // Emit the values of the JSON object
        io.emit('values', Object.values(jsonData));

        // Assign JSON values to weather object
        const { temperature, humidity, pressure, weatherDesc, sensorId, location, battery, timestamp } = jsonData;
        // Create Weather instance with individual values 
        const weather1 = new Weather(temperature, humidity, pressure, weatherDesc, sensorId, location, battery, timestamp);
        // Emulate second sensor with dummy values
        const weather2 = new Weather(temperature + 1, humidity + 2, pressure - 50, weatherDesc, SENSOR2_ID, [location[0] + 1, location[1] + 1], battery - 20, timestamp);
        // Emulate third sensor with dummy values
        const weather3 = new Weather(temperature + 2, humidity + 3, pressure - 40, weatherDesc, SENSOR3_ID, [location[0] + 2, location[1] + 2], battery - 15, timestamp);
        // Emulate forth sensor with dummy values
        const weather4 = new Weather(temperature + 3, humidity + 10, pressure + 10, weatherDesc, SENSOR4_ID, [location[0] + 3, location[1] + 3], battery - 10, timestamp);
        // Emulate fifth sensor with dummy values
        const weather5 = new Weather(temperature + 4, humidity  - 5, pressure + 5, weatherDesc, SENSOR5_ID, [location[0] + 4, location[1] + 4], battery - 35, timestamp);
        // Emulate sixth sensor with dummy values
        const weather6 = new Weather(temperature + 5, humidity - 10, pressure + 12, weatherDesc, SENSOR6_ID, [location[0] + 5, location[1] + 5], battery + 10, timestamp);
        // Create the InfluxDB datapoints
        const point1 = weatherPoint(weather1);
        const point2 = weatherPoint(weather2);
        const point3 = weatherPoint(weather3);
        const point4 = weatherPoint(weather4);
        const point5 = weatherPoint(weather5);
        const point6 = weatherPoint(weather6);
        // Write data to InfluxDB
        writeApi.writePoint(point1);
        writeApi.writePoint(point2);
        writeApi.writePoint(point3);
        writeApi.writePoint(point4);
        writeApi.writePoint(point5);
        writeApi.writePoint(point6);
      } catch (error) {
        console.error('Error parsing JSON:', error);
      }
    });

    // Send message to port
    socket.on('send-message', (message) => {
      console.log(`Message received from client: ${message}`);
      chosenPort.write(message, (err) => {
        if (err) {
          console.error('Error writing to serial port:', err);
        } else {
          console.log('Message sent successfully');
        }
      });
    });

    // Close port
    socket.on('close-port', function () {
      console.log('Closing port');
      chosenPort.close();
    });
  });
});

// The Weather class to hold JSON values
class Weather {
  constructor(temperature, humidity, pressure, weatherDesc, sensorId, location, battery, timestamp) {
    this.temperature = temperature;
    this.humidity = humidity;
    this.pressure = pressure;
    this.weatherDesc = weatherDesc;
    this.sensorId = sensorId;
    this.location = location;
    this.battery = battery;
    this.timestamp = timestamp;
  }
}

