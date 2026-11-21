// Copyright 2013 The Flutter Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file must not import `dart:ui`, directly or indirectly, as it is
// intended to function even in pure Dart server or CLI environments.
import 'dart:collection';
import 'dart:convert';
import 'dart:typed_data';

import '../limits.dart';
import 'model.dart';

// The format is specified by the craft_binary_format feature blueprint.

/// The format version this library writes, and the highest
/// minimum-reader-version it can decode.
const int blobFormatVersion = 1;

/// The first four bytes of a Craft binary data blob ("\xFECRD").
///
/// [encodeDataBlob] writes it, followed by the version header.
///
/// See also:
///
///  * [libraryBlobSignature], which is the signature for binary library blobs.
const List<int> dataBlobSignature = <int>[0xFE, 0x43, 0x52, 0x44];

/// The first four bytes of a Craft binary library blob ("\xFECRF").
///
/// [encodeLibraryBlob] writes it, followed by the version header.
///
/// See also:
///
///  * [dataBlobSignature], which is the signature for binary data blobs.
const List<int> libraryBlobSignature = <int>[0xFE, 0x43, 0x52, 0x46];

/// The signature of a Remote Flutter Widgets data blob, which has no version
/// header and decodes as format version 0.
const List<int> legacyDataBlobSignature = <int>[0xFE, 0x52, 0x57, 0x44];

/// The signature of a Remote Flutter Widgets library blob, which has no
/// version header and decodes as format version 0.
const List<int> legacyLibraryBlobSignature = <int>[0xFE, 0x52, 0x46, 0x57];

/// Why a blob failed to decode.
enum BlobErrorKind {
  /// The first four bytes are neither the Craft nor the RFW signature.
  signature,

  /// The version header is malformed: version 0, minimum reader version 0,
  /// or a minimum reader version above the version.
  invalidHeader,

  /// The blob's minimum reader version exceeds [blobFormatVersion].
  unsupportedVersion,

  /// The blob ends before the data it declares.
  truncated,

  /// A length or count is negative.
  invalidLength,

  /// A string is not well-formed UTF-8.
  invalidUtf8,

  /// A tag that this decoder does not know and cannot skip.
  unknownTag,

  /// A known tag, or a skippable one, where the format does not allow it.
  unexpectedTag,

  /// A map repeats a key, or a switch repeats a case.
  duplicateKey,

  /// Bytes remain after the root value or library.
  trailingBytes,

  /// The blob exceeds a limit (see the `craft_limits` blueprint), named by
  /// [BlobFormatException.limit].
  limitExceeded,
}

/// A [FormatException] raised while decoding a binary blob.
///
/// [offset] is the byte offset of the offending field.
class BlobFormatException extends FormatException {
  /// Creates a decoding error.
  const BlobFormatException(
    this.kind,
    String message, {
    required int offset,
    this.tag,
    this.blobVersion,
    this.limit,
  }) : super(message, null, offset);

  /// The error category.
  final BlobErrorKind kind;

  /// The offending tag, for [BlobErrorKind.unknownTag] and
  /// [BlobErrorKind.unexpectedTag].
  final int? tag;

  /// The blob's format version (0 for RFW blobs), or null if the error was
  /// found before the version was known.
  final int? blobVersion;

  /// The limit exceeded, for [BlobErrorKind.limitExceeded].
  final CraftLimit? limit;
}

/// Encode data as a Craft binary data blob (format version
/// [blobFormatVersion]).
///
/// See also:
///
///  * [decodeDataBlob], which decodes this format.
///  * [encodeLibraryBlob], which uses a superset of this format to encode
///    binary library blobs.
Uint8List encodeDataBlob(Object value) {
  final encoder = _BlobEncoder();
  encoder.writeHeader(dataBlobSignature);
  encoder.writeValue(value);
  return encoder.bytes.toBytes();
}

/// Decode a binary data blob: a Craft blob ([dataBlobSignature]) or a Remote
/// Flutter Widgets blob ([legacyDataBlobSignature]).
///
/// This data is usually used in conjunction with [DynamicContent].
///
/// This method supports a subset of the format supported by
/// [decodeLibraryBlob]; specifically, it reads a _value_ from that format
/// (rather than a _library_), and disallows values other than maps, lists,
/// ints, doubles, booleans, and strings. Skipped extension values are left out
/// of their enclosing map or list.
///
/// Throws a [BlobFormatException] on malformed input, and on input that
/// exceeds [limits] (by default [CraftLimits.defaults]; see the `craft_limits`
/// blueprint).
///
/// See also:
///
///  * [encodeDataBlob], which encodes this format.
///  * [decodeLibraryBlob], which decodes library blobs.
///  * [parseDataFile], which parses the text variant of this format.
Object decodeDataBlob(Uint8List bytes, {CraftLimits? limits}) {
  final decoder = _BlobDecoder(
    bytes.buffer.asByteData(bytes.offsetInBytes, bytes.lengthInBytes),
    limits ?? CraftLimits.defaults,
  );
  decoder.readHeader(dataBlobSignature, legacyDataBlobSignature);
  final Object result = decoder.readRootValue();
  decoder.expectFinished('value');
  return result;
}

/// Encode a library as a Craft binary library blob (format version
/// [blobFormatVersion]).
///
/// The same library always yields the same bytes. Maps are written in their
/// iteration order, which is source order for parsed libraries.
///
/// See also:
///
///  * [decodeLibraryBlob], which decodes this format.
///  * [parseLibraryFile], which parses the text variant of this format.
Uint8List encodeLibraryBlob(RemoteWidgetLibrary value) {
  final encoder = _BlobEncoder();
  encoder.writeHeader(libraryBlobSignature);
  encoder.writeLibrary(value);
  return encoder.bytes.toBytes();
}

/// Decode a binary library blob: a Craft blob ([libraryBlobSignature]) whose
/// minimum reader version is at most [blobFormatVersion], or a Remote Flutter
/// Widgets blob ([legacyLibraryBlobSignature]), decoded as format version 0.
///
/// Remote widget libraries are usually used in conjunction with a [Runtime].
///
/// The format is a depth-first serialization of the library with one-byte tags
/// and little-endian 64-bit lengths, specified in the `craft_binary_format`
/// blueprint. Skipped extension values decode as [missing].
///
/// Throws a [BlobFormatException] on malformed input, and on input that
/// exceeds [limits] (by default [CraftLimits.defaults]; see the `craft_limits`
/// blueprint).
///
/// ## Limitations
///
/// JavaScript does not have a native integer type; all numbers are stored as
/// [double]s. Data loss may therefore occur when handling integers that cannot
/// be completely represented as a [binary64] floating point number.
///
/// See also:
///
///  * [encodeLibraryBlob], which encodes this format.
///  * [decodeDataBlob], which uses a subset of this format to decode
///    binary data blobs.
///  * [parseLibraryFile], which parses the text variant of this format.
RemoteWidgetLibrary decodeLibraryBlob(Uint8List bytes, {CraftLimits? limits}) {
  final decoder = _BlobDecoder(
    bytes.buffer.asByteData(bytes.offsetInBytes, bytes.lengthInBytes),
    limits ?? CraftLimits.defaults,
  );
  decoder.readHeader(libraryBlobSignature, legacyLibraryBlobSignature);
  final RemoteWidgetLibrary result = decoder.readLibrary();
  decoder.expectFinished('constructors');
  return result;
}

// endianess used by this format
const Endian _blobEndian = Endian.little;

// whether we can use 64 bit APIs on this platform
// (on JS, we can only use 32 bit APIs and integers only go up to ~2^53)
const bool _has64Bits = 0x1000000000000000 + 1 != 0x1000000000000000; // 2^60

// magic signatures
const int _msFalse = 0x00;
const int _msTrue = 0x01;
const int _msInt64 = 0x02;
const int _msBinary64 = 0x03;
const int _msString = 0x04;
const int _msList = 0x05;
const int _msMap = 0x07;
const int _msLoop = 0x08;
const int _msWidget = 0x09;
const int _msArgsReference = 0x0A;
const int _msDataReference = 0x0B;
const int _msLoopReference = 0x0C;
const int _msStateReference = 0x0D;
const int _msEvent = 0x0E;
const int _msSwitch = 0x0F;
const int _msDefault = 0x10;
const int _msSetState = 0x11;
const int _msWidgetBuilder = 0x12;
const int _msWidgetBuilderArgReference = 0x13;
const int _msThemeReference = 0x14;
const int _msMediaReference = 0x15;
const int _msSymbolReference = 0x16;

