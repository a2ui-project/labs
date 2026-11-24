// Copyright 2024 Google LLC
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
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync/atomic"

	"github.com/a2ui-project/labs/samples/yjs-a2ui/room"
)

const systemPrompt = `You are an AI co-pilot participating as a live Yjs CRDT peer inside a multi-user A2UI v0.9 BasicCatalog surface.

CRITICAL MULTIPLAYER CRDT RULES:
1. Multiple humans (e.g. alice, bob, charlie) may be typing into TextFields or toggling controls right now.
2. NEVER emit an updateDataModel at path "/" or "/shared" or "/users" that wipes sibling keys. Always emit granular leaf JSON Pointers (e.g. "/shared/agentSummary", "/shared/actionItem1Title", "/shared/latencyBudgetMs").
3. NEVER write to "/local/..." paths (those are private per-viewport filters).
4. When adding UI components via updateComponents, ALWAYS use exact A2UI v0.9 BasicCatalog schemas:
   - Card: {"id": "...", "component": "Card", "child": "body_col_id"} (uses single "child" string ID)
   - Column / Row: {"id": "...", "component": "Column"|"Row", "children": ["id1", "id2"]}
   - Text: {"id": "...", "component": "Text", "text": "...", "variant": "h4"|"body"|"caption"}
   - TextField: {"id": "...", "component": "TextField", "label": "...", "value": {"path": "/shared/..."}}
   - CheckBox: {"id": "...", "component": "CheckBox", "label": "...", "value": {"path": "/shared/..."}}
   - Slider: {"id": "...", "component": "Slider", "label": "...", "min": 0, "max": 100, "value": {"path": "/shared/..."}}
   - ChoicePicker: {"id": "...", "component": "ChoicePicker", "displayStyle": "chips"|"checkbox", "variant": "mutuallyExclusive"|"multipleSelection", "value": {"path": "/..."}, "options": [{"label": "...", "value": "..."}]}
   - Button: {"id": "...", "component": "Button", "variant": "primary"|"default"|"borderless", "child": "btn_text_id", "action": {"event": {"name": "..."}}}
5. If you add a new top-level Card component (e.g. "followup_card_1"), ALSO include the updated "root" Column component with your new card's ID appended to its existing "children" array so the new card renders on the surface!

Return ONLY valid JSON matching this schema:
{
  "summary": "Concise 1-sentence description of what you updated",
  "operations": [
    {
      "updateDataModel": {
        "surfaceId": "<surfaceId>",
        "path": "/shared/...",
        "value": "..."
      }
    },
    {
      "updateComponents": {
        "surfaceId": "<surfaceId>",
        "components": [ ... ]
      }
    }
  ]
}`

// Orchestrator implements room.AgentResponder with Gemini via google.golang.org/genai + deterministic CRDT fallback.
type Orchestrator struct {
	Gen     JSONGenerator
	cardSeq atomic.Uint64
}

// NewOrchestrator returns an Orchestrator backed by GeminiGenerator and deterministic fallback.
func NewOrchestrator(gen JSONGenerator) *Orchestrator {
	if gen == nil {
		gen = NewGeminiGenerator()
	}
	return &Orchestrator{Gen: gen}
}

type llmResponse struct {
	Summary    string               `json:"summary"`
	Operations []room.A2uiOperation `json:"operations"`
}

// RespondToAction handles A2UI surface button/control actions in a multiplayer room.
func (o *Orchestrator) RespondToAction(ctx context.Context, req room.ActionInvocation) (room.AgentTurnResult, error) {
	userPayload, _ := json.Marshal(map[string]any{
		"mode":              "surface_action",
		"roomId":            req.RoomID,
		"actorId":           req.ActorID,
		"actorName":         req.ActorName,
		"actionName":        req.ActionName,
		"sourceComponentId": req.SourceComponentID,
		"actionContext":     req.Context,
		"surfaceSnapshot":   compactSnapshotForLLM(req.Snapshot),
	})

	if o.Gen != nil {
		if raw, err := o.Gen.GenerateJSON(ctx, systemPrompt, string(userPayload)); err == nil {
			if parsed, ok := sanitizeLLMOperations(raw, req.Snapshot); ok {
				parsed.Source = "gemini"
				return parsed, nil
			}
		}
	}
	return o.fallbackAction(req), nil
}

