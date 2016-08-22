import React from 'react';
import classNames from 'classnames';
import RingComponent from '../ring-component/ring-component';
import './loader-inline.scss';

/**
 * @name Loader Inline
 * @constructor
 * @extends {ReactComponent}
 */

export default class LoaderInline extends RingComponent {
  render() {
    const classes = classNames(
      'ring-loader-inline',
      this.props.className
    );

    return (
      <div
        {...this.props}
        className={classes}
      >
        <div className="ring-loader-inline__ball"></div>
        <div className="ring-loader-inline__ball ring-loader-inline__ball_second"></div>
        <div className="ring-loader-inline__ball ring-loader-inline__ball_third"></div>
      </div>
    );
  }
}
