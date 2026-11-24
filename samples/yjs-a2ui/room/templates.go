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

package room

import "strings"

// RoomMeta describes a collaborative room returned by `GET /api/rooms`.
type RoomMeta struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	SurfaceID   string `json:"surfaceId"`
	BuiltIn     bool   `json:"builtIn"`
}

func cardWithHeader(id, title, subtitle string, bodyChildren []any) []map[string]any {
	colID := id + "_body"
	titleID := id + "_title"
	subID := id + "_subtitle"
	children := []any{titleID}
	comps := []map[string]any{
		{
			"id":        id,
			"component": "Card",
			"child":     colID,
		},
		{
			"id":        titleID,
			"component": "Text",
			"text":      title,
			"variant":   "h4",
		},
	}
	if subtitle != "" {
		children = append(children, subID)
		comps = append(comps, map[string]any{
			"id":        subID,
			"component": "Text",
			"text":      subtitle,
			"variant":   "caption",
		})
	}
	children = append(children, bodyChildren...)
	comps = append(comps, map[string]any{
		"id":        colID,
		"component": "Column",
		"children":  children,
	})
	return comps
}

func actionButton(id, label, variant, eventName string) []map[string]any {
	textID := id + "_label"
	return []map[string]any{
		{
			"id":        id,
			"component": "Button",
			"child":     textID,
			"variant":   variant,
			"action": map[string]any{
				"event": map[string]any{
					"name": eventName,
				},
			},
		},
		{
			"id":        textID,
			"component": "Text",
			"text":      label,
		},
	}
}

// BuiltInRoomSeeds returns the 3 starter multiplayer A2UI v0.9 BasicCatalog rooms.
func BuiltInRoomSeeds() map[string]SurfaceSeed {
	return map[string]SurfaceSeed{
		"arch-tradeoff":     archTradeoffSeed(),
		"incident-war-room": incidentWarRoomSeed(),
		"launch-signoff":    launchSignoffSeed(),
	}
}

// OrderedBuiltInRoomIDs returns starter room IDs in display order.
func OrderedBuiltInRoomIDs() []string {
	return []string{"arch-tradeoff", "incident-war-room", "launch-signoff"}
}

