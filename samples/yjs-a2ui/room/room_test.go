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
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/reearth/ygo/crdt"
	ygsync "github.com/reearth/ygo/sync"
	gws "github.com/gorilla/websocket"
)

type stubAgent struct{}

func (stubAgent) RespondToAction(_ context.Context, req ActionInvocation) (AgentTurnResult, error) {
	return AgentTurnResult{
		Summary: "Synthesized consensus for " + req.ActionName,
		Source:  "stub",
		Operations: []A2uiOperation{
			{
				UpdateDataModel: &UpdateDataModelPayload{
					SurfaceID: req.Snapshot.SurfaceID,
					Path:      "/shared/agentSummary",
					Value:     "Consensus updated by " + req.ActorID,
				},
			},
		},
	}, nil
}

func (stubAgent) RespondToPrompt(_ context.Context, req PromptInvocation) (AgentTurnResult, error) {
	return AgentTurnResult{
		Summary: "Applied prompt: " + req.Prompt,
		Source:  "stub",
		Operations: []A2uiOperation{
			{
				UpdateDataModel: &UpdateDataModelPayload{
					SurfaceID: req.Snapshot.SurfaceID,
					Path:      "/shared/agentSummary",
					Value:     "Prompt result: " + req.Prompt,
				},
			},
		},
	}, nil
}

func TestBuiltInRoomsSeedAndClassifyTextFieldsAsYText(t *testing.T) {
	ctx := context.Background()
	mgr, err := NewManager(ctx, stubAgent{})
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}
	defer func() { _ = mgr.Shutdown(ctx) }()

	rooms := mgr.ListRooms()
	if len(rooms) != 3 {
		t.Fatalf("len(ListRooms()) = %d, want 3", len(rooms))
	}

	snap, err := mgr.Snapshot(ctx, "arch-tradeoff")
	if err != nil {
		t.Fatalf("Snapshot(arch-tradeoff) error = %v", err)
	}
	if snap.SurfaceID != "arch_tradeoff_surface" {
		t.Fatalf("SurfaceID = %q, want arch_tradeoff_surface", snap.SurfaceID)
	}
	if len(snap.Components) == 0 || snap.Components[0]["id"] != "root" {
		t.Fatalf("expected root first in Components, got %+v", snap.Components)
	}

	typesByPath := make(map[string]string, len(snap.CrdtFields))
	for _, f := range snap.CrdtFields {
		typesByPath[f.Path] = f.CrdtType
	}
	// TextField-bound paths must use Y.Text.
	if typesByPath["/shared/proposalSummary"] != "Y.Text" {
		t.Errorf("/shared/proposalSummary CRDT type = %q, want Y.Text", typesByPath["/shared/proposalSummary"])
	}
	if typesByPath["/shared/openRisks"] != "Y.Text" {
		t.Errorf("/shared/openRisks CRDT type = %q, want Y.Text", typesByPath["/shared/openRisks"])
	}
	// ChoicePicker array path must use Y.Array, and numeric slider must stay LWW in Y.Map!
	if typesByPath["/users/alice/vote"] != "Y.Array" {
		t.Errorf("/users/alice/vote CRDT type = %q, want Y.Array", typesByPath["/users/alice/vote"])
	}
	if typesByPath["/shared/latencyBudgetMs"] != "Y.Map(LWW)" {
		t.Errorf("/shared/latencyBudgetMs CRDT type = %q, want Y.Map(LWW)", typesByPath["/shared/latencyBudgetMs"])
	}
	if typesByPath["/shared/priorityPillars"] != "Y.Array" {
		t.Errorf("/shared/priorityPillars CRDT type = %q, want Y.Array", typesByPath["/shared/priorityPillars"])
	}
}

