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

package agent

import (
	"context"
	"errors"
	"testing"

	"github.com/a2ui-project/labs/samples/yjs-a2ui/room"
)

type fakeGenerator struct {
	reply string
	err   error
}

func (f fakeGenerator) GenerateJSON(_ context.Context, _, _ string) (string, error) {
	return f.reply, f.err
}

func TestRespondToActionReturnsErrorWhenGeneratorUnavailable(t *testing.T) {
	ctx := context.Background()
	mgr, err := room.NewManager(ctx, nil)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}
	defer func() { _ = mgr.Shutdown(ctx) }()

	snap, err := mgr.Snapshot(ctx, "arch-tradeoff")
	if err != nil {
		t.Fatalf("Snapshot() error = %v", err)
	}

	orch := NewOrchestrator(fakeGenerator{err: errors.New("offline")})
	res, err := orch.RespondToAction(ctx, room.ActionInvocation{
		RoomID:     "arch-tradeoff",
		ActorID:    "alice",
		ActorName:  "Alice",
		ActionName: "synthesize_consensus",
		Snapshot:   snap,
	})
	if err == nil {
		t.Fatalf("RespondToAction() expected error when generator fails, got %+v", res)
	}
	if len(res.Operations) != 0 {
		t.Fatalf("expected 0 fallback operations on error, got %+v", res.Operations)
	}
}

func TestSanitizeLLMOperationsRejectsRootWipesAndValidatesBasicCatalog(t *testing.T) {
	snap := room.SurfaceSnapshot{SurfaceID: "arch_tradeoff_surface"}
	raw := `{
		"summary": "Added card and updated summary",
		"operations": [
			{"updateDataModel": {"surfaceId": "arch_tradeoff_surface", "path": "/", "value": {}}},
			{"updateDataModel": {"surfaceId": "arch_tradeoff_surface", "path": "/local/sectionFilter", "value": "votes"}},
			{"updateDataModel": {"surfaceId": "arch_tradeoff_surface", "path": "/shared/agentSummary", "value": "Clean leaf write"}},
			{"updateComponents": {"surfaceId": "arch_tradeoff_surface", "components": [
				{"id": "c1", "component": "Card", "child": "t1"},
				{"id": "t1", "component": "Text", "text": "Hello", "variant": "body"}
			]}}
		]
	}`

	res, ok := sanitizeLLMOperations(raw, snap)
	if !ok {
		t.Fatalf("sanitizeLLMOperations() returned ok=false")
	}
	if len(res.Operations) != 2 {
		t.Fatalf("len(Operations) = %d, want 2 (root and /local writes filtered)", len(res.Operations))
	}
	comps := res.Operations[1].UpdateComponents.Components
	if len(comps) != 3 || comps[0]["id"] != "root" {
		t.Fatalf("expected [root c1 t1], got %+v", comps)
	}
	if comps[1]["child"] != "t1" {
		t.Fatalf("Card child = %v, want t1", comps[1]["child"])
	}
	if comps[2]["variant"] != "body" {
		t.Fatalf("Text variant = %v, want body", comps[2]["variant"])
	}
}

func TestRespondToPromptAppendsValidCollaborativeCardIntoYDoc(t *testing.T) {
	ctx := context.Background()
	reply := `{
		"summary": "Added security signoff checklist card",
		"operations": [
			{"updateComponents": {"surfaceId": "arch_tradeoff_surface", "components": [
				{"id": "sec_card", "component": "Card", "child": "sec_col"},
				{"id": "sec_col", "component": "Column", "children": ["sec_check"]},
				{"id": "sec_check", "component": "CheckBox", "label": "Security signoff", "value": {"path": "/shared/secSignoff"}}
			]}},
			{"updateDataModel": {"surfaceId": "arch_tradeoff_surface", "path": "/shared/secSignoff", "value": false}}
		]
	}`
	orch := NewOrchestrator(fakeGenerator{reply: reply})
	mgr, err := room.NewManager(ctx, orch)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}
	defer func() { _ = mgr.Shutdown(ctx) }()

	snapBefore, err := mgr.Snapshot(ctx, "arch-tradeoff")
	if err != nil {
		t.Fatalf("Snapshot() error = %v", err)
	}
	res, err := orch.RespondToPrompt(ctx, room.PromptInvocation{
		RoomID:    "arch-tradeoff",
		ActorID:   "bob",
		ActorName: "Bob",
		Prompt:    "Add a security signoff checklist card",
		Snapshot:  snapBefore,
	})
	if err != nil {
		t.Fatalf("RespondToPrompt() error = %v", err)
	}
	snapAfter, err := mgr.ApplyOperations(ctx, "arch-tradeoff", res.Operations)
	if err != nil {
		t.Fatalf("ApplyOperations() error = %v", err)
	}
	if len(snapAfter.Components) <= len(snapBefore.Components) {
		t.Fatalf("expected new components appended, before=%d after=%d", len(snapBefore.Components), len(snapAfter.Components))
	}
}

func TestSanitizeLLMOperationsStripsStrictUnknownPropsAndAttachesOrphanCards(t *testing.T) {
	snap := room.SurfaceSnapshot{
		SurfaceID: "arch_tradeoff_surface",
		Components: []map[string]any{
			{"id": "root", "component": "Column", "children": []any{"existing_banner"}},
			{"id": "existing_banner", "component": "Banner", "text": "Ready"},
		},
	}
	raw := `{
		"summary": "Added strict-validated card",
		"operations": [
			{"updateComponents": {"surfaceId": "arch_tradeoff_surface", "components": [
				{"id": "orphan_card", "component": "Card", "description": "hallucinated_prop", "child": "slider_1"},
				{"id": "btn_1", "component": "Button", "child": "btn_1_text", "variant": "primary", "extraKey": 42, "action": {"event": {"name": "escalate"}}},
				{"id": "slider_1", "component": "Slider", "min": 0, "max": 100, "helperText": "not_in_slider_schema", "value": {"path": "/shared/riskScore"}}
			]}}
		]
	}`

	res, ok := sanitizeLLMOperations(raw, snap)
	if !ok {
		t.Fatalf("sanitizeLLMOperations() returned ok=false")
	}
	comps := res.Operations[0].UpdateComponents.Components
	if len(comps) != 4 {
		t.Fatalf("len(Components) = %d, want 4 (prepended root + 3 components)", len(comps))
	}
	if comps[0]["id"] != "root" {
		t.Fatalf("expected prepended root component, got %+v", comps[0])
	}
	rootChildren, _ := comps[0]["children"].([]any)
	if len(rootChildren) != 2 || rootChildren[0] != "existing_banner" || rootChildren[1] != "orphan_card" {
		t.Fatalf("root children = %+v, want [existing_banner orphan_card]", rootChildren)
	}
	if _, hasDesc := comps[1]["description"]; hasDesc {
		t.Errorf("Card kept disallowed strict property 'description': %+v", comps[1])
	}
	if comps[2]["child"] != "btn_1_text" {
		t.Errorf("Button child = %v, want btn_1_text", comps[2]["child"])
	}
	if _, hasExtra := comps[2]["extraKey"]; hasExtra {
		t.Errorf("Button kept unknown property 'extraKey': %+v", comps[2])
	}
	if _, hasHelper := comps[3]["helperText"]; hasHelper {
		t.Errorf("Slider kept unknown property 'helperText': %+v", comps[3])
	}
}
