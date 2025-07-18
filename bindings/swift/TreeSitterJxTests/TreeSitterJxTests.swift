import XCTest
import SwiftTreeSitter
import TreeSitterJx

final class TreeSitterJxTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_jx())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Jx Parser grammar")
    }
}