const int _flagExported = 1 << 0;

const int _lastCoreTag = _msSymbolReference;
const int _firstExtensionTag = 0x80;
const int _lastExtensionTag = 0xEF;

bool _isAssignedTag(int tag) => tag <= _lastCoreTag && tag != 0x06;

bool _isExtensionTag(int tag) =>
    tag >= _firstExtensionTag && tag <= _lastExtensionTag;

/// Whether two switch case keys are the same case (see the craft_binary_format
/// blueprint): as `==`, except that an integer and a double are the same only
/// when the double is exactly the integer.
bool _sameCaseKey(Object? a, Object? b) => switch ((a, b)) {
  (int i, double d) || (double d, int i) => _isExactly(d, i),
  _ => a == b,
};

bool _isExactly(double d, int i) =>
    d == d.truncateToDouble() &&
    d >= -9223372036854775808.0 &&
    d < 9223372036854775808.0 &&
    d.toInt() == i;

String _hexByte(int byte) =>
    byte.toRadixString(16).toUpperCase().padLeft(2, '0');

String _hexBytes(List<int> bytes) => bytes.map(_hexByte).join(' ');

/// API for decoding binary blobs: [readHeader] first, then [readRootValue]
/// (data) or [readLibrary] (library), then [expectFinished].
class _BlobDecoder {
  _BlobDecoder(this.bytes, this._limits);

  final ByteData bytes;
  final CraftLimits _limits;

  /// The nesting depth of the tagged value being read.
  int _depth = 0;

  /// The tagged values read in the data value or declaration being read.
  int _nodes = 0;

  Never _limitError(CraftLimit limit, String message, int offset) =>
      _fail(BlobErrorKind.limitExceeded, message, offset: offset, limit: limit);

  /// Reads, with [read], a value whose tag is at [offset], one level deeper.
  T _node<T>(int offset, T Function() read) {
    _depth += 1;
    if (_depth > _limits.maxDepth) {
      _limitError(
        CraftLimit.maxDepth,
        'The value at offset $offset is nested deeper than '
        '${_limits.maxDepth}.',
        offset,
      );
    }
    _nodes += 1;
    if (_nodes > _limits.maxNodes) {
      _limitError(
        CraftLimit.maxNodes,
        'The value at offset $offset is beyond the limit of '
        '${_limits.maxNodes} nodes.',
        offset,
      );
    }
    final T result = read();
    _depth -= 1;
    return result;
  }

  int _cursor = 0;

  /// The blob's format version; null until [readHeader] has read it.
  int? _version;

  bool get _skipsExtensions => _version! >= 1;

  Never _fail(
    BlobErrorKind kind,
    String message, {
    required int offset,
    int? tag,
    CraftLimit? limit,
  }) {
    final String version = _version == null
        ? ''
        : ' (blob format version $_version; '
              'this decoder reads up to $blobFormatVersion)';
    throw BlobFormatException(
      kind,
      '$message$version',
      offset: offset,
      tag: tag,
      blobVersion: _version,
      limit: limit,
    );
  }

  void _advance(String context, int length) {
    if (_cursor + length > bytes.lengthInBytes) {
      _fail(
        BlobErrorKind.truncated,
        'Could not read $context at offset $_cursor: unexpected end of file.',
        offset: _cursor,
      );
    }
    _cursor += length;
  }

  int _readByte() {
    final int byteOffset = _cursor;
    _advance('byte', 1);
    return bytes.getUint8(byteOffset);
  }

  int _readUint16() {
    final int byteOffset = _cursor;
    _advance('uint16', 2);
    return bytes.getUint16(byteOffset, _blobEndian);
  }

  int _readInt64() {
    final int byteOffset = _cursor;
    _advance('int64', 8);
    if (_has64Bits) {
      return bytes.getInt64(byteOffset, _blobEndian);
    }
    // We use multiplication rather than bit shifts because << truncates to 32 bits when compiled to JS:
    // https://dart.dev/guides/language/numbers#bitwise-operations
    final int a = bytes.getUint32(
      byteOffset,
      _blobEndian,
    ); // dead code on VM target
    final int b = bytes.getInt32(
      byteOffset + 4,
      _blobEndian,
    ); // dead code on VM target
    return a + (b * 0x100000000); // dead code on VM target
  }

