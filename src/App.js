import React, { Component } from 'react';
import './App.css';
import {Line} from 'react-chartjs-2';

class App extends Component {

  constructor() {

    super();

    this.initialStyle = {
      label: 'Bitcoin Price',
      fill: false,
      lineTension: 0.1,
      backgroundColor: 'rgba(75,192,192,0.4)',
      borderColor: 'rgba(75,192,192,1)',
      borderCapStyle: 'butt',
      borderDash: [],
      borderDashOffset: 0.0,
      borderJoinStyle: 'miter',
      pointBorderColor: '#e60000',
      pointBackgroundColor: 'rgba(75,192,192,1)',
      pointBorderWidth: 2,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: '#e60000',
      pointHoverBorderColor: 'rgba(220,220,220,1)',
      pointHoverBorderWidth: 2,
      pointRadius: 1,
      pointHitRadius: 10,
    };

    this.initialOptions = {
      legend: {
        display: false
      },
      scales: {
        xAxes: [{
          ticks: {
            autoSkip: true,
            maxTicksLimit: 10
          }
        }]
        /* yAxes: [{
          ticks: {
            max: 100,
            min: 0,
            stepSize: 5
          }
        }] */
      },
      title: {
        display: 'Bitcoin Price Chart',
        text: 'Bitcoin Price Chart'
      },
      maintainAspectRatio: false,
      responsive: true
    };

    this.state = {
      data: {
        labels: [],
        datasets: [
          {...this.initialStyle, data: []}
        ]
      },
      options: this.initialOptions,
      currPrice: 0
    };

  }


  displayGraph = noOfDays => {

    const headers = {'Authorization': `Apikey ${process.env.REACT_APP_API_KEY}`};

    // fetch historical data till yesterday
    fetch(`https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&limit=${noOfDays}`, {headers})
    .then(response => response.json())
    .then(obj => {

      if (Array.isArray(obj.Data.Data)) { // if response is valid

        var labels = []; // array for labels
        var data = []; // array for values

        for (const item of obj.Data.Data) {

          const timestamp = item.time - 3600;
          // reducing some time because API returns timestamp of next day 12:00 AM

          const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

          const date = new Date(timestamp * 1000);

          const d = date.getUTCDate();
          // API ends the day (closes the price) according to UTC

          const month = monthNames[date.getUTCMonth()];
          const label = d + ' ' + month;
          
          labels.push(label); // push date
          data.push(item.close); // push closing price

        }

        // fetch today's current data
        fetch('https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC&tsyms=USD', {headers})
        .then(response => response.json())
        .then(obj => {

          const currPrice = obj.BTC.USD;

          if (typeof currPrice === 'number') { // if response is valid

            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            const date = new Date();
            const d = date.getUTCDate();
            const month = monthNames[date.getUTCMonth()];
            const currLabel = d + ' ' + month;

            labels.push(currLabel); // push
            data.push(currPrice);

            this.setState({ // set state
              data: {
                labels: labels,
                datasets: [
                  {...this.initialStyle, data:data}
                ]
              },
              options: this.initialOptions,
              currPrice: currPrice
            });

          } else {
            console.log('API returned invalid current value');
          }

        })
        .catch(error => {
          console.error('An error occured! ', error);
        });

      } else {
        console.log('API returned invalid historical data');
      }

    })
    .catch(error => {
      console.error('An error occured! ', error);
    });

  }


  setupSocketConnection = () => {

    // socket connection for real time updates
    let socket = new WebSocket(`wss://streamer.cryptocompare.com/v2?api_key=${process.env.REACT_APP_API_KEY}`);

    const subscriptionMsg = {
      "action": "SubAdd",
      "subs": ["2~Coinbase~BTC~USD"]
    };

    // subscribe to channel when connection is established
    socket.onopen = function(event) {
      console.log("Connection established");
      socket.send(JSON.stringify(subscriptionMsg));
    };
    
    // update current price when message is received
    socket.onmessage = event => {
      
      const obj = JSON.parse(event.data);

      if (parseInt(obj.TYPE)===2) {

        const currPrice = parseFloat(obj.PRICE);
        const timestamp = parseInt(obj.LASTUPDATE);
        // API returns all values as strings

        if (
          !isNaN(currPrice) &&
          !isNaN(timestamp)
          // parseFloat and parseInt return NaN when value cannot be converted to number

          // using "isNaN()" instead of "typeof value === 'number'" because technically, in javascript NaN is a number

        ) { // if response is valid

          const data = this.state.data.datasets[0].data.slice(0, -1); // remove last element (old current price)
          data.push(currPrice); // append new current price

          this.setState({ // set state
            data: {
              labels: this.state.data.labels,
              datasets: [
                {...this.initialStyle, data: data}
              ]
            },
            options: this.initialOptions,
            currPrice: currPrice
          });

          const localTime = new Date(timestamp * 1000).toLocaleTimeString("en-US");

          console.log(`Update at ${localTime}:  ${currPrice} USD`);

        } else {
          console.log(`Socket API returned invalid value. Price: ${obj.PRICE}, Timestamp: ${obj.LASTUPDATE}`);
        }

      }

    };
    
    socket.onclose = function(event) {
      console.log("Connection closed");
    };
    
    socket.onerror = function(error) {
      console.error("Error occured in socket connection!");
    };

  }


  componentDidMount() {

    this.displayGraph(48); // display 50 points
    // on sending limit=48, API returns 49 items and then current item is appended

    this.setupSocketConnection();
    
  }


  render() {

    const {data, options, currPrice} = this.state;

    return (
      <div className="App">
        <div className="headings">
          <div className="title">Bitcoin Price Chart</div>
          <div className="buttons">
            <button className="button-1" onClick={()=>{ this.displayGraph(1); }}>3 Days</button>
            <button className="button-1" onClick={()=>{ this.displayGraph(3); }}>5 Days</button>
            <button className="button-1" onClick={()=>{ this.displayGraph(8); }}>10 Days</button>
            <button className="button-1" onClick={()=>{ this.displayGraph(48); }}>50 Days</button>
          </div>
          <div className="price">1 BTC = {currPrice} USD</div>
        </div>
        <div className="chart">         
          <Line data={data} options={options} />
        </div>
      </div>
    );
  }

}

export default App;
