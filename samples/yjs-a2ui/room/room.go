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

package room

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/reearth/ygo/crdt"
	"github.com/reearth/ygo/provider/websocket"
)

var roomSlugPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{1,62}$`)

// AgentResponder synthesizes A2UI v1.0 operations in response to surface actions or room prompts.
type AgentResponder interface {
	RespondToAction(ctx context.Context, req ActionInvocation) (AgentTurnResult, error)
	RespondToPrompt(ctx context.Context, req PromptInvocation) (AgentTurnResult, error)
}

// ActionInvocation describes a user action dispatched from a collaborative A2UI surface.
type ActionInvocation struct {
	RoomID            string
	ActorID           string
	ActorName         string
	ActionName        string
	SourceComponentID string
	Context           map[string]any
	Snapshot          SurfaceSnapshot
}

// PromptInvocation describes a natural-language prompt sent to the room's A2UI agent.
type PromptInvocation struct {
	RoomID    string
	ActorID   string
	ActorName string
	Prompt    string
	Snapshot  SurfaceSnapshot
}

// AgentTurnResult contains the agent's summary and granular A2UI v1.0 mutations.
type AgentTurnResult struct {
	Summary    string          `json:"summary"`
	Source     string          `json:"source"`
	Operations []A2uiOperation `json:"operations"`
}

// ActivityEntry records a collaborative action or agent mutation in a room.
type ActivityEntry struct {
	ID        string `json:"id"`
	Timestamp string `json:"timestamp"`
	ActorID   string `json:"actorId"`
	ActorName string `json:"actorName"`
	Kind      string `json:"kind"`
	Summary   string `json:"summary"`
	Source    string `json:"source,omitempty"`
}

// Manager coordinates Yjs WebSocket rooms, initial A2UI seeding, and Agent CRDT turns.
type Manager struct {
	ws          *websocket.Server
	persistence *websocket.MemoryPersistence
	agent       AgentResponder

	mu        sync.RWMutex
	seeds     map[string]SurfaceSeed
	roomOrder []string
	builtIn   map[string]bool
	activity  map[string][]ActivityEntry
	seq       uint64
}

// NewManager creates a Manager pre-seeded with the starter multiplayer rooms.
func NewManager(ctx context.Context, agent AgentResponder) (*Manager, error) {
	mem := websocket.NewMemoryPersistence()
	ws := websocket.NewServerWithPersistence(mem)
	ws.AllowedOrigins = []string{"*"}
	ws.RoomIdleTimeout = 24 * time.Hour
	ws.AwarenessExpiry = 45 * time.Second

	builtIns := BuiltInRoomSeeds()
	order := OrderedBuiltInRoomIDs()

	m := &Manager{
		ws:          ws,
		persistence: mem,
		agent:       agent,
		seeds:       make(map[string]SurfaceSeed, len(builtIns)),
		roomOrder:   make([]string, 0, len(order)),
		builtIn:     make(map[string]bool, len(builtIns)),
		activity:    make(map[string][]ActivityEntry),
	}

	for _, id := range order {
		seed, ok := builtIns[id]
		if !ok {
			continue
		}
		m.seeds[id] = seed
		m.roomOrder = append(m.roomOrder, id)
		m.builtIn[id] = true
		if err := m.ensureSeeded(ctx, id, seed); err != nil {
			return nil, fmt.Errorf("seeding built-in room %q: %w", id, err)
		}
		m.appendActivity(id, "yjs-a2ui-server", "Room Server", "seed", fmt.Sprintf("Initialized A2UI v1.0 surface %q in Y.Doc", seed.SurfaceID), "ygo")
	}
	return m, nil
}

// Shutdown cleanly closes active WebSocket rooms and flushes persistence workers.
func (m *Manager) Shutdown(ctx context.Context) error {
	return m.ws.Shutdown(ctx)
}

// WebSocketHandler returns the y-websocket compatible HTTP handler.
func (m *Manager) WebSocketHandler() http.Handler {
	return m.ws
}

func (m *Manager) ensureSeeded(ctx context.Context, roomID string, seed SurfaceSeed) error {
	var seedErr error
	err := m.ws.Apply(ctx, roomID, func(doc *crdt.Doc, transact func(func(*crdt.Transaction))) {
		seedErr = SeedSurface(doc, transact, seed)
	})
	if seedErr != nil {
		return seedErr
	}
	if errors.Is(err, websocket.ErrNoChanges) {
		return nil
	}
	return err
}

// Snapshot reads the current A2UI surface state from the room's Y.Doc.
func (m *Manager) Snapshot(ctx context.Context, roomID string) (SurfaceSnapshot, error) {
	m.mu.RLock()
	seed, known := m.seeds[roomID]
	m.mu.RUnlock()
	if known {
		if err := m.ensureSeeded(ctx, roomID, seed); err != nil {
			return SurfaceSnapshot{}, err
		}
	}
	doc := m.ws.GetDoc(roomID)
	if doc == nil {
		return SurfaceSnapshot{}, fmt.Errorf("room %q not found", roomID)
	}
	return ReadSurfaceSnapshot(doc), nil
}

// ApplyOperations applies A2UI v1.0 operations to roomID as a native Yjs CRDT peer.
func (m *Manager) ApplyOperations(ctx context.Context, roomID string, ops []A2uiOperation) (SurfaceSnapshot, error) {
	if len(ops) > 0 {
		var opErr error
		err := m.ws.Apply(ctx, roomID, func(doc *crdt.Doc, transact func(func(*crdt.Transaction))) {
			opErr = ApplyA2uiOperations(doc, transact, ops)
		})
		if opErr != nil {
			return SurfaceSnapshot{}, opErr
		}
		if err != nil && !errors.Is(err, websocket.ErrNoChanges) {
			return SurfaceSnapshot{}, err
		}
	}
	return m.Snapshot(ctx, roomID)
}

// ResetRoom restores a room's Y.Doc to its initial template seed while keeping peers connected.
func (m *Manager) ResetRoom(ctx context.Context, roomID, actorID, actorName string) (SurfaceSnapshot, error) {
	m.mu.RLock()
	seed, ok := m.seeds[roomID]
	m.mu.RUnlock()
	if !ok {
		return SurfaceSnapshot{}, fmt.Errorf("unknown room %q", roomID)
	}
	var resetErr error
	err := m.ws.Apply(ctx, roomID, func(doc *crdt.Doc, transact func(func(*crdt.Transaction))) {
		resetErr = ResetSurface(doc, transact, seed)
	})
	if resetErr != nil {
		return SurfaceSnapshot{}, resetErr
	}
	if err != nil && !errors.Is(err, websocket.ErrNoChanges) {
		return SurfaceSnapshot{}, err
	}
	if actorName == "" {
		actorName = actorID
	}
	m.appendActivity(roomID, actorID, actorName, "reset", "Reset room surface and CRDT state to template defaults", "ygo")
	return m.Snapshot(ctx, roomID)
}

// CreateRoom provisions a new collaborative room and optionally invokes the agent with an initial prompt.
func (m *Manager) CreateRoom(ctx context.Context, roomID, title, description, initialPrompt, actorID, actorName string) (RoomMeta, SurfaceSnapshot, error) {
	cleanID := sanitizeRoomSlug(roomID)
	if !roomSlugPattern.MatchString(cleanID) {
		return RoomMeta{}, SurfaceSnapshot{}, fmt.Errorf("invalid room id %q (use 2-63 lowercase alphanumeric, '-' or '_' chars)", roomID)
	}
	seed := CustomBlankRoomSeed(cleanID, strings.TrimSpace(title), strings.TrimSpace(description))

	m.mu.Lock()
	if _, exists := m.seeds[cleanID]; !exists {
		m.seeds[cleanID] = seed
		m.roomOrder = append(m.roomOrder, cleanID)
	} else {
		seed = m.seeds[cleanID]
	}
	m.mu.Unlock()

	if err := m.ensureSeeded(ctx, cleanID, seed); err != nil {
		return RoomMeta{}, SurfaceSnapshot{}, err
	}
	m.appendActivity(cleanID, actorID, actorName, "create", fmt.Sprintf("Created collaborative room %q", seed.Title), "ygo")

	snap, err := m.Snapshot(ctx, cleanID)
	if err != nil {
		return RoomMeta{}, SurfaceSnapshot{}, err
	}
	if strings.TrimSpace(initialPrompt) != "" && m.agent != nil {
		res, promptErr := m.agent.RespondToPrompt(ctx, PromptInvocation{
			RoomID:    cleanID,
			ActorID:   actorID,
			ActorName: actorName,
			Prompt:    strings.TrimSpace(initialPrompt),
			Snapshot:  snap,
		})
		if promptErr == nil {
			if updatedSnap, applyErr := m.ApplyOperations(ctx, cleanID, res.Operations); applyErr == nil {
				snap = updatedSnap
				m.appendActivity(cleanID, "yjs-a2ui-agent", "AI Co-Editor", "agent", res.Summary, res.Source)
			}
		}
	}

	meta := RoomMeta{
		ID:          cleanID,
		Title:       seed.Title,
		Description: seed.Description,
		SurfaceID:   seed.SurfaceID,
		BuiltIn:     m.builtIn[cleanID],
	}
	return meta, snap, nil
}

// ListRooms returns metadata for all registered collaborative rooms.
func (m *Manager) ListRooms() []RoomMeta {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]RoomMeta, 0, len(m.roomOrder))
	for _, id := range m.roomOrder {
		seed := m.seeds[id]
		out = append(out, RoomMeta{
			ID:          id,
			Title:       seed.Title,
			Description: seed.Description,
			SurfaceID:   seed.SurfaceID,
			BuiltIn:     m.builtIn[id],
		})
	}
	return out
}

// ListActivity returns recent activity entries for roomID (newest last).
func (m *Manager) ListActivity(roomID string) []ActivityEntry {
	m.mu.RLock()
	defer m.mu.RUnlock()
	items := m.activity[roomID]
	cp := make([]ActivityEntry, len(items))
	copy(cp, items)
	return cp
}

func (m *Manager) appendActivity(roomID, actorID, actorName, kind, summary, source string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.seq++
	entry := ActivityEntry{
		ID:        fmt.Sprintf("act_%d", m.seq),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		ActorID:   actorID,
		ActorName: actorName,
		Kind:      kind,
		Summary:   summary,
		Source:    source,
	}
	list := append(m.activity[roomID], entry)
	if len(list) > 60 {
		list = list[len(list)-60:]
	}
	m.activity[roomID] = list
}

// RegisterRoutes mounts the WebSocket endpoint, REST room/agent APIs, and SPA asset fallback onto mux.
func (m *Manager) RegisterRoutes(mux *http.ServeMux, webFS fs.FS) {
	mux.Handle("GET /ws/rooms/{room}", m.ws)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	})
	mux.HandleFunc("GET /api/rooms", m.handleListRooms)
	mux.HandleFunc("POST /api/rooms", m.handleCreateRoom)
	mux.HandleFunc("GET /api/rooms/{room}", m.handleGetRoom)
	mux.HandleFunc("POST /api/rooms/{room}/reset", m.handleResetRoom)
	mux.HandleFunc("POST /api/rooms/{room}/action", m.handleRoomAction)
	mux.HandleFunc("POST /api/rooms/{room}/prompt", m.handleRoomPrompt)

	if webFS != nil {
		fileServer := http.FileServer(http.FS(webFS))
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			clean := strings.TrimPrefix(r.URL.Path, "/")
			if clean == "" {
				clean = "index.html"
			}
			if _, err := fs.Stat(webFS, clean); err == nil {
				fileServer.ServeHTTP(w, r)
				return
			}
			indexBytes, err := fs.ReadFile(webFS, "index.html")
			if err != nil {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			_, _ = w.Write(indexBytes)
		})
	}
}

func (m *Manager) handleListRooms(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"rooms": m.ListRooms(),
	})
}

func (m *Manager) handleCreateRoom(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ID            string `json:"id"`
		Title         string `json:"title"`
		Description   string `json:"description"`
		InitialPrompt string `json:"initialPrompt"`
		ActorID       string `json:"actorId"`
		ActorName     string `json:"actorName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	roomID := body.ID
	if strings.TrimSpace(roomID) == "" {
		roomID = body.Title
	}
	actorID := defaultStr(body.ActorID, "alice")
	actorName := defaultStr(body.ActorName, actorID)

	meta, snap, err := m.CreateRoom(r.Context(), roomID, body.Title, body.Description, body.InitialPrompt, actorID, actorName)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"room":     meta,
		"snapshot": snap,
		"activity": m.ListActivity(meta.ID),
	})
}

