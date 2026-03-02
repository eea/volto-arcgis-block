import React, { createRef } from 'react';

class PanWidget extends React.Component {
  /**
   * Creator of the Basemap widget class
   * @param {*} props
   */
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = {};
    this.PIXELS_TO_PAN = 50;
    this.props.mapViewer.pan_enabled = false;
    this.isComponentMounted = false;
  }

  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    this.isComponentMounted = true;
    if (!this.container.current) return;
    if (!this.props.view || !this.props.view.when) return;
    this.props.view.when(() => {
      if (
        !this.isComponentMounted ||
        !this.container.current ||
        !this.props.view ||
        !this.props.view.ui
      ) {
        return;
      }
      this.props.view.ui.add({
        component: this.container.current,
        position: 'top-right',
        index: 0,
      });
    });
  }

  componentWillUnmount() {
    this.isComponentMounted = false;
    if (this.props.view && this.props.view.ui && this.container.current) {
      try {
        this.props.view.ui.remove(this.container.current);
      } catch (error) {}
    }
  }

  togglePan() {
    this.props.mapViewer.pan_enabled = !this.props.mapViewer.pan_enabled;
    let pan_toogle_button = window.document.querySelector(
      '#pan_toogle_button>span',
    );
    if (!pan_toogle_button) {
      return;
    }
    if (this.props.mapViewer.pan_enabled) {
      pan_toogle_button.classList.add('active-widget');
    } else {
      pan_toogle_button.classList.remove('active-widget');
    }
  }
  async moveUp() {
    if (!this.props.mapViewer.view) return;
    let center = this.props.mapViewer.view.center;
    let resolution = this.props.mapViewer.view.resolution;
    center.y += resolution * this.PIXELS_TO_PAN;
    await this.props.mapViewer.view.goTo({ target: center });
  }
  async moveDown() {
    if (!this.props.mapViewer.view) return;
    let center = this.props.mapViewer.view.center;
    let resolution = this.props.mapViewer.view.resolution;
    center.y -= resolution * this.PIXELS_TO_PAN;
    await this.props.mapViewer.view.goTo({ target: center });
  }
  async moveLeft() {
    if (!this.props.mapViewer.view) return;
    let center = this.props.mapViewer.view.center;
    let resolution = this.props.mapViewer.view.resolution;
    center.x -= resolution * this.PIXELS_TO_PAN;
    await this.props.mapViewer.view.goTo({ target: center });
  }
  async moveRight() {
    if (!this.props.mapViewer.view) return;
    let center = this.props.mapViewer.view.center;
    let resolution = this.props.mapViewer.view.resolution;
    center.x += resolution * this.PIXELS_TO_PAN;
    await this.props.mapViewer.view.goTo({ target: center });
  }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="pan-container">
          <div>
            <div
              id="pan_left_button"
              className="esri-icon-left-arrow-circled esri-widget--button"
              role="button"
              tabIndex="0"
              onClick={this.moveLeft.bind(this)}
              onKeyDown={this.moveLeft.bind(this)}
            ></div>
          </div>
          <div>
            <div
              id="pan_up_button"
              className="esri-icon-up-arrow-circled esri-widget--button"
              role="button"
              tabIndex="0"
              onClick={this.moveUp.bind(this)}
              onKeyDown={this.moveUp.bind(this)}
            ></div>
            <div
              id="pan_toogle_button"
              className="esri-widget--button esri-widget esri-interactive"
              role="button"
              tabIndex="0"
              aria-label="Toogle pan"
              tooltip="Toogle pan"
              direction="left"
              type="widget"
              onClick={this.togglePan.bind(this)}
              onKeyDown={this.togglePan.bind(this)}
            >
              <span
                aria-hidden="true"
                role="presentation"
                className="esri-widget--button esri-icon esri-icon-pan"
              ></span>
            </div>
            <div
              id="pan_down_button"
              className="esri-icon-down-arrow-circled esri-widget--button"
              role="button"
              tabIndex="0"
              onClick={this.moveDown.bind(this)}
              onKeyDown={this.moveDown.bind(this)}
            ></div>
          </div>
          <div>
            <div
              id="pan_right_button"
              className="esri-icon-right-arrow-circled esri-widget--button"
              role="button"
              tabIndex="0"
              onClick={this.moveRight.bind(this)}
              onKeyDown={this.moveRight.bind(this)}
            ></div>
          </div>
        </div>
      </>
    );
  }
}

export default PanWidget;
