import React, { createRef } from 'react';
import './css/ArcgisMap.css';

class LoadingSpinner extends React.Component {
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = {};
    this.isLoading = this.props.isLoading;
    this.view = this.props.view;
}

  revealSpinner() {
    this.isLoading ? this.container.current.style.display = "block" : this.container.current.style.display = "none";
  }

  componentDidMount() {
  this.props.view.when(() => {
    this.props.view.ui.add(this.container.current, "manual");
    })
  }

  render() {
    return (
      <div
        ref={this.container} 
        id="loader"
        className="loading"
        role="alert"
        aria-busy="true"
        aria-live="polite"
      >
        <div></div>
        <div></div>
        <br></br>
        <span>Loading...</span>
      </div>
    );
  }
}

export default LoadingSpinner;
