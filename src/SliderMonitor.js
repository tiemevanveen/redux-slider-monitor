import React, { PropTypes, findDOMNode, Component } from 'react';
import Slider from './Slider';
import * as themes from 'redux-devtools/lib/react/themes';

export default class SliderMonitor extends Component {
  constructor(props) {
    super(props);

    if (props.keyboardEnabled) {
      window.addEventListener('keydown', ::this.handleKeyPress);
    }

    this.state = {
      timer: undefined
    };
  }

  static propTypes = {
    computedStates: PropTypes.array.isRequired,
    currentStateIndex: PropTypes.number.isRequired,
    monitorState: PropTypes.object.isRequired,
    stagedActions: PropTypes.array.isRequired,
    skippedActions: PropTypes.object.isRequired,
    reset: PropTypes.func.isRequired,
    commit: PropTypes.func.isRequired,
    rollback: PropTypes.func.isRequired,
    sweep: PropTypes.func.isRequired,
    toggleAction: PropTypes.func.isRequired,
    jumpToState: PropTypes.func.isRequired,
    setMonitorState: PropTypes.func.isRequired,
    select: PropTypes.func.isRequired
  };

  static defaultProps = {
    select: (state) => state,
    monitorState: { isVisible: true },
    theme: 'nicinabox'
  };

  componentWillReceiveProps(nextProps) {
    const node = findDOMNode(this);
    if (!node) {
      this.scrollDown = true;
    } else if (
      this.props.stagedActions.length < nextProps.stagedActions.length
    ) {
      const scrollableNode = node.parentElement;
      const { scrollTop, offsetHeight, scrollHeight } = scrollableNode;

      this.scrollDown = Math.abs(
        scrollHeight - (scrollTop + offsetHeight)
      ) < 20;
    } else {
      this.scrollDown = false;
    }
  }

  componentDidUpdate() {
    const node = findDOMNode(this);
    if (!node) {
      return;
    }

    if (this.scrollDown) {
      const scrollableNode = node.parentElement;
      const { offsetHeight, scrollHeight } = scrollableNode;

      scrollableNode.scrollTop = scrollHeight - offsetHeight;
      this.scrollDown = false;
    }
  }

  handleReset() {
    this.props.reset();
  }

  toggleHidden() {
    const { monitorState } = this.props;

    this.props.setMonitorState({
      ...monitorState,
      isVisible: !monitorState.isVisible
    });
  }

  handleKeyPress(event) {
    if (event.ctrlKey && event.keyCode === 72) { // Ctrl+H
      event.preventDefault();
      ::this.toggleHidden();
    } else if (event.ctrlKey && event.keyCode === 74) { // Ctrl+K
      event.preventDefault();

      if (this.state.timer) {
        return this.props.realtime ? ::this.pauseRealtimeReplay() : ::this.pauseReplay();
      }

      return this.props.realtime ? ::this.startRealtimeReplay() : ::this.startReplay();
    } else if (event.shiftKey && event.keyCode === 219) { // [
      event.preventDefault();
      this.stepLeft();
    } else if (event.shiftKey && event.keyCode === 221) { // ]
      event.preventDefault();
      this.stepRight();
    }
  }

  handleSliderChange(value) {
    if (this.state.timer) {
      this.pauseReplay();
    }

    this.props.jumpToState(value);
  }

  startReplay() {
    if (this.state.timer) {
      return;
    }

    let currentStateIndex;
    if (this.props.currentStateIndex === this.props.computedStates.length - 1) {
      this.props.jumpToState(0);
      currentStateIndex = 0;
    } else {
      this.props.jumpToState(this.props.currentStateIndex + 1);
      currentStateIndex = this.props.currentStateIndex + 1;
    }

    let counter = currentStateIndex === 0 ? 1 : currentStateIndex + 1;
    let timer = setInterval(() => {
      this.props.jumpToState(counter);

      if (counter === this.props.computedStates.length - 1) {
        clearInterval(this.state.timer);
        this.setState({
          timer: undefined
        });
      }
      counter++;
    }, 500);

    this.setState({ timer });
  }

  startRealtimeReplay() {
    if (this.state.timer) {
      return;
    }

    if (this.props.currentStateIndex === this.props.computedStates.length - 1) {
      this.props.jumpToState(0);

      ::this.loop(0);
    } else {
      ::this.loop(this.props.currentStateIndex);
    }
  }

