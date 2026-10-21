// Project-specific lint rules (see docs/policies.md).

const isUseState = node => {
  const callee = node.callee;

  return (
    (callee.type === 'Identifier' && callee.name === 'useState') ||
    (callee.type === 'MemberExpression' && callee.property.name === 'useState')
  );
};

/** One `useState` holding an object beats many: a component may call it at most `max` times. */
const maxUseState = {
  meta: {
    type: 'suggestion',
    schema: [{ type: 'object', properties: { max: { type: 'integer' } }, additionalProperties: false }],
    messages: {
      tooMany:
        'Found {{count}} useState calls (max {{max}}). Combine the state into one object with one update handler.',
    },
  },
  create: context => {
    const max = context.options[0]?.max ?? 2;
    const counts = [];

    const enter = () => {
      counts.push(0);
    };

    const exit = node => {
      const count = counts.pop();

      if (count > max) {
        context.report({ node, messageId: 'tooMany', data: { count, max } });
      }
    };

    return {
      FunctionDeclaration: enter,
      'FunctionDeclaration:exit': exit,
      FunctionExpression: enter,
      'FunctionExpression:exit': exit,
      ArrowFunctionExpression: enter,
      'ArrowFunctionExpression:exit': exit,
      CallExpression: node => {
        if (counts.length > 0 && isUseState(node)) {
          counts[counts.length - 1] += 1;
        }
      },
    };
  },
};

/** A read like `row.week` (not a call, an assignment, a ref's `.current` or an optional chain) that destructuring could replace. */
// Checks like `result.ok` or `action.kind` narrow a union: the object has to stay whole, so they are not counted.
const DISCRIMINANTS = new Set(['ok', 'success', 'kind', 'type', 'action']);

const isPlainRead = reference => {
  const id = reference.identifier;
  const member = id.parent;

  if (member?.type !== 'MemberExpression' || member.object !== id || member.computed || member.optional) {
    return false;
  }

  const parent = member.parent;

  if (parent.type === 'CallExpression' && parent.callee === member) {
    return false;
  }

  if (parent.type === 'AssignmentExpression' && parent.left === member) {
    return false;
  }

  return (
    parent.type !== 'UpdateExpression' && member.property.name !== 'current' && !DISCRIMINANTS.has(member.property.name)
  );
};

/** Reading properties off one object twice or more: destructure it once, `const { week, streak } = row`. */
const destructureRepeatedReads = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      repeated: 'Properties of "{{name}}" are read {{count}} times. Destructure it once: const { a, b } = {{name}}.',
    },
  },
  create: context => {
    return {
      'Program:exit': () => {
        for (const scope of context.sourceCode.scopeManager.scopes) {
          for (const variable of scope.variables) {
            // Imports and globals are left alone: only objects made in this file.
            if (variable.defs.length === 0 || variable.defs[0].type === 'ImportBinding') {
              continue;
            }

            const reads = variable.references.filter(isPlainRead);

            if (reads.length >= 2) {
              context.report({
                node: reads[1].identifier.parent,
                messageId: 'repeated',
                data: { name: variable.name, count: reads.length },
              });
            }
          }
        }
      },
    };
  },
};

const policies = { rules: { 'max-use-state': maxUseState, 'destructure-repeated-reads': destructureRepeatedReads } };

export default policies;
