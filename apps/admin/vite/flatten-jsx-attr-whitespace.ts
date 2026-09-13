import { types as t, type PluginObj } from '@babel/core';

const flattenAttrWhitespace = (value: string): string => {
  if (!value.includes('\n')) return value;
  return value.replace(/\s+/g, ' ').trim();
};

/** JSX HTML Attributes value `\n` -> `space` */
export const flattenJsxAttrWhitespace = (): PluginObj => ({
  name: 'grey-flowers:flatten-jsx-attr-whitespace',
  visitor: {
    JSXAttribute(path) {
      const { value } = path.node;
      if (!value) return;
      if (value.type === 'StringLiteral') {
        const flat = flattenAttrWhitespace(value.value);
        if (flat !== value.value) {
          path.get('value').replaceWith(t.stringLiteral(flat));
        }
        return;
      }
      if (value.type !== 'JSXExpressionContainer') return;
      const { expression } = value;
      if (expression.type === 'StringLiteral') {
        const flat = flattenAttrWhitespace(expression.value);
        if (flat !== expression.value) {
          path.get('value.expression').replaceWith(t.stringLiteral(flat));
        }
        return;
      }
      if (
        expression.type === 'TemplateLiteral' &&
        expression.expressions.length === 0
      ) {
        const raw = expression.quasis[0]?.value.cooked ?? '';
        const flat = flattenAttrWhitespace(raw);
        if (flat !== raw) {
          path.get('value.expression').replaceWith(t.stringLiteral(flat));
        }
      }
    },
  },
});