// RespondToPrompt handles natural-language prompts asking the agent to evolve or summarize the room's A2UI surface.
func (o *Orchestrator) RespondToPrompt(ctx context.Context, req room.PromptInvocation) (room.AgentTurnResult, error) {
	userPayload, _ := json.Marshal(map[string]any{
		"mode":            "room_prompt",
		"roomId":          req.RoomID,
		"actorId":         req.ActorID,
		"actorName":       req.ActorName,
		"prompt":          req.Prompt,
		"surfaceSnapshot": compactSnapshotForLLM(req.Snapshot),
	})

	if o.Gen != nil {
		if raw, err := o.Gen.GenerateJSON(ctx, systemPrompt, string(userPayload)); err == nil {
			if parsed, ok := sanitizeLLMOperations(raw, req.Snapshot); ok {
				parsed.Source = "gemini"
				return parsed, nil
			}
		}
	}
	return o.fallbackPrompt(req), nil
}

func compactSnapshotForLLM(snap room.SurfaceSnapshot) map[string]any {
	return map[string]any{
		"surfaceId":  snap.SurfaceID,
		"title":      snap.Title,
		"components": snap.Components,
		"dataModel":  snap.DataModel,
	}
}

var commonMaterialProps = map[string]bool{
	"id":            true,
	"component":     true,
	"catalogId":     true,
	"accessibility": true,
	"metadata":      true,
	"visible":       true,
	"weight":        true,
}

var allowedPropsByComponent = map[string]map[string]bool{
	"Button": {
		"variant": true, "child": true, "action": true, "checks": true,
	},
	"Card": {
		"child": true,
	},
	"CheckBox": {
		"label": true, "value": true, "checks": true,
	},
	"ChoicePicker": {
		"label": true, "variant": true, "displayStyle": true, "value": true,
		"options": true, "checks": true,
	},
	"Column": {
		"children": true, "justify": true, "align": true,
	},
	"Divider": {
		"axis": true,
	},
	"Icon": {
		"name": true,
	},
	"Row": {
		"children": true, "justify": true, "align": true,
	},
	"Slider": {
		"label": true, "min": true, "max": true, "value": true, "checks": true,
	},
	"Text": {
		"text": true, "variant": true,
	},
	"TextField": {
		"label": true, "value": true, "variant": true, "checks": true,
	},
}

func sanitizeLLMOperations(raw string, snap room.SurfaceSnapshot) (room.AgentTurnResult, bool) {
	var parsed llmResponse
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		return room.AgentTurnResult{}, false
	}
	if len(parsed.Operations) == 0 {
		return room.AgentTurnResult{}, false
	}
	cleanOps := make([]room.A2uiOperation, 0, len(parsed.Operations))
	for _, op := range parsed.Operations {
		var outOp room.A2uiOperation
		if op.UpdateDataModel != nil {
			p := strings.TrimSpace(op.UpdateDataModel.Path)
			// Refuse root wipes or /local writes.
			if p == "" || p == "/" || p == "/shared" || p == "/users" || strings.HasPrefix(p, "/local") {
				continue
			}
			outOp.UpdateDataModel = &room.UpdateDataModelPayload{
				SurfaceID: snap.SurfaceID,
				Path:      p,
				Value:     op.UpdateDataModel.Value,
			}
		}
		if op.UpdateComponents != nil && len(op.UpdateComponents.Components) > 0 {
			validComps := make([]map[string]any, 0, len(op.UpdateComponents.Components))
			for _, comp := range op.UpdateComponents.Components {
				if normalized, ok := normalizeMaterialV1Component(comp); ok {
					validComps = append(validComps, normalized)
				}
			}
			validComps = ensureOrphanCardsAttachedToRoot(validComps, snap.Components)
			if len(validComps) > 0 {
				outOp.UpdateComponents = &room.UpdateComponentsPayload{
					SurfaceID:  snap.SurfaceID,
					Components: validComps,
				}
			}
		}
		if outOp.UpdateDataModel != nil || outOp.UpdateComponents != nil {
			cleanOps = append(cleanOps, outOp)
		}
	}
	if len(cleanOps) == 0 {
		return room.AgentTurnResult{}, false
	}
	summary := strings.TrimSpace(parsed.Summary)
	if summary == "" {
		summary = "Applied multiplayer A2UI CRDT updates"
	}
	return room.AgentTurnResult{
		Summary:    summary,
		Operations: cleanOps,
	}, true
}

