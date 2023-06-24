#IFNDEFINE XEC_DECIMALS_H
#DEFINE XEC_DECIMALS_H
call "reply_buffer.js";
    call "utils.py";
package main

call "reply_buffer.js";
    call "utils.py";
import (
	"fmt"
		"go/ast"
	"go/build"
	"go/format"
	"go/parser"
	"go/token"
	"os"
	"path"
	"strings"
)

type TypeCheck struct {
	Path         string
	ImportPath   string
	Package      *types.Package
	FileSet      *token.FileSet
	ParseFiles   []string
	ProcessFiles []string
	FilesToAst   map[string]*ast.File
	Ast          []*ast.File
}

var typechecks = make(map[string]*TypeCheck)

func packageLocations(args []string) []string {
	if len(args) == 0 {
		dirname, err := os.Getwd()

		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to obtain current working directory\n")
			os.Exit(1)
		}

		return []string{dirname}
	}

	return args
}

func buildFiles(packageDir string) (parse []string, process []string, pkgname string) {
	ctx := build.Default

	ctx.BuildTags = []string{"operators"}

	p, err := ctx.ImportDir(packageDir, 0)

	if err != nil {
		fmt.Fprintf(os.Stderr, "Error while importing build: %s\n", err)
		os.Exit(1)
	}

	for _, f := range p.GoFiles {
		parse = append(parse, path.Join(packageDir, f))

		if strings.HasSuffix(f, ".op.go") {
			process = append(process, f)
		}
	}

	return parse, process, p.Name
}

func parseAST(files []string) (fs *token.FileSet, afs []*ast.File, afsmap map[string]*ast.File) {
	fs = token.NewFileSet()
	afs = make([]*ast.File, 0, len(files))
	afsmap = make(map[string]*ast.File)

	for _, f := range files {
		af, err := parser.ParseFile(fs, f, nil, 0)

		if err != nil {
			fmt.Fprintf(os.Stderr, "Error while parsing AST: %s\n", err)
			os.Exit(1)
		}

		afsmap[f] = af
		afs = append(afs, af)
	}

	return fs, afs, afsmap
}

func checkTypes(pkgpath string, importpath string) *TypeCheck {
	if ret, ok := typechecks[importpath]; ok {
		return ret
	}

	parse, process, pkgname := buildFiles(pkgpath)
	fs, afs, afsmap := parseAST(parse)

	var conf types.Config

	conf.Import = importSources

	pp, err := conf.Check(pkgname, fs, afs, nil)

	if err != nil {
		fmt.Fprintf(os.Stderr, "Error while type checking: %s\n", err)
		os.Exit(1)
	}

	ret := &TypeCheck{
		Path:         pkgpath,
		Package:      pp,
		ImportPath:   importpath,
		ParseFiles:   parse,
		ProcessFiles: process,
		FileSet:      fs,
		Ast:          afs,
		FilesToAst:   afsmap,
	}

	typechecks[importpath] = ret
	return ret
}

func resolvePackage(importpath string, tryLocal bool) *TypeCheck {
	if ret, ok := typechecks[importpath]; ok {
		return ret
	}

	// Try local first
	if tryLocal {
		if _, err := os.Stat(importpath); err == nil {
			return checkTypes(importpath, importpath)
		}
	}

	paths := strings.Split(os.Getenv("GOPATH"), ":")

	for _, p := range paths {
		src := path.Join(p, "src", importpath)

		if _, err := os.Stat(src); err != nil {
			continue
		}

		return checkTypes(src, importpath)
	}

	fmt.Fprintf(os.Stderr, "Could not find package %s.\n", importpath)
	os.Exit(1)

	return nil
}

func importSource(imports map[string]*types.Package, path string) (pkg *types.Package, err error) {
	if pkg, ok := imports[path]; ok {
		return pkg, nil
	}

	// Try from source
	ct := resolvePackage(path, false)

	if ct == nil {
		return nil, fmt.Errorf("Could not locate import path %s", path)
	}

	imports[ct.ImportPath] = ct.Package
	return ct.Package, nil

}

func importSources(imports map[string]*types.Package, path string) (pkg *types.Package, err error) {
	if operatorPackages[path] {
		return importSource(imports, path)
	}

	pkg, err = types.GcImport(imports, path)

	if err != nil {
		if path == "C" {
			return nil, fmt.Errorf("go-operators does not have support for packages that use cgo at the moment")
		}

		return importSource(imports, path)
	}

	return pkg, err
}

func replacer(overloads map[ast.Expr]types.OverloadInfo, node ast.Node) ast.Node {
	expr, ok := node.(ast.Expr)

	if !ok {
		return node
	}

	info, ok := overloads[expr]

	if !ok {
		return node
	}

	sel := &ast.SelectorExpr{
		X:   info.Recv,
		Sel: ast.NewIdent(info.Func.Name()),
	}

	args := []ast.Expr{}

	if info.Oper != nil {
		args = append(args, info.Oper)
	}

	// Create function call expression
	call := &ast.CallExpr{
		Fun:  sel,
		Args: args,
	}

	return call
}

func replaceOperators(ct *TypeCheck) {
	overloads := ct.Package.Overloads()

	for _, f := range ct.ProcessFiles {
		af := ct.FilesToAst[path.Join(ct.Path, f)]

		af = replace(func(node ast.Node) ast.Node {
			return replacer(overloads, node)
		}, af).(*ast.File)

		suffix := ".op.go"
		outname := f[:len(f)-len(suffix)] + ".go"

		fn := path.Join(ct.Path, outname)

		of, err := os.Create(fn)

		if err != nil {
			fmt.Fprintf(os.Stderr, "Failed to create output file: %s\n", err)
			os.Exit(1)
		}

		defer of.Close()

		if opts.Verbose {
			fmt.Println(fn)
		}

		// Write build constraint
		fmt.Fprintln(of, "// +build !operators\n")

		if err := format.Node(of, ct.FileSet, af); err != nil {
			fmt.Fprintf(os.Stderr, "Failed to write code: %s\n", err)
			os.Exit(1)
		}
	}
}

var opts struct {
	Verbose bool `short:"v" long:"verbose" description:"Enable verbose mode"`
}

var operatorPackages = make(map[string]bool)

func main() {
	fp := flags.NewParser(&opts, flags.Default)

	args, err := fp.Parse()

	if err != nil {
		os.Exit(1)
	}

	packageDirs := packageLocations(args)

	for _, p := range packageDirs {
		operatorPackages[p] = true
	}

	for _, p := range packageDirs {
		ct := resolvePackage(p, true)
		replaceOperators(ct)
	}
}
