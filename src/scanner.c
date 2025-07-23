#include "tag.h"
#include "tree_sitter/parser.h"

#include <wctype.h>
#include <stdio.h>

enum TokenType {
    START_TAG_NAME,
    SCRIPT_START_TAG_NAME,
    STYLE_START_TAG_NAME,
    END_TAG_NAME,
    ERRONEOUS_END_TAG_NAME,
    SELF_CLOSING_TAG_DELIMITER,
    IMPLICIT_END_TAG,
    RAW_TEXT,
    COMMENT,
    DESCENDANT_OP,
    PSEUDO_CLASS_SELECTOR_COLON,
    ERROR_RECOVERY,
};


typedef struct {
    Array(Tag) tags;
} Scanner;


static const struct {
  const char *name;
  size_t      len;
} HTML_ELEMENTS[] = {
  { "A",           1 }, { "ABBR",        4 }, { "ADDRESS",    7 },
  { "AREA",        4 }, { "ARTICLE",     7 }, { "ASIDE",      5 },
  { "AUDIO",       5 }, { "B",           1 }, { "BASE",        4 },
  { "BDI",         3 }, { "BDO",         3 }, { "BLOCKQUOTE", 10 },
  { "BODY",        4 }, { "BR",          2 }, { "BUTTON",      6 },
  { "CANVAS",      6 }, { "CAPTION",     7 }, { "CITE",        4 },
  { "CODE",        4 }, { "COL",         3 }, { "COLGROUP",    8 },
  { "DATA",        4 }, { "DATALIST",    8 }, { "DD",          2 },
  { "DEL",         3 }, { "DETAILS",     7 }, { "DFN",         3 },
  { "DIALOG",      6 }, { "DIV",         3 }, { "DL",          2 },
  { "DT",          2 }, { "EM",          2 }, { "EMBED",       5 },
  { "FIELDSET",    8 }, { "FIGCAPTION",  10}, { "FIGURE",      6 },
  { "FOOTER",      6 }, { "FORM",        4 }, { "H1",          2 },
  { "H2",          2 }, { "H3",          2 }, { "H4",          2 },
  { "H5",          2 }, { "H6",          2 }, { "HEAD",        4 },
  { "HEADER",      6 }, { "HGROUP",      6 }, { "HR",          2 },
  { "HTML",        4 }, { "I",           1 }, { "IFRAME",      6 },
  { "IMG",         3 }, { "INPUT",       5 }, { "INS",         3 },
  { "KBD",         3 }, { "LABEL",       5 }, { "LEGEND",      6 },
  { "LI",          2 }, { "LINK",        4 }, { "MAIN",        4 },
  { "MAP",         3 }, { "MARK",        4 }, { "MATH",        4 },
  { "MENU",        4 }, { "META",        4 }, { "METER",       5 },
  { "NAV",         3 }, { "NOFRAMES",    8 }, { "NOSCRIPT",    8 },
  { "OBJECT",      6 }, { "OL",          2 }, { "OPTGROUP",    8 },
  { "OPTION",      6 }, { "OUTPUT",      6 }, { "P",           1 },
  { "PARAM",       5 }, { "PICTURE",     7 }, { "PRE",         3 },
  { "PROGRESS",    8 }, { "Q",           1 }, { "RB",          2 },
  { "RP",          2 }, { "RT",          2 }, { "RTC",         3 },
  { "RUBY",        4 }, { "S",           1 }, { "SAMP",        4 },
  { "SCRIPT",      6 }, { "SECTION",     7 }, { "SELECT",      6 },
  { "SMALL",       5 }, { "SOURCE",      6 }, { "SPAN",        4 },
  { "STRONG",      6 }, { "STYLE",       5 }, { "SUB",         3 },
  { "SUMMARY",     7 }, { "SUP",         3 }, { "SVG",         3 },
  { "TABLE",       5 }, { "TBODY",       5 }, { "TD",          2 },
  { "TEMPLATE",    8 }, { "TEXTAREA",    8 }, { "TFOOT",       5 },
  { "TH",          2 }, { "THEAD",       5 }, { "TIME",        4 },
  { "TITLE",       5 }, { "TR",          2 }, { "TRACK",       5 },
  { "U",           1 }, { "UL",          2 }, { "VAR",         3 },
  { "VIDEO",       5 }, { "WBR",         3 }
};