  /// Reads a byte length or an element count. Every element takes at least
  /// one byte, so a count beyond the remaining bytes is reported as
  /// truncation before anything is allocated.
  int _readLength(String context) {
    final int offset = _cursor;
    final int length = _readInt64();
    if (length < 0) {
      _fail(
        BlobErrorKind.invalidLength,
        'Negative $context length $length at offset $offset.',
        offset: offset,
      );
    }
    if (length > bytes.lengthInBytes - _cursor) {
      _fail(
        BlobErrorKind.truncated,
        'Could not read $context of length $length at offset $offset: '
        'unexpected end of file.',
        offset: offset,
      );
    }
    return length;
  }

  double _readBinary64() {
    final int byteOffset = _cursor;
    _advance('binary64', 8);
    return bytes.getFloat64(byteOffset, _blobEndian);
  }

  /// Reads a string; a string value, whose tag is at [valueOffset], is
  /// checked against `maxStringBytes`.
  String _readString({int? valueOffset}) {
    final int length = _readLength('string');
    if (valueOffset != null && length > _limits.maxStringBytes) {
      _limitError(
        CraftLimit.maxStringBytes,
        'The string at offset $valueOffset is longer than '
        '${_limits.maxStringBytes} bytes.',
        valueOffset,
      );
    }
    final int byteOffset = _cursor;
    _advance('string', length);
    final Uint8List raw = bytes.buffer.asUint8List(
      bytes.offsetInBytes + byteOffset,
      length,
    );
    // utf8.decode drops a leading byte order mark, which belongs to the string.
    final bool bom =
        length >= 3 && raw[0] == 0xEF && raw[1] == 0xBB && raw[2] == 0xBF;
    try {
      return '${bom ? '\uFEFF' : ''}${utf8.decode(raw)}';
    } on FormatException {
      _fail(
        BlobErrorKind.invalidUtf8,
        'Invalid UTF-8 in the string at offset $byteOffset.',
        offset: byteOffset,
      );
    }
  }

  /// Skips an extension value, returning [missing]; any other tag fails.
  Object _skipExtension(int tag, int offset) {
    if (!(_isExtensionTag(tag) && _skipsExtensions)) {
      _rejectTag(tag, offset, 'Unrecognized data type', 'blob');
    }
    _advance('extension payload', _readLength('extension payload'));
    return missing;
  }

  /// Fails on a [tag] that the position at [offset] does not accept.
  Never _rejectTag(int tag, int offset, String problem, String context) {
    final String message =
        '$problem 0x${_hexByte(tag)} while decoding $context. '
        'The tag is at offset $offset.';
    if (_isAssignedTag(tag)) {
      _fail(
        BlobErrorKind.unexpectedTag,
        '$message It is not allowed there.',
        offset: offset,
        tag: tag,
      );
    }
    if (_isExtensionTag(tag) && _skipsExtensions) {
      _fail(
        BlobErrorKind.unexpectedTag,
        '$message Extension values cannot be skipped there.',
        offset: offset,
        tag: tag,
      );
    }
    final String range = tag < _firstExtensionTag
        ? 'It is reserved for future core tags; the blob may need a newer '
              'decoder.'
        : _isExtensionTag(tag)
        ? 'Extension tags cannot be skipped in a version-0 blob.'
        : 'It is reserved and never valid.';
    _fail(
      BlobErrorKind.unknownTag,
      '$message $range',
      offset: offset,
      tag: tag,
    );
  }

  List<Object> _readPartList() {
    return List<Object>.generate(_readLength('reference parts'), (int index) {
      final int offset = _cursor;
      final int type = _readByte();
      switch (type) {
        case _msString:
          return _readString();
        case _msInt64:
          return _readInt64();
        default:
          _rejectTag(type, offset, 'Invalid reference type', 'blob');
      }
    });
  }

