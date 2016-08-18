/**
 * @fileoverview Rule to flag non-camelcased identifiers except for the "opt_" prefix
 * @author Gregg Tavares (but it's just a modified version of camelcase by Nicholas C. Zakas)
 */

'use strict';

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = {

  meta: {
    docs: {
      description: 'allow opt_ prefix and var_args variable identifiers',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
  },

  create(context) {
    // Helpers

    /**
     * Checks if a string contains an underscore and isn't all upper-case
     * @param {string} name The string to check.
     * @returns {boolean} if the string is underscored
     * @private
     */
    function isUnderscored(name) {
      if (name === 'var_args') {
        return false;
      }
      if (name.substring(0, 4) === 'opt_') {
        name = name.substring(4);
      }
      // if there's an underscore, it might be A_CONSTANT, which is okay
      return name.indexOf('_') > -1 && name !== name.toUpperCase();
    }

    /**
     * Reports an AST node as a rule violation.
     * @param {!ASTNode} node The node to report.
     * @returns {void}
     * @private
     */
    function report(node) {
      context.report(node, "Identifier '{{name}}' is not in camel case.",
                     {name: node.name});
    }

    return {

      Identifier: function(node) {

        // Leading and trailing underscores are commonly used to flag private/protected identifiers, strip them
        var effectiveParent = (node.parent.type === 'MemberExpression')
          ? node.parent.parent
          : node.parent;
        var name = node.name.replace(/^_+|_+$/g, '');

        // MemberExpressions get special rules
        if (node.parent.type === 'MemberExpression') {

          // Always report underscored object names
          if (node.parent.object.type === 'Identifier' &&
              node.parent.object.name === node.name &&
              isUnderscored(name)) {
            report(node);

            // Report AssignmentExpressions only if they are the left side of the assignment
          } else if (effectiveParent.type === 'AssignmentExpression' &&
                     isUnderscored(name) &&
                     (effectiveParent.right.type !== 'MemberExpression' ||
                      effectiveParent.left.type === 'MemberExpression' &&
                      effectiveParent.left.property.name === node.name)) {
            report(node);
          }

          // Report anything that is underscored that isn't a CallExpression
        } else if (isUnderscored(name)
                   && effectiveParent.type !== 'CallExpression') {
          report(node);
        }
      },
    };

  }
};