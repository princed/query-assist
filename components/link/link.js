import React from 'react';
import classNames from 'classnames';
import RingComponent from '../ring-component/ring-component';
import './link.scss';

/**
 * @name Link
 * @constructor
 * @extends {ReactComponent}
 */
export default class Link extends RingComponent {
  render() {
    const classes = classNames('ring-link', this.props.className);
    return (
      <a
        {...this.props}
        className={classes}
      >{this.props.children}</a>
    );
  }
}