  /// Reads an untagged map; [dropMissing] leaves out skipped extension values.
  Map<String, Object?>? _readMap(
    Object Function() readNode, {
    bool nullIfEmpty = false,
    bool dropMissing = false,
  }) {
    final int count = _readLength('map');
    if (count == 0 && nullIfEmpty) {
      return null;
    }
    final result = DynamicMap();
    final keys = <String>{};
    for (var index = 0; index < count; index += 1) {
      final int offset = _cursor;
      final String key = _readString();
      if (!keys.add(key)) {
        _fail(
          BlobErrorKind.duplicateKey,
          'Duplicate map key "$key" at offset $offset.',
          offset: offset,
        );
      }
      final Object value = readNode();
      if (!(dropMissing && value == missing)) {
        result[key] = value;
      }
    }
    return result;
  }

  Switch _readSwitch() {
    final Object value = _readArgument();
    final int count = _readLength('switch cases');
    // Keyed by the format's case equality, so cases that it keeps apart are
    // never merged by ==, which also matches 2^53 + 1 with the double 2^53.
    final cases = LinkedHashMap<Object?, Object>(
      equals: _sameCaseKey,
      hashCode: (Object? key) =>
          key is num ? key.toDouble().hashCode : key.hashCode,
    );
    for (var index = 0; index < count; index += 1) {
      final int offset = _cursor;
      final int type = _readByte();
      final Object? key = type == _msDefault
          ? null
          : _node(offset, () => _parseArgument(type, offset));
      if (key != missing && cases.containsKey(key)) {
        _fail(
          BlobErrorKind.duplicateKey,
          'Duplicate switch case ${key ?? 'default'} at offset $offset.',
          offset: offset,
        );
      }
      final Object output = _readArgument();
      // A case keyed by a skipped extension value can never match.
      if (key != missing) {
        cases[key] = output;
      }
    }
    return Switch(value, cases);
  }

  /// Parses a plain value; [data] selects the rules for data (skipped
  /// extension values are left out of lists and maps).
  Object _parseValue(
    int type,
    int offset,
    Object Function() readNode,
    bool data,
  ) {
    switch (type) {
      case _msFalse:
        return false;
      case _msTrue:
        return true;
      case _msInt64:
        return _readInt64();
      case _msBinary64:
        return _readBinary64();
      case _msString:
        return _readString(valueOffset: offset);
      case _msList:
        final int count = _readLength('list');
        final list = DynamicList.empty(growable: true);
        for (var index = 0; index < count; index += 1) {
          final Object value = readNode();
          if (!(data && value == missing)) {
            list.add(value);
          }
        }
        return list;
      case _msMap:
        return _readMap(readNode, dropMissing: data)!;
      default:
        return _skipExtension(type, offset);
    }
  }

  Object _readValue() {
    final int offset = _cursor;
    final int type = _readByte();
    return _node(offset, () => _parseValue(type, offset, _readValue, true));
  }

  Object readRootValue() {
    final int offset = _cursor;
    final Object value = _readValue();
    if (value == missing) {
      final int tag = bytes.getUint8(offset);
      _fail(
        BlobErrorKind.unexpectedTag,
        'The root value at offset $offset is an extension value (tag '
        '0x${_hexByte(tag)}), which cannot be skipped there.',
        offset: offset,
        tag: tag,
      );
    }
    return value;
  }

  Object _parseArgument(int type, int offset) {
    switch (type) {
      case _msLoop:
        return Loop(_readArgument(), _readArgument());
      case _msWidget:
        return _readWidget();
      case _msArgsReference:
        return ArgsReference(_readPartList());
      case _msDataReference:
        return DataReference(_readPartList());
      case _msThemeReference:
        return ThemeReference(_readPartList());
      case _msMediaReference:
        return MediaReference(_readPartList());
      case _msLoopReference:
        return LoopReference(_readInt64(), _readPartList());
      case _msStateReference:
        return StateReference(_readPartList());
      case _msEvent:
        return EventHandler(_readString(), _readMap(_readArgument)!);
      case _msSwitch:
        return _readSwitch();
      case _msSetState:
        return SetStateHandler(
          StateReference(_readPartList()),
          _readArgument(),
        );
      case _msWidgetBuilder:
        return _readWidgetBuilder();
      case _msWidgetBuilderArgReference:
        return WidgetBuilderArgReference(_readString(), _readPartList());
      case _msSymbolReference:
        return SymbolReference(_readString(), _readPartList());
      default:
        return _parseValue(type, offset, _readArgument, false);
    }
  }

