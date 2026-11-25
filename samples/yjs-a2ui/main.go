// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Binary yjs-a2ui launches the multi-user A2UI + Yjs CRDT collaboration server.
package main

import (
	"context"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	"github.com/a2ui-project/labs/samples/yjs-a2ui/agent"
	"github.com/a2ui-project/labs/samples/yjs-a2ui/room"
)

var (
	port   = flag.Int("port", 8890, "HTTP/WebSocket port to listen on")
	webDir = flag.String("web_dir", "web/dist/browser", "Path to built Angular SPA assets")
)

func resolvePort() int {
	if env := os.Getenv("PORT"); env != "" {
		if p, err := strconv.Atoi(env); err == nil && p > 0 {
			return p
		}
	}
	return *port
}

func resolveWebFS(dir string) fs.FS {
	candidates := []string{
		dir,
		filepath.Join("samples", "yjs-a2ui", dir),
	}
	for _, c := range candidates {
		if st, err := os.Stat(filepath.Join(c, "index.html")); err == nil && !st.IsDir() {
			log.Printf("Serving web assets from %s", c)
			return os.DirFS(c)
		}
	}
	log.Printf("Warning: built web assets not found at %q (run 'cd web && npm run build' or use 'npm run dev')", dir)
	return os.DirFS(".")
}

func main() {
	flag.Parse()

	ctx := context.Background()
	gen := agent.NewGeminiGenerator()
	orch := agent.NewOrchestrator(gen)
	mgr, err := room.NewManager(ctx, orch)
	if err != nil {
		log.Fatalf("Failed to initialize room manager: %v", err)
	}

	mux := http.NewServeMux()
	mgr.RegisterRoutes(mux, resolveWebFS(*webDir))

	addr := fmt.Sprintf(":%d", resolvePort())
	srv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Printf("Yjs + A2UI server listening on http://localhost%s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
		close(errCh)
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		log.Printf("Received signal %v, shutting down...", sig)
	case err := <-errCh:
		if err != nil {
			log.Fatalf("Server failed: %v", err)
		}
		return
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
	_ = mgr.Shutdown(shutdownCtx)
}
