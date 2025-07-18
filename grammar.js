/**
 * @file A parser for jx files
 * @author Tobias Liese <mail@tobiasliese.me>
 * @license MIT
 */

const java = require("./tree-sitter-java/grammar");
/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar(java, {
  name: "jx",
  extras: $ => [
    $.line_comment,
    $.block_comment,
    /\s/,
  ],

  supertypes: $ => [
    $.expression,
    $.declaration,
    $.statement,
    $.primary_expression,
    $._literal,
    $._type,
    $._simple_type,
    $._unannotated_type,
    $.module_directive,
  ],

  inline: $ => [
    $._name,
    $._simple_type,
    $._class_body_declaration,
    $._variable_initializer,
  ],

  conflicts: $ => [
    [$.method_invocation, $.module_name],
    [$.yield_statement, $._reserved_identifier],
    [$.primary_expression, $.generic_type],
    [$.primary_expression, $._unannotated_type],
    [$.primary_expression, $._unannotated_type, $.scoped_type_identifier],
    [$.expression, $.statement],
    [$.package_declaration, $.modifiers, $.annotated_type],
    [$._unannotated_type, $.scoped_type_identifier],
    [$.inferred_parameters, $.primary_expression, $._unannotated_type],
    [$.modifiers, $.annotated_type, $.receiver_parameter],
    [$.inferred_parameters, $.primary_expression],
    [$._unannotated_type, $.generic_type],
    [$.lambda_expression, $.primary_expression],
    [$.jx_children],
    [$.argument_list, $.record_pattern_body]
  ],

  externals: $ => [
    $._start_tag_name,
    $._script_start_tag_name,
    $._style_start_tag_name,
    $._end_tag_name,
    $.erroneous_end_tag_name,
    '/>',
    $._implicit_end_tag,
    $.raw_text,
    $.comment,
  ],

  rules: {
    source_file: $ => seq(
      $.package_declaration,
      optional($.import_declaration),
      $.module_declaration
    ),
    module_declaration: $ => seq(
      $.module_name, '(', optional($.formal_parameters), ')', '{', $.jx_expression, '}'
    ),
    module_name: $ => $.identifier,
    jx_expression: $ => choice(
      $.jx_fragment,
      $.jx_element
    ),
    jx_fragment: $ => prec.left(
      seq('<', '>', $.jx_children, '<', '/', '>')
    ),
    jx_element: $ => choice(
      $.element,
      $.jx_self_closing_element,
      seq($.jx_opening_element, optional($.jx_children), $.jx_closing_element)
    ),
    jx_self_closing_element: $ => seq(
      '<', $.jx_element_name, optional($.jx_attributes), '/', '>'
    ),
    jx_opening_element: $ => seq(
      '<', $.jx_element_name, optional($.jx_attributes), '>'
    ),
    jx_closing_element: $ => seq(
      '<', '/', $.jx_element_name, '>'
    ),
    jx_element_name: $ => choice(
      $.jx_identifier,
      $.jx_namespaced_name,
      $.jx_member_expression
    ),
    jx_identifier: $ => $.identifier,
    jx_namespaced_name: $ => seq(
      $.jx_identifier, ':', $.jx_identifier 
    ),
    jx_member_expression: $ => seq(
      $.jx_identifier, '.', $.jx_identifier
    ),
    jx_attributes: $ => repeat1(
      choice($.jx_spread_attribute, $.jx_attribute)
    ),
    jx_spread_attribute: $ => seq(
      '{', '...', $.assignment_expression, '}'
    ),
    jx_attribute: $ => seq(
      $.jx_attribute_name, optional($.jx_attribute_initilizer)
    ),
    jx_attribute_name: $ => choice(
      $.jx_identifier,
      $.jx_namespaced_name
    ),
    jx_attribute_initilizer: $ => seq(
      '=', $.jx_attribute_value
    ),
    jx_attribute_value: $ => choice(
      seq('"', $.jx_double_string_characters, '"'),
      seq('\'', $.jx_single_string_characters, '\''),
      seq('{', $.assignment_expression, '}'),
      $.jx_element,
      $.jx_fragment
    ),
    jx_double_string_characters: $ => repeat1(
      $.jx_double_string_character
    ),
    jx_double_string_character: $ => /[^"]/, // todo
    jx_single_string_characters: $ => repeat1(
      $.jx_single_string_character
    ),
    jx_single_string_character: $ => /[^']/, // todo
    jx_children: $ =>
      repeat1($.jx_child)
    ,
    jx_child: $ => choice(
      prec(-1, $.jx_text),
      $.jx_element,
      $.jx_fragment,
      seq('{', $.jx_child_expression, '}')
    ),
    jx_text: $ => prec.left(
      repeat1($.jx_text_character),
    ),
    jx_text_character: $ => token(prec(1, /[^"{}<>]+/)), // todo
    jx_child_expression: $ => choice(
      $.assignment_expression,
      seq('...', $.assignment_expression),
    ),

    // html rules

    doctype: $ => seq(
      '<!',
      alias($._doctype, 'doctype'),
      /[^>]+/,
      '>',
    ),

    _doctype: _ => /[Dd][Oo][Cc][Tt][Yy][Pp][Ee]/,

    _node: $ => choice(
      $.doctype,
      $.entity,
      $.text,
      $.element,
      $.script_element,
      $.style_element,
      $.erroneous_end_tag,
    ),

    element: $ => choice(
      seq(
        $.start_tag,
        repeat($._node),
        choice($.end_tag, $._implicit_end_tag),
      ),
      $.self_closing_tag,
    ),

    script_element: $ => seq(
      alias($.script_start_tag, $.start_tag),
      optional($.raw_text),
      $.end_tag,
    ),

    style_element: $ => seq(
      alias($.style_start_tag, $.start_tag),
      optional($.raw_text),
      $.end_tag,
    ),

    start_tag: $ => seq(
      '<',
      alias($._start_tag_name, $.tag_name),
      repeat($.attribute),
      '>',
    ),

    script_start_tag: $ => seq(
      '<',
      alias($._script_start_tag_name, $.tag_name),
      repeat($.attribute),
      '>',
    ),

    style_start_tag: $ => seq(
      '<',
      alias($._style_start_tag_name, $.tag_name),
      repeat($.attribute),
      '>',
    ),

    self_closing_tag: $ => seq(
      '<',
      alias($._start_tag_name, $.tag_name),
      repeat($.attribute),
      '/>',
    ),

    end_tag: $ => seq(
      '</',
      alias($._end_tag_name, $.tag_name),
      '>',
    ),

    erroneous_end_tag: $ => seq(
      '</',
      $.erroneous_end_tag_name,
      '>',
    ),

    attribute: $ => seq(
      $.attribute_name,
      optional(seq(
        '=',
        choice(
          $.attribute_value,
          $.quoted_attribute_value,
        ),
      )),
    ),

    attribute_name: _ => /[^<>"'/=\s]+/,

    attribute_value: _ => /[^<>"'=\s]+/,

    // An entity can be named, numeric (decimal), or numeric (hexacecimal). The
    // longest entity name is 29 characters long, and the HTML spec says that
    // no more will ever be added.
    entity: _ => /&(#([xX][0-9a-fA-F]{1,6}|[0-9]{1,5})|[A-Za-z]{1,30});?/,

    quoted_attribute_value: $ => choice(
      seq('\'', optional(alias(/[^']+/, $.attribute_value)), '\''),
      seq('"', optional(alias(/[^"]+/, $.attribute_value)), '"'),
    ),

    text: _ => /[^<>&\s]([^<>&]*[^<>&\s])?/,
  }
});
