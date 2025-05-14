import React, { createRef } from 'react';
import './css/ArcgisMap.css';
class LoadingSpinner extends React.Component {
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = {
      loading: false,
    };
    this.showLoading = this.showLoading.bind(this);
    this.listenForLayerChanges = this.listenForLayerChanges.bind(this);
    this.arcgisEventHandles = [];
    this._isMounted = false;
  }

  listenForLayerChanges() {
    const handle1 = this.props.view.map.layers.on('change', (event) => {
      if (!this._isMounted) return;
      if (event.added.length > 0 && this.state.loading === false) {
        this.setState({ loading: true }, this.showLoading);
      }
    });
    const handle2 = this.props.view.on('layerview-create', (event) => {
      if (!this._isMounted) return;
      if (event.layer.loadStatus === 'loaded') {
        const watchHandle = this.props.view.watch('updating', (isUpdating) => {
          if (!this._isMounted) return;
          if (!isUpdating && this.state.loading === true) {
            this.setState({ loading: false }, this.showLoading);
          }
        });
        this.arcgisEventHandles.push(watchHandle);
      }
    });
    const handle3 = this.props.view.on('layerview-create-error', (event) => {
      if (!this._isMounted) return;
      if (event.layer.loadError !== null && this.state.loading === true) {
        this.setState({ loading: false }, this.showLoading);
      }
    });
    this.arcgisEventHandles.push(handle1, handle2, handle3);
  }

  showLoading() {
    if (!this.container.current) return;
    if (this.state.loading === false) {
      this.container.current.style.display = 'none';
    } else {
      this.container.current.style.display = 'block';
    }
  }

  async componentDidMount() {
    this._isMounted = true;
    //this.waitForContainer(this.props.view);
    if (!this.container.current) return;
    this.props.view.when(() => {
      this.props.view.ui.add(this.container.current, 'manual');
      this.listenForLayerChanges();
    });
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this.arcgisEventHandles) {
      this.arcgisEventHandles.forEach(
        (handle) => handle && handle.remove && handle.remove(),
      );
      this.arcgisEventHandles = [];
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