  Object _readArgument() {
    final int offset = _cursor;
    final int type = _readByte();
    return _node(offset, () => _parseArgument(type, offset));
  }

  ConstructorCall _readWidget() {
    final String name = _readString();
    return ConstructorCall(name, _readMap(_readArgument)!);
  }

  /// Reads a widget call or a switch: the root of a declaration or the body
  /// of a widget builder, never skippable.
  BlobNode _readWidgetOrSwitch(String context) {
    final int offset = _cursor;
    final int type = _readByte();
    return _node(
      offset,
      () => switch (type) {
        _msWidget => _readWidget(),
        _msSwitch => _readSwitch(),
        _ => _rejectTag(type, offset, 'Unrecognized data type', context),
      },
    );
  }

  WidgetBuilderDeclaration _readWidgetBuilder() {
    final String argumentName = _readString();
    return WidgetBuilderDeclaration(
      argumentName,
      _readWidgetOrSwitch('widget builder blob'),
    );
  }

  WidgetDeclaration _readDeclaration() {
    final String name = _readString();
    // Version 0 has no flags; unknown flag bits are ignored.
    final int flags = _version! >= 1 ? _readInt64() : 0;
    _nodes = 0;
    // A declaration's initial state is a map node, at the offset of its count.
    final DynamicMap? initialState = _node(
      _cursor,
      () => _readMap(_readValue, nullIfEmpty: true, dropMissing: true),
    );
    if (initialState == null) {
      _nodes -= 1;
    }
    return WidgetDeclaration(
      name,
      initialState,
      _readWidgetOrSwitch('widget declaration root'),
      exported: flags & _flagExported != 0,
    );
  }

  List<WidgetDeclaration> _readDeclarationList() {
    final int offset = _cursor;
    final int count = _readLength('declarations');
    if (count > _limits.maxDeclarations) {
      _limitError(
        CraftLimit.maxDeclarations,
        'The library has $count declarations; the limit is '
        '${_limits.maxDeclarations}.',
        offset,
      );
    }
    return List<WidgetDeclaration>.generate(
      count,
      (int index) => _readDeclaration(),
    );
  }

  Import _readImport() {
    return Import(
      LibraryName(
        List<String>.generate(
          _readLength('import name'),
          (int index) => _readString(),
        ),
      ),
    );
  }

  List<Import> _readImportList() {
    return List<Import>.generate(
      _readLength('imports'),
      (int index) => _readImport(),
    );
  }

  RemoteWidgetLibrary readLibrary() {
    return RemoteWidgetLibrary(_readImportList(), _readDeclarationList());
  }

  /// Reads the signature and, for Craft blobs, the version header, after
  /// checking the blob's size.
  void readHeader(List<int> signature, List<int> legacySignature) {
    if (bytes.lengthInBytes > _limits.maxSourceBytes) {
      _limitError(
        CraftLimit.maxSourceBytes,
        'The blob is longer than ${_limits.maxSourceBytes} bytes.',
        _limits.maxSourceBytes,
      );
    }
    final List<int> found = <int>[
      for (var index = 0; index < 4; index += 1) _readByte(),
    ];
    bool matches(List<int> expected) =>
        Iterable<int>.generate(4).every((int i) => found[i] == expected[i]);
    if (matches(legacySignature)) {
      _version = 0;
      return;
    }
    if (!matches(signature)) {
      _fail(
        BlobErrorKind.signature,
        'File signature mismatch. Expected ${_hexBytes(signature)} '
        'or ${_hexBytes(legacySignature)} but found ${_hexBytes(found)}.',
        offset: 0,
      );
    }
    final int version = _readUint16();
    final int minReaderVersion = _readUint16();
    _version = version;
    if (version == 0 || minReaderVersion == 0 || minReaderVersion > version) {
      _fail(
        BlobErrorKind.invalidHeader,
        'Invalid version header: version $version, '
        'minimum reader version $minReaderVersion.',
        offset: 4,
      );
    }
    if (minReaderVersion > blobFormatVersion) {
      _fail(
        BlobErrorKind.unsupportedVersion,
        'The blob needs a decoder for format version $minReaderVersion or '
        'newer.',
        offset: 6,
      );
    }
  }