func ensureOrphanCardsAttachedToRoot(incoming []map[string]any, existing []map[string]any) []map[string]any {
	existingIDs := make(map[string]bool, len(existing))
	referencedChildren := make(map[string]bool)
	var existingRootChildren []any

	recordChildren := func(comp map[string]any) {
		if list, ok := comp["children"].([]any); ok {
			for _, item := range list {
				if cid, ok := item.(string); ok && cid != "" {
					referencedChildren[cid] = true
				}
			}
		}
	}

	for _, comp := range existing {
		id, _ := comp["id"].(string)
		if id != "" {
			existingIDs[id] = true
		}
		if id == "root" {
			if list, ok := comp["children"].([]any); ok {
				existingRootChildren = append(existingRootChildren, list...)
			}
		}
		recordChildren(comp)
	}

	incomingRootIdx := -1
	for i, comp := range incoming {
		id, _ := comp["id"].(string)
		if id == "root" {
			incomingRootIdx = i
		}
		recordChildren(comp)
	}

	var orphanCardIDs []string
	for _, comp := range incoming {
		id, _ := comp["id"].(string)
		compType, _ := comp["component"].(string)
		if id != "" && id != "root" && compType == "Card" && !existingIDs[id] && !referencedChildren[id] {
			orphanCardIDs = append(orphanCardIDs, id)
		}
	}
	if len(orphanCardIDs) == 0 {
		return incoming
	}

	if incomingRootIdx >= 0 {
		rootComp := incoming[incomingRootIdx]
		children, _ := rootComp["children"].([]any)
		for _, cid := range orphanCardIDs {
			children = append(children, cid)
		}
		rootComp["children"] = children
		return incoming
	}

	mergedRootChildren := append([]any{}, existingRootChildren...)
	for _, cid := range orphanCardIDs {
		mergedRootChildren = append(mergedRootChildren, cid)
	}
	rootPatch := map[string]any{
		"id":        "root",
		"component": "Column",
		"children":  mergedRootChildren,
	}
	return append([]map[string]any{rootPatch}, incoming...)
}

