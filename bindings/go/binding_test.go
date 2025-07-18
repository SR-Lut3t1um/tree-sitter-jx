package tree_sitter_jx_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_jx "github.com/sr-lut3t1um/tree-sitter-jx/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_jx.Language())
	if language == nil {
		t.Errorf("Error loading Jx Parser grammar")
	}
}