  void expectFinished(String context) {
    if (_cursor < bytes.lengthInBytes) {
      _fail(
        BlobErrorKind.trailingBytes,
        'Unexpected trailing bytes after $context. '
        '${bytes.lengthInBytes - _cursor} bytes remain at offset $_cursor.',
        offset: _cursor,
      );
    }
  }
}

/// API for encoding binary blobs.
///
/// Binary data blobs can be serialized using [writeValue].
///
/// Binary library blobs can be serialized using [writeLibrary].
///
/// [writeHeader] comes first. The output is in [bytes], and can be cleared
/// manually to reuse the [_BlobEncoder].
class _BlobEncoder {
  _BlobEncoder();

  static final Uint8List _scratchOut = Uint8List(8);
  static final ByteData _scratchIn = _scratchOut.buffer.asByteData(
    _scratchOut.offsetInBytes,
    _scratchOut.lengthInBytes,
  );

  final BytesBuilder bytes =
      BytesBuilder(); // copying builder -- we repeatedly add _scratchOut after changing it

  void _writeUint16(int value) {
    bytes
      ..addByte(value & 0xFF)
      ..addByte(value >> 8);
  }

  void _writeInt64(int value) {
    if (_has64Bits) {
      _scratchIn.setInt64(0, value, _blobEndian);
    } else {
      // We use division rather than bit shifts because >> truncates to 32 bits when compiled to JS:
      // https://dart.dev/guides/language/numbers#bitwise-operations
      if (value >= 0) {
        // dead code on VM target
        _scratchIn.setInt32(0, value, _blobEndian); // dead code on VM target
        _scratchIn.setInt32(
          4,
          value ~/ 0x100000000,
          _blobEndian,
        ); // dead code on VM target
      } else {
        _scratchIn.setInt32(0, value, _blobEndian); // dead code on VM target
        _scratchIn.setInt32(
          4,
          -((-value) ~/ 0x100000000 + 1),
          _blobEndian,
        ); // dead code on VM target
      }
    }
    bytes.add(_scratchOut);
  }

  void _writeString(String value) {
    for (var index = 0; index < value.length; index += 1) {
      final int unit = value.codeUnitAt(index);
      if (unit & 0xFC00 == 0xD800 &&
          index + 1 < value.length &&
          value.codeUnitAt(index + 1) & 0xFC00 == 0xDC00) {
        index += 1;
      } else if (unit & 0xF800 == 0xD800) {
        throw StateError(
          'Unpaired surrogate 0x${unit.toRadixString(16).toUpperCase()} '
          'while encoding blob; it has no UTF-8 encoding.',
        );
      }
    }
    final Uint8List buffer = const Utf8Encoder().convert(value);
    _writeInt64(buffer.length);
    bytes.add(buffer);
  }

  void _writeMap(DynamicMap value, void Function(Object? value) recurse) {
    _writeInt64(value.length);
    value.forEach((String key, Object? value) {
      _writeString(key);
      recurse(value);
    });
  }

  void _writePart(Object? value) {
    if (value is int) {
      bytes.addByte(_msInt64);
      _writeInt64(value);
    } else if (value is String) {
      bytes.addByte(_msString);
      _writeString(value);
    } else {
      throw StateError(
        'Unexpected type ${value.runtimeType} while encoding blob.',
      );
    }
  }

  void _writeValue(Object? value, void Function(Object? value) recurse) {
    if (value == false) {
      bytes.addByte(_msFalse);
    } else if (value == true) {
      bytes.addByte(_msTrue);
    } else if (value is double && value is! int) {
      // When compiled to JS, a Number can be both.
      bytes.addByte(_msBinary64);
      _scratchIn.setFloat64(0, value, _blobEndian);
      bytes.add(_scratchOut);
    } else if (value is DynamicList) {
      bytes.addByte(_msList);
      _writeInt64(value.length);
      value.forEach(recurse);
    } else if (value is DynamicMap) {
      bytes.addByte(_msMap);
      _writeMap(value, recurse);
    } else {
      _writePart(value);
    }
  }