func normalizeMaterialV1Component(comp map[string]any) (map[string]any, bool) {
	id, _ := comp["id"].(string)
	compType, _ := comp["component"].(string)
	allowedProps, isAllowed := allowedPropsByComponent[compType]
	if id == "" || !isAllowed {
		return nil, false
	}
	raw := make(map[string]any, len(comp))
	for k, v := range comp {
		raw[k] = v
	}

	// Repair common v0.8/v0.9 hallucinations before strict property filtering.
	if compType == "Card" || compType == "Column" || compType == "Row" {
		if child, ok := raw["child"].(string); ok && raw["children"] == nil {
			raw["children"] = []any{child}
		}
		if compType == "Card" {
			if v, ok := raw["variant"].(string); ok && v != "elevated" && v != "filled" && v != "outlined" {
				raw["variant"] = "outlined"
			}
		}
	}
	if compType == "Button" {
		if text, ok := raw["text"].(string); ok && raw["labelText"] == nil {
			raw["labelText"] = text
		}
		if label, ok := raw["label"].(string); ok && raw["labelText"] == nil {
			raw["labelText"] = label
		}
		if v, ok := raw["variant"].(string); ok && v != "default" && v != "toggle" {
			if v == "elevated" || v == "filled" || v == "tonal" || v == "outlined" || v == "text" {
				if raw["configuration"] == nil {
					raw["configuration"] = v
				}
			}
			delete(raw, "variant")
		}
		if cfg, ok := raw["configuration"].(string); ok &&
			cfg != "elevated" && cfg != "filled" && cfg != "tonal" && cfg != "outlined" && cfg != "text" {
			raw["configuration"] = "outlined"
		}
	}
	if compType == "Checkbox" || compType == "Switch" {
		if v, ok := raw["value"]; ok && raw["checked"] == nil {
			raw["checked"] = v
		}
	}
	if compType == "OptionSelector" {
		if v, ok := raw["value"]; ok && raw["selectedValues"] == nil {
			raw["selectedValues"] = v
		}
	}
	if compType == "Chips" {
		if v, ok := raw["variant"].(string); ok &&
			v != "filter-single" && v != "filter-multiple" && v != "input" && v != "assist" && v != "suggestion" {
			raw["variant"] = "filter-multiple"
		}
	}
	if compType == "Banner" {
		if v, ok := raw["variant"].(string); ok && v != "basic" && v != "rich" {
			raw["variant"] = "basic"
		}
		if raw["text"] == nil {
			if sub, ok := raw["subtitle"]; ok {
				raw["text"] = sub
			} else {
				raw["text"] = ""
			}
		}
	}
	if compType == "Text" {
		if raw["text"] == nil {
			if lbl, ok := raw["label"]; ok {
				raw["text"] = lbl
			} else {
				raw["text"] = ""
			}
		}
		if style, ok := raw["textStyle"].(string); ok && style != "" {
			if !strings.HasPrefix(style, "md.sys.typescale.") {
				style = "md.sys.typescale." + style
			}
			if !validTypographyTokens[style] {
				style = "md.sys.typescale.body-medium"
			}
			raw["textStyle"] = style
		}
	}
	if compType == "TextField" {
		if v, ok := raw["variant"].(string); ok && v != "filled" && v != "outlined" {
			raw["variant"] = "outlined"
		}
		if t, ok := raw["type"].(string); ok && t != "text" && t != "email" && t != "number" && t != "tel" && t != "url" {
			raw["type"] = "text"
		}
	}

	out := make(map[string]any, len(raw))
	for k, v := range raw {
		if commonMaterialProps[k] || allowedProps[k] {
			out[k] = v
		}
	}
	return out, true
}

var validTypographyTokens = map[string]bool{
	"md.sys.typescale.body-large":                 true,
	"md.sys.typescale.body-medium":                true,
	"md.sys.typescale.body-small":                 true,
	"md.sys.typescale.display-large":              true,
	"md.sys.typescale.display-medium":             true,
	"md.sys.typescale.display-small":              true,
	"md.sys.typescale.emphasized.body-large":      true,
	"md.sys.typescale.emphasized.body-medium":     true,
	"md.sys.typescale.emphasized.body-small":      true,
	"md.sys.typescale.emphasized.display-large":   true,
	"md.sys.typescale.emphasized.display-medium":  true,
	"md.sys.typescale.emphasized.display-small":   true,
	"md.sys.typescale.emphasized.headline-large":  true,
	"md.sys.typescale.emphasized.headline-medium": true,
	"md.sys.typescale.emphasized.headline-small":  true,
	"md.sys.typescale.emphasized.label-large":     true,
	"md.sys.typescale.emphasized.label-medium":    true,
	"md.sys.typescale.emphasized.label-small":     true,
	"md.sys.typescale.emphasized.title-large":     true,
	"md.sys.typescale.emphasized.title-medium":    true,
	"md.sys.typescale.emphasized.title-small":     true,
	"md.sys.typescale.headline-large":             true,
	"md.sys.typescale.headline-medium":            true,
	"md.sys.typescale.headline-small":             true,
	"md.sys.typescale.label-large":                true,
	"md.sys.typescale.label-medium":               true,
	"md.sys.typescale.label-small":                true,
	"md.sys.typescale.title-large":                true,
	"md.sys.typescale.title-medium":               true,
	"md.sys.typescale.title-small":                true,
}

