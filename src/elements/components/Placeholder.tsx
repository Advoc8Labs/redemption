import React from 'react';

export default function Placeholder({
  value,
  element,
  responsiveStyles,
  type = 'input',
  inputFocused = false,
  rightToLeft = false
}: any) {
  const focusedStyles = {
    ...responsiveStyles.getTarget('placeholderFocus'),
    ...responsiveStyles.getTarget('placeholderActive')
  };
  return (
    <span
      css={{
        position: 'absolute',
        pointerEvents: 'none',
        [rightToLeft ? 'right' : 'left']: '0.75rem',
        transition: '0.2s ease all',
        top: type === 'input' ? '50%' : '0.6rem',
        ...responsiveStyles.getTarget('placeholder'),
        ...(value ? responsiveStyles.getTarget('placeholderFocus') : {}),
        ...(inputFocused ? focusedStyles : {}),
        [`${type}:focus ~ &`]: focusedStyles
      }}
    >
      {element.properties.placeholder || ''}
    </span>
  );
}
