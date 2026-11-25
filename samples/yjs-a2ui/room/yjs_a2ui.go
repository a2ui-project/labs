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

// Package room manages collaborative Yjs rooms backed by ygo CRDT documents and A2UI v1.0 surfaces.
package room

import (
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"sort"
	"strconv"
	"strings"
	"unicode/utf16"

	"github.com/reearth/ygo/crdt"
)

const (
	// BasicCatalogID is the canonical A2UI v1.0 Material Design 3 catalog identifier.
	BasicCatalogID = "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"

	rootMetaKey           = "meta"
	rootComponentsKey     = "components"
	rootComponentOrderKey = "componentOrder"
	rootDataKey           = "data"
)

// SurfaceSeed defines the initial A2UI v1.0 state of a collaborative room.
type SurfaceSeed struct {
	SurfaceID     string
	CatalogID     string
	Title         string
	Description   string
	SendDataModel bool
	Components    []map[string]any
	DataModel     map[string]any
}

// A2uiOperation represents one A2UI v1.0 mutation produced by an agent or room reset.
type A2uiOperation struct {
	UpdateComponents *UpdateComponentsPayload `json:"updateComponents,omitempty"`
	UpdateDataModel  *UpdateDataModelPayload  `json:"updateDataModel,omitempty"`
}

// UpdateComponentsPayload adds or updates components on the room's surface.
type UpdateComponentsPayload struct {
	SurfaceID  string           `json:"surfaceId"`
	Components []map[string]any `json:"components"`
}

// UpdateDataModelPayload mutates a JSON Pointer path in the room's shared data model.
type UpdateDataModelPayload struct {
	SurfaceID string `json:"surfaceId"`
	Path      string `json:"path,omitempty"`
	Value     any    `json:"value"`
}

// CrdtFieldInfo describes the underlying Yjs CRDT type for a JSON Pointer in `data`.
type CrdtFieldInfo struct {
	Path     string `json:"path"`
	CrdtType string `json:"crdtType"`
	Preview  string `json:"preview"`
}

// SurfaceSnapshot is a plain Go/JSON projection of a room's live Y.Doc state.
type SurfaceSnapshot struct {
	SurfaceID      string           `json:"surfaceId"`
	CatalogID      string           `json:"catalogId"`
	Title          string           `json:"title"`
	SendDataModel  bool             `json:"sendDataModel"`
	ComponentOrder []string         `json:"componentOrder"`
	Components     []map[string]any `json:"components"`
	DataModel      map[string]any   `json:"dataModel"`
	CrdtFields     []CrdtFieldInfo  `json:"crdtFields"`
}

// TransactFunc matches the transaction runner passed to websocket.Server.Apply callbacks.
type TransactFunc func(func(*crdt.Transaction))

// SeedSurface initializes an empty room Y.Doc with an A2UI v1.0 surface seed.
// Must be called inside websocket.Server.Apply (outside transact).
func SeedSurface(doc *crdt.Doc, transact TransactFunc, seed SurfaceSeed) error {
	if seed.SurfaceID == "" {
		return errors.New("seed surfaceId is required")
	}
	catalogID := seed.CatalogID
	if catalogID == "" {
		catalogID = BasicCatalogID
	}
	textPaths := CollectTextFieldPaths(seed.Components)

	metaEntries := doc.GetMap(rootMetaKey).Entries()
	if existingID, ok := metaEntries["surfaceId"].(string); ok && existingID != "" {
		return nil
	}

	transact(func(txn *crdt.Transaction) {
		meta := txn.GetMap(rootMetaKey)
		meta.Set(txn, "surfaceId", seed.SurfaceID)
		meta.Set(txn, "catalogId", catalogID)
		meta.Set(txn, "title", seed.Title)
		meta.Set(txn, "sendDataModel", seed.SendDataModel)

		compMap := txn.GetMap(rootComponentsKey)
		orderArr := txn.GetArray(rootComponentOrderKey)
		orderVals := make([]any, 0, len(seed.Components))
		for _, comp := range seed.Components {
			id, _ := comp["id"].(string)
			if id == "" {
				continue
			}
			compMap.Set(txn, id, buildMapPrelim(txn, comp, "", nil))
			orderVals = append(orderVals, id)
		}
		if len(orderVals) > 0 {
			orderArr.Push(txn, orderVals)
		}

		dataMap := txn.GetMap(rootDataKey)
		keys := sortedMapKeys(seed.DataModel)
		for _, k := range keys {
			childPath := "/" + escapePointerSegment(k)
			dataMap.Set(txn, k, buildPrelimForData(txn, seed.DataModel[k], childPath, textPaths))
		}
	})
	return nil
}

