import React, { useMemo } from 'react';

import ReactButton from 'react-bootstrap/Button';
import TextNodes from '../components/TextNodes';
import { imgMaxSizeStyles } from '../styles';
import { adjustColor } from '../../utils/styles';
import useBorder from '../components/useBorder';

function applyButtonStyles(element: any, responsiveStyles: any) {
  responsiveStyles.addTargets(
    'button',
    'buttonLabel',
    'buttonActive',
    'buttonHover',
    'buttonDisabled',
    'loader',
    'img'
  );

  responsiveStyles.applyColor('button', 'background_color', 'backgroundColor');
  responsiveStyles.applyCorners('button');
  responsiveStyles.applyBoxShadow('button');
  responsiveStyles.applyFlexDirection('button');
  responsiveStyles.applyContentAlign('button');
  responsiveStyles.applyTextAlign('buttonLabel');
  responsiveStyles.apply(
    'button',
    [
      'uploader_padding_top',
      'uploader_padding_right',
      'uploader_padding_bottom',
      'uploader_padding_left'
    ],
    // @ts-expect-error TS(7006): Parameter 'a' implicitly has an 'any' type.
    (a, b, c, d) => ({
      padding: `${a}px ${b}px ${c}px ${d}px`
    })
  );
  responsiveStyles.applyWidth('img', 'image_');
  responsiveStyles.applyMargin('img', 'image_');

  if (element.styles.hover_background_color) {
    responsiveStyles.applyColor(
      'buttonHover',
      `hover_background_color`,
      'backgroundColor',
      true
    );
  } else {
    // default hover effect
    responsiveStyles.apply('buttonHover', 'background_color', (a: any) => {
      const newColor = `${adjustColor(a, -30)} !important`;
      return { backgroundColor: newColor };
    });
  }
  responsiveStyles.applySpanSelectorStyles('buttonHover', 'hover_');
  responsiveStyles.apply('buttonHover', 'hover_image_color', (a: string) => {
    if (!a) return {};
    const level = a === 'black' ? 0 : 100;
    return {
      img: {
        webkitFilter: `brightness(${level}%)`,
        filter: `brightness(${level}%)`
      }
    };
  });

  responsiveStyles.applyColor(
    'buttonActive',
    `selected_background_color`,
    'backgroundColor',
    true
  );
  responsiveStyles.applySpanSelectorStyles('buttonActive', 'selected_');
  responsiveStyles.apply(
    'buttonActive',
    'selected_image_color',
    (a: string) => {
      if (!a) return {};
      const level = a === 'black' ? 0 : 100;
      return {
        img: {
          webkitFilter: `brightness(${level}%)`,
          filter: `brightness(${level}%)`
        }
      };
    }
  );

  responsiveStyles.apply('buttonDisabled', 'background_color', (a: any) => {
    const color = `${adjustColor(a, 30)} !important`;
    return {
      backgroundColor: color,
      borderColor: color
    };
  });
  responsiveStyles.apply(
    'buttonDisabled',
    'disabled_image_color',
    (a: string) => {
      if (!a) return {};
      const level = a === 'black' ? 0 : 100;
      return {
        img: {
          webkitFilter: `brightness(${level}%)`,
          filter: `brightness(${level}%)`
        }
      };
    }
  );
  responsiveStyles.applySpanSelectorStyles('buttonDisabled', 'disabled_');
  responsiveStyles.applyColor(
    'buttonDisabled',
    `disabled_background_color`,
    'backgroundColor',
    true
  );

  responsiveStyles.apply(
    'loader',
    ['height', 'height_unit'],
    (a: any, b: any) => {
      const halfHeight = Math.round(a / 2);
      const dimension = `${halfHeight}${b}`;
      return { width: dimension, height: dimension };
    }
  );

  return responsiveStyles;
}

function ButtonElement({
  element,
  responsiveStyles,
  loader = null,
  editMode,
  focused = false,
  disabled = false,
  active = null,
  textCallbacks = {},
  onClick = () => {},
  elementProps = {},
  inlineError,
  children,
  featheryContext
}: any) {
  const styles = useMemo(
    () => applyButtonStyles(element, responsiveStyles),
    [responsiveStyles]
  );
  const { borderStyles, customBorder } = useBorder({
    element,
    error: inlineError,
    defaultHover: true
  });

  const activeStyles = editMode
    ? styles.getTarget('button')
    : {
        ...styles.getTarget('buttonActive'),
        ...borderStyles.active
      };

  const actions = element.properties.actions ?? [];
  const noActions = actions.length === 0 && !element.properties.submit;
  return (
    <ReactButton
      id={element.id}
      key={element.id}
      active={active}
      // type=submit is important for HTML5 type validation messages
      type='submit'
      style={{
        display: 'flex',
        cursor: editMode || noActions ? 'default' : 'pointer',
        width: '100%',
        height: '100%',
        position: 'relative',
        flex: 1
      }}
      css={{
        borderWidth: 0, // Prevent global CSS override if embedded
        justifyContent: 'center',
        alignItems: 'center',
        border: 'none',
        transition: '0.2s ease all !important',
        '&:disabled': {
          cursor: 'default !important',
          ...styles.getTarget('buttonDisabled'),
          ...borderStyles.disabled
        },
        '&:hover:enabled': editMode
          ? styles.getTarget('button')
          : {
              ...styles.getTarget('buttonHover'),
              ...borderStyles.hover
            },
        '&.active:enabled': activeStyles,
        // Fall back on default focus behavior if custom active state
        // is not set for button
        ...(active === null ? { '&:focus:enabled': activeStyles } : {}),
        '&&': styles.getTarget('button')
      }}
      disabled={!editMode && (noActions || loader || disabled)}
      onClick={onClick}
      {...elementProps}
    >
      {customBorder}
      {children}
      {loader ? (
        <div css={styles.getTarget('loader')}>{loader}</div>
      ) : (
        <>
          {element.properties.image && (
            <img
              src={element.properties.image}
              style={{
                ...imgMaxSizeStyles,
                ...responsiveStyles.getTargets('img')
              }}
            />
          )}
          {element.properties.text && (
            <TextNodes
              element={element}
              responsiveStyles={responsiveStyles}
              cssTarget='buttonLabel'
              editMode={editMode}
              disabled={disabled}
              focused={focused}
              textCallbacks={textCallbacks}
              featheryContext={featheryContext}
            />
          )}
        </>
      )}
    </ReactButton>
  );
}

export default ButtonElement;