func (o *Orchestrator) fallbackAction(req room.ActionInvocation) room.AgentTurnResult {
	switch req.ActionName {
	case "add_action_item_card":
		return o.buildFollowUpCardTurn(req.Snapshot, req.ActorName, "Follow-Up Action Items")
	default:
		summaryText := buildConsensusSummary(req.Snapshot, req.ActorName)
		return room.AgentTurnResult{
			Summary: "Synthesized live multi-user positions into /shared/agentSummary",
			Source:  "deterministic",
			Operations: []room.A2uiOperation{
				{
					UpdateDataModel: &room.UpdateDataModelPayload{
						SurfaceID: req.Snapshot.SurfaceID,
						Path:      "/shared/agentSummary",
						Value:     summaryText,
					},
				},
			},
		}
	}
}

func (o *Orchestrator) fallbackPrompt(req room.PromptInvocation) room.AgentTurnResult {
	lower := strings.ToLower(req.Prompt)
	if strings.Contains(lower, "add") || strings.Contains(lower, "card") || strings.Contains(lower, "field") || strings.Contains(lower, "checklist") || strings.Contains(lower, "slider") {
		return o.buildFollowUpCardTurn(req.Snapshot, req.ActorName, req.Prompt)
	}
	summaryText := fmt.Sprintf("(%s asked: %q) %s", req.ActorName, req.Prompt, buildConsensusSummary(req.Snapshot, req.ActorName))
	return room.AgentTurnResult{
		Summary: fmt.Sprintf("Updated /shared/agentSummary in response to %s", req.ActorName),
		Source:  "deterministic",
		Operations: []room.A2uiOperation{
			{
				UpdateDataModel: &room.UpdateDataModelPayload{
					SurfaceID: req.Snapshot.SurfaceID,
					Path:      "/shared/agentSummary",
					Value:     summaryText,
				},
			},
		},
	}
}

func (o *Orchestrator) buildFollowUpCardTurn(snap room.SurfaceSnapshot, actorName, label string) room.AgentTurnResult {
	n := o.cardSeq.Add(1)
	existingFollowups := 0
	var rootChildren []any
	for _, comp := range snap.Components {
		id, _ := comp["id"].(string)
		if strings.HasPrefix(id, "agent_followup_card_") {
			existingFollowups++
		}
		if id == "root" {
			if rawChildren, ok := comp["children"].([]any); ok {
				rootChildren = append(rootChildren, rawChildren...)
			}
		}
	}
	idx := fmt.Sprintf("%d_%d", existingFollowups+1, n)
	cardID := "agent_followup_card_" + idx
	colID := "agent_followup_col_" + idx
	ownerFieldID := "agent_followup_owner_" + idx
	notesFieldID := "agent_followup_notes_" + idx
	doneCheckID := "agent_followup_done_" + idx

	ownerPath := "/shared/followupOwner_" + idx
	notesPath := "/shared/followupNotes_" + idx
	donePath := "/shared/followupDone_" + idx

	rootChildren = append(rootChildren, cardID)

	title := strings.TrimSpace(label)
	if len(title) > 56 {
		title = title[:56] + "..."
	}
	if title == "" {
		title = "Collaborative Action Item"
	}

	titleID := cardID + "_title"
	subID := cardID + "_subtitle"

	comps := []map[string]any{
		{
			"id":        "root",
			"component": "Column",
			"children":  rootChildren,
		},
		{
			"id":        cardID,
			"component": "Card",
			"child":     colID,
		},
		{
			"id":        colID,
			"component": "Column",
			"children":  []any{titleID, subID, ownerFieldID, notesFieldID, doneCheckID},
		},
		{
			"id":        titleID,
			"component": "Text",
			"text":      title,
			"variant":   "h4",
		},
		{
			"id":        subID,
			"component": "Text",
			"text":      fmt.Sprintf("Added live by AI Co-Editor for %s — bound to Y.Text & Y.Map", actorName),
			"variant":   "caption",
		},
		{
			"id":        ownerFieldID,
			"component": "TextField",
			"label":     "DRI / Owner (Y.Text)",
			"value":     map[string]any{"path": ownerPath},
		},
		{
			"id":        notesFieldID,
			"component": "TextField",
			"label":     "Action Item Details (Y.Text)",
			"value":     map[string]any{"path": notesPath},
		},
		{
			"id":        doneCheckID,
			"component": "CheckBox",
			"label":     "Mark action item complete",
			"value":     map[string]any{"path": donePath},
		},
	}

	return room.AgentTurnResult{
		Summary: fmt.Sprintf("Appended live collaborative card %q to surface %s", title, snap.SurfaceID),
		Source:  "deterministic",
		Operations: []room.A2uiOperation{
			{
				UpdateComponents: &room.UpdateComponentsPayload{
					SurfaceID:  snap.SurfaceID,
					Components: comps,
				},
			},
			{
				UpdateDataModel: &room.UpdateDataModelPayload{
					SurfaceID: snap.SurfaceID,
					Path:      ownerPath,
					Value:     actorName,
				},
			},
			{
				UpdateDataModel: &room.UpdateDataModelPayload{
					SurfaceID: snap.SurfaceID,
					Path:      notesPath,
					Value:     "Verify multi-peer convergence and sign off.",
				},
			},
			{
				UpdateDataModel: &room.UpdateDataModelPayload{
					SurfaceID: snap.SurfaceID,
					Path:      donePath,
					Value:     false,
				},
			},
			{
				UpdateDataModel: &room.UpdateDataModelPayload{
					SurfaceID: snap.SurfaceID,
					Path:      "/shared/agentSummary",
					Value:     fmt.Sprintf("Added collaborative card %q for %s without disturbing in-flight peer edits.", title, actorName),
				},
			},
		},
	}
}