static const size_t HTML_ELEMENTS_COUNT = sizeof(HTML_ELEMENTS) / sizeof(*HTML_ELEMENTS);

bool is_valid_html_element(const String tag_name) {
    for (size_t i = 0; i < HTML_ELEMENTS_COUNT; i++) {
        if (tag_name.size == HTML_ELEMENTS[i].len &&
            memcmp(tag_name.contents,
                   HTML_ELEMENTS[i].name,
                   HTML_ELEMENTS[i].len) == 0) {
            return true;
        }
    }
    return false;
}

#define MAX(a, b) ((a) > (b) ? (a) : (b))

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }


bool static scan_css(void *payload, TSLexer *lexer, const bool *valid_symbols) {
    if (valid_symbols[ERROR_RECOVERY]) {
        return false;
    }

    if (iswspace(lexer->lookahead) && valid_symbols[DESCENDANT_OP]) {
        lexer->result_symbol = DESCENDANT_OP;

        skip(lexer);
        while (iswspace(lexer->lookahead)) {
            skip(lexer);
        }
        lexer->mark_end(lexer);

        if (lexer->lookahead == '#' || lexer->lookahead == '.' || lexer->lookahead == '[' || lexer->lookahead == '-' ||
            lexer->lookahead == '*' || iswalnum(lexer->lookahead)) {
            return true;
        }

        if (lexer->lookahead == ':') {
            advance(lexer);
            if (iswspace(lexer->lookahead)) {
                return false;
            }
            for (;;) {
                if (lexer->lookahead == ';' || lexer->lookahead == '}' || lexer->eof(lexer)) {
                    return false;
                }
                if (lexer->lookahead == '{') {
                    return true;
                }
                advance(lexer);
            }
        }
    }

    if (valid_symbols[PSEUDO_CLASS_SELECTOR_COLON]) {
        while (iswspace(lexer->lookahead)) {
            skip(lexer);
        }
        if (lexer->lookahead == ':') {
            advance(lexer);
            if (lexer->lookahead == ':') {
                return false;
            }
            lexer->mark_end(lexer);
            lexer->result_symbol = PSEUDO_CLASS_SELECTOR_COLON;
            // We need a { to be a pseudo class selector, a ; indicates a property
            while (lexer->lookahead != ';' && lexer->lookahead != '}' && !lexer->eof(lexer)) {
                advance(lexer);
                if (lexer->lookahead == '{') {
                    return true;
                }
            }

            // If we're at eof, and we happened to *not* find an opening brace to indicate we have a pseudo class
            // selector, we should *still* return one at EOF. This will improve error recovery, and the malformed code
            // can be parsed as an erroneous pseudo-class selector, rather than an erroneous property.
            return lexer->eof(lexer);
        }
    }

    return false;
}

