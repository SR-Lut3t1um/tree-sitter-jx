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
    [$.modifiers, $.receiver_parameter]
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
      $.jx_module_name, $.formal_parameters, '{', $.jx_expression, '}'
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
      $.html_element,
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
    jx_text: $ => prec.left(
      repeat1($.jx_text_character),
    ),
    jx_text_character: $ => token(prec(1, /[^"{}<>]+/)), // todo
    jx_child_expression: $ => choice(
      $.expression,
      seq('...', $.expression),
    ),
    html_element: $ => prec(-1, choice(
      $.a,
      $.abbr,
      $.address,
      $.area,
      $.article,
      $.aside,
      $.audio,
      $.b,
      $.base,
      $.bdi,
      $.bdo,
      $.blockquote,
      $.body,
      $.br,
      $.button,
      $.canvas,
      $.caption,
      $.cite,
      $.code,
      $.col,
      $.colgroup,
      $.data,
      $.datalist,
      $.dd,
      $.del,
      $.details,
      $.dfn,
      $.dialog,
      $.div,
      $.dl,
      $.dt,
      $.em,
      $.embed,
      $.fieldset,
      $.figcaption,
      $.figure,
      $.footer,
      $.form,
      $.h1,
      $.h2,
      $.h3,
      $.h4,
      $.h5,
      $.h6,
      $.head,
      $.header,
      $.hgroup,
      $.hr,
      $.html,
      $.i,
      $.iframe,
      $.img,
      $.input,
      $.ins,
      $.kdb,
      $.label,
      $.legend,
      $.li
    )),
    a: $ => choice(
      seq('<', 'a', optional($.a_attributes), '>', optional($.jx_children), '<', '/', 'a', '>'),
      seq('<', 'a', optional($.a_attributes), '/', '>')
    ),
    abbr: $ => choice(
      seq('<', 'abbr', optional($.abbr_attributes), '>', optional($.jx_children), '<', '/', 'abbr', '>'),
      seq('<', 'abbr', optional($.abbr_attributes), '/', '>')
    ),
    address: $ => choice(
      seq('<', 'address', optional($.address_attributes), '>', optional($.jx_children), '<', '/', 'address', '>'),
      seq('<', 'address', optional($.address_attributes), '/', '>'),
    ),
    area: $ => choice(
      seq('<', 'area', optional($.area_attributes), '>', optional($.jx_children), '<', '/', 'area', '>'),
      seq('<', 'area', optional($.area_attributes), '/', '>'),
    ),
    article: $ => choice(
      seq('<', 'article', optional($.article_attributes), '>', optional($.jx_children), '<', '/', 'article', '>'),
      seq('<', 'article', optional($.article_attributes), '/', '>'),
    ),
    aside: $ => choice(
      seq('<', 'aside', optional($.aside_attributes), '>', optional($.jx_children), '<', '/', 'aside', '>'),
      seq('<', 'aside', optional($.aside_attributes), '/', '>')
    ),
    audio: $ => choice(
      seq('<', 'audio', optional($.audio_attributes), '>', optional($.jx_children), '<', '/', 'audio', '>'),
      seq('<', 'audio', optional($.audio_attributes), '/', '>')
    ),
    b: $ => choice(
      seq('<', 'b', optional($.b_attributes), '>', optional($.jx_children), '<', '/', 'b', '>'),
      seq('<', 'b', optional($.b_attributes), '/', '>'),
    ),
    base: $ => choice(
      seq('<', 'base', optional($.base_attributes), '>', optional($.jx_children), '<', '/', 'base', '>'),
      seq('<', 'base', optional($.base_attributes), '/', '>'),
    ),
    bdi: $ => choice(
      seq('<', 'bdi', optional($.bdi_attributes), '>', optional($.jx_children), '<', '/', 'bdi', '>'),
      seq('<', 'bdi', optional($.bdi_attributes), '/', '>'),
    ),
    bdo: $ => choice(
      seq('<', 'bdo', optional($.bdo_attributes), '>', optional($.jx_children), '<', '/', 'bdo', '>'),
      seq('<', 'bdo', optional($.bdo_attributes), '/', '>'),
    ),
    blockquote: $ => choice(
      seq('<', 'blockquote', optional($.blockquote_attributes), optional($.jx_children), '<', '/', 'blockquote', '>'),
      seq('<', 'blockquote', optional($.blockquote_attributes), '/', '>')
    ),
    body: $ => choice(
      seq('<', 'body', optional($.body_attributes), '>', optional($.jx_children), '<', '/', 'body', '>'),
      seq('<', 'body', optional($.body_attributes), '/', '>'),
    ),
    br: $ => choice(
      seq('<', 'br', optional($.br_attributes), '>', optional($.jx_children), '<', '/', 'br', '>'),
      seq('<', 'br', optional($.br_attributes), '/', '>'),
    ),
    button: $ => choice(
      seq('<', 'button', optional($.button_attributes), '>', optional($.jx_children), '<', '/', 'button', '>'),
      seq('<', 'button', optional($.button_attributes), '/', '>'),
    ),
    canvas: $ => choice(
      seq('<', 'canvas', optional($.canvas_attributes), '>', optional($.jx_children), '<', '/', 'canvas', '>'),
      seq('<', 'canvas', optional($.canvas_attributes), '/', '>'),
    ),
    caption: $ => choice(
      seq('<', 'caption', optional($.caption_attributes), '>', optional($.jx_children), '<', '/', 'caption', '>'),
      seq('<', 'caption', optional($.caption_attributes), '/', '>'),
    ),
    cite: $ => choice(
      seq('<', 'cite', optional($.cite_attributes), '>', optional($.jx_children), '<', '/', 'cite', '>'),
      seq('<', 'cite', optional($.cite_attributes), '/', '>'),
    ),
    code: $ => choice(
      seq('<', 'code', optional($.code_attributes), '>', optional($.jx_children), '<', '/', 'code', '>'),
      seq('<', 'code', optional($.code_attributes), '/', '>'),
    ),
    col: $ => choice(
      seq('<', 'col', optional($.col_attributes), '>', optional($.jx_children), '<', '/', 'col', '>'),
      seq('<', 'col', optional($.col_attributes), '/', '>'),
    ),
    colgroup: $ => choice(
      seq('<', 'colgroup', optional($.colgroup_attributes), '>', optional($.jx_children), '<', '/', 'colgroup', '>'),
      seq('<', 'colgroup', optional($.colgroup_attributes), '/', '>'),
    ),
    data: $ => choice(
      seq('<', 'data', optional($.data_attributes), '>', optional($.jx_children), '<', '/', 'data', '>'),
      seq('<', 'data', optional($.data_attributes), '/', '>'),
    ),
    datalist: $ => choice(
      seq('<', 'datalist', optional($.datalist_attributes), '>', optional($.jx_children), '<', '/', 'datalist', '>'),
      seq('<', 'datalist', optional($.datalist_attributes), '/', '>'),
    ),
    dd: $ => choice(
      seq('<', 'dd', optional($.dd_attributes), '>', optional($.jx_children), '<', '/', 'dd', '>'),
      seq('<', 'dd', optional($.dd_attributes), '/', '>')
    ),
    del: $ => choice(
      seq('<', 'del', optional($.del_attributes), '>', optional($.jx_children), '<', '/', 'del', '>'),
      seq('<', 'del', optional($.del_attributes), '/', '>'),
    ),
    details: $ => choice(
      seq('<', 'details', optional($.details_attributes), '>', optional($.jx_children), '<', '/', 'details', '>'),
      seq('<', 'details', optional($.details_attributes), '/', '>'),
    ),
    dfn: $ => choice(
      seq('<', 'dfn', optional($.dfn_attributes), '>', optional($.jx_children), '<', '/', 'dfn', '>'),
      seq('<', 'dfn', optional($.dfn_attributes), '/', '>'),
    ),
    dialog: $ => choice(
      seq('<', 'dialog', optional($.dialog_attributes), '>', optional($.jx_children), '<', '/', 'dialog', '>'),
      seq('<', 'dialog', optional($.dialog_attributes), '/', '>'),
    ),
    div: $ => choice(
      seq('<', 'div', optional($.div_attributes), '>', optional($.jx_children), '<', '/', 'div', '>'),
      seq('<', 'div', optional($.div_attributes), '/', '>'),
    ),
    dl: $ => choice(
      seq('<', 'dl', optional($.dl_attributes), '>', optional($.jx_children), '<', '/', 'dl', '>'),
      seq('<', 'dl', optional($.dl_attributes), '/', '>'),
    ),
    dt: $ => choice(
      seq('<', 'dt', optional($.dt_attributes), '>', optional($.jx_children), '<', '/', 'dt', '>'),
      seq('<', 'dt', optional($.dt_attributes), '/', '>'),
    ),
    em: $ => choice(
      seq('<', 'em', optional($.em_attributes), '>', optional($.jx_children), '<', '/', 'em', '>'),
      seq('<', 'em', optional($.em_attributes), '/', '>'),
    ),
    embed: $ => choice(
      seq('<', 'embed', optional($.embed_attributes), '>', optional($.jx_children), '<', '/', 'embed', '>'),
      seq('<', 'embed', optional($.embed_attributes), '/', '>'),
    ),
    fieldset: $ => choice(
      seq('<', 'fieldset', optional($.fieldset_attributes), '>', optional($.jx_children), '<', '/', 'fieldset', '>'),
      seq('<', 'fieldset', optional($.fieldset_attributes), '/', '>'),
    ),
    figcaption: $ => choice(
      seq('<', 'figcaption', optional($.figcaption_attributes), '>', optional($.jx_children), '<', '/', 'figcaption', '>'),
      seq('<', 'figcaption', optional($.figcaption_attributes), '/', '>')
    ),
    figure: $ => choice(
      seq('<', 'figure', optional($.figure_attributes), '>', optional($.jx_children), '<', '/', 'figure', '>'),
      seq('<', 'figure', optional($.figure_attributes), '/', '>'),
    ),
    footer: $ => choice(
      seq('<', 'footer', optional($.footer_attributes), '>', optional($.jx_children), '<', '/', 'footer', '>'),
      seq('<', 'footer', optional($.footer_attributes), '/', '>',)
    ),
    form: $ => choice(
      seq('<', 'form', optional($.form_attributes), '>', optional($.jx_children), '<', '/', 'form', '>'),
      seq('<', 'form', optional($.form_attributes), '/', '>'),
    ),
    h1: $ => choice(
      seq('<', 'h1', optional($.h1_attributes), '>', optional($.jx_children), '<', '/', 'h1', '>'),
      seq('<', 'h1', optional($.h1_attributes), '/', '>'),
    ),
    h2: $ => choice(
      seq('<', 'h2', optional($.h2_attributes), '>', optional($.jx_children), '<', '/', 'h2', '>'),
      seq('<', 'h2', optional($.h2_attributes), '/', '>'),
    ),
    h3: $ => choice(
      seq('<', 'h3', optional($.h3_attributes), '>', optional($.jx_children), '<', '/', 'h3', '>',),
      seq('<', 'h3', optional($.h3_attributes), '/', '>'),
    ),
    h4: $ => choice(
      seq('<', 'h4', optional($.h4_attributes), '>', optional($.jx_children), '<', '/', 'h4', '>',),
      seq('<', 'h4', optional($.h4_attributes), '/', '>'),
    ),
    h5: $ => choice(
      seq('<', 'h5', optional($.h5_attributes), '>', optional($.jx_children), '<', '/', 'h5', '>',),
      seq('<', 'h5', optional($.h5_attributes), '/', '>',),
    ),
    h6: $ => choice(
      seq('<', 'h6', optional($.h6_attributes), '>', optional($.jx_children), '<', '/', 'h6', '>',),
      seq('<', 'h6', optional($.h6_attributes), '/', '>',),
    ),
    head: $ => choice(
      seq('<', 'head', optional($.head_attributes), '>', optional($.jx_children), '<', '/', 'head', '>',),
      seq('<', 'head', optional($.head_attributes), '/', '>',),
    ),
    header: $ => choice(
      seq('<', 'header', optional($.header_attributes), '>', optional($.jx_children), '<', '/', 'header', '>',),
      seq('<', 'header', optional($.header_attributes), '/', '>',),
    ),
    hgroup: $ => choice(
      seq('<', 'hgroup', optional($.hgroup_attributes), '>', optional($.jx_children), '<', '/', 'hgroup', '>',),
      seq('<', 'hgroup', optional($.hgroup_attributes), '/', '>',),
    ),
    hr: $ => choice(
      seq('<', 'hr', optional($.hr_attributes), '>', optional($.jx_children), '<', '/', 'hr', '>',),
      seq('<', 'hr', optional($.hr_attributes), '/', '>',),
    ),
    html: $ => choice(
      seq('<', 'html', optional($.html_attributes), '>', optional($.jx_children), '<', '/', 'html', '>',),
      seq('<', 'html', optional($.html_attributes), '/', '>'),
    ),
    i: $ => choice(
      seq('<', 'i', optional($.i_attributes), '>', optional($.jx_children), '<', '/', 'i', '>',),
      seq('<', 'i', optional($.i_attributes), '/', '>',),
    ),
    iframe: $ => choice(
      seq('<', 'iframe', optional($.iframe_attributes), '>', optional($.jx_children), '<', '/', 'iframe', '>',),
      seq('<', 'iframe', optional($.iframe_attributes), '/', '>',),
    ),
    img: $ => choice(
      seq('<', 'img', optional($.img_attributes), '>', optional($.jx_children), '<', '/', 'img', '>',),
      seq('<', 'img', optional($.img_attributes), '/', '>',),
    ),
    input: $ => choice(
      seq('<', 'input', optional($.input_attributes), '>', optional($.jx_children), '<', '/', 'input', '>',),
      seq('<', 'input', optional($.input_attributes), '/', '>',),
    ),
    ins: $ => choice(
      seq('<', 'ins', optional($.ins_attributes), '>', optional($.jx_children), '<', '/', 'ins', '>',),
      seq('<', 'ins', optional($.ins_attributes), '/', '>',),
    ),
    kdb: $ => choice(
      seq('<', 'kdb', optional($.kdb_attributes), '>', optional($.jx_children), '<', '/', 'kdb', '>',),
      seq('<', 'kdb', optional($.kdb_attributes), '/', '>',),
    ),
    label: $ => choice(
      seq('<', 'label', optional($.label_attributes), '>', optional($.jx_children), '<', '/', 'label', '>',),
      seq('<', 'label', optional($.label_attributes), '/', '>',),
    ),
    legend: $ => choice(
      seq('<', 'legend', optional($.legend_attributes), '>', optional($.jx_children), '<', '/', 'legend', '>',),
      seq('<', 'legend', optional($.legend_attributes), '/', '>',),
    ),
    li: $ => choice(
      seq('<', 'li', optional($.li_attributes), '>', optional($.jx_children), '<', '/', 'li', '>',),
      seq('<', 'li', optional($.li_attributes), '/', '>'),
    ),

    html_global_attribute: $ => choice(
      seq('accesskey', $.html_attribute_initilizer),
      seq('autocapitalize', $.html_attribute_initilizer),
      seq('autocorrect', $.html_attribute_initilizer),
      seq('autofocus', $.html_attribute_initilizer),
      seq('class', $.html_attribute_initilizer),
      seq('contenteditable', $.html_attribute_initilizer),
      seq('dir', $.html_attribute_initilizer),
      seq('draggable', $.html_attribute_initilizer),
      seq('enterkeyhint', $.html_attribute_initilizer),
      seq('hidden', $.html_attribute_initilizer),
      seq('id', $.html_attribute_initilizer),
      seq('inert', $.html_attribute_initilizer),
      seq('inputmode', $.html_attribute_initilizer),
      seq('is', $.html_attribute_initilizer),
      seq('itemid', $.html_attribute_initilizer),
      seq('itemprop', $.html_attribute_initilizer),
      seq('itemref', $.html_attribute_initilizer),
      seq('itemscope', $.html_attribute_initilizer),
      seq('itemtype', $.html_attribute_initilizer),
      seq('lang', $.html_attribute_initilizer),
      seq('nonce', $.html_attribute_initilizer),
      seq('popover', $.html_attribute_initilizer),
      seq('spellcheck', $.html_attribute_initilizer),
      seq('slot', $.html_attribute_initilizer),
      seq('style', $.html_attribute_initilizer),
      seq('tabindex', $.html_attribute_initilizer),
      seq('title', $.html_attribute_initilizer),
      seq('translate', $.html_attribute_initilizer),
      seq('writingsuggestion', $.html_attribute_initilizer),
    ),

    html_attribute_initilizer: $ => seq(
      '=', $.string_literal
    ),

    string_literal: $ => choice( // todo
      /"(?:[^"\\\r\n]|\\.)*"/,
      /'(?:[^'\\\r\n]|\\.)*'/
    ),

    a_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    abbr_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    address_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    area_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    article_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    aside_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    audio_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    b_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    base_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    bdi_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    bdo_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    blockquote_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    body_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    br_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    button_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    canvas_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    caption_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    cite_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    code_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    col_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    colgroup_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    data_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    datalist_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    dd_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    del_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    details_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    dfn_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    dialog_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    div_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    dl_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    dt_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    em_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    embed_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    fieldset_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    figcaption_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    figure_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    footer_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    form_attributes: $ => repeat1(
      choice(
        $.html_global_attribute,
      )
    ),
    h1_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    h2_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    h3_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    h4_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    h5_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    h6_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    head_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    header_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    hgroup_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    hr_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    html_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    i_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    iframe_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    img_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    input_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    ins_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    kdb_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    label_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    legend_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
    li_attributes: $ => repeat1(
      choice(  
        $.html_global_attribute,
      )
    ),
  }
});
