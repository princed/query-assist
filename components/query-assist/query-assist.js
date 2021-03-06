/**
 * @name Query Assist
 * @fileoverview Query Assist
 */

import React, {PropTypes, DOM} from 'react';
import {findDOMNode} from 'react-dom';
import debounce from 'mout/function/debounce';
import deepEquals from 'mout/lang/deepEquals';
import classNames from 'classnames';

import {getRect} from '../dom/dom';
import RingComponentWithShortcuts from '../ring-component/ring-component_with-shortcuts';
import Caret from '../caret/caret';
import ContentEditable from '../contenteditable/contenteditable';
import PopupMenu from '../popup-menu/popup-menu';
import Icon from '../icon/icon';
import LoaderInline from '../loader-inline/loader-inline';

import './query-assist.scss';
import '../input/input.scss';

const INPUT_BORDER_WIDTH = 1;
const POPUP_COMPENSATION = INPUT_BORDER_WIDTH +
  PopupMenu.ListProps.Dimension.ITEM_PADDING +
  PopupMenu.PopupProps.Dimension.BORDER_WIDTH;

const ngModelStateField = 'query';

function noop() {}

/**
 * @name QueryAssist
 * @constructor
 * @extends {ReactComponent}
 */
export default class QueryAssist extends RingComponentWithShortcuts {
  static ngModelStateField = ngModelStateField;

  static propTypes = {
    autoOpen: PropTypes.bool,
    caret: PropTypes.number,
    className: PropTypes.string,
    popupClassName: PropTypes.string,
    dataSource: PropTypes.func.isRequired,
    delay: PropTypes.number,
    disabled: PropTypes.bool,
    focus: PropTypes.bool,
    hint: PropTypes.string,
    hintOnSelection: PropTypes.string,
    glass: PropTypes.bool,
    loader: PropTypes.bool,
    placeholder: PropTypes.string,
    onApply: PropTypes.func,
    onChange: PropTypes.func,
    onClear: PropTypes.func,
    onFocusChange: PropTypes.func,
    query: PropTypes.string
  };

  static defaultProps = {
    onApply: noop,
    onChange: noop,
    onClear: noop,
    onFocusChange: noop
  };

  state = {
    dirty: !this.props.query,
    query: this.props.query,
    placeholderEnabled: !this.props.query,
    shortcuts: true
  };

  constructor(...props) {
    super(...props);

    this.boundRequestHandler = ::this.requestHandler;
  }

  ngModelStateField = ngModelStateField;

  getShortcutsProps() {
    return {
      map: {
        del: noop,
        enter: ::this.handleComplete,
        'command+enter': ::this.handleComplete,
        'ctrl+enter': ::this.handleComplete,
        'ctrl+space': ::this.handleCtrlSpace,
        tab: ::this.handleTab,
        right: noop,
        left: noop,
        space: noop,
        home: noop,
        end: noop
      },
      scope: ::this.constructor.getUID('ring-query-assist-')
    };
  }

  // See http://stackoverflow.com/questions/12353247/force-contenteditable-div-to-stop-accepting-input-after-it-loses-focus-under-web
  blurInput() {
    window.getSelection().removeAllRanges();
  }

  didMount() {
    const query = this.props.query || '';

    this.immediateState = {
      query,
      caret: Number.isFinite(this.props.caret) ? this.props.caret : query.length,
      focus: this.props.autoOpen || this.props.focus
    };

    this.setupRequestHandler(this.props.delay);
    this.setShortcutsEnabled(this.props.focus);

    if (this.props.autoOpen) {
      this.boundRequestHandler().
        catch(noop).
        then(::this.setFocus);
    } else {
      this.requestStyleRanges().catch(noop);
    }

    this.setFocus();
  }

  /**
   * Optionally setup data request delay. For each component create a separate
   * instance of the delayed function. This may help reduce the load on the server
   * when the user quickly inputs data.
   */
  setupRequestHandler(delay) {
    const needDelay = typeof delay === 'number';
    const hasDelay = this.requestData !== this.boundRequestHandler;

    if (!this.requestData || hasDelay !== needDelay) {
      if (needDelay) {
        this.requestData = debounce(this.boundRequestHandler, delay);
      } else {
        this.requestData = this.boundRequestHandler;
      }
    }
  }

