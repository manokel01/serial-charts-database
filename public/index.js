const socket = io();
const startTime = Date.now();
const dataPoints1 = []; // array to hold sensor 1 values
const dataPoints2 = []; // array to hold sensor 2 values
const dataPoints3 = []; // array to hold sensor 3 values
const dataLabels = []; // array to hold sensor/charts labels
let serialPort;

// ----------- Serial Port Config ------------ //
const baudRateList = document.getElementById('baud-list');

// Make a GET request to the /serialports endpoint to get the list of available ports
function populateSerialPorts() {
    fetch('/serialports')
    .then(response => response.json())
    .then(data => {
      // Get a reference to the <select> element
      const portList = document.getElementById('port-list');
    
      // Loop through each port in the list and add it as an <option> to the <select> element
      data.forEach(port => {
        const option = document.createElement('option');
        option.value = port.path.toString();
        option.text = `${port.manufacturer} - ${port.path}`;
        portList.add(option);
      });
    })
    .catch(error => console.error(error));
}

// Populate the dropdown menu with available ports when the page loads
populateSerialPorts();

// Populate the Baud Rate dropdown menu
function populateBaudRate() {
  const baudRates = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
  // const baudRateList = document.getElementById('baud-list');

  baudRates.forEach(baudRate => {
    const option = document.createElement('option');
    option.value = baudRate.toString();
    option.text = baudRate.toString();
    baudRateList.add(option);
  });
  baudRateList.value = '9600';
}
populateBaudRate();

// Populate the Data Bits dropdown menu
function populateDataBits() {
  const dataBits = [5, 6, 7, 8];
  const dataBitsList = document.getElementById('data-bits-list');

  dataBits.forEach(dataBit => {
    const option = document.createElement('option');
    option.value = dataBit.toString();
    option.text = dataBit.toString();
    dataBitsList.add(option);
  });
  dataBitsList.value = 8;
}
populateDataBits();

// Populate the Stop Bits dropdown menu
function populateStopBits() {
  const stopBits = [1, 1.5, 2];
  const stopBitsList = document.getElementById('stop-bits-list');

  stopBits.forEach(stopBit => {
    const option = document.createElement('option');
    option.value = stopBit.toString();
    option.text = stopBit.toString();
    stopBitsList.add(option);
  });
  stopBitsList.value = 1;
}
populateStopBits();

// Populate the Parity dropdown menu
function populatePariry() {
  const parities = ['none', 'even', 'odd', 'mark', 'space'];
  const parityList = document.getElementById('parity-list');

  parities.forEach(parity => {
    const option = document.createElement('option');
    option.value = parity.toString();
    option.text = parity.toString();
    parityList.add(option);
  });
  parityList.value = 'none';
}
populatePariry();

// Add event listener to the "Open Port" button
document.getElementById('open-button').addEventListener('click', openPort);
// Add event listener to the "Close Port" button
document.getElementById('close-button').addEventListener('click', closePort);

// Open the port with the selected options
function openPort() {
  // Get the selected port from the dropdown menu
  const port = document.getElementById('port-list').value;
  console.log(port);
  // Get the selected baud rate from the dropdown menu
  const baudRate = document.getElementById('baud-list').value;
  console.log(baudRate);
  // Get the selected data bits from the dropdown menu
  const dataBits = document.getElementById('data-bits-list').value;
  // Get the selected stop bits from the dropdown menu
  const stopBits = document.getElementById('stop-bits-list').value;
  // Get the selected parity from the dropdown menu
  const parity = document.getElementById('parity-list').value;
  const portSelections = {port, baudRate, dataBits, stopBits, parity};
  socket.emit('open-port', portSelections);
}

// Close the port
function closePort() {
  socket.emit('close-port');
}

// ----------- Serial Monitor ------------ //
const inputText = document.getElementById('input-field');
const terminal = document.getElementById('termianl');
const submitButton = document.getElementById('submit-button');

submitButton.addEventListener('clicl', () => {
    const inputValue = inputText.value;
    terminal.value += inputText.value + '\r\n';
    socket.emit('send-message', inputText.value);
})
  
// --------------- Charts --------------- //
Chart.defaults.global.defaultFontFamily = 'helvetica';
Chart.defaults.global.defaultFontSize = 14;

const chartTitle1 = document.getElementById('chart-title-1');