static unsigned serialize(Scanner *scanner, char *buffer) {
    uint16_t tag_count = scanner->tags.size > UINT16_MAX ? UINT16_MAX : scanner->tags.size;
    uint16_t serialized_tag_count = 0;

    unsigned size = sizeof(tag_count);
    memcpy(&buffer[size], &tag_count, sizeof(tag_count));
    size += sizeof(tag_count);

    for (; serialized_tag_count < tag_count; serialized_tag_count++) {
        Tag tag = scanner->tags.contents[serialized_tag_count];
        if (tag.type == CUSTOM) {
            unsigned name_length = tag.custom_tag_name.size;
            if (name_length > UINT8_MAX) {
                name_length = UINT8_MAX;
            }
            if (size + 2 + name_length >= TREE_SITTER_SERIALIZATION_BUFFER_SIZE) {
                break;
            }
            buffer[size++] = (char)tag.type;
            buffer[size++] = (char)name_length;
            strncpy(&buffer[size], tag.custom_tag_name.contents, name_length);
            size += name_length;
        } else {
            if (size + 1 >= TREE_SITTER_SERIALIZATION_BUFFER_SIZE) {
                break;
            }
            buffer[size++] = (char)tag.type;
        }
    }

    memcpy(&buffer[0], &serialized_tag_count, sizeof(serialized_tag_count));
    return size;
}

static void deserialize(Scanner *scanner, const char *buffer, unsigned length) {
    for (unsigned i = 0; i < scanner->tags.size; i++) {
        tag_free(&scanner->tags.contents[i]);
    }
    array_clear(&scanner->tags);

    if (length > 0) {
        unsigned size = 0;
        uint16_t tag_count = 0;
        uint16_t serialized_tag_count = 0;

        memcpy(&serialized_tag_count, &buffer[size], sizeof(serialized_tag_count));
        size += sizeof(serialized_tag_count);

        memcpy(&tag_count, &buffer[size], sizeof(tag_count));
        size += sizeof(tag_count);

        array_reserve(&scanner->tags, tag_count);
        if (tag_count > 0) {
            unsigned iter = 0;
            for (iter = 0; iter < serialized_tag_count; iter++) {
                Tag tag = tag_new();
                tag.type = (TagType)buffer[size++];
                if (tag.type == CUSTOM) {
                    uint16_t name_length = (uint8_t)buffer[size++];
                    array_reserve(&tag.custom_tag_name, name_length);
                    tag.custom_tag_name.size = name_length;
                    memcpy(tag.custom_tag_name.contents, &buffer[size], name_length);
                    size += name_length;
                }
                array_push(&scanner->tags, tag);
            }
            // add zero tags if we didn't read enough, this is because the
            // buffer had no more room but we held more tags.
            for (; iter < tag_count; iter++) {
                array_push(&scanner->tags, tag_new());
            }
        }
    }
}

static String scan_tag_name(TSLexer *lexer) {
    String tag_name = array_new();
    while (iswalnum(lexer->lookahead) || lexer->lookahead == '-' || lexer->lookahead == ':') {
        array_push(&tag_name, towupper(lexer->lookahead));
        advance(lexer);
    }
    return tag_name;
}

static bool scan_comment(TSLexer *lexer) {
    if (lexer->lookahead != '-') {
        return false;
    }
    advance(lexer);
    if (lexer->lookahead != '-') {
        return false;
    }
    advance(lexer);

    unsigned dashes = 0;
    while (lexer->lookahead) {
        switch (lexer->lookahead) {
            case '-':
                ++dashes;
                break;
            case '>':
                if (dashes >= 2) {
                    lexer->result_symbol = COMMENT;
                    advance(lexer);
                    lexer->mark_end(lexer);
                    return true;
                }
            default:
                dashes = 0;
        }
        advance(lexer);
    }
    return false;
}

static bool scan_raw_text(Scanner *scanner, TSLexer *lexer) {
    if (scanner->tags.size == 0) {
        return false;
    }

    lexer->mark_end(lexer);

    const char *end_delimiter = array_back(&scanner->tags)->type == SCRIPT ? "</SCRIPT" : "</STYLE";

    unsigned delimiter_index = 0;
    while (lexer->lookahead) {
        if (towupper(lexer->lookahead) == end_delimiter[delimiter_index]) {
            delimiter_index++;
            if (delimiter_index == strlen(end_delimiter)) {
                break;
            }
            advance(lexer);
        } else {
            delimiter_index = 0;
            advance(lexer);
            lexer->mark_end(lexer);
        }
    }

    lexer->result_symbol = RAW_TEXT;
    return true;
}

