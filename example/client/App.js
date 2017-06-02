import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import SimpleInput from 'react-simple-input';
import { services } from './feathers';

// import logo from './logo.svg';
// import './App.css';
var text = 'initial value'; // eslint-disable-line no-var
var id = ''; // eslint-disable-line no-var

class App extends Component {
  static propTypes = {
    servicesState: PropTypes.object.isRequired,
    onCreate: PropTypes.func.isRequired,
    onGet: PropTypes.func.isRequired,
    onFind: PropTypes.func.isRequired,
  };

  render() {
    const { messages } = this.props.servicesState;
    return (
      <div className="App">
        <div className="App-header">
          <img src="./logo.svg" className="App-logo" alt="logo" />
          Reduxify Feathers Services
        </div>
        <div className="App-controls">
          <br />
          <SimpleInput placeholder="text for message" onChange={value => { text = value; }} />
          <button onClick={this.props.onCreate}>Create message</button>
          <br />
          <br />
          <SimpleInput placeholder="id for message" onChange={value => { id = value; }} />
          <button onClick={this.props.onGet}>Get message</button>
          <br />
          <br />
          <button onClick={this.props.onFind}>Retrieve some messages</button>
          <br />
          <br />
        </div>
        <br />
        <div className="App-status">
          state.messages.data:
          <figure>
            <pre>
              <code>
                {messages.data ? JSON.stringify(messages.data, null, 2) : ''}
              </code>
            </pre>
          </figure>
          <br />
          state.messages.requests:
          <figure>
            <pre>
              <code>
                {messages.requests ? JSON.stringify(messages.requests, null, 2) : ''}
              </code>
            </pre>
          </figure>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  servicesState: state,
  messages: state.messages,
});

const mapDispatchToProps = (dispatch) => ({
  onCreate: () => {
    dispatch(services.messages.create({ text }));
  },
  onGet: () => {
    dispatch(services.messages.get(id));
  },
  onFind: () => {
    dispatch(services.messages.find());
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(App);
