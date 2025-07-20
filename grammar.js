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

  word: $ => $.identifier,

  inline: $ => [
    $._name,
    $._simple_type,
    $._class_body_declaration,
    $._variable_initializer,
  ],

  conflicts: $ => [
    [$.method_invocation, $.jx_module_name],
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
    [$.argument_list, $.record_pattern_body],
    [$.module_declaration, $.package_declaration, $.modifiers, $.annotated_type],
    [$.modifiers, $.receiver_parameter],
    [$.jx_text]
  ],

  rules: {
    program: $ => seq(
      $.package_declaration,
      optional($.import_declarations),
      $.jx_module_declaration
    ),
    import_declarations: $ => repeat1(
      $.import_declaration
    ),
    jx_module_declaration: $ => seq(
      $.jx_module_name,  '{', $.jx_components, '}'
    ),
    jx_components: $ => repeat1(
      $.jx_component
    ),
    jx_component: $ => choice(
      $.jx_render_declaration,
      $.jx_css_declaration
    ),
    jx_render_declaration: $ => seq(
      'render', $.formal_parameters, '{', $.jx_expression, '}'
    ),
    jx_css_declaration: $ => seq(
      'css', '{', repeat($.css_top_level_item), '}',
    ),
    jx_module_name: $ => $.identifier,
    jx_expression: $ => choice(
      $.jx_fragment,
      $.jx_element
    ),
    jx_fragment: $ => prec.left(
      seq('<', '>', $.jx_children, '<', '/', '>')
    ),
    jx_element: $ => choice(
      $.html_node,
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
      '{', '...', $.expression, '}'
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
      seq('{', $.expression, '}'),
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
      $.jx_text,
      $.jx_element,
      $.jx_fragment,
      seq('{', $.jx_child_expression, '}')
    ),
    jx_text: $ => repeat1(
      $.jx_text_character
    ),
    jx_text_character: $ => token(prec(1, /[^"{}<>]+/)), // todo
    jx_child_expression: $ => choice(
      $.expression,
      seq('...', $.expression),
    ),
  }
});