  loop(index) {
    const { computedStates, timestamps } = this.props;
    let currentTimestamp = Date.now();
    let timestampDiff = timestamps[index + 1] - timestamps[index];

    let aLoop = () => {
      if (this.props.currentStateIndex === computedStates.length - 1) {
        return this.pauseRealtimeReplay();
      }

      let replayDiff = Date.now() - currentTimestamp;

      if (replayDiff >= timestampDiff) {
        this.props.jumpToState(this.props.currentStateIndex + 1);
        timestampDiff = timestamps[this.props.currentStateIndex + 1] - timestamps[this.props.currentStateIndex];
        currentTimestamp = Date.now();

        this.setState({
          timer: requestAnimationFrame(aLoop)
        });
      } else {
        this.setState({
          timer: requestAnimationFrame(aLoop)
        });
      }
    };

    if (index !== computedStates.length - 1) {
      this.setState({
        timer: requestAnimationFrame(aLoop)
      });
    }
  }

  pauseRealtimeReplay() {
    if (this.state.timer) {
      cancelAnimationFrame(this.state.timer);
      this.setState({
        timer: undefined
      });
    }
  }

  pauseReplay() {
    if (this.state.timer) {
      clearInterval(this.state.timer);
      this.setState({
        timer: undefined
      });
    }
  }

  stepLeft() {
    this.pauseReplay();

    if (this.props.currentStateIndex !== 0) {
      this.props.jumpToState(this.props.currentStateIndex - 1);
    }
  }

  stepRight() {
    this.pauseReplay();

    if (this.props.currentStateIndex !== this.props.computedStates.length - 1) {
      this.props.jumpToState(this.props.currentStateIndex + 1);
    }
  }

  containerStyle(theme) {
    return {
      fontFamily: 'monospace',
      position: 'relative',
      padding: '1.1rem',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      background: theme.base00,
      WebkitUserSelect: 'none', MozUserSelect: 'none', MsUserSelect: 'none'
    };
  }

  iconStyle(theme) {
    return {
      cursor: 'hand',
      fill: theme.base06,
      width: '2.3rem',
      height: '2.3rem'
    };
  }

  renderPlayButton(theme) {
    let play = this.props.realtime ? ::this.startRealtimeReplay : ::this.startReplay;

    return (
      <a onClick={play}>
        <svg viewBox='0 0 24 24' preserveAspectRatio='xMidYMid meet' fit
          style={this.iconStyle(theme)}
        >
          <g><path d='M8 5v14l11-7z'></path></g>
        </svg>
      </a>
    );
  }

  renderPauseButton(theme) {
    let pause = this.props.realtime ? ::this.pauseRealtimeReplay : ::this.pauseReplay;

    return (
      <a onClick={pause}>
        <svg viewBox='0 0 24 24' preserveAspectRatio='xMidYMid meet' fit
          style={this.iconStyle(theme)}
        >
          <g><path d='M6 19h4V5H6v14zm8-14v14h4V5h-4z'></path></g>
        </svg>
      </a>
    );
  }

  renderStepLeftButton(theme) {
    return (
      <a onClick={::this.stepLeft}>
        <svg viewBox='0 0 24 24' preserveAspectRatio='xMidYMid meet' fit
          style={this.iconStyle(theme)}
        >
          <g><path d='M15.41 16.09l-4.58-4.59 4.58-4.59-1.41-1.41-6 6 6 6z'></path></g>
        </svg>
      </a>
    );
  }

  renderStepRightButton(theme) {
    return (
      <a onClick={::this.stepRight}>
        <svg viewBox='0 0 24 24' preserveAspectRatio='xMidYMid meet' fit
          style={this.iconStyle(theme)}
        >
          <g><path d='M8.59 16.34l4.58-4.59-4.58-4.59 1.41-1.41 6 6-6 6z'></path></g>
        </svg>
      </a>
    );
  }

  renderHideButton(theme) {
    return (<a onClick={::this.toggleHidden}
              style={{ textDecoration: 'underline', cursor: 'hand', color: theme.base06 }}>
              <small>Hide</small>
           </a>);
  }

  render() {
    const { monitorState, currentStateIndex, computedStates } = this.props;

    let theme;
    if (typeof this.props.theme === 'string') {
      if (typeof themes[this.props.theme] !== 'undefined') {
        theme = themes[this.props.theme];
      } else {
        theme = themes.nicinabox;
      }
    } else {
      theme = this.props.theme;
    }
    if (!monitorState.isVisible) {
      return null;
    }

    return (
      <div style={this.containerStyle(theme)}>
        { this.state.timer ? this.renderPauseButton(theme) : this.renderPlayButton(theme) }
        <div style={{ width: '80%', height: '100%' }}>
          <Slider
            min={0}
            max={computedStates.length - 1}
            value={currentStateIndex}
            onChange={::this.handleSliderChange}
            theme={theme}
          />
        </div>
        { this.renderStepLeftButton(theme) }
        { this.renderStepRightButton(theme) }
        <a onClick={::this.handleReset}
           style={{ textDecoration: 'underline', cursor: 'hand' }}>
          <small>Reset</small>
        </a>
      </div>
    );
  }
}
