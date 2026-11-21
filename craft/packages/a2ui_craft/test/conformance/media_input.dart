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

// The media inputs of conformance cases, documented in the header of
// craft/conformance/media_context.yaml.

import 'package:a2ui_craft/a2ui_craft.dart';

/// The media context of a case's `media` (properties) or `size` (a size in
/// logical pixels) input; null when it has neither.
MediaContext? mediaInput(Object? media, Object? size) {
  if (size case final Map<String, Object?> size) {
    return MediaContext.fromSize(
      (size['width']! as num).toDouble(),
      (size['height']! as num).toDouble(),
      platform: _platform(size['platform']),
      reducedMotion: size['reducedMotion'] as bool? ?? false,
    );
  }
  if (media case final Map<String, Object?> media) {
    return MediaContext(
      width: WidthClass.values.byName(media['width']! as String),
      height: HeightClass.values.byName(media['height']! as String),
      orientation: SurfaceOrientation.values.byName(
        media['orientation']! as String,
      ),
      platform: _platform(media['platform']),
      reducedMotion: media['reducedMotion'] as bool? ?? false,
    );
  }
  return null;
}

HostPlatform? _platform(Object? name) =>
    name == null ? null : HostPlatform.values.byName(name as String);