func archTradeoffSeed() SurfaceSeed {
	comps := []map[string]any{
		{
			"id":        "root",
			"component": "Column",
			"children": []any{
				"shared_spec_card",
				"agent_synthesis_card",
			},
		},
	}

	comps = append(comps, cardWithHeader(
		"shared_spec_card",
		"Shared Architecture Spec (/shared/*)",
		"TextFields use character-level Y.Text; ChoicePicker uses Y.Array; Slider and CheckBoxes use LWW values.",
		[]any{
			"proposal_summary_field",
			"open_risks_field",
			"latency_budget_slider",
			"priority_pillars_picker",
			"checklist_row",
		},
	)...)
	comps = append(comps,
		map[string]any{
			"id":        "proposal_summary_field",
			"component": "TextField",
			"label":     "Proposal Summary (Y.Text — type concurrently across panes)",
			"value":     map[string]any{"path": "/shared/proposalSummary"},
		},
		map[string]any{
			"id":        "open_risks_field",
			"component": "TextField",
			"label":     "Open Risks & Constraints (Y.Text)",
			"value":     map[string]any{"path": "/shared/openRisks"},
		},
		map[string]any{
			"id":        "latency_budget_slider",
			"component": "Slider",
			"label":     "Sync Latency Budget (ms)",
			"min":       10,
			"max":       250,
			"value":     map[string]any{"path": "/shared/latencyBudgetMs"},
		},
		map[string]any{
			"id":           "priority_pillars_picker",
			"component":    "ChoicePicker",
			"displayStyle": "chips",
			"variant":      "multipleSelection",
			"value":        map[string]any{"path": "/shared/priorityPillars"},
			"options": []any{
				map[string]any{"label": "Low Latency", "value": "low_latency"},
				map[string]any{"label": "Schema Safety", "value": "schema_safety"},
				map[string]any{"label": "Agent Co-Editing", "value": "agent_coedit"},
				map[string]any{"label": "Offline Merge", "value": "offline_merge"},
			},
		},
		map[string]any{
			"id":        "checklist_row",
			"component": "Row",
			"children":  []any{"check_load_test", "check_security_audit", "check_offline_merge"},
		},
		map[string]any{
			"id":        "check_load_test",
			"component": "CheckBox",
			"label":     "Load test verified",
			"value":     map[string]any{"path": "/shared/checkLoadTest"},
		},
		map[string]any{
			"id":        "check_security_audit",
			"component": "CheckBox",
			"label":     "Security audit complete",
			"value":     map[string]any{"path": "/shared/checkSecurityAudit"},
		},
		map[string]any{
			"id":        "check_offline_merge",
			"component": "CheckBox",
			"label":     "Offline merge verified",
			"value":     map[string]any{"path": "/shared/checkOfflineMerge"},
		},
	)

	comps = append(comps, cardWithHeader(
		"agent_synthesis_card",
		"AI Co-Editor (/shared/agentSummary)",
		"The agent joins the room as a CRDT peer and patches leaf paths without clobbering live typing.",
		[]any{"agent_summary_text", "agent_actions_row"},
	)...)
	comps = append(comps,
		map[string]any{
			"id":        "agent_summary_text",
			"component": "Text",
			"text":      map[string]any{"path": "/shared/agentSummary"},
		},
		map[string]any{
			"id":        "agent_actions_row",
			"component": "Row",
			"children":  []any{"synthesize_btn", "add_followup_btn"},
		},
	)
	comps = append(comps, actionButton("synthesize_btn", "Synthesize Consensus", "primary", "synthesize_consensus")...)
	comps = append(comps, actionButton("add_followup_btn", "Add Follow-Up Action Card", "default", "add_followup_card")...)

	return SurfaceSeed{
		SurfaceID:     "arch_tradeoff_surface",
		CatalogID:     BasicCatalogID,
		Title:         "Architecture Trade-off Studio",
		Description:   "Concurrent Y.Text notes, per-user /me votes, and live Gemini consensus synthesis.",
		SendDataModel: true,
		DataModel: map[string]any{
			"shared": map[string]any{
				"proposalSummary":    "Bind unmodified A2UI surfaces directly to Yjs CRDT containers and Awareness.",
				"openRisks":          "Keep ChoicePicker selections atomic while TextField paths use character-level Y.Text.",
				"latencyBudgetMs":    float64(80),
				"priorityPillars":    []any{"low_latency", "schema_safety", "agent_coedit"},
				"checkLoadTest":      true,
				"checkSecurityAudit": false,
				"checkOfflineMerge":  true,
				"agentSummary":       "Ready to synthesize team votes and shared constraints. Click Synthesize Consensus or send a room prompt.",
			},
			"users": map[string]any{
				"alice": map[string]any{
					"vote":      []any{"yjs_crdt"},
					"rationale": "Character-level YATA merge avoids clobbering concurrent TextField edits.",
				},
				"bob": map[string]any{
					"vote":      []any{"hybrid_crdt_rpc"},
					"rationale": "Use Yjs for live form state plus explicit A2UI action events for side effects.",
				},
				"charlie": map[string]any{
					"vote":      []any{"yjs_crdt"},
					"rationale": "Native Go ygo peer lets the backend agent patch leaf paths safely.",
				},
				"diana": map[string]any{
					"vote":      []any{"hybrid_crdt_rpc"},
					"rationale": "Product sign-off workflows need explicit submit actions alongside live drafts.",
				},
			},
		},
		Components: comps,
	}
}

