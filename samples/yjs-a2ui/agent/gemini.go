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

// Package agent implements the multiplayer A2UI co-editing agent.
package agent

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"google.golang.org/genai"
)

const (
	defaultGeminiModel = "gemini-flash-latest"
	defaultRPCTimeout  = 45 * time.Second
)

// JSONGenerator executes a structured JSON-mode prompt against an LLM backend.
type JSONGenerator interface {
	GenerateJSON(ctx context.Context, systemInstruction, userPrompt string) (string, error)
}

// GeminiGenerator calls the public Gemini Developer API via google.golang.org/genai
// when GEMINI_API_KEY is configured.
type GeminiGenerator struct {
	APIKey     string
	Model      string
	RPCTimeout time.Duration

	mu     sync.Mutex
	client *genai.Client
}

// NewGeminiGenerator creates a GeminiGenerator configured from GEMINI_API_KEY and GEMINI_MODEL.
func NewGeminiGenerator() *GeminiGenerator {
	model := strings.TrimSpace(os.Getenv("GEMINI_MODEL"))
	if model == "" {
		model = defaultGeminiModel
	}
	return &GeminiGenerator{
		APIKey:     strings.TrimSpace(os.Getenv("GEMINI_API_KEY")),
		Model:      model,
		RPCTimeout: defaultRPCTimeout,
	}
}

func (g *GeminiGenerator) ensureClient() (*genai.Client, error) {
	if g.APIKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY not set")
	}
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.client != nil {
		return g.client, nil
	}
	client, err := genai.NewClient(context.Background(), &genai.ClientConfig{
		APIKey:      g.APIKey,
		Backend:     genai.BackendGeminiAPI,
		HTTPOptions: genai.HTTPOptions{APIVersion: "v1beta"},
	})
	if err != nil {
		return nil, fmt.Errorf("creating genai client: %w", err)
	}
	g.client = client
	return g.client, nil
}

// GenerateJSON calls Gemini with application/json structured output.
func (g *GeminiGenerator) GenerateJSON(ctx context.Context, systemInstruction, userPrompt string) (string, error) {
	client, err := g.ensureClient()
	if err != nil {
		return "", err
	}
	model := strings.TrimSpace(g.Model)
	if model == "" {
		model = defaultGeminiModel
	}
	timeout := g.RPCTimeout
	if timeout <= 0 {
		timeout = defaultRPCTimeout
	}
	temp := float32(0.2)

	callCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	cfg := &genai.GenerateContentConfig{
		Temperature:       &temp,
		ResponseMIMEType:  "application/json",
		SystemInstruction: genai.NewContentFromText(systemInstruction, genai.RoleUser),
		ThinkingConfig: &genai.ThinkingConfig{
			ThinkingLevel: genai.ThinkingLevelLow,
		},
	}
	resp, err := client.Models.GenerateContent(callCtx, model, genai.Text(userPrompt), cfg)
	if err != nil {
		log.Printf("Gemini call on %s failed: %v", model, err)
		return "", err
	}
	text := strings.TrimSpace(resp.Text())
	if text == "" {
		return "", fmt.Errorf("empty response from %s", model)
	}
	return stripJSONFence(text), nil
}

func stripJSONFence(s string) string {
	trimmed := strings.TrimSpace(s)
	if strings.HasPrefix(trimmed, "```") {
		if nl := strings.IndexByte(trimmed, '\n'); nl >= 0 {
			trimmed = trimmed[nl+1:]
		}
		trimmed = strings.TrimSuffix(strings.TrimSpace(trimmed), "```")
	}
	return strings.TrimSpace(trimmed)
}