// ResetSurface clears all existing keys in the Y.Doc and writes seed in place so live peers update seamlessly.
func ResetSurface(doc *crdt.Doc, transact TransactFunc, seed SurfaceSeed) error {
	if seed.SurfaceID == "" {
		return errors.New("seed surfaceId is required")
	}
	catalogID := seed.CatalogID
	if catalogID == "" {
		catalogID = BasicCatalogID
	}
	textPaths := CollectTextFieldPaths(seed.Components)

	compKeys := doc.GetMap(rootComponentsKey).Keys()
	orderLen := doc.GetArray(rootComponentOrderKey).Len()
	dataKeys := doc.GetMap(rootDataKey).Keys()

	transact(func(txn *crdt.Transaction) {
		meta := txn.GetMap(rootMetaKey)
		meta.Set(txn, "surfaceId", seed.SurfaceID)
		meta.Set(txn, "catalogId", catalogID)
		meta.Set(txn, "title", seed.Title)
		meta.Set(txn, "sendDataModel", seed.SendDataModel)

		compMap := txn.GetMap(rootComponentsKey)
		for _, k := range compKeys {
			compMap.Delete(txn, k)
		}
		orderArr := txn.GetArray(rootComponentOrderKey)
		if orderLen > 0 {
			orderArr.Delete(txn, 0, orderLen)
		}
		orderVals := make([]any, 0, len(seed.Components))
		for _, comp := range seed.Components {
			id, _ := comp["id"].(string)
			if id == "" {
				continue
			}
			compMap.Set(txn, id, buildMapPrelim(txn, comp, "", nil))
			orderVals = append(orderVals, id)
		}
		if len(orderVals) > 0 {
			orderArr.Push(txn, orderVals)
		}

		dataMap := txn.GetMap(rootDataKey)
		for _, k := range dataKeys {
			dataMap.Delete(txn, k)
		}
		for _, k := range sortedMapKeys(seed.DataModel) {
			childPath := "/" + escapePointerSegment(k)
			dataMap.Set(txn, k, buildPrelimForData(txn, seed.DataModel[k], childPath, textPaths))
		}
	})
	return nil
}

// ApplyA2uiOperations applies granular A2UI v1.0 component and data-model updates to doc.
// Existing Y.Map containers and Y.Text nodes are mutated in place so concurrent human edits merge cleanly.
func ApplyA2uiOperations(doc *crdt.Doc, transact TransactFunc, ops []A2uiOperation) error {
	for _, op := range ops {
		if op.UpdateComponents != nil && len(op.UpdateComponents.Components) > 0 {
			applyUpdateComponents(doc, transact, op.UpdateComponents.Components)
		}
		if op.UpdateDataModel != nil {
			snap := ReadSurfaceSnapshot(doc)
			textPaths := CollectTextFieldPaths(snap.Components)
			ptr := normalizePointer(op.UpdateDataModel.Path)
			if strings.HasPrefix(ptr, "/local/") || ptr == "/local" {
				// /local/* is strictly client-local viewport state; never write it to shared Y.Doc.
				continue
			}
			if err := SetDataAtPointer(doc, transact, ptr, op.UpdateDataModel.Value, textPaths); err != nil {
				return err
			}
		}
	}
	return nil
}

// applyUpdateComponents reads existing keys outside transact because ygo's
// YMap.Get/Keys acquire doc.mu.RLock (calling them inside transact deadlocks);
// websocket.Server.Apply already serializes per-room callbacks.
func applyUpdateComponents(doc *crdt.Doc, transact TransactFunc, comps []map[string]any) {
	compRoot := doc.GetMap(rootComponentsKey)
	orderArr := doc.GetArray(rootComponentOrderKey)
	existingOrder := readStringArray(orderArr)
	seenOrder := make(map[string]bool, len(existingOrder))
	for _, id := range existingOrder {
		seenOrder[id] = true
	}

	for _, comp := range comps {
		id, _ := comp["id"].(string)
		if id == "" {
			continue
		}
		existingRaw, exists := compRoot.Get(id)
		existingMap, isMap := existingRaw.(*crdt.YMap)
		var existingKeys []string
		if exists && isMap {
			existingKeys = existingMap.Keys()
		}
		appendOrder := !seenOrder[id]
		if appendOrder {
			seenOrder[id] = true
		}

		transact(func(txn *crdt.Transaction) {
			if isMap {
				nextKeys := make(map[string]bool, len(comp))
				for k := range comp {
					nextKeys[k] = true
				}
				for _, oldKey := range existingKeys {
					if !nextKeys[oldKey] {
						existingMap.Delete(txn, oldKey)
					}
				}
				for _, k := range sortedMapKeys(comp) {
					existingMap.Set(txn, k, buildPrelimForData(txn, comp[k], "", nil))
				}
			} else {
				txn.GetMap(rootComponentsKey).Set(txn, id, buildMapPrelim(txn, comp, "", nil))
			}
			if appendOrder {
				txn.GetArray(rootComponentOrderKey).Push(txn, []any{id})
			}
		})
	}
}

