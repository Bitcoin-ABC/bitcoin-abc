// This is a golang script, needed for generating the RPC bitcoin documentation
//
// What is necessary to run this:
// (1) install golang
// (2) install bitcoin ABC
// (3) run bitcoind (possibly on regtest to reduce system load)
// (4) run this script with `go run generate.go` while being in the build directory
// (5) add the generated files to git
package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path"
	"strings"
	"text/template"
)

const BITCOIN_COMMAND = "bitcoin-cli"

type Command struct {
	Name        string
	Description string
}

type Group struct {
	Index    int
	Name     string
	Commands []Command
}

type CommandData struct {
	Version     string
	Name        string
	Description string
	Group       string
	Permalink   string
}

var srcdir string = ""
var builddir string = ""
var bitcoin_cli_path string = BITCOIN_COMMAND

func setupEnv() error {
	srcdir = strings.TrimSpace(runCommand("git", "rev-parse", "--show-toplevel"))
	cwd, err := os.Getwd()
	if err != nil {
		log.Fatalf("Cannot find the build directory.")
		return err
	}
	builddir = cwd

	bitcoin_cli_path = path.Join(builddir, "src", BITCOIN_COMMAND)
	return nil
}

func getVersion() string {
	allInfo := run("getnetworkinfo")
	var f interface{}
	err := json.Unmarshal([]byte(allInfo), &f)
	if err != nil {
		panic("Cannot read network info as JSON")
	}
	m := f.(map[string]interface{})

	numv := int(m["version"].(float64))
	v := fmt.Sprintf("%d.%d.%d", numv/1000000, (numv/10000)%100, (numv/100)%100)
	return v
}

func main() {
	setupEnv()
	version := getVersion()

	first := run("help")
	split := strings.Split(first, "\n")

	groups := make([]Group, 0)
	commands := make([]Command, 0)
	lastGroupName := ""

	for _, line := range split {
		if len(line) > 0 {
			if strings.HasPrefix(line, "== ") {
				if len(commands) != 0 {
					g := Group{
						Name:     lastGroupName,
						Commands: commands,
						Index:    len(groups),
					}
					groups = append(groups, g)
					commands = make([]Command, 0)
				}
				lastGroupName = strings.ToLower(line[3 : len(line)-3])
			} else {
				name := strings.Split(line, " ")[0]
				desc := run("help", name)
				comm := Command{
					Name:        name,
					Description: desc,
				}
				commands = append(commands, comm)
			}
		}
	}

	g := Group{
		Name:     lastGroupName,
		Commands: commands,
		Index:    len(groups),
	}
	groups = append(groups, g)

	tmpl := template.Must(template.ParseFiles(path.Join(srcdir, "doc", "rpc", "command-template.md")))

	for _, group := range groups {
		groupname := group.Name
		dirname := path.Join("doc", "rpc", "en", version, "rpc", groupname)
		err := os.MkdirAll(dirname, 0777)
		if err != nil {
			log.Fatalf("Cannot make directory %s: %s", dirname, err.Error())
		}
		for _, command := range group.Commands {
			name := command.Name
			address := fmt.Sprintf("%s/%s.html", dirname, name)
			permalink := fmt.Sprintf("doc/%s/rpc/%s/%s/", version, groupname, name)
			err = tmpl.Execute(open(address), CommandData{
				Version:     version,
				Name:        name,
				Description: command.Description,
				Group:       groupname,
				Permalink:   permalink,
			})
			if err != nil {
				log.Fatalf("Cannot make command file %s: %s", name, err.Error())
			}
		}
	}
}

func open(path string) io.Writer {
	f, err := os.Create(path)
	// not closing, program will close sooner
	if err != nil {
		log.Fatalf("Cannot open file %s: %s", path, err.Error())
	}
	return f
}

func runCommand(command string, args ...string) string {
	out, err := exec.Command(command, args...).CombinedOutput()
	if err != nil {
		log.Fatalf("Cannot run %s: %s, is bitcoind running?", command, err.Error())
	}

	return string(out)
}

func run(args ...string) string {
	additionalArgs := os.Args[1:]
	args = append(additionalArgs, args...)
	return runCommand(bitcoin_cli_path, args...)
}