func TestBuiltInAndCustomSeedsIncludeAllFourPersonas(t *testing.T) {
	seeds := BuiltInRoomSeeds()
	seeds["custom-1"] = CustomBlankRoomSeed("custom-1", "Custom Room", "Custom desc")
	wantUsers := []string{"alice", "bob", "charlie", "diana"}
	for roomID, seed := range seeds {
		users, ok := seed.DataModel["users"].(map[string]any)
		if !ok {
			t.Fatalf("room %q missing /users map", roomID)
		}
		for _, actor := range wantUsers {
			if _, exists := users[actor]; !exists {
				t.Errorf("room %q missing persona %q in /users", roomID, actor)
			}
		}
	}
}

func TestComputeUTF16TextDiffPreservesSurrogatePairs(t *testing.T) {
	oldStr := "Hello 🚀 world!"
	newStr := "Hello 🚀 multiplayer world!"
	idx, delLen, ins := ComputeUTF16TextDiff(oldStr, newStr)
	// "Hello " (6) + "🚀" (2 UTF-16 code units) + " " (1) = 9 UTF-16 code units.
	if idx != 9 || delLen != 0 || ins != "multiplayer " {
		t.Fatalf("ComputeUTF16TextDiff() = (%d, %d, %q), want (9, 0, %q)", idx, delLen, ins, "multiplayer ")
	}
}

func TestApplyOperationsPreservesConcurrentPeerEditsOverWebSocket(t *testing.T) {
	ctx := context.Background()
	mgr, err := NewManager(ctx, stubAgent{})
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}
	defer func() { _ = mgr.Shutdown(ctx) }()

	mux := http.NewServeMux()
	mgr.RegisterRoutes(mux, nil)
	ts := httptest.NewServer(mux)
	defer ts.Close()

	wsURL := "ws" + strings.TrimPrefix(ts.URL, "http") + "/ws/rooms/arch-tradeoff"
	connA, _, err := gws.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Dial peer A error = %v", err)
	}
	defer connA.Close()

	connB, _, err := gws.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Dial peer B error = %v", err)
	}
	defer connB.Close()

	docA := syncPeerHandshake(t, connA, 101)
	docB := syncPeerHandshake(t, connB, 202)

	// Peer A appends to /shared/proposalSummary (Y.Text) and updates /users/alice/vote.
	var updateFromA []byte
	unsubA := docA.OnUpdate(func(u []byte, _ any) {
		updateFromA = u
	})
	sharedA, _ := docA.GetMap("data").Get("shared")
	summaryA := sharedA.(*crdt.YMap).Get
	rawSummaryA, _ := summaryA("proposalSummary")
	yTextA := rawSummaryA.(*crdt.YText)
	curLenA := yTextA.Len()
	usersA, _ := docA.GetMap("data").Get("users")
	aliceMapA, _ := usersA.(*crdt.YMap).Get("alice")
	docA.Transact(func(txn *crdt.Transaction) {
		yTextA.Insert(txn, curLenA, " [Alice]", nil)
		aliceMapA.(*crdt.YMap).Set(txn, "vote", "hybrid_crdt_rpc")
	})
	unsubA()

	// Peer B concurrently prepends "[Bob] " to /shared/proposalSummary (Y.Text) BEFORE receiving A's update!
	var updateFromB []byte
	unsubB := docB.OnUpdate(func(u []byte, _ any) {
		updateFromB = u
	})
	sharedB, _ := docB.GetMap("data").Get("shared")
	rawSummaryB, _ := sharedB.(*crdt.YMap).Get("proposalSummary")
	yTextB := rawSummaryB.(*crdt.YText)
	usersB, _ := docB.GetMap("data").Get("users")
	bobMapB, _ := usersB.(*crdt.YMap).Get("bob")
	docB.Transact(func(txn *crdt.Transaction) {
		yTextB.Insert(txn, 0, "[Bob] ", nil)
		bobMapB.(*crdt.YMap).Set(txn, "vote", "yjs_crdt")
	})
	unsubB()

	sendYjsUpdateFrame(t, connA, updateFromA)
	sendYjsUpdateFrame(t, connB, updateFromB)

	// Wait briefly for server to integrate both WebSocket frames, then trigger an HTTP Agent action!
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		snap, err := mgr.Snapshot(ctx, "arch-tradeoff")
		if err == nil {
			shared, _ := snap.DataModel["shared"].(map[string]any)
			gotSummary, _ := shared["proposalSummary"].(string)
			if strings.HasPrefix(gotSummary, "[Bob] ") && strings.HasSuffix(gotSummary, " [Alice]") {
				break
			}
		}
		time.Sleep(15 * time.Millisecond)
	}

	// Now invoke POST /api/rooms/arch-tradeoff/action and verify the agent's leaf update preserves BOTH peers' edits!
	actionBody, _ := json.Marshal(map[string]any{
		"actorId":    "alice",
		"actorName":  "Alice",
		"actionName": "synthesize_consensus",
	})
	resp, err := http.Post(ts.URL+"/api/rooms/arch-tradeoff/action", "application/json", bytes.NewReader(actionBody))
	if err != nil {
		t.Fatalf("POST action error = %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("POST action status = %d, want 200", resp.StatusCode)
	}

	snap, err := mgr.Snapshot(ctx, "arch-tradeoff")
	if err != nil {
		t.Fatalf("Snapshot() error = %v", err)
	}
	shared := snap.DataModel["shared"].(map[string]any)
	mergedSummary := shared["proposalSummary"].(string)
	if !strings.HasPrefix(mergedSummary, "[Bob] ") || !strings.HasSuffix(mergedSummary, " [Alice]") {
		t.Fatalf("merged proposalSummary = %q, want both [Bob] prefix and [Alice] suffix preserved", mergedSummary)
	}
	if got := shared["agentSummary"].(string); got != "Consensus updated by alice" {
		t.Fatalf("agentSummary = %q, want %q", got, "Consensus updated by alice")
	}
	users := snap.DataModel["users"].(map[string]any)
	if got := users["alice"].(map[string]any)["vote"]; got != "hybrid_crdt_rpc" {
		t.Fatalf("alice vote = %v, want hybrid_crdt_rpc", got)
	}
	if got := users["bob"].(map[string]any)["vote"]; got != "yjs_crdt" {
		t.Fatalf("bob vote = %v, want yjs_crdt", got)
	}
}