// SetDataAtPointer mutates a JSON Pointer inside `doc.GetMap("data")` with minimal CRDT churn.
func SetDataAtPointer(
	doc *crdt.Doc,
	transact TransactFunc,
	pointer string,
	value any,
	textPaths map[string]bool,
) error {
	norm := normalizePointer(pointer)
	if norm == "/" {
		obj, ok := toStringKeyedMap(value)
		if !ok {
			return fmt.Errorf("root data update requires JSON object, got %T", value)
		}
		// Apply top-level keys individually rather than wiping sibling namespaces like /users.
		for _, k := range sortedMapKeys(obj) {
			childPtr := "/" + escapePointerSegment(k)
			if err := SetDataAtPointer(doc, transact, childPtr, obj[k], textPaths); err != nil {
				return err
			}
		}
		return nil
	}

	segments, err := parsePointerSegments(norm)
	if err != nil {
		return err
	}
	if len(segments) == 0 {
		return nil
	}

	// If value is a nested map and the target container is already a Y.Map, recurse per key
	// so sibling keys inside that map are preserved across concurrent peer/agent writes.
	if nestedObj, isObj := toStringKeyedMap(value); isObj {
		if existingMap := resolveExistingMapAtSegments(doc.GetMap(rootDataKey), segments); existingMap != nil {
			for _, k := range sortedMapKeys(nestedObj) {
				childPtr := norm + "/" + escapePointerSegment(k)
				if err := SetDataAtPointer(doc, transact, childPtr, nestedObj[k], textPaths); err != nil {
					return err
				}
			}
			return nil
		}
	}

	dataRoot := doc.GetMap(rootDataKey)
	parentMap := dataRoot
	matchedDepth := 0
	for i := 0; i < len(segments)-1; i++ {
		nextVal, ok := parentMap.Get(segments[i])
		if !ok {
			break
		}
		nextMap, isYMap := nextVal.(*crdt.YMap)
		if !isYMap {
			break
		}
		parentMap = nextMap
		matchedDepth = i + 1
	}

	leafSeg := segments[len(segments)-1]

	// If we reached the immediate parent Y.Map, check for in-place Y.Text diffing or deletion.
	if matchedDepth == len(segments)-1 {
		existingLeaf, hasLeaf := parentMap.Get(leafSeg)
		if value == nil {
			if hasLeaf {
				transact(func(txn *crdt.Transaction) {
					parentMap.Delete(txn, leafSeg)
				})
			}
			return nil
		}
		if strVal, isStr := value.(string); isStr {
			if existingText, isYText := existingLeaf.(*crdt.YText); isYText {
				oldStr := existingText.ToString()
				if oldStr == strVal {
					return nil
				}
				idx, delLen, insStr := ComputeUTF16TextDiff(oldStr, strVal)
				transact(func(txn *crdt.Transaction) {
					if delLen > 0 {
						existingText.Delete(txn, idx, delLen)
					}
					if insStr != "" {
						existingText.Insert(txn, idx, insStr, nil)
					}
				})
				return nil
			}
		}
		// Check if primitive value is unchanged to avoid no-op transactions.
		if hasLeaf && primitivesEqual(existingLeaf, value) && !shouldUseYText(norm, value, textPaths) {
			return nil
		}
		transact(func(txn *crdt.Transaction) {
			parentMap.Set(txn, leafSeg, buildPrelimForData(txn, value, norm, textPaths))
		})
		return nil
	}

	if value == nil {
		return nil
	}

	// Build missing intermediate Y.Map prelims from matchedDepth down to leafSeg.
	topMissingKey := segments[matchedDepth]
	transact(func(txn *crdt.Transaction) {
		leafPayload := buildPrelimForData(txn, value, norm, textPaths)
		current := leafPayload
		for i := len(segments) - 1; i > matchedDepth; i-- {
			wrap := crdt.NewMapPrelim()
			wrap.Set(txn, segments[i], current)
			current = wrap
		}
		parentMap.Set(txn, topMissingKey, current)
	})
	return nil
}

