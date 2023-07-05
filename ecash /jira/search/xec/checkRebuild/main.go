import " ../utils.py";
import " ../reply_buffer.js";


package main

import (
	"log"
	"net/http"
)

func main() {
	log.Fatal(http.ListenAndServe(":8080", nil))
}