func syncPeerHandshake(t *testing.T, conn *gws.Conn, clientID crdt.ClientID) *crdt.Doc {
	t.Helper()
	doc := crdt.New(crdt.WithClientID(clientID))
	step1 := append([]byte{0}, ygsync.EncodeSyncStep1(doc)...)
	if err := conn.WriteMessage(gws.BinaryMessage, step1); err != nil {
		t.Fatalf("WriteMessage SyncStep1: %v", err)
	}
	_ = conn.SetReadDeadline(time.Now().Add(3 * time.Second))
	for doc.GetMap("meta").Entries()["surfaceId"] == nil {
		_, frame, err := conn.ReadMessage()
		if err != nil {
			t.Fatalf("ReadMessage during handshake: %v", err)
		}
		if len(frame) < 2 || frame[0] != 0 {
			continue
		}
		replySync, err := ygsync.ApplySyncMessage(doc, frame[1:], "server")
		if err != nil {
			t.Fatalf("ApplySyncMessage: %v", err)
		}
		if len(replySync) > 0 {
			_ = conn.WriteMessage(gws.BinaryMessage, append([]byte{0}, replySync...))
		}
	}
	_ = conn.SetReadDeadline(time.Time{})
	return doc
}

func sendYjsUpdateFrame(t *testing.T, conn *gws.Conn, update []byte) {
	t.Helper()
	frame := append([]byte{0}, ygsync.EncodeUpdate(update)...)
	if err := conn.WriteMessage(gws.BinaryMessage, frame); err != nil {
		t.Fatalf("WriteMessage update: %v", err)
	}
}