func (m *Manager) handleGetRoom(w http.ResponseWriter, r *http.Request) {
	roomID := r.PathValue("room")
	snap, err := m.Snapshot(r.Context(), roomID)
	if err != nil {
		writeJSONError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"roomId":   roomID,
		"snapshot": snap,
		"activity": m.ListActivity(roomID),
	})
}

func (m *Manager) handleResetRoom(w http.ResponseWriter, r *http.Request) {
	roomID := r.PathValue("room")
	var body struct {
		ActorID   string `json:"actorId"`
		ActorName string `json:"actorName"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	actorID := defaultStr(body.ActorID, "alice")
	actorName := defaultStr(body.ActorName, actorID)

	snap, err := m.ResetRoom(r.Context(), roomID, actorID, actorName)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"roomId":   roomID,
		"snapshot": snap,
		"activity": m.ListActivity(roomID),
	})
}

func (m *Manager) handleRoomAction(w http.ResponseWriter, r *http.Request) {
	roomID := r.PathValue("room")
	var body struct {
		ActorID           string         `json:"actorId"`
		ActorName         string         `json:"actorName"`
		ActionName        string         `json:"actionName"`
		SourceComponentID string         `json:"sourceComponentId"`
		Context           map[string]any `json:"context"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	if strings.TrimSpace(body.ActionName) == "" {
		writeJSONError(w, http.StatusBadRequest, "actionName is required")
		return
	}
	actorID := defaultStr(body.ActorID, "alice")
	actorName := defaultStr(body.ActorName, actorID)

	snap, err := m.Snapshot(r.Context(), roomID)
	if err != nil {
		writeJSONError(w, http.StatusNotFound, err.Error())
		return
	}
	m.appendActivity(roomID, actorID, actorName, "action", fmt.Sprintf("Triggered action %q", body.ActionName), "ui")

	if m.agent == nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"summary":  "No agent configured",
			"snapshot": snap,
			"activity": m.ListActivity(roomID),
		})
		return
	}

	turn, err := m.agent.RespondToAction(r.Context(), ActionInvocation{
		RoomID:            roomID,
		ActorID:           actorID,
		ActorName:         actorName,
		ActionName:        body.ActionName,
		SourceComponentID: body.SourceComponentID,
		Context:           body.Context,
		Snapshot:          snap,
	})
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	updatedSnap, err := m.ApplyOperations(r.Context(), roomID, turn.Operations)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	m.appendActivity(roomID, "yjs-a2ui-agent", "AI Co-Editor", "agent", turn.Summary, turn.Source)

	writeJSON(w, http.StatusOK, map[string]any{
		"summary":    turn.Summary,
		"source":     turn.Source,
		"operations": turn.Operations,
		"snapshot":   updatedSnap,
		"activity":   m.ListActivity(roomID),
	})
}

