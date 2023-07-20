import React from 'react';
import './css/ArcgisMap.css';

class Loader extends React.Component {
  render() {
    return (
      <div
        active=""
        //type="indeterminate"
        //scale="m"
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

export default Loader;
