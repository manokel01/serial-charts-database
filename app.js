const express = require('express');
const app = express();
const SerialPort = require('serialport');
const parsers = SerialPort.parsers;
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const dotenv = require('dotenv');
const getSerialPorts = require('./config/serialport');

// Parsing one line at a time
const parser = new parsers.Readline({
  delimiter: '\r\n'
});

// List available serial ports in console
getSerialPorts();

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

    // InfluxDB configuration
    dotenv.config();
    const token = 'i9CZErxnq1BrrZJq46LYKWLmE3K3Rt0FmB78G8ODd5uUSfte3D_qy-l_pmIRpzm4Rms0Of7DIqwLxy-VM595pQ==';
    const url = process.env.INFLUXDB_URL;
    const org = process.env.INFLUXDB_ORG;
    const bucket = process.env.INFLUXDB_BUCKET;

    const influxClient = new InfluxDB({ url, token });
    const writeApi = influxClient.getWriteApi(org, bucket, 'ns');

    // Create Point for InfluxDB
    const weatherPoint = (weather) => {
      const point = new Point('weather-data')
        .tag('crop', 'grapes')
        .tag('plot', 1)
        .tag('region', 'west')
        .floatField('temperature', weather.temperature)
        .floatField('humidity', weather.humidity)
        .floatField('pressure', weather.pressure)
        .stringField('weatherDesc', weather.weatherDesc)
        .stringField('deviceID', weather.deviceID)
        .stringField('mac', weather.mac)
        .stringField('location', weather.location)
        .floatField('battery', weather.battery)
        .floatField('timestamp', weather.timestamp);

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
        const { temperature, humidity, pressure, weatherDesc, deviceID, mac, location, battery, timestamp } = jsonData;
        // Create Weather instance with individual values
        const weather = new Weather(temperature, humidity, pressure, weatherDesc, deviceID, mac, location, battery, timestamp);
        // Create an InfluxDB datapoint
        const point = weatherPoint(weather);
        // Write data to InfluxDB
        writeApi.writePoint(point);
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
  constructor(temperature, humidity, pressure, weatherDesc, deviceID, mac, location, battery, timestamp) {
    this.temperature = temperature;
    this.humidity = humidity;
    this.pressure = pressure;
    this.weatherDesc = weatherDesc;
    this.deviceID = deviceID;
    this.mac = mac;
    this.location = location;
    this.battery = battery;
    this.timestamp = timestamp;
  }
}