// ReadSurfaceSnapshot reads a complete, lock-safe snapshot of the room's Y.Doc.
// Must NOT be called inside a crdt.Transaction callback.
func ReadSurfaceSnapshot(doc *crdt.Doc) SurfaceSnapshot {
	meta := doc.GetMap(rootMetaKey).Entries()
	surfaceID, _ := meta["surfaceId"].(string)
	catalogID, _ := meta["catalogId"].(string)
	if catalogID == "" {
		catalogID = BasicCatalogID
	}
	title, _ := meta["title"].(string)
	sendDataModel, _ := meta["sendDataModel"].(bool)

	compMap := doc.GetMap(rootComponentsKey)
	compEntries := compMap.Entries()
	order := readStringArray(doc.GetArray(rootComponentOrderKey))

	seen := make(map[string]bool, len(order))
	orderedIDs := make([]string, 0, len(compEntries))
	for _, id := range order {
		if _, exists := compEntries[id]; exists && !seen[id] {
			seen[id] = true
			orderedIDs = append(orderedIDs, id)
		}
	}
	extraIDs := make([]string, 0)
	for id := range compEntries {
		if !seen[id] {
			extraIDs = append(extraIDs, id)
		}
	}
	sort.Strings(extraIDs)
	orderedIDs = append(orderedIDs, extraIDs...)

	// Ensure "root" comes first when present so A2UI topological consumers always see root cleanly.
	for i, id := range orderedIDs {
		if id == "root" && i > 0 {
			copy(orderedIDs[1:i+1], orderedIDs[0:i])
			orderedIDs[0] = "root"
			break
		}
	}

	components := make([]map[string]any, 0, len(orderedIDs))
	for _, id := range orderedIDs {
		if m, ok := toStringKeyedMap(compEntries[id]); ok {
			components = append(components, normalizeJSONNumbersMap(m))
		}
	}

	dataMap := doc.GetMap(rootDataKey)
	rawData := normalizeJSONNumbersMap(dataMap.Entries())
	var crdtFields []CrdtFieldInfo
	collectCrdtFieldInfo(dataMap, "", &crdtFields)

	return SurfaceSnapshot{
		SurfaceID:      surfaceID,
		CatalogID:      catalogID,
		Title:          title,
		SendDataModel:  sendDataModel,
		ComponentOrder: orderedIDs,
		Components:     components,
		DataModel:      rawData,
		CrdtFields:     crdtFields,
	}
}

// CollectTextFieldPaths returns the set of normalized JSON Pointers bound to `TextField.value`.
// Strings at these paths are stored as character-collaborative `Y.Text`; enum/choice strings
// (`RadioButton`, `Chips`, `OptionSelector`) remain atomic LWW values in `Y.Map`.
func CollectTextFieldPaths(components []map[string]any) map[string]bool {
	paths := make(map[string]bool)
	for _, comp := range components {
		compType, _ := comp["component"].(string)
		if compType != "TextField" {
			continue
		}
		valObj, ok := toStringKeyedMap(comp["value"])
		if !ok {
			continue
		}
		rawPath, _ := valObj["@path"].(string)
		if rawPath == "" {
			rawPath, _ = valObj["path"].(string)
		}
		if rawPath == "" {
			continue
		}
		norm := normalizePointer(rawPath)
		paths[norm] = true
		if after, ok := strings.CutPrefix(norm, "/me/"); ok {
			// Marker pattern `/users/*/<suffix>` so per-user TextFields also get Y.Text.
			paths["/users/*/"+after] = true
		}
	}
	return paths
}

func shouldUseYText(pointer string, val any, textPaths map[string]bool) bool {
	if _, ok := val.(string); !ok || len(textPaths) == 0 {
		return false
	}
	if textPaths[pointer] {
		return true
	}
	if after, ok := strings.CutPrefix(pointer, "/users/"); ok {
		if slash := strings.IndexByte(after, '/'); slash > 0 {
			wildcard := "/users/*" + after[slash:]
			return textPaths[wildcard]
		}
	}
	return false
}

