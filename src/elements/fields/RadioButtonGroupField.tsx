import React, { useMemo, useState } from 'react';
import ReactForm from 'react-bootstrap/Form';
import { bootstrapStyles } from '../styles';
import {
  applyCheckableInputStyles,
  applyHeightWidthMarginByFontSize,
  composeCheckableInputStyle
} from './CheckboxField';
import HoverTooltip from '../components/HoverTooltip';

const applyRadioGroupStyles = (element: any, responsiveStyles: any) => {
  responsiveStyles.addTargets('radioGroup');
  applyHeightWidthMarginByFontSize(responsiveStyles, 'radioGroup');
  return responsiveStyles;
};

function RadioButtonGroupField({
  element,
  responsiveStyles,
  fieldLabel,
  required = false,
  disabled = false,
  fieldVal = '',
  otherVal = '',
  onChange = () => {},
  onOtherChange = () => {},
  onEnter = () => {},
  elementProps = {},
  children
}: any) {
  const servar = element.servar;
  const [otherSelect, setOtherSelect] = useState({});
  const otherChecked =
    // @ts-expect-error TS(7053): Element implicitly has an 'any' type because expre... Remove this comment to see the full error message
    (otherSelect[servar.key] || fieldVal) && fieldVal === otherVal;
  const otherLabel = servar.metadata.other_label ?? 'Other';

  const styles = useMemo(() => {
    applyCheckableInputStyles(element, responsiveStyles);
    applyRadioGroupStyles(element, responsiveStyles);
    responsiveStyles.apply('row', 'row_separation', (a: number) => {
      return { marginBottom: `${a}px` };
    });
    return responsiveStyles;
  }, [responsiveStyles]);

  const labels = servar.metadata.option_labels;
  const tooltips = servar.metadata.option_tooltips ?? [];

  return (
    <div
      css={{
        width: '100%',
        ...responsiveStyles.getTarget('fc'),
        position: 'relative'
      }}
      {...elementProps}
    >
      {children}
      {fieldLabel}
      {servar.metadata.options.map((opt: any, i: number) => {
        const optionLabel = labels && labels[i] ? labels[i] : opt;
        return (
          <div
            key={`${servar.key}-${i}`}
            css={{
              display: 'flex',
              alignItems: 'center',
              ...styles.getTarget('row')
            }}
          >
            <input
              type='radio'
              id={`${servar.key}-${i}`}
              // All radio buttons in group must have same name to be evaluated
              // together
              name={servar.key}
              checked={fieldVal === opt}
              required={required}
              disabled={disabled}
              onChange={onChange}
              value={opt}
              style={{
                padding: 0,
                lineHeight: 'normal'
              }}
              css={{
                ...composeCheckableInputStyle(styles, disabled, true),
                ...styles.getTarget('radioGroup'),
                ...(disabled ? responsiveStyles.getTarget('disabled') : {})
              }}
            />
            <HoverTooltip text={tooltips[i]}>
              <label htmlFor={`${servar.key}-${i}`}>{optionLabel}</label>
            </HoverTooltip>
          </div>
        );
      })}
      {servar.metadata.other && (
        <div style={{ display: 'flex' }}>
          <input
            type='radio'
            id={`${servar.key}-`}
            key={`${servar.key}-`}
            name={servar.key}
            checked={otherChecked}
            disabled={disabled}
            onChange={(e) => {
              setOtherSelect({
                ...otherSelect,
                [servar.key]: true
              });
              onChange(e);
            }}
            value={otherVal || ''}
            style={{
              padding: 0,
              lineHeight: 'normal'
            }}
            css={{
              ...composeCheckableInputStyle(styles, disabled, true),
              ...styles.getTarget('radioGroup'),
              ...(disabled ? responsiveStyles.getTarget('disabled') : {})
            }}
          />
          <HoverTooltip text={servar.metadata.other_tooltip}>
            <label htmlFor={`${servar.key}-`}>{otherLabel}</label>
          </HoverTooltip>
          <ReactForm.Control
            type='text'
            css={{
              marginLeft: '5px',
              ...bootstrapStyles,
              paddingLeft: '0.4rem',
              ...responsiveStyles.getTarget('field'),
              ...(disabled ? responsiveStyles.getTarget('disabled') : {})
            }}
            id={servar.key}
            value={otherVal || ''}
            onChange={onOtherChange}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter') onEnter(e);
            }}
            maxLength={servar.max_length}
            minLength={servar.min_length}
            required={otherChecked}
            disabled={disabled || !otherChecked}
          />
        </div>
      )}
    </div>
  );
}

export default RadioButtonGroupField;
