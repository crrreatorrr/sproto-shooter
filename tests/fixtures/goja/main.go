// Runs the Shooter verifier bundle inside goja. Stdin is JSON. Stdout is the receipt JSON.
package main

import (
	"fmt"
	"io"
	"os"

	"github.com/dop251/goja"
)

func main() {
	if len(os.Args) != 2 && len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "usage: goja-verify <bundle.js> [export]")
		os.Exit(2)
	}
	method := "verifyRunJSON"
	if len(os.Args) == 3 {
		method = os.Args[2]
	}
	src, err := os.ReadFile(os.Args[1])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	input, err := io.ReadAll(os.Stdin)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	vm := goja.New()
	if _, err = vm.RunString(string(src)); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fn, ok := goja.AssertFunction(vm.Get("SprotoShooterSim").ToObject(vm).Get(method))
	if !ok {
		fmt.Fprintln(os.Stderr, method+" missing")
		os.Exit(1)
	}
	out, err := fn(goja.Undefined(), vm.ToValue(string(input)))
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Print(out.String())
}