func incidentWarRoomSeed() SurfaceSeed {
	comps := []map[string]any{
		{
			"id":        "root",
			"component": "Column",
			"children":  []any{"incident_header_card", "incident_agent_card"},
		},
	}
	comps = append(comps, cardWithHeader(
		"incident_header_card",
		"P1 Incident War Room (/shared/*)",
		"Multiple responders co-edit the live timeline and mitigation checklist simultaneously.",
		[]any{"incident_summary_field", "mitigation_notes_field", "traffic_drain_slider", "mitigation_row"},
	)...)
	comps = append(comps,
		map[string]any{
			"id":        "incident_summary_field",
			"component": "TextField",
			"label":     "Live Incident Summary (Y.Text)",
			"value":     map[string]any{"path": "/shared/incidentSummary"},
		},
		map[string]any{
			"id":        "mitigation_notes_field",
			"component": "TextField",
			"label":     "Root Cause & Mitigation Timeline (Y.Text)",
			"value":     map[string]any{"path": "/shared/mitigationNotes"},
		},
		map[string]any{
			"id":        "traffic_drain_slider",
			"component": "Slider",
			"label":     "Canary Traffic Drain (%)",
			"min":       0,
			"max":       100,
			"value":     map[string]any{"path": "/shared/trafficDrainPct"},
		},
		map[string]any{
			"id":        "mitigation_row",
			"component": "Row",
			"children":  []any{"mit_rollback", "mit_comms", "mit_postmortem"},
		},
		map[string]any{
			"id":        "mit_rollback",
			"component": "CheckBox",
			"label":     "Rollback initiated",
			"value":     map[string]any{"path": "/shared/rollbackInitiated"},
		},
		map[string]any{
			"id":        "mit_comms",
			"component": "CheckBox",
			"label":     "Customer status posted",
			"value":     map[string]any{"path": "/shared/statusPosted"},
		},
		map[string]any{
			"id":        "mit_postmortem",
			"component": "CheckBox",
			"label":     "Postmortem doc created",
			"value":     map[string]any{"path": "/shared/postmortemCreated"},
		},
	)

	comps = append(comps, cardWithHeader(
		"incident_agent_card",
		"AI Status Update Drafter",
		"Synthesizes shared mitigation state into a crisp status update.",
		[]any{"incident_agent_text", "draft_status_btn"},
	)...)
	comps = append(comps, map[string]any{
		"id":        "incident_agent_text",
		"component": "Text",
		"text":      map[string]any{"path": "/shared/agentSummary"},
	})
	comps = append(comps, actionButton("draft_status_btn", "Draft Stakeholder Update", "primary", "draft_status_update")...)

	return SurfaceSeed{
		SurfaceID:     "incident_war_room_surface",
		CatalogID:     BasicCatalogID,
		Title:         "Incident War Room (P1 Checkout Timeout)",
		Description:   "Multi-responder live timeline, mitigation checklist, per-responder status, and AI status drafting.",
		SendDataModel: true,
		DataModel: map[string]any{
			"shared": map[string]any{
				"incidentSummary":   "Elevated p99 latency on checkout-api in us-east following config rollout #482.",
				"mitigationNotes":   "14:02 UTC: Alert fired. 14:05 UTC: Identified connection pool saturation. Draining canary.",
				"trafficDrainPct":   float64(60),
				"rollbackInitiated": true,
				"statusPosted":      false,
				"postmortemCreated": false,
				"agentSummary":      "Click Draft Stakeholder Update to synthesize responder notes into an executive summary.",
			},
			"users": map[string]any{
				"alice":   map[string]any{"status": []any{"mitigating"}, "note": "Draining us-east canary pool."},
				"bob":     map[string]any{"status": []any{"investigating"}, "note": "Checking DB replica saturation."},
				"charlie": map[string]any{"status": []any{"monitoring"}, "note": "Error rate dropping after drain."},
				"diana":   map[string]any{"status": []any{"monitoring"}, "note": "Preparing customer comms draft."},
			},
		},
		Components: comps,
	}
}