  willUnmount() {
    if (this._popup) {
      this._popup.remove();
    }
  }

  willReceiveProps({caret, delay, focus, query}) {
    let setFocus;
    this.setupRequestHandler(delay);

    if (typeof focus === 'boolean') {
      this.setShortcutsEnabled(focus);

      if (focus === false && this.immediateState.focus === true) {
        this.blurInput();
      } else if (focus === true && this.immediateState.focus === false) {
        setFocus = true;
      }

      this.immediateState.focus = focus;
    }

    if (typeof caret === 'number') {
      this.immediateState.caret = caret;
      setFocus = true;
    }

    if (setFocus) {
      this.setFocus();
    }

    if (typeof query === 'string' && query !== this.immediateState.query) {
      this.immediateState.query = query;
      let callback = noop;

      if (query && this.props.autoOpen) {
        callback = this.requestData;
      } else if (query) {
        callback = ::this.requestStyleRanges;
      }

      this.setState({query, placeholderEnabled: !query}, callback);
    }
  }

  setFocus() {
    const queryLength = this.immediateState.query != null && this.immediateState.query.length;
    const newCaretPosition = this.immediateState.caret < queryLength ? this.immediateState.caret : queryLength;
    const currentCaretPosition = this.caret.getPosition({avoidFocus: true});

    if (this.immediateState.focus && !this.props.disabled && currentCaretPosition !== -1) {
      // Set to end of field value if newCaretPosition is inappropriate
      this.caret.setPosition(newCaretPosition >= 0 ? newCaretPosition : -1);
      this.scrollInput();
    }
  }

  scrollInput() {
    const caretOffset = this.caret.getOffset();

    if (this.input.clientWidth !== this.input.scrollWidth && caretOffset > this.input.clientWidth) {
      this.input.scrollLeft = this.input.scrollLeft + caretOffset;
    }
  }

  handleFocusChange(e) {
    // otherwise it's blur and false
    const focus = e.type === 'focus';
    this.immediateState.focus = focus;

    // Track mouse state to avoid focus loss on clicks on icons.
    // Doesn't handle really edge cases like shift+tab while mouse button is pressed.
    if (!this.node || (!focus && this.mouseIsDownOnInput)) {
      return;
    }

    if (!focus) {
      this.blurInput();

      // Close popup on blur by keyboard (mostly shift+tab)
      if (!this.mouseIsDownOnPopup) {
        this.closePopup();
      }
    } else {
      this.setFocus();
    }

    if (!this.mouseIsDownOnPopup) {
      this.props.onFocusChange({focus});
    }

    this.setShortcutsEnabled(focus);
  }

  getQuery() {
    return this.input.textContent.replace(/\s/g, ' ');
  }

  handleInput() {
    const props = {
      dirty: true,
      query: this.getQuery(),
      caret: this.caret.getPosition(),
      focus: true
    };

    if (this.immediateState.query === props.query) {
      return;
    }

    const currentQueryIsEmpty = this.immediateState.query === '';
    const newQueryIsEmpty = props.query === '';

    if (newQueryIsEmpty !== currentQueryIsEmpty) {
      this.setState({placeholderEnabled: newQueryIsEmpty});
    }

    this.immediateState = props;
    this.props.onChange(props);
    this.requestData();
  }

  // It's necessary to prevent new element creation before any other hooks
  handleEnter(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  }

  handleTab(e) {
    const list = this._popup && this._popup.refs.List;
    const suggestion = list && (list.getSelected() || list.getFirst());

    if (suggestion && this._popup && this._popup.isVisible()) {
      e.preventDefault();

      if (this.getQuery() !== this.immediateState.suggestionsQuery) {
        return false;
      }

      return this.handleComplete(suggestion, true);
    }

    if (this.state.loading) {
      e.preventDefault();
      return false;
    }

    return true;
  }