  void writeValue(Object? value) {
    _writeValue(value, writeValue);
  }

  void _writeArgument(Object? value) {
    if (value is Loop) {
      bytes.addByte(_msLoop);
      _writeArgument(value.input);
      _writeArgument(value.output);
    } else if (value is ConstructorCall) {
      bytes.addByte(_msWidget);
      _writeString(value.name);
      _writeMap(value.arguments, _writeArgument);
    } else if (value is WidgetBuilderDeclaration) {
      bytes.addByte(_msWidgetBuilder);
      _writeString(value.argumentName);
      _writeArgument(value.widget);
    } else if (value is ArgsReference) {
      bytes.addByte(_msArgsReference);
      _writeInt64(value.parts.length);
      value.parts.forEach(_writePart);
    } else if (value is DataReference) {
      bytes.addByte(_msDataReference);
      _writeInt64(value.parts.length);
      value.parts.forEach(_writePart);
    } else if (value is ThemeReference) {
      bytes.addByte(_msThemeReference);
      _writeInt64(value.parts.length);
      value.parts.forEach(_writePart);
    } else if (value is MediaReference) {
      bytes.addByte(_msMediaReference);
      _writeInt64(value.parts.length);
      value.parts.forEach(_writePart);
    } else if (value is WidgetBuilderArgReference) {
      bytes.addByte(_msWidgetBuilderArgReference);
      _writeString(value.argumentName);
      _writeInt64(value.parts.length);
      value.parts.forEach(_writePart);
    } else if (value is SymbolReference) {
      bytes.addByte(_msSymbolReference);
      _writeString(value.symbol);
      _writeInt64(value.parts.length);
      value.parts.forEach(_writePart);
    } else if (value is LoopReference) {
      bytes.addByte(_msLoopReference);
      _writeInt64(value.loop);
      _writeInt64(value.parts.length);
      value.parts.forEach(_writePart);
    } else if (value is StateReference) {
      bytes.addByte(_msStateReference);
      _writeInt64(value.parts.length);
      value.parts.forEach(_writePart);
    } else if (value is EventHandler) {
      bytes.addByte(_msEvent);
      _writeString(value.eventName);
      _writeMap(value.eventArguments, _writeArgument);
    } else if (value is Switch) {
      bytes.addByte(_msSwitch);
      _writeArgument(value.input);
      _writeInt64(value.outputs.length);
      value.outputs.forEach((Object? key, Object value) {
        if (key == null) {
          bytes.addByte(_msDefault);
        } else {
          _writeArgument(key);
        }
        _writeArgument(value);
      });
    } else if (value is SetStateHandler) {
      bytes.addByte(_msSetState);
      final reference = value.stateReference as StateReference;
      _writeInt64(reference.parts.length);
      reference.parts.forEach(_writePart);
      _writeArgument(value.value);
    } else if (value is Missing) {
      throw StateError('A missing value has no encoding.');
    } else {
      assert(value is! BlobNode);
      _writeValue(value, _writeArgument);
    }
  }

  void _writeDeclarationList(List<WidgetDeclaration> value) {
    _writeInt64(value.length);
    for (final declaration in value) {
      _writeString(declaration.name);
      _writeInt64(declaration.exported ? _flagExported : 0);
      if (declaration.initialState != null) {
        _writeMap(declaration.initialState!, _writeArgument);
      } else {
        _writeInt64(0);
      }
      _writeArgument(declaration.root);
    }
  }

  void _writeImportList(List<Import> value) {
    _writeInt64(value.length);
    for (final import in value) {
      _writeInt64(import.name.parts.length);
      import.name.parts.forEach(_writeString);
    }
  }

  void writeLibrary(RemoteWidgetLibrary library) {
    _writeImportList(library.imports);
    _writeDeclarationList(library.widgets);
  }

  /// Writes [signature] and the version header: the version and the minimum
  /// reader version, both [blobFormatVersion].
  void writeHeader(List<int> signature) {
    assert(signature.length == 4);
    bytes.add(signature);
    _writeUint16(blobFormatVersion);
    _writeUint16(blobFormatVersion);
  }
}