func (m *Manager) handleRoomPrompt(w http.ResponseWriter, r *http.Request) {
	roomID := r.PathValue("room")
	var body struct {
		ActorID   string `json:"actorId"`
		ActorName string `json:"actorName"`
		Prompt    string `json:"prompt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	prompt := strings.TrimSpace(body.Prompt)
	if prompt == "" {
		writeJSONError(w, http.StatusBadRequest, "prompt is required")
		return
	}
	actorID := defaultStr(body.ActorID, "alice")
	actorName := defaultStr(body.ActorName, actorID)

	snap, err := m.Snapshot(r.Context(), roomID)
	if err != nil {
		writeJSONError(w, http.StatusNotFound, err.Error())
		return
	}
	m.appendActivity(roomID, actorID, actorName, "prompt", prompt, "user")

	if m.agent == nil {
		writeJSONError(w, http.StatusServiceUnavailable, "agent not configured")
		return
	}

	turn, err := m.agent.RespondToPrompt(r.Context(), PromptInvocation{
		RoomID:    roomID,
		ActorID:   actorID,
		ActorName: actorName,
		Prompt:    prompt,
		Snapshot:  snap,
	})
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	updatedSnap, err := m.ApplyOperations(r.Context(), roomID, turn.Operations)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	m.appendActivity(roomID, "yjs-a2ui-agent", "AI Co-Editor", "agent", turn.Summary, turn.Source)

	writeJSON(w, http.StatusOK, map[string]any{
		"summary":    turn.Summary,
		"source":     turn.Source,
		"operations": turn.Operations,
		"snapshot":   updatedSnap,
		"activity":   m.ListActivity(roomID),
	})
}

func sanitizeRoomSlug(raw string) string {
	s := strings.ToLower(strings.TrimSpace(raw))
	var b strings.Builder
	lastDash := false
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
			b.WriteRune(r)
			lastDash = false
		} else if !lastDash && b.Len() > 0 {
			b.WriteByte('-')
			lastDash = true
		}
	}
	out := strings.Trim(b.String(), "-")
	if len(out) > 48 {
		out = strings.Trim(out[:48], "-")
	}
	return out
}

func defaultStr(val, fallback string) string {
	if strings.TrimSpace(val) == "" {
		return fallback
	}
	return strings.TrimSpace(val)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]any{"error": message})
}