  handleCaretMove(e) {
    const caret = this.caret.getPosition();
    const popupHidden = (!this._popup || !this._popup.isVisible()) && e.type === 'click';

    if (!this.props.disabled && (caret !== this.immediateState.caret || popupHidden)) {
      this.immediateState.caret = caret;
      this.scrollInput();
      this.requestData();
    }
  }

  handleResponse({query = '', caret = 0, styleRanges, suggestions}) {
    return new Promise((resolve, reject) => {
      if (query === this.getQuery() && (caret === this.immediateState.caret || this.immediateState.caret === undefined)) {
        resolve(suggestions);

        // Do not setState on unmounted component
        if (!this.node) {
          return;
        }

        const state = {
          dirty: this.immediateState.dirty,
          loading: false,
          placeholderEnabled: !query,
          query
        };

        this.immediateState.suggestionsQuery = query;

        // Do not update deep equal styleRanges to simplify shouldComponentUpdate check
        if (!deepEquals(this.state.styleRanges, styleRanges)) {
          state.styleRanges = styleRanges;
        }

        this.setState(state);
      } else {
        reject(new Error('Current and response queries mismatch'));
      }
    });
  }

  handleApply() {
    this.closePopup();
    this.immediateState.dirty = false;
    this.setState({dirty: false});
    return this.props.onApply(this.immediateState);
  }

  handleComplete(data, replace) {
    if (!data || !data.data) {
      this.handleApply();

      return;
    }

    const query = this.getQuery();
    const currentCaret = this.immediateState.caret;
    const suggestion = data.data;
    const prefix = suggestion.prefix || '';
    const suffix = suggestion.suffix || '';

    const state = {
      caret: suggestion.caret,
      query: query.substr(0, suggestion.completionStart) + prefix + suggestion.option + suffix
    };

    if (replace) {
      state.query += this.immediateState.query.substr(suggestion.completionEnd);
    } else {
      state.query += this.immediateState.query.substr(this.immediateState.caret);
    }

    this.props.onChange(state);

    const focusState = {focus: true};
    this.props.onFocusChange(focusState);

    if (state.query !== this.immediateState.query) {
      this.setState({
        placeholderEnabled: !state.query,
        query: state.query
      });
    }

    this.immediateState = Object.assign(state, focusState);

    if (this.immediateState.caret !== currentCaret) {
      this.setFocus();
    }

    this.closePopup();
    this.requestData();
  }

  requestStyleRanges() {
    if (!this.immediateState.query) {
      return Promise.reject(new Error('Query is empty'));
    }

    return this.sendRequest({
      query: this.immediateState.query,
      caret: this.immediateState.caret,
      omitSuggestions: true
    }).
      then(::this.handleResponse).
      catch(noop);
  }

  requestHandler() {
    if (this.props.disabled) {
      return Promise.reject();
    }

    return this.sendRequest(this.immediateState).
      then(::this.handleResponse).
      then(::this.renderPopup).
      catch(noop);
  }

  sendRequest(params) {
    const value = this.props.dataSource(params);
    const dataPromise = Promise.resolve(value);

    // Close popup after timeout between long requests
    const timeout = window.setTimeout(() => {
      if (this.node) {
        this.setState({
          loading: true
        });
      }

      if (params.query === this.immediateState.query) {
        this.closePopup();
      }
    }, 500);

    dataPromise.then(() => window.clearTimeout(timeout));

    return dataPromise;
  }

  getPopupOffset(suggestions) {
    // First suggestion should be enough?
    const suggestion = suggestions && suggestions[0];

    // Check of suggestion begins not from the end
    const completionStart = suggestion &&
      suggestion.completionStart !== suggestion.completionEnd &&
      suggestion.completionStart;

    const completionStartNode = this.input.firstChild &&
      suggestion.completionStart !== false &&
      suggestion.completionStart != null &&
      this.input.firstChild.childNodes[completionStart];

    let offset = completionStartNode &&
      (getRect(completionStartNode).right - getRect(this.input).left);

    if (!offset) {
      const caret = this.caret.getOffset();

      // Do not compensate caret in the beginning of field
      if (caret === 0) {
        return caret;
      } else {
        offset = caret;
      }
    }

    return offset - POPUP_COMPENSATION;
  }