static void pop_tag(Scanner *scanner) {
    Tag popped_tag = array_pop(&scanner->tags);
    tag_free(&popped_tag);
}

static bool scan_implicit_end_tag(Scanner *scanner, TSLexer *lexer) {
    Tag *parent = scanner->tags.size == 0 ? NULL : array_back(&scanner->tags);

    bool is_closing_tag = false;
    if (lexer->lookahead == '/') {
        is_closing_tag = true;
        advance(lexer);
    } else {
        if (parent && tag_is_void(parent)) {
            pop_tag(scanner);
            lexer->result_symbol = IMPLICIT_END_TAG;
            return true;
        }
    }

    String tag_name = scan_tag_name(lexer);
    if ((tag_name.size == 0 && !lexer->eof(lexer)) || ! is_valid_html_element(tag_name)) {
        array_delete(&tag_name);
        return false;
    }

    Tag next_tag = tag_for_name(tag_name);

    if (is_closing_tag) {
        // The tag correctly closes the topmost element on the stack
        if (scanner->tags.size > 0 && tag_eq(array_back(&scanner->tags), &next_tag)) {
            tag_free(&next_tag);
            return false;
        }

        // Otherwise, dig deeper and queue implicit end tags (to be nice in
        // the case of malformed HTML)
        for (unsigned i = scanner->tags.size; i > 0; i--) {
            if (scanner->tags.contents[i - 1].type == next_tag.type) {
                pop_tag(scanner);
                lexer->result_symbol = IMPLICIT_END_TAG;
                tag_free(&next_tag);
                return true;
            }
        }
    } else if (
        parent &&
        (
            !tag_can_contain(parent, &next_tag) ||
            ((parent->type == HTML || parent->type == HEAD || parent->type == BODY) && lexer->eof(lexer))
        )
    ) {
        pop_tag(scanner);
        lexer->result_symbol = IMPLICIT_END_TAG;
        tag_free(&next_tag);
        return true;
    }

    tag_free(&next_tag);
    return false;
}

static bool scan_start_tag_name(Scanner *scanner, TSLexer *lexer) {
    String tag_name = scan_tag_name(lexer);
    if (tag_name.size == 0 || ! is_valid_html_element(tag_name)) {
        array_delete(&tag_name);
        return false;
    }

    Tag tag = tag_for_name(tag_name);
    array_push(&scanner->tags, tag);
    switch (tag.type) {
        case SCRIPT:
            lexer->result_symbol = SCRIPT_START_TAG_NAME;
            break;
        case STYLE:
            lexer->result_symbol = STYLE_START_TAG_NAME;
            break;
        default:
            lexer->result_symbol = START_TAG_NAME;
            break;
    }
    return true;
}

static bool scan_end_tag_name(Scanner *scanner, TSLexer *lexer) {
    String tag_name = scan_tag_name(lexer);

    if (tag_name.size == 0 || ! is_valid_html_element(tag_name)) {
        array_delete(&tag_name);
        return false;
    }

    Tag tag = tag_for_name(tag_name);
    if (scanner->tags.size > 0 && tag_eq(array_back(&scanner->tags), &tag)) {
        pop_tag(scanner);
        lexer->result_symbol = END_TAG_NAME;
    } else {
        lexer->result_symbol = ERRONEOUS_END_TAG_NAME;
    }

    tag_free(&tag);
    return true;
}

static bool scan_self_closing_tag_delimiter(Scanner *scanner, TSLexer *lexer) {
    advance(lexer);
    if (lexer->lookahead == '>') {
        advance(lexer);
        if (scanner->tags.size > 0) {
            pop_tag(scanner);
            lexer->result_symbol = SELF_CLOSING_TAG_DELIMITER;
        }
        return true;
    }
    return false;
}