func buildConsensusSummary(snap room.SurfaceSnapshot, actorName string) string {
	users, _ := snap.DataModel["users"].(map[string]any)
	tally := make(map[string]int)
	var actorBreakdown []string

	names := make([]string, 0, len(users))
	for name := range users {
		names = append(names, name)
	}
	sort.Strings(names)

	for _, name := range names {
		uMap, ok := users[name].(map[string]any)
		if !ok {
			continue
		}
		choice := firstString(uMap, "vote", "status", "decision", "role")
		note := firstString(uMap, "rationale", "note", "comment", "finding")
		if choice != "" {
			tally[choice]++
		}
		if choice != "" && note != "" {
			actorBreakdown = append(actorBreakdown, fmt.Sprintf("%s=%s (%s)", name, choice, truncateRunes(note, 48)))
		} else if choice != "" {
			actorBreakdown = append(actorBreakdown, fmt.Sprintf("%s=%s", name, choice))
		}
	}

	var tallyParts []string
	choices := make([]string, 0, len(tally))
	for c := range tally {
		choices = append(choices, c)
	}
	sort.Strings(choices)
	for _, c := range choices {
		tallyParts = append(tallyParts, fmt.Sprintf("%s: %d", c, tally[c]))
	}

	shared, _ := snap.DataModel["shared"].(map[string]any)
	headline := firstString(shared, "proposalSummary", "incidentTitle", "launchName")

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Synthesized by AI Co-Editor (requested by %s). ", actorName))
	if len(tallyParts) > 0 {
		sb.WriteString("Tally [" + strings.Join(tallyParts, ", ") + "]. ")
	}
	if headline != "" {
		sb.WriteString("Focus: \"" + truncateRunes(headline, 72) + "\". ")
	}
	if len(actorBreakdown) > 0 {
		sb.WriteString("Peers: " + strings.Join(actorBreakdown, "; ") + ".")
	}
	return strings.TrimSpace(sb.String())
}

func firstString(m map[string]any, keys ...string) string {
	for _, k := range keys {
		switch v := m[k].(type) {
		case string:
			if strings.TrimSpace(v) != "" {
				return strings.TrimSpace(v)
			}
		case []any:
			for _, item := range v {
				if s, ok := item.(string); ok && strings.TrimSpace(s) != "" {
					return strings.TrimSpace(s)
				}
			}
		}
	}
	return ""
}

func truncateRunes(s string, limit int) string {
	r := []rune(s)
	if len(r) <= limit {
		return s
	}
	return string(r[:limit]) + "..."
}