  handleCtrlSpace(e) {
    e.preventDefault();

    if (!this._popup || !this._popup.isVisible()) {
      this.requestData();
    }
  }

  trackPopupMouseState(e) {
    this.mouseIsDownOnPopup = e.type === 'mousedown';
  }

  trackInputMouseState(e) {
    this.mouseIsDownOnInput = e.type === 'mousedown';
  }

  renderPopup(suggestions) {
    if (!suggestions.length || !this.node) {
      this.closePopup();
      return;
    }

    const renderedSuggestions = this.renderSuggestions(suggestions);

    if (!this._popup || !this._popup.node) {
      this._popup = PopupMenu.renderPopup(
        <PopupMenu
          anchorElement={this.node}
          autoRemove={false} // required to prevent popup unmount on Esc
          className={this.props.popupClassName}
          directions={[PopupMenu.PopupProps.Directions.BOTTOM_RIGHT]}
          data={renderedSuggestions}
          hint={this.props.hint}
          hintOnSelection={this.props.hintOnSelection}
          left={this.getPopupOffset(suggestions)}
          maxHeight="screen"
          onMouseDown={::this.trackPopupMouseState}
          onMouseUp={::this.trackPopupMouseState}
          onSelect={item => this.handleComplete(item, false)}
          shortcuts={true}
        />
      );
    } else {
      this._popup.rerender({
        data: renderedSuggestions,
        hint: this.props.hint,
        hintOnSelection: this.props.hintOnSelection,
        left: this.getPopupOffset(suggestions)
      });
      this._popup.show();
    }
  }

  closePopup() {
    if (this._popup) {
      this._popup.close();
    }
  }

  clearQuery() {
    const state = {
      dirty: false,
      caret: 0,
      query: '',
      focus: true
    };

    this.props.onChange(state);
    this.props.onClear();

    this.immediateState = state;
    this.setState({
      dirty: false,
      query: '',
      placeholderEnabled: true,
      loading: false
    });
  }

  renderSuggestions(suggestions) {
    const renderedSuggestions = [];

    suggestions.forEach((suggestion, index, arr) => {
      const prevSuggestion = arr[index - 1] && arr[index - 1].group;

      if (prevSuggestion !== suggestion.group) {

        renderedSuggestions.push({
          key: suggestion.option + suggestion.group + PopupMenu.ListProps.Type.SEPARATOR,
          description: suggestion.group,
          rgItemType: PopupMenu.ListProps.Type.SEPARATOR
        });
      }

      let option;
      let before = false;
      let after = false;

      if (suggestion.matchingStart !== suggestion.matchingEnd) {
        before = suggestion.option.substring(0, suggestion.matchingStart);
        option = <span className="ring-list__highlight">{suggestion.option.substring(suggestion.matchingStart, suggestion.matchingEnd)}</span>;
        after = suggestion.option.substring(suggestion.matchingEnd);
      } else {
        option = suggestion.option;
      }

      const prefix = !!suggestion.prefix && <span className="ring-list__service">{suggestion.prefix}</span>;
      const suffix = !!suggestion.suffix && <span className="ring-list__service">{suggestion.suffix}</span>;

      const label = DOM.span({className: suggestion.className}, prefix, before, option, after, suffix);

      const item = {
        key: suggestion.prefix + suggestion.option + suggestion.suffix + suggestion.group + suggestion.description,
        label,
        rgItemType: PopupMenu.ListProps.Type.ITEM,
        data: suggestion
      };

      if (!suggestion.group) {
        item.description = suggestion.description;
      }

      if (suggestion.icon) {
        item.icon = suggestion.icon;
      }

      renderedSuggestions.push(item);
    });

    return renderedSuggestions;
  }

