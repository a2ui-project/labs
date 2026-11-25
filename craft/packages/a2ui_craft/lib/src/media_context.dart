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

import 'functions.dart';
import 'rfw/model.dart';

/// The width class of the space a surface gets (see the `craft_media_context`
/// blueprint, requirement 2), smallest first.
enum WidthClass {
  /// Narrower than 600 logical pixels.
  compact,

  /// From 600 to less than 840.
  medium,

  /// From 840 to less than 1200.
  expanded,

  /// From 1200 to less than 1600.
  large,

  /// 1600 or wider.
  extraLarge;

  /// The class of a width in logical pixels.
  ///
  /// Throws an [ArgumentError] when [width] is negative or NaN.
  static WidthClass of(double width) {
    _checkLength(width, 'width');
    if (width < 600) return compact;
    if (width < 840) return medium;
    if (width < 1200) return expanded;
    if (width < 1600) return large;
    return extraLarge;
  }
}

/// The height class of the space a surface gets (see the `craft_media_context`
/// blueprint, requirement 2), smallest first.
enum HeightClass {
  /// Shorter than 480 logical pixels.
  compact,

  /// From 480 to less than 900.
  medium,

  /// 900 or taller.
  expanded;

  /// The class of a height in logical pixels.
  ///
  /// Throws an [ArgumentError] when [height] is negative or NaN.
  static HeightClass of(double height) {
    _checkLength(height, 'height');
    if (height < 480) return compact;
    if (height < 900) return medium;
    return expanded;
  }
}

/// Whether the space a surface gets is wider than it is tall.
enum SurfaceOrientation {
  /// As tall as it is wide, or taller.
  portrait,

  /// Wider than it is tall.
  landscape,
}

/// The platform the host runs on.
enum HostPlatform {
  /// Android.
  android,

  /// Fuchsia.
  fuchsia,

  /// iOS and iPadOS.
  ios,

  /// Linux.
  linux,

  /// macOS.
  macos,

  /// A web browser, whatever its operating system.
  web,

  /// Windows.
  windows,
}

void _checkLength(double value, String name) {
  if (value.isNaN || value < 0) {
    throw ArgumentError.value(value, name, 'Must be a number of at least 0');
  }
}

/// What a host tells templates about the surface they render on (see the
/// `craft_media_context` blueprint): size classes, never pixels.
class MediaContext {
  /// Creates a media context with the given properties.
  const MediaContext({
    required this.width,
    required this.height,
    required this.orientation,
    this.platform,
    this.reducedMotion = false,
  });

  /// The media context of a space of [width] by [height] logical pixels:
  /// its size classes and orientation.
  ///
  /// Throws an [ArgumentError] when [width] or [height] is negative or NaN.
  factory MediaContext.fromSize(
    double width,
    double height, {
    HostPlatform? platform,
    bool reducedMotion = false,
  }) => MediaContext(
    width: WidthClass.of(width),
    height: HeightClass.of(height),
    orientation: width > height
        ? SurfaceOrientation.landscape
        : SurfaceOrientation.portrait,
    platform: platform,
    reducedMotion: reducedMotion,
  );

  /// The width class.
  final WidthClass width;

  /// The height class.
  final HeightClass height;

  /// Portrait or landscape.
  final SurfaceOrientation orientation;

  /// The host's platform, or null when the host does not say.
  final HostPlatform? platform;

  /// Whether the user asked the platform to reduce motion.
  final bool reducedMotion;

  /// The media map that `media.` references read: each property by its
  /// name, classes as their names, `platform` only when known.
  Map<String, Object> toMap() => <String, Object>{
    'width': width.name,
    'height': height.name,
    'orientation': orientation.name,
    if (platform case final HostPlatform platform) 'platform': platform.name,
    'reducedMotion': reducedMotion,
  };

  @override
  bool operator ==(Object other) =>
      other is MediaContext &&
      other.width == width &&
      other.height == height &&
      other.orientation == orientation &&
      other.platform == platform &&
      other.reducedMotion == reducedMotion;

  @override
  int get hashCode =>
      Object.hash(width, height, orientation, platform, reducedMotion);

  @override
  String toString() => 'MediaContext(${toMap()})';
}

/// Reads the media reference [parts] in [media]: the value at those parts of
/// its media map, absent where it has none or without a media context.
Object readMedia(MediaContext? media, List<Object> parts) {
  Object current = media?.toMap() ?? missing;
  for (final Object part in parts) {
    current = switch ((current, part)) {
      (final Map<String, Object> map, final String key) => map[key] ?? missing,
      _ => missing,
    };
  }
  return current;
}

/// The standard functions that the `craft_media_context` feature adds.
final Map<String, LocalFunction> mediaFunctions =
    Map<String, LocalFunction>.unmodifiable(<String, LocalFunction>{
      'atLeast': LocalFunction(
        arguments: const <String, FunctionArgType>{
          'a': FunctionArgType.string,
          'b': FunctionArgType.string,
        },
        implementation: (DynamicMap arguments) {
          final int? a = _rank(arguments['a']);
          final int? b = _rank(arguments['b']);
          return a == null || b == null ? null : a >= b;
        },
      ),
    });

/// The position of the size class named [name] in compact < medium <
/// expanded < large < extraLarge, or null when it names none.
int? _rank(Object? name) {
  for (final WidthClass c in WidthClass.values) {
    if (c.name == name) return c.index;
  }
  return null;
}