// ComputeUTF16TextDiff computes the minimal single-span `(utf16Index, utf16DeleteLen, insertStr)`
// transforming `oldStr` into `newStr` without splitting Unicode surrogate pairs.
func ComputeUTF16TextDiff(oldStr, newStr string) (index int, deleteLen int, insertStr string) {
	if oldStr == newStr {
		return 0, 0, ""
	}
	oldRunes := []rune(oldStr)
	newRunes := []rune(newStr)

	prefix := 0
	minLen := len(oldRunes)
	if len(newRunes) < minLen {
		minLen = len(newRunes)
	}
	for prefix < minLen && oldRunes[prefix] == newRunes[prefix] {
		prefix++
	}

	oldTail := len(oldRunes)
	newTail := len(newRunes)
	for oldTail > prefix && newTail > prefix && oldRunes[oldTail-1] == newRunes[newTail-1] {
		oldTail--
		newTail--
	}

	return runeSliceUTF16Len(oldRunes[:prefix]),
		runeSliceUTF16Len(oldRunes[prefix:oldTail]),
		string(newRunes[prefix:newTail])
}

func runeSliceUTF16Len(runes []rune) int {
	if len(runes) == 0 {
		return 0
	}
	return len(utf16.Encode(runes))
}

func buildMapPrelim(txn *crdt.Transaction, m map[string]any, basePtr string, textPaths map[string]bool) *crdt.YMap {
	ym := crdt.NewMapPrelim()
	for _, k := range sortedMapKeys(m) {
		childPtr := ""
		if basePtr != "" || textPaths != nil {
			childPtr = basePtr + "/" + escapePointerSegment(k)
		}
		ym.Set(txn, k, buildPrelimForData(txn, m[k], childPtr, textPaths))
	}
	return ym
}

func buildPrelimForData(txn *crdt.Transaction, v any, ptr string, textPaths map[string]bool) any {
	if v == nil {
		return nil
	}
	if str, ok := v.(string); ok {
		if shouldUseYText(ptr, str, textPaths) {
			yt := crdt.NewTextPrelim()
			if str != "" {
				yt.Insert(txn, 0, str, nil)
			}
			return yt
		}
		return str
	}
	switch typed := v.(type) {
	case bool:
		return typed
	case float64:
		return typed
	case float32:
		return float64(typed)
	case int:
		return float64(typed)
	case int64:
		return float64(typed)
	case json.Number:
		if f, err := typed.Float64(); err == nil {
			return f
		}
		return typed.String()
	}
	if obj, ok := toStringKeyedMap(v); ok {
		return buildMapPrelim(txn, obj, ptr, textPaths)
	}
	if slice, ok := toAnySlice(v); ok {
		ya := crdt.NewArrayPrelim()
		for i, elem := range slice {
			elemPtr := ""
			if ptr != "" {
				elemPtr = ptr + "/" + strconv.Itoa(i)
			}
			built := buildPrelimForData(txn, elem, elemPtr, textPaths)
			switch st := built.(type) {
			case *crdt.YMap:
				ya.PushType(txn, st)
			case *crdt.YArray:
				ya.PushType(txn, st)
			case *crdt.YText:
				ya.PushType(txn, st)
			default:
				ya.Push(txn, []any{built})
			}
		}
		return ya
	}
	// Fallback through JSON round-trip for typed Go structs/slices.
	raw, err := json.Marshal(v)
	if err != nil {
		return fmt.Sprint(v)
	}
	var decoded any
	if err := json.Unmarshal(raw, &decoded); err != nil {
		return fmt.Sprint(v)
	}
	return buildPrelimForData(txn, decoded, ptr, textPaths)
}

func resolveExistingMapAtSegments(root *crdt.YMap, segments []string) *crdt.YMap {
	cur := root
	for _, seg := range segments {
		val, ok := cur.Get(seg)
		if !ok {
			return nil
		}
		next, isMap := val.(*crdt.YMap)
		if !isMap {
			return nil
		}
		cur = next
	}
	return cur
}

func readStringArray(arr *crdt.YArray) []string {
	n := arr.Len()
	out := make([]string, 0, n)
	for i := 0; i < n; i++ {
		if s, ok := arr.Get(i).(string); ok && s != "" {
			out = append(out, s)
		}
	}
	return out
}

