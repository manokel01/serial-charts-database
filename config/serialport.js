const SerialPort = require('serialport');

// utility function to listports
const getSerialPorts = async () => {
    const ports = await SerialPort.list();
    const availablePorts = [...ports];
    ports.forEach(port => {
      if (port.path.includes('/dev/tty')) {
        const cuPort = {
          ...port,
          path: port.path.replace('/dev/tty', '/dev/cu')
        };
        availablePorts.push(cuPort);
      }
    });
    return availablePorts;
  }

module.exports = getSerialPorts;