// @ts-nocheck
import React, { Component } from "react";
import ReactDOM from "react-dom";
import Content from "~/core/frame/frame-content";
import { FrameContextProvider } from "~/core/frame/frame-context";

interface FrameProps {
  style?: object;
  head?: React.ReactNode; // eslint-disable-line;
  initialContent?: string;
  mountTarget?: string;
  className?: string;
  contentDidMount?(...args: unknown[]): unknown;
  contentDidUpdate?(...args: unknown[]): unknown;
  children?: React.ReactElement | React.ReactElement[];
}

export class Frame extends Component<FrameProps> {
  static defaultProps = {
    style: {},
    head: null,
    children: undefined,
    mountTarget: undefined,
    contentDidMount: () => {},
    contentDidUpdate: () => {},
    initialContent: '<!DOCTYPE html><html><head></head><body><div class="frame-root"></div></body></html>',
  };

  constructor(props, context) {
    super(props, context);
    this._isMounted = false;
    this.nodeRef = React.createRef();
    this.state = { iframeLoaded: false };
  }

  componentDidMount() {
    this._isMounted = true;

    const doc = this.getDoc();

    if (doc) {
      this.nodeRef.current.contentWindow.addEventListener("DOMContentLoaded", this.handleLoad);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;

    this.nodeRef.current.removeEventListener("DOMContentLoaded", this.handleLoad);
  }

  getDoc() {
    return this.nodeRef.current ? this.nodeRef.current.contentDocument : null;
  }

  getMountTarget() {
    const doc = this.getDoc();
    if (this.props.mountTarget) {
      return doc.querySelector(this.props.mountTarget);
    }
    return doc.body.children[0];
  }

  setRef = (node) => {
    this.nodeRef.current = node;

    const { forwardedRef } = this.props; // eslint-disable-line react/prop-types
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  handleLoad = () => {
    clearInterval(this.loadCheck);
    // Bail update as some browsers will trigger on both DOMContentLoaded & onLoad ala firefox
    if (!this.state.iframeLoaded) {
      this.setState({ iframeLoaded: true });
    }
  };

  // In certain situations on a cold cache DOMContentLoaded never gets called
  // fallback to an interval to check if that's the case
  loadCheck = () =>
    setInterval(() => {
      this.handleLoad();
    }, 500);

  renderFrameContents() {
    if (!this._isMounted) {
      return null;
    }

    const doc = this.getDoc();

    if (!doc) {
      return null;
    }

    const contentDidMount = this.props.contentDidMount;
    const contentDidUpdate = this.props.contentDidUpdate;

    const win = doc.defaultView || doc.parentView;
    const contents = (
      <Content contentDidMount={contentDidMount} contentDidUpdate={contentDidUpdate}>
        <FrameContextProvider value={{ document: doc, window: win }}>
          <div className="frame-content">{this.props.children}</div>
        </FrameContextProvider>
      </Content>
    );

    const mountTarget = this.getMountTarget();

    return [ReactDOM.createPortal(this.props.head, this.getDoc().head), ReactDOM.createPortal(contents, mountTarget)];
  }

  render() {
    const props = {
      ...this.props,
      srcDoc: this.props.initialContent,
      children: undefined, // The iframe isn't ready so we drop children from props here. #12, #17
    };
    delete props.head;
    delete props.initialContent;
    delete props.mountTarget;
    delete props.contentDidMount;
    delete props.contentDidUpdate;
    delete props.forwardedRef;

    return (
      <iframe {...props} ref={this.setRef} onLoad={this.handleLoad}>
        {this.state.iframeLoaded && this.renderFrameContents()}
      </iframe>
    );
  }
}

export const ChaiFrame = React.forwardRef((props, ref) => <Frame {...props} forwardedRef={ref} />);