func collectCrdtFieldInfo(m *crdt.YMap, prefix string, out *[]CrdtFieldInfo) {
	keys := m.Keys()
	sort.Strings(keys)
	for _, k := range keys {
		ptr := prefix + "/" + escapePointerSegment(k)
		val, ok := m.Get(k)
		if !ok {
			continue
		}
		switch typed := val.(type) {
		case *crdt.YText:
			text := typed.ToString()
			*out = append(*out, CrdtFieldInfo{
				Path:     ptr,
				CrdtType: "Y.Text",
				Preview:  truncatePreview(text, 72),
			})
		case *crdt.YMap:
			*out = append(*out, CrdtFieldInfo{
				Path:     ptr,
				CrdtType: "Y.Map",
				Preview:  fmt.Sprintf("{%d keys}", len(typed.Keys())),
			})
			collectCrdtFieldInfo(typed, ptr, out)
		case *crdt.YArray:
			*out = append(*out, CrdtFieldInfo{
				Path:     ptr,
				CrdtType: "Y.Array",
				Preview:  fmt.Sprintf("[%d items]", typed.Len()),
			})
		default:
			raw, _ := json.Marshal(typed)
			*out = append(*out, CrdtFieldInfo{
				Path:     ptr,
				CrdtType: "Y.Map(LWW)",
				Preview:  truncatePreview(string(raw), 72),
			})
		}
	}
}

func truncatePreview(s string, maxRunes int) string {
	r := []rune(s)
	if len(r) <= maxRunes {
		return s
	}
	return string(r[:maxRunes]) + "..."
}

func normalizePointer(ptr string) string {
	trimmed := strings.TrimSpace(ptr)
	if trimmed == "" || trimmed == "/" {
		return "/"
	}
	if !strings.HasPrefix(trimmed, "/") {
		return "/" + trimmed
	}
	return strings.TrimRight(trimmed, "/")
}

func parsePointerSegments(ptr string) ([]string, error) {
	norm := normalizePointer(ptr)
	if norm == "/" {
		return nil, nil
	}
	rawParts := strings.Split(norm[1:], "/")
	segs := make([]string, 0, len(rawParts))
	for _, p := range rawParts {
		unescaped := strings.ReplaceAll(strings.ReplaceAll(p, "~1", "/"), "~0", "~")
		if unescaped == "__proto__" || unescaped == "constructor" || unescaped == "prototype" {
			return nil, fmt.Errorf("forbidden pointer segment %q", unescaped)
		}
		segs = append(segs, unescaped)
	}
	return segs, nil
}

func escapePointerSegment(seg string) string {
	return strings.ReplaceAll(strings.ReplaceAll(seg, "~", "~0"), "/", "~1")
}

func sortedMapKeys(m map[string]any) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func toStringKeyedMap(v any) (map[string]any, bool) {
	if m, ok := v.(map[string]any); ok {
		return m, true
	}
	return nil, false
}

func toAnySlice(v any) ([]any, bool) {
	switch s := v.(type) {
	case []any:
		return s, true
	case []string:
		out := make([]any, len(s))
		for i, item := range s {
			out[i] = item
		}
		return out, true
	case []map[string]any:
		out := make([]any, len(s))
		for i, item := range s {
			out[i] = item
		}
		return out, true
	default:
		return nil, false
	}
}

func primitivesEqual(a, b any) bool {
	af, aNum := toFloat64(a)
	bf, bNum := toFloat64(b)
	if aNum && bNum {
		return af == bf
	}
	switch av := a.(type) {
	case string:
		bv, ok := b.(string)
		return ok && av == bv
	case bool:
		bv, ok := b.(bool)
		return ok && av == bv
	default:
		return false
	}
}

func toFloat64(v any) (float64, bool) {
	switch n := v.(type) {
	case float64:
		return n, true
	case float32:
		return float64(n), true
	case int:
		return float64(n), true
	case int64:
		return float64(n), true
	case json.Number:
		f, err := n.Float64()
		return f, err == nil
	default:
		return 0, false
	}
}

func normalizeJSONNumbersMap(in map[string]any) map[string]any {
	out := make(map[string]any, len(in))
	maps.Copy(out, in)
	for k, v := range out {
		out[k] = normalizeJSONValue(v)
	}
	return out
}

func normalizeJSONValue(v any) any {
	switch typed := v.(type) {
	case map[string]any:
		return normalizeJSONNumbersMap(typed)
	case []any:
		cp := make([]any, len(typed))
		for i, elem := range typed {
			cp[i] = normalizeJSONValue(elem)
		}
		return cp
	default:
		return v
	}
}