  renderQuery() {
    const {dirty, styleRanges, query} = this.state;
    const classes = [];
    const LETTER_CLASS = 'ring-query-assist__letter';
    const LETTER_DEFAULT_CLASS = `${LETTER_CLASS}_default`;

    if (styleRanges && styleRanges.length) {
      styleRanges.forEach((item, index) => {
        if (dirty && index === styleRanges.length - 1 && item.style === 'text') {
          return;
        }
        const className = `${LETTER_CLASS}_${item.style.replace('_', '-')}`;

        for (let i = item.start; i < item.start + item.length; i++) {
          classes[i] = className;
        }
      });
    }

    // \u00a0 === &nbsp;
    return query.split('').map((letter, index) => (
      <span
        className={classNames([LETTER_CLASS, classes[index] || LETTER_DEFAULT_CLASS])}
        key={index + letter}
      >{letter === ' ' ? '\u00a0' : letter}</span>
    ));
  }

  shouldUpdate(props, state) {
    return state.query !== this.state.query ||
      state.dirty !== this.state.dirty ||
      state.loading !== this.state.loading ||
      state.styleRanges !== this.state.styleRanges ||
      state.placeholderEnabled !== this.state.placeholderEnabled ||
      props.placeholder !== this.props.placeholder ||
      props.disabled !== this.props.disabled ||
      props.clear !== this.props.clear ||
      props.loader !== this.props.loader ||
      props.glass !== this.props.glass;
  }

  refInput(node) {
    if (!node) {
      return;
    }

    this.input = findDOMNode(node);
    this.caret = new Caret(this.input);
  }

  render() {
    const renderPlaceholder = !!this.props.placeholder && this.state.placeholderEnabled;
    const renderClear = this.props.clear && !!this.state.query;
    const renderLoader = this.props.loader !== false && this.state.loading;
    const renderGlass = this.props.glass && !renderLoader;
    const renderGlassOrLoader = this.props.glass || renderLoader;

    const inputClasses = classNames({
      'ring-query-assist__input ring-input ring-js-shortcuts': true,
      'ring-query-assist__input_gap': renderGlassOrLoader !== renderClear &&
        (renderGlassOrLoader || renderClear),
      'ring-query-assist__input_double-gap': renderGlassOrLoader && renderClear,
      'ring-input_disabled': this.props.disabled
    });

    return (
      <div
        className="ring-query-assist"
        onMouseDown={::this.trackInputMouseState}
        onMouseUp={::this.trackInputMouseState}
      >
        <ContentEditable
          className={inputClasses}
          ref={::this.refInput}
          disabled={this.props.disabled}
          onComponentUpdate={::this.setFocus}

          onBlur={::this.handleFocusChange}
          onClick={::this.handleCaretMove}
          onFocus={::this.handleFocusChange}
          onInput={::this.handleInput}
          onKeyDown={::this.handleEnter}
          onKeyPress={::this.handleEnter}
          onKeyUp={::this.handleCaretMove}

          spellCheck="false"
        >{this.state.query && <span>{this.renderQuery()}</span>}</ContentEditable>

        {renderPlaceholder &&
        <span
          className="ring-query-assist__placeholder"
          ref="placeholder"
          onClick={::this.handleCaretMove}
        >
          {this.props.placeholder}
        </span>}
        {renderGlass &&
        <Icon
          className="ring-query-assist__icon"
          ref="glass"
          color="gray"
          glyph={require('../../icons/search.svg')}
          onClick={::this.handleApply}
          size={Icon.Size.Size16}
        />}
        {renderLoader &&
        <div
          className="ring-query-assist__icon ring-query-assist__icon_loader"
          ref="loader"
        >
          <LoaderInline/>
        </div>}
        {renderClear &&
        <Icon
          className="ring-query-assist__icon ring-query-assist__icon_clear"
          ref="clear"
          color="gray"
          glyph={require('../../icons/close.svg')}
          onClick={::this.clearQuery}
          size={Icon.Size.Size16}
        />}
      </div>
    );
  }
}
