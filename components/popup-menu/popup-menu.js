/**
 * @name Popup Menu
 * @fileoverview Popup Menu.
 */

import React from 'react';
import Popup from '../popup/popup';
import List from '../list/list';

/**
 * @name Popup Menu
 * @constructor
 * @extends {ReactComponent}
 */
export default class PopupMenu extends Popup {
  static isItemType = List.isItemType;
  static ListProps = List.ListProps;

  /** @override */
  getInternalContent() {
    return (
      <div>
        <List
          ref="List"
          {...this.props}
          maxHeight={this._getStyles().maxHeight}
          onSelect={this.props.onSelect}
          shortcuts={this.shortcutsEnabled()}
        />
      </div>
    );
  }
}