static bool scan_html(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
    if (valid_symbols[RAW_TEXT] && !valid_symbols[START_TAG_NAME] && !valid_symbols[END_TAG_NAME]) {
        return scan_raw_text(scanner, lexer);
    }

    while (iswspace(lexer->lookahead)) {
        skip(lexer);
    }

    if (lexer->lookahead == '{' && !valid_symbols[SELF_CLOSING_TAG_DELIMITER] ) return false;


    switch (lexer->lookahead) {
        case '<':
            lexer->mark_end(lexer);
            advance(lexer);

            if (lexer->lookahead == '!') {
                advance(lexer);
                return scan_comment(lexer);
            }

            if (valid_symbols[IMPLICIT_END_TAG]) {
                return scan_implicit_end_tag(scanner, lexer);
            }
            break;

        case '\0':
            if (valid_symbols[IMPLICIT_END_TAG]) {
                return scan_implicit_end_tag(scanner, lexer);
            }
            break;

        case '/':
            if (valid_symbols[SELF_CLOSING_TAG_DELIMITER]) {
                return scan_self_closing_tag_delimiter(scanner, lexer);
            }
            break;

        default:
            if ((valid_symbols[START_TAG_NAME] || valid_symbols[END_TAG_NAME]) && !valid_symbols[RAW_TEXT]) {
                return valid_symbols[START_TAG_NAME] ? scan_start_tag_name(scanner, lexer)
                                                     : scan_end_tag_name(scanner, lexer);
            }
    }

    return false;
}


static bool scan_attributes(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
    uint32_t depth = 0;
    uint32_t last_char = '!';
    while (!lexer->eof(lexer)) {
        if (lexer->lookahead == '<') {
            depth++;
        }
        if (lexer->lookahead == '>' && depth == 0) {
            if (last_char != '/') {
                lexer->mark_end(lexer);
            }
            return true;
        } else {
            last_char = lexer->lookahead;
            lexer->mark_end(lexer);
            advance(lexer);
        }
    }
    return false;
}

static bool scan(Scanner *scanner, TSLexer *lexer, const bool *valid_symbols) {
    if (lexer->lookahead == '{') {
        return false;
    }
    bool ret_value = false;
    if (valid_symbols[DESCENDANT_OP] || valid_symbols[PSEUDO_CLASS_SELECTOR_COLON]) {
        ret_value =  scan_css(scanner, lexer, valid_symbols);
    }
    if (ret_value) {
        return ret_value;
    }
    if (valid_symbols[START_TAG_NAME]
    || valid_symbols[SCRIPT_START_TAG_NAME]
    || valid_symbols[STYLE_START_TAG_NAME]
    || valid_symbols[END_TAG_NAME]
    || valid_symbols[SELF_CLOSING_TAG_DELIMITER]
    || valid_symbols[IMPLICIT_END_TAG]) {
        ret_value =  scan_html(scanner, lexer, valid_symbols);
    }
    
    if (ret_value) {
        return ret_value;
    }
    return ret_value;
}


void *tree_sitter_jx_external_scanner_create() {
    Scanner *scanner = (Scanner *)ts_calloc(1, sizeof(Scanner));
    return scanner;
}

bool tree_sitter_jx_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
    Scanner *scanner = (Scanner *)payload;
    return scan(scanner, lexer, valid_symbols);
}

unsigned tree_sitter_jx_external_scanner_serialize(void *payload, char *buffer) {
    Scanner *scanner = (Scanner *)payload;
    return serialize(scanner, buffer);
}

void tree_sitter_jx_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
    Scanner *scanner = (Scanner *)payload;
    deserialize(scanner, buffer, length);
}

void tree_sitter_jx_external_scanner_destroy(void *payload) {
    Scanner *scanner = (Scanner *)payload;
    for (unsigned i = 0; i < scanner->tags.size; i++) {
        tag_free(&scanner->tags.contents[i]);
    }
    array_delete(&scanner->tags);
    ts_free(scanner);
}
