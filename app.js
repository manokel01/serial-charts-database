const express = require('express');
const app = express();
const fs = require('fs');
const index = fs.readFileSync( 'index.html');
const SerialPort = require('serialport');
const parsers = SerialPort.parsers;
const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const dotenv = require('dotenv');

// parsing one line at a time
const parser = new parsers.Readline({
   delimiter: '\r\n'
});

// list available ports in console 
SerialPort.list().then(ports => {
   let allPorts = [...ports];
   ports.forEach(port => {
     if (port.path.includes('/dev/tty')) {
       const cuPort = {
         ...port,
         path: port.path.replace('/dev/tty', '/dev/cu')
       };
       allPorts.push(cuPort);
     }
   });
   console.log('Available serial ports:');
   allPorts.forEach(port => {
     console.log(`${port.path} - ${port.manufacturer}`);
   });
 });

// create route to get serial ports (lists both /dev/tty and /dev/cu)
//The filter(Boolean) call removes any null values from the resulting array.
app.get('/serialports', (req, res) => {
  SerialPort.list().then(ports => {
    const cuPorts = ports.map(port => {
      if (port.path.startsWith('/dev/tty.')) {
        return {
          ...port,
          path: port.path.replace('/dev/tty.', '/dev/cu.'),
        };
      }
      return null;
    }).filter(Boolean);
    const allPorts = [...ports, ...cuPorts];
    res.json(allPorts);
  });
});

// middleware
app.use(express.static('public'));

// create server
app.get('/', function (req, res) {
   res.sendFile(__dirname + '/index.html');
});

// load css
app.get('/style.css', function(req, res) {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(__dirname + '/public/style.css');
 });

 // open server port 5000
 const server = app.listen(5000, function () {
   console.log('Server is listening on port 3000!');
});

// listen for serial port properties selected by user
const io = require('socket.io')(server);

io.on('connection', function(socket) {
   console.log('Node is listening to port');

  socket.on('open-port', (data) => {
  const { port, baudRate, dataBits, stopBits, parity} = data;
  console.log('Opening port: ' + port);
  console.log('Baud date' + baudRate);
  console.log('Data bits' + dataBits);
  console.log('Parity: ' + parity);
  console.log('Stop bits: ' + stopBits);

  // open port
  chosenPort = new SerialPort(port, {
    baudRate: parseInt(baudRate),
    dataBits: parseInt(dataBits),
    stopBits: parseInt(stopBits),
    parity: parity
  });
  chosenPort.on('open', () => {
    console.log(`Serial port ${port} opened successfully`);
  });

  // ------- influxdb configuration ---------- //
  dotenv.config();

  const token = process.env.INFLUXDB_TOKEN;
  const url = process.env.INFLUXDB_URL;
  const org = process.env.INFLUXDB_ORG;
  const bucket = process.env.INFLUXDB_BUCKET;

  const influxClient = new InfluxDB({ url, token });
  const writeApi = influxClient.getWriteApi(org, bucket, 'ns');

  // Create Point for influxDB
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
    .stringField('locationID', weather.locationID)
    .floatField('battery', weather.battery)
    .intField('timestamp', weather.timestamp);

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

      // Assign json values to weather object
      const { temperature, humidity, pressure, weatherDesc, deviceID, mac, location, battery, timestamp } = jsonData;
      // Create Weather instance with individual values
      const weather = new Weather(temperature, humidity, pressure, weatherDesc, deviceID, mac, location, battery, timestamp);
      //create an influxdb datapoint
      const point = weatherPoint(weather);
      // write data to influxdb
      writeApi.writePoint(point);
    } catch (error) {
      console.error('Error parsing JSON:', error);
    }
  });
  
  // send message to port
  socket.on('send-message', (message) => {
    console.log(`Message received from client: ${message}`);
    chosenPort.write(message, (err) => {
      if (err) {
        console.error('Error writing to serial port:', err);
      } else {
        console.log('Message sent successfully');
      }
    });
  })

  // close port
  socket.on('close-port', function() {
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
    this.location = weatherDesc;
    this.deviceID = deviceID;
    this.mac = mac;
    this.location = location;
    this.battery = battery;
    this.timestamp = timestamp;
  }
}
