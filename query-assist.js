import 'babel-polyfill';
import React from 'react';
import {render} from 'react-dom';

// Import Query Assist React componemt
import QueryAssist from './components/query-assist/query-assist';
// DOM container
const container = document.getElementById('container');

// Returns application (div wrapper) with applied query
const queryAssist = appliedQuery => (
  <div>
    <div>Applied query: "{appliedQuery}"</div>
    <QueryAssist
      onApply={({query}) => render(queryAssist(query), container)} // Re-render application with query is applied
      query={appliedQuery} // pass initial query
      hint="General hint"
      hintOnSelection="Hint visible when suggestion is selected"
      // Demo data source function (usually should just call server job)
      dataSource={({caret, focus, query}) => {
        // Generate demo suggestions
        const suggestions = allSuggestions.
          filter(({option}) => option.includes(query)). // filter dummy suggestions using query
          map(suggestion => {
            // Fake suggestion fields for demo purposes
            const optionLength = (suggestion.prefix + suggestion.option + suggestion.suffix).length;
            return Object.assign({}, suggestion, {
              matchingEnd: caret,
              completionEnd: optionLength,
              caret: optionLength,
            })
          });

        // Generate static demo styleRanges
        // Properly highlights only request from suggestions, like `prefix: test three`
        const styleRanges = [
          {start: 0, length: 8, style: 'field_value'},
          {start: 9, length: 10, style: 'field_name'}
        ];

        return {
          query,
          caret,
          styleRanges,
          suggestions
        };
      }}
    />
  </div>
);

// Initial render with empty query
render(queryAssist(''), container);

// Dummy suggestions
const allSuggestions = [{
  prefix: 'prefix: ',
  option: 'test',
  suffix: ' ',
  description: 'description',
  matchingStart: 0,
  matchingEnd: 0,
  caret: 0,
  completionStart: 0,
  completionEnd: 0,
  icon: 'https://avatars2.githubusercontent.com/u/878437?v=3&s=32'
}, {
  prefix: 'prefix: ',
  option: 'test one',
  suffix: ' ',
  matchingStart: 0,
  matchingEnd: 0,
  caret: 0,
  completionStart: 0,
  completionEnd: 0,
  group: 'group',
  icon: 'https://avatars2.githubusercontent.com/u/878437?v=3&s=32'
}, {
  prefix: 'prefix: ',
  option: 'test two',
  suffix: ' ',
  matchingStart: 0,
  matchingEnd: 0,
  caret: 0,
  completionStart: 0,
  completionEnd: 0,
  group: 'group',
  icon: 'https://avatars2.githubusercontent.com/u/878437?v=3&s=32'
}, {
  prefix: 'prefix: ',
  option: 'test three',
  suffix: ' ',
  matchingStart: 0,
  matchingEnd: 0,
  caret: 0,
  completionStart: 0,
  completionEnd: 0,
  group: 'group',
  icon: 'https://avatars2.githubusercontent.com/u/878437?v=3&s=32'
}];
