import React, { useMemo } from 'react';
import TextNodes from '../components/TextNodes';
import { isNum } from '../../utils/primitives';

// TODO(peter): deprecate once customers have upgraded and backend migrated
function legacyAlignment(alignment: any) {
  switch (alignment) {
    case 'flex-start':
      return 'left';
    case 'flex-end':
      return 'right';
    default:
      return alignment;
  }
}

function applyTextStyles(element: any, applyStyles: any) {
  applyStyles.addTargets('text');
  applyStyles.apply('text', 'layout', (a: any) => ({
    textAlign: legacyAlignment(a)
  }));
  applyStyles.apply('text', 'line_height', (a: any) => ({
    lineHeight: isNum(a) ? `${a}px` : 'normal'
  }));
  applyStyles.apply('text', 'letter_spacing', (a: any) => ({
    letterSpacing: isNum(a) ? `${a}px` : 'normal'
  }));
  applyStyles.apply('text', 'text_transform', (a: any) => ({
    textTransform: a || 'none'
  }));
  return applyStyles;
}

function TextElement({
  element,
  applyStyles,
  values = null,
  editable = false,
  focused = false,
  textCallbacks = {},
  handleRedirect = () => {},
  conditions = [],
  elementProps = {},
  children
}: any) {
  const styles = useMemo(
    () => applyTextStyles(element, applyStyles),
    [applyStyles]
  );
  return (
    <div
      css={{
        ...styles.getTarget('text'),
        position: 'relative',
        maxWidth: '100%'
      }}
      {...elementProps}
    >
      <TextNodes
        element={element}
        values={values}
        applyStyles={applyStyles}
        handleRedirect={handleRedirect}
        conditions={conditions}
        editable={editable}
        focused={focused}
        textCallbacks={textCallbacks}
      />
      {children}
    </div>
  );
}

export default TextElement;