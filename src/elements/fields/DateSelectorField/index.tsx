import React, { memo, useState } from 'react';

import Placeholder from '../../components/Placeholder';
import InlineTooltip from '../../components/Tooltip';
// @ts-expect-error TS(7016): Could not find a declaration file for module 'reac... Remove this comment to see the full error message
import DatePicker from 'react-datepicker';
import DateSelectorStyles from './styles';

import { bootstrapStyles } from '../../styles';
import { parseISO } from 'date-fns';
import useBorder from '../../components/useBorder';

function formatDateString(date: any, chooseTime: boolean) {
  if (!date) return '';

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  let formatted = `${year}-${month}-${day}`;
  if (chooseTime) {
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    formatted = `${formatted}T${hour}:${minute}:${second}`;
  }
  return formatted;
}

function DateSelectorField({
  element,
  responsiveStyles,
  fieldLabel,
  elementProps = {},
  required = false,
  editMode,
  onChange = () => {},
  setRef = () => {},
  value = '',
  inlineError,
  children
}: any) {
  const servar = element.servar;
  const chooseTime = servar.metadata.choose_time;

  let internalVal: any = '';
  if (value) {
    internalVal = parseISO(value);
    if (!chooseTime) internalVal.setHours(0, 0, 0);
  }
  const [internalDate, setInternalDate] = useState(internalVal);

  const onDateChange = (newDate: any) => {
    newDate = newDate ?? '';
    setInternalDate(newDate);
    onChange(formatDateString(newDate, chooseTime));
  };

  const { borderStyles, customBorder } = useBorder({
    element,
    error: inlineError
  });
  const [focused, setFocused] = useState(false);

  const dateMask = chooseTime ? 'MM/d/yy h:mm aa' : 'MM/d/yy';
  return (
    <div
      css={{
        maxWidth: '100%',
        width: '100%',
        position: 'relative',
        pointerEvents: editMode ? 'none' : 'auto',
        ...responsiveStyles.getTarget('fc')
      }}
      {...elementProps}
    >
      {children}
      {fieldLabel}
      <div
        css={{
          position: 'relative',
          width: '100%',
          ...responsiveStyles.getTarget('sub-fc'),
          '&:hover': {
            ...responsiveStyles.getTarget('hover'),
            ...borderStyles.hover
          },
          '&&': focused
            ? {
                ...responsiveStyles.getTarget('active'),
                ...borderStyles.active
              }
            : {}
        }}
      >
        {customBorder}
        <DateSelectorStyles />
        <DatePicker
          selected={internalDate}
          onSelect={onDateChange} // when day is clicked
          onChange={onDateChange} // only when value has changed
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          autoComplete={servar.metadata.autocomplete || 'on'}
          placeholder=''
          showTimeSelect={servar.metadata.choose_time ?? false}
          dateFormat={dateMask}
          css={{
            height: '100%',
            width: '100%',
            border: 'none',
            background: 'transparent',
            ...bootstrapStyles,
            ...responsiveStyles.getTarget('field'),
            ...(focused || value || !element.properties.placeholder
              ? {}
              : { color: 'transparent !important' })
          }}
          ref={setRef}
        />
        <Placeholder
          value={value}
          element={element}
          responsiveStyles={responsiveStyles}
          inputFocused={focused}
        />
        <InlineTooltip element={element} responsiveStyles={responsiveStyles} />
      </div>
    </div>
  );
}

export default memo(DateSelectorField);
