import React, { createRef } from 'react';
import './css/ArcgisMap.css';
import { loadModules } from 'esri-loader';
var watchUtils;
class LoadingSpinner extends React.Component {
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = {};
  }

  loader() {
    return loadModules(['esri/core/watchUtils']).then(([_watchUtils]) => {
      watchUtils = _watchUtils;
    });
  }

  showLoading() {
    if (this.props.layerLoading === false) {
      this.container.current.style.display = 'none';
    } else {
      this.container.current.style.display = 'block';
    }
    this.setState({});
  }

  async componentDidMount() {
    await this.loader();
    this.props.view.when(() => {
      this.props.view.ui.add(this.container.current, 'manual');
      watchUtils.watch(this.props.view, 'updating', () => {
        return;
      });
    });
  }

  componentDidUpdate(prevProps) {
    if (this.props.layerLoading !== prevProps.layerLoading) {
      this.showLoading();
    }
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
        <div>
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <style>
              {`.spinner_ajPY {
      transform-origin: center;
      animation: spinner_AtaB .75s infinite linear;
      fill: #a0b128; stroke-width: 3px; filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.1));
    }
    @keyframes spinner_AtaB {
      100% {
        transform: rotate(360deg);
      }
    }`}
            </style>
            <path
              d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
              opacity=".25"
            />
            <path
              d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
              className="spinner_ajPY"
            />
          </svg>
        </div>
      </div>
    );
  }
}

export default LoadingSpinner;