func launchSignoffSeed() SurfaceSeed {
	comps := []map[string]any{
		{
			"id":        "root",
			"component": "Column",
			"children":  []any{"launch_overview_card", "launch_agent_card"},
		},
	}
	comps = append(comps, cardWithHeader(
		"launch_overview_card",
		"Launch Readiness Sign-Off (/shared/*)",
		"Coordinate Eng, Security, SRE, and Product go/no-go checks in real time.",
		[]any{"launch_notes_field", "rollout_pct_slider", "launch_checks_row"},
	)...)
	comps = append(comps,
		map[string]any{
			"id":        "launch_notes_field",
			"component": "TextField",
			"label":     "Release Notes & Rollout Caveats (Y.Text)",
			"value":     map[string]any{"path": "/shared/launchNotes"},
		},
		map[string]any{
			"id":        "rollout_pct_slider",
			"component": "Slider",
			"label":     "Initial Ramp Percentage (%)",
			"min":       1,
			"max":       100,
			"value":     map[string]any{"path": "/shared/rolloutPct"},
		},
		map[string]any{
			"id":        "launch_checks_row",
			"component": "Row",
			"children":  []any{"chk_rollback_plan", "chk_alerts_armed"},
		},
		map[string]any{
			"id":        "chk_rollback_plan",
			"component": "CheckBox",
			"label":     "Rollback plan verified",
			"value":     map[string]any{"path": "/shared/rollbackPlanVerified"},
		},
		map[string]any{
			"id":        "chk_alerts_armed",
			"component": "CheckBox",
			"label":     "SLO alerts armed",
			"value":     map[string]any{"path": "/shared/alertsArmed"},
		},
	)

	comps = append(comps, cardWithHeader(
		"launch_agent_card",
		"AI Launch Readiness Check",
		"Audits blockers and generates a Go/No-Go summary.",
		[]any{"launch_agent_text", "audit_launch_btn"},
	)...)
	comps = append(comps, map[string]any{
		"id":        "launch_agent_text",
		"component": "Text",
		"text":      map[string]any{"path": "/shared/agentSummary"},
	})
	comps = append(comps, actionButton("audit_launch_btn", "Audit Launch Readiness", "primary", "audit_launch_readiness")...)

	return SurfaceSeed{
		SurfaceID:     "launch_signoff_surface",
		CatalogID:     BasicCatalogID,
		Title:         "Launch Readiness Sign-Off (Go/No-Go)",
		Description:   "Cross-functional Eng / Security / SRE Go/No-Go sign-off with shared rollout controls.",
		SendDataModel: true,
		DataModel: map[string]any{
			"shared": map[string]any{
				"launchNotes":          "Staged rollout starting at 10% with automated rollback on error budget burn.",
				"rolloutPct":           float64(10),
				"rollbackPlanVerified": true,
				"alertsArmed":          true,
				"agentSummary":         "Click Audit Launch Readiness to summarize all reviewer sign-offs.",
			},
			"users": map[string]any{
				"alice":   map[string]any{"decision": []any{"go"}, "comment": "All integration tests green."},
				"bob":     map[string]any{"decision": []any{"conditional"}, "comment": "Verify rate-limit headers before 50%."},
				"charlie": map[string]any{"decision": []any{"go"}, "comment": "Dashboards and paging rules armed."},
				"diana":   map[string]any{"decision": []any{"go"}, "comment": "Release comms ready."},
			},
		},
		Components: comps,
	}
}

// CustomBlankRoomSeed creates a starter collaborative room for dynamically created rooms.
func CustomBlankRoomSeed(roomID, title, description string) SurfaceSeed {
	cleanID := strings.ReplaceAll(roomID, "-", "_")
	if title == "" {
		title = "Collaborative A2UI Room"
	}
	if description == "" {
		description = "Shared Yjs + A2UI v0.9 BasicCatalog room."
	}
	comps := []map[string]any{
		{
			"id":        "root",
			"component": "Column",
			"children":  []any{"custom_main_card", "custom_agent_card"},
		},
	}
	comps = append(comps, cardWithHeader(
		"custom_main_card",
		title,
		description,
		[]any{"custom_shared_notes"},
	)...)
	comps = append(comps,
		map[string]any{
			"id":        "custom_shared_notes",
			"component": "TextField",
			"label":     "Shared Room Notes (/shared/notes -> Y.Text)",
			"value":     map[string]any{"path": "/shared/notes"},
		},
	)
	comps = append(comps, cardWithHeader(
		"custom_agent_card",
		"AI Co-Editor",
		"Ask the agent to synthesize notes or add new A2UI cards to this room.",
		[]any{"custom_agent_summary", "custom_synthesize_btn"},
	)...)
	comps = append(comps, map[string]any{
		"id":        "custom_agent_summary",
		"component": "Text",
		"text":      map[string]any{"path": "/shared/agentSummary"},
	})
	comps = append(comps, actionButton("custom_synthesize_btn", "Synthesize Room", "primary", "synthesize_consensus")...)

	return SurfaceSeed{
		SurfaceID:     cleanID + "_surface",
		CatalogID:     BasicCatalogID,
		Title:         title,
		Description:   description,
		SendDataModel: true,
		DataModel: map[string]any{
			"shared": map[string]any{
				"notes":        "Start typing here across multiple panes to test Y.Text collaboration.",
				"agentSummary": "Ready to co-edit this room.",
			},
			"users": map[string]any{
				"alice":   map[string]any{"note": ""},
				"bob":     map[string]any{"note": ""},
				"charlie": map[string]any{"note": ""},
				"diana":   map[string]any{"note": ""},
			},
		},
		Components: comps,
	}
}