const chart1 = new Chart(document.getElementById('chart1').getContext('2d'), {
  type: 'line',
  data: {
      datasets: [{
      label: '',
      data: dataPoints1,
      backgroundColor: 'rgba(255, 99, 132, 0.6)',
      borderWidth: 2,
      borderColor: 'red',
      fill: false,
      }]
  },
  options: {
    elements: {
        point: {
            radius: 0
        }
    },
    title: {
        display: false,
        text: 'Sensor Data',
        fontSize: 14,
        justifyContent: 'center'
    },
    scales: {
        xAxes: [{
            type: 'linear',
            position: 'bottom',
            scaleLabel: {
                display: true,
                labelString: 'Elapsed Time (ms)'
            }
        }],
        yAxes: [{
            type: 'linear',
            position: 'left',
            scaleLabel: {
                display: true,
                labelString: 'Incoming Data'
            }
        }]
    },
    legend: {
        display: true,
        position: 'top',
        labels: {
            fontColor: '#000'
        }
    },
    layout: {
        padding: {
            left: 20,
            right: 0,
            bottom: 0,
            top: 20
        }
    },
    toolips: {
    enabled: true
    },
    responsive: true,
  }
});

const chartTitle2 = document.getElementById('chart-title-2');

const chart2 = new Chart(document.getElementById('chart2').getContext('2d'), {
  type: 'line',
  data: {
      datasets: [{
      label: '',
      data: dataPoints2,
      backgroundColor:  'rgba(54, 162, 235, 0.9)',
      borderWidth: 2,
      borderColor: 'rgba(54, 162, 235, 0.9)',
      fill: false,
      }]
  },
  options: {
    elements: {
        point: {
            radius: 0
        }
    },
    title: {
        display: false,
        text: 'Sensor Data',
        fontSize: 14,
        justifyContent: 'center'
    },
    scales: {
        xAxes: [{
            type: 'linear',
            position: 'bottom',
            scaleLabel: {
                display: true,
                labelString: 'Elapsed Time (ms)'
            }
        }],
        yAxes: [{
            type: 'linear',
            position: 'left',
            scaleLabel: {
                display: true,
                labelString: 'Incoming Data'
            }
        }]
    },
    legend: {
        display: true,
        position: 'top',
        labels: {
            fontColor: '#000'
        }
    },
    layout: {
        padding: {
            left: 20,
            right: 0,
            bottom: 0,
            top: 20
        }
    },
    toolips: {
    enabled: true
    },
    responsive: true,
  }
});

const chartTitle3 = document.getElementById('chart-title-3');

const chart3 = new Chart(document.getElementById('chart3').getContext('2d'), {
  type: 'line',
  data: {
      datasets: [{
      label: '',
      data: dataPoints3,
      backgroundColor: 'rgba(25, 179, 63, 0.9)',
      borderWidth: 2,
      borderColor: 'rgba(25, 179, 63, 0.9)',
      fill: false,
      }]
  },
  options: {
    elements: {
        point: {
            radius: 0
        }
    },
    title: {
        display: false,
        text: 'Sensor Data',
        fontSize: 14,
        justifyContent: 'center'
    },
    scales: {
        xAxes: [{
            type: 'linear',
            position: 'bottom',
            scaleLabel: {
                display: true,
                labelString: 'Elapsed Time (ms)'
            }
        }],
        yAxes: [{
            type: 'linear',
            position: 'left',
            scaleLabel: {
                display: true,
                labelString: 'Incoming Data'
            }
        }]
    },
    legend: {
        display: true,
        position: 'top',
        labels: {
            fontColor: '#000'
        }
    },
    layout: {
        padding: {
            left: 20,
            right: 0,
            bottom: 0,
            top: 20
        }
    },
    toolips: {
    enabled: true
    },
    responsive: true,
  }
});

// receive JSON parsed values and keys from server
socket.on('keys', (keysArray) => {
    // Process the keys array
    console.log('Received keys:', keysArray);

    chartTitle1.innerText = keysArray[0];
    chartTitle2.innerText = keysArray[1];
    chartTitle3.innerText = keysArray[2];
});
  
// Receive values array from the server
socket.on('values', (valuesArray) => {
    const timeElapsed = Date.now() - startTime;
    // Process the values array
    console.log('Received values:', valuesArray);

    // Update data for chart1
    dataPoints1.push({x: timeElapsed, y: valuesArray[0]});
    chart1.update();

    // Update data for chart2
    dataPoints2.push({x: timeElapsed, y: valuesArray[1]});
    chart2.update();

    // Update data for chart3
    dataPoints3.push({x: timeElapsed, y: valuesArray[2]});
    chart3.update();

    // Update terminal display
    const terminal = document.getElementById('terminal');
    terminal.innerHTML += valuesArray.join(", ") + "\n";
    terminal.scrollTop = terminal.scrollHeight;
});
  




