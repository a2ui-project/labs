---
feature_name: binary_format
module_blueprints:
  - craft_engine
dependencies:
  - text_format
  - libraries_and_names
date_added: 2026-11-20
---

# **Binary Format Feature Blueprint**

This document specifies the Craft binary format byte by byte: how a library or a data value is encoded as a blob, how a decoder reads one, and how it fails. It is meant to be enough to write an independent encoder and decoder. A host can author templates in the text format and ship them in this format.

The format extends the RFW 2.0.0 binary format. It adds its own signatures with a version header, declaration flags (which carry `export`, see `libraries_and_names`), tags for theme, media and symbol references (see `text_format`), and ranges of tags reserved for future versions and for extensions that old decoders can skip. RFW blobs still decode.

---

## **Requirements**

In this blueprint a blob is a sequence of bytes and an offset is a 0-based index into it. A decoder turns a blob into a library or a data value, or rejects it with an error (requirement 10). Results are stated in the canonical JSON form of `text_format`.

### **1. Primitive encodings**

- A **uint16** MUST be 2 bytes, an unsigned integer in little-endian order.
- An **int64** MUST be 8 bytes, a two's-complement signed integer in little-endian order. For example, 513 is `01 02 00 00 00 00 00 00` and −1 is eight `FF` bytes.
- A **binary64** MUST be 8 bytes, an IEEE 754 double-precision number in little-endian order. For example, 0.25 is `00 00 00 00 00 00 D0 3F`.
- A **length** or **count** MUST be an int64. A **string** MUST be a length _n_ followed by _n_ bytes of UTF-8. For example, `"Hello"` is `05 00 00 00 00 00 00 00 48 65 6C 6C 6F`.
- A decoder MUST accept exactly the well-formed UTF-8 byte sequences (RFC 3629). It MUST reject overlong forms, encoded surrogates (U+D800–U+DFFF), code points above U+10FFFF and incomplete sequences. A leading byte order mark (`EF BB BF`) is part of the string: it MUST decode to U+FEFF, not be dropped.
- A **tag** MUST be one byte that says what follows (requirement 5).
- A **part list** MUST be a count followed by that many parts, each either tag `02` and an int64 (an integer part) or tag `04` and a string (a string part).

### **2. Blob layout and versions**

- A library blob MUST start with the signature `FE 43 52 46` (`\xFE` and `CRF`), and a data blob with `FE 43 52 44` (`\xFE` and `CRD`). Both MUST be followed by a version header: a uint16 **version** and a uint16 **minimum reader version**. The library (requirement 3) or the data value (requirement 6) follows the header, and nothing follows it.
- A blob with the RFW signature, `FE 52 46 57` for a library and `FE 52 57 44` for data, has no version header: the library or value follows the signature directly. Its version is 0 (requirement 8).
- A decoder MUST reject any other first four bytes with `signature`, including a data signature given to a library decoder and a library signature given to a data decoder.
- The version and the minimum reader version MUST both be at least 1, and the minimum reader version MUST NOT exceed the version; otherwise a decoder MUST reject the blob with `invalidHeader` at offset 4.
- This blueprint specifies format version 1. A decoder for version 1 MUST reject a blob whose minimum reader version is above 1 with `unsupportedVersion` at offset 6, after the `invalidHeader` checks. It MUST decode a blob with a higher version whose minimum reader version is 1 by the rules for version 1.
- So that this works, writers set the minimum reader version to the oldest format version whose decoders read the blob correctly: a later version that adds only extension tags (requirement 7) or declaration flags keeps it at 1, and one that adds a core tag or changes the layout raises it. Encoders for version 1 write 1 for both (requirement 9).

### **3. Libraries**

A library MUST be encoded as:

1. **Imports**: a count, then for each import a count of name parts followed by each part as a string. The library name is the parts joined with `.` (`import a.b;` has the parts `a` and `b`).
2. **Declarations**: a count, then for each declaration:
   1. its name, a string;
   2. in a blob of version 1 or higher, an int64 of **flags**. Bit 0 (the value 1) MUST mean the declaration is exported (`"exported": true` in the canonical form). A decoder MUST ignore every other bit, including the sign bit;
   3. its initial state, as an untagged map (requirement 4) whose values are data values (requirement 6). A count of 0 MUST mean that the declaration has no initial state. An initial state whose entries are all skipped extension values is an empty initial state, `{}`;
   4. its root: tag `09` and a widget call, or tag `0F` and a switch (requirement 5). Any other tag MUST be rejected.

### **4. Maps**

- An **untagged map** MUST be a count followed by that many entries, each a key (a string) and a tagged value. Entries MUST decode in blob order.
- Two entries of one untagged map with the same key MUST be rejected with `duplicateKey` at the offset of the second key, even when either value is a skipped extension value.

### **5. Values**

A **value** MUST be a tag followed by the tag's payload. Where a value is allowed, these tags MUST decode as follows:

| Tag  | Node (canonical form)                        | Payload                                                                                                       |
| ---- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `00` | `false`                                      | none                                                                                                          |
| `01` | `true`                                       | none                                                                                                          |
| `02` | integer (`int`)                              | int64                                                                                                         |
| `03` | double (`double`)                            | binary64                                                                                                      |
| `04` | string                                       | string                                                                                                        |
| `05` | list                                         | a count, then that many values                                                                                |
| `07` | map                                          | the rest of an untagged map: a count, then that many entries                                                  |
| `08` | loop (`loop`)                                | the input value, then the output value                                                                        |
| `09` | widget call (`call`)                         | the name (a string, qualified names included), then the arguments as an untagged map                          |
| `0A` | `args` reference (`argsRef`)                 | a part list                                                                                                   |
| `0B` | `data` reference (`dataRef`)                 | a part list                                                                                                   |
| `0C` | loop reference (`loopRef`)                   | the loop index as an int64, then a part list                                                                  |
| `0D` | `state` reference (`stateRef`)               | a part list                                                                                                   |
| `0E` | event handler (`event`)                      | the event name (a string), then the arguments as an untagged map                                              |
| `0F` | switch (`switch`)                            | the input value, a count, then that many cases: a key (tag `10` for the default case, or a value) and a value |
| `11` | state setter (`setState`)                    | the part list of the target state reference, then the value                                                   |
| `12` | widget builder (`builder`)                   | the argument name (a string), then the body: tag `09` and a widget call, or tag `0F` and a switch             |
| `13` | builder argument reference (`builderArgRef`) | the argument name (a string), then a part list                                                                |
| `14` | `theme` reference (`themeRef`)               | a part list                                                                                                   |
| `15` | `media` reference (`mediaRef`)               | a part list                                                                                                   |
| `16` | symbol reference (`symbolRef`)               | the symbol (a string, qualified symbols included), then a part list                                           |

Tags `00`–`16` except `06` are the **core tags**. Tags `00`–`13` are RFW 2.0.0's, with the same payloads; `14`–`16` are Craft's.

- Tag `10` MUST be accepted only as a switch case key, where it marks the default case and has no payload. Anywhere else it MUST be rejected with `unexpectedTag`.
- A decoder MUST NOT validate a loop index; it is any int64.
- Cases MUST decode in blob order. A switch with two default cases, or with a case whose key equals an earlier case's key, MUST be rejected with `duplicateKey` at the offset of the later key's tag, before that case's value is read. Two keys are equal when both are booleans with the same value; both strings with the same characters; both integers with the same value; both doubles that compare equal (so 0.0 equals −0.0, and NaN equals nothing); an integer and a double whose value is exactly that integer (so 1 equals 1.0, and 2⁵³+1 does not equal the double 2⁵³, although it rounds to it); or both symbol references with the same symbol and the same parts, where an integer part never equals a string part (`A.1` and `A."1"` are distinct). No other keys are ever equal: lists, maps, widget calls and all other references are distinct even when they are encoded the same way.
- Where a value position accepts only some tags (a part, a declaration root, a builder body, a data value), a core tag outside that set MUST be rejected with `unexpectedTag`.

### **6. Data values and data blobs**

A **data value** is a value restricted to the tags `00`–`05` and `07`, whose list elements and map values are data values in turn. A data blob holds one data value, and the values of an initial state are data values.

- Any other core tag in a data value MUST be rejected with `unexpectedTag`.
- A skipped extension value (requirement 7) inside a data value MUST be left out: an element is removed from its list, and an entry from its map.
- An extension value as the root of a data blob MUST be rejected with `unexpectedTag` at the offset of its tag, after its payload has been read.
- A data blob decodes to the canonical form of its value, as a data file does in `text_format`.

### **7. Tag ranges and extensions**

The 256 tag values MUST be divided into ranges:

| Tags      | Range            | In a blob of version 1 or higher             |
| --------- | ---------------- | -------------------------------------------- |
| `00`–`16` | core tags        | as in requirement 5 (`06` is never assigned) |
| `06`      | unassigned       | `unknownTag`                                 |
| `17`–`7F` | future core tags | `unknownTag`                                 |
| `80`–`EF` | extension tags   | skipped where a value is allowed             |
| `F0`–`FF` | reserved         | `unknownTag`, never valid                    |

- An **extension value** MUST be an extension tag followed by a length _n_ and _n_ payload bytes, so that a decoder that does not know the tag can step over it. Version 1 assigns no extension tags: a version 1 decoder skips them all.
- In a blob of version 1 or higher, an extension value where a value is allowed MUST decode as missing (`{"$": "missing"}`). In a list or map of a library it keeps its place, so the indices of later elements don't change. As a switch case key it MUST remove that case (whose value is still decoded), because the case can never match. In data values it is left out (requirement 6).
- An extension value MUST NOT be skipped where only some tags are accepted (a part, a declaration root or a builder body): there it MUST be rejected with `unexpectedTag`.
- In a blob of version 0, an extension tag MUST be rejected with `unknownTag`, like any tag that is not a core tag.

### **8. RFW blobs**

A blob with an RFW signature is version 0.

- A version 0 blob MUST be decoded like a version 1 blob, except that library declarations have no flags field (and so are never exported) and extension tags are rejected.
- A version 0 blob MAY use the Craft core tags `14`–`16`, which RFW 2.0.0 rejects: Craft encoders wrote them under the RFW signature before the version header existed.
- A blob with an RFW signature that RFW 2.0.0 decodes MUST decode to the same library or value, with two differences from RFW 2.0.0's decoder: a repeated map key or switch case MUST be rejected with `duplicateKey` (requirements 4 and 5), where RFW keeps the later value; and a leading byte order mark MUST stay in its string (requirement 1), where RFW drops it.

### **9. Encoders**

An encoder MUST encode every library that the text format accepts and every data value that a data file holds, except one that holds a string with an unpaired surrogate (requirement 1 has no encoding for it; a `\u` escape in the text format can produce one). It MUST produce exactly these bytes:

- The Craft signature for its kind of blob, then version 1 and minimum reader version 1.
- For a library: the imports in order; the declarations in order, each with flags 1 if it is exported and 0 otherwise, its initial state's entries in order (a count of 0 when it has no initial state or an empty one), and its root.
- Values with the tags of requirement 5. An integer MUST be written with tag `02` and a double with tag `03`, also when its value is a whole number (`1.0`). Map entries, list elements and switch cases MUST be written in order, the default case with tag `10`.
- An encoder MUST NOT write tag `06`, extension tags or reserved tags.

An encoder MUST reject a library or value that holds a string with an unpaired surrogate, or a missing value (which has no encoding). It MAY reject, or encode in a way that does not decode, a library that the text format cannot produce (for example a widget builder whose body is a reference).

### **10. Errors**

A decoder reads a blob from front to back and MUST stop at the first error, reporting its **kind** and the **offset** below. Once it has read the whole version header, or an RFW signature (version 0), it MUST also report the blob's version, and for `unknownTag` and `unexpectedTag` the tag. For `invalidHeader` and `unsupportedVersion` the reported version is the header's version field as read, even when it is invalid (0 for a header whose version is 0).

| Kind                 | When                                                                                       | Offset                                   |
| -------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `signature`          | the first four bytes are not a signature for the expected kind of blob                     | 0                                        |
| `invalidHeader`      | requirement 2                                                                              | 4                                        |
| `unsupportedVersion` | requirement 2                                                                              | 6                                        |
| `truncated`          | a tag, uint16, int64 or binary64 extends beyond the end of the blob                        | the start of that field                  |
| `truncated`          | a length or count is larger than the number of bytes after it                              | the length or count                      |
| `invalidLength`      | a length or count is negative                                                              | the length or count                      |
| `invalidUtf8`        | a string's bytes are not well-formed UTF-8                                                 | the first byte after the string's length |
| `unknownTag`         | a tag outside the core and extension ranges, or an extension tag in a blob of version 0    | the tag                                  |
| `unexpectedTag`      | a core tag, or an extension tag in a blob of version 1 or higher, where it is not accepted | the tag                                  |
| `duplicateKey`       | requirements 4 and 5                                                                       | the repeated key                         |
| `trailingBytes`      | bytes remain after the library or the data value                                           | the first remaining byte                 |

- A blob shorter than four bytes MUST be rejected with `truncated` at the offset equal to its length, because the signature is read one byte at a time.
- The lengths and counts are those of strings, extension payloads, lists, maps, switch cases, part lists, imports, import name parts and declarations. Flags, loop indexes and integer values are not lengths.
- A length or count MUST be checked when it is read: negative first (`invalidLength`), then larger than the bytes after it (`truncated`). Every element takes at least one byte, so a decoder never needs to allocate more than the blob's size.

### **11. Round trip**

- For every library that an encoder encodes (requirement 9), decoding the encoded library MUST give the same canonical JSON form as the parsed library, with one exception: a declaration with an empty initial state (`widget A {} = ...`) decodes with no initial state, because both encode as a count of 0. Information outside the canonical form, such as source locations, comments and formatting, is not kept.
- For every data file that an encoder encodes, decoding the encoded data value MUST give the same canonical form as the parsed data file.
- Encoding a decoded blob that an encoder produced MUST give the same bytes.

---

## **Detailed Description of Changes**

This library:

```craft
import core;

export widget Hello = Text(text: theme.greeting);
```

encodes as follows (offsets on the left, in decimal):

```none
  0  FE 43 52 46                library signature
  4  01 00                      version 1
  6  01 00                      minimum reader version 1
  8  01 00 00 00 00 00 00 00    1 import
 16  01 00 00 00 00 00 00 00      with 1 name part
 24  04 00 00 00 00 00 00 00      "core"
 32  63 6F 72 65
 36  01 00 00 00 00 00 00 00    1 declaration
 44  05 00 00 00 00 00 00 00      name "Hello"
 52  48 65 6C 6C 6F
 57  01 00 00 00 00 00 00 00      flags: exported
 65  00 00 00 00 00 00 00 00      no initial state
 73  09                           root: widget call
 74  04 00 00 00 00 00 00 00        name "Text"
 82  54 65 78 74
 86  01 00 00 00 00 00 00 00        1 argument
 94  04 00 00 00 00 00 00 00          key "text"
102  74 65 78 74
106  14                               theme reference
107  01 00 00 00 00 00 00 00            1 part
115  04                                 string part
116  08 00 00 00 00 00 00 00            "greeting"
124  67 72 65 65 74 69 6E 67
```

Compared with RFW 2.0.0:

- **Signatures and versions.** RFW blobs have no version, so a decoder cannot tell a newer blob from a corrupt one. Craft blobs carry a version and the minimum version a decoder needs. A decoder reads anything whose minimum reader version it supports and rejects the rest up front with `unsupportedVersion`.
- **Declaration flags.** The flags field carries `export`; new flags can be added without a new minimum reader version, because decoders ignore unknown bits.
- **Craft tags.** `14`–`16` encode the references that `text_format` adds.
- **Extensions.** A later version can add a node kind in the extension range. Old decoders skip it as missing, so a template that uses it still loads and degrades where it is used, instead of failing as a whole.
- **Errors.** Each error has a kind and an offset, which conformance cases pin. Every length is checked before anything is allocated, and repeated keys are rejected instead of silently replacing earlier ones.

---

## **Links**

- RFW 2.0.0 binary format: `craft/third_party/rfw/lib/src/dart/binary.dart`.
- Canonical JSON form: [text_format](text_format.blueprint.md). The `export` keyword: [libraries_and_names](libraries_and_names.blueprint.md).
- Module blueprint: [craft_engine](../modules/craft_engine.blueprint.md).

---

## **Test Cases & Conformance**

The shared cases are in `craft/conformance/binary_format.yaml`. A decoder case gives a blob in hex and either the expected canonical JSON form or the expected error (kind, offset, version and, for tag errors, the tag). An encoder case gives a source and either the exact blob or a rejection. For an exact blob, the runner also decodes it and compares the result with the parsed source (requirement 11), then encodes the decoded result and expects the same bytes, which also checks that entries and cases decode in blob order. An engine MUST pass every case:

- **Primitive encodings**: integers, including one that needs more than 32 bits; the smallest and largest int64; doubles, including a whole number that stays a double; two-, three- and four-byte UTF-8; a byte order mark is kept; an encoded surrogate, an overlong form and a code point above U+10FFFF are rejected; a double as a part is rejected.
- **Blob layout and versions**: a library and a data value at version 1; a higher version with minimum reader version 1 decodes, for a library and for data; a minimum reader version above 1 is rejected, for a library and for data; version 0, minimum reader version 0, and a minimum reader version above the version are rejected; an unknown signature, and the Craft and RFW signatures of the other kind of blob, are rejected by both decoders.
- **Libraries**: dotted imports; an exported declaration; unknown flag bits, including the sign bit, are ignored; exported and private declarations encoded; initial state; a switch as a declaration root; an extension value and a reference as a declaration root are rejected; a reference in an initial state is rejected.
- **Maps**: a repeated argument key is rejected, and a control case with distinct keys decodes; a repeated key in a data map is rejected even when the first value is a skipped extension value; a repeated key is reported before its invalid value.
- **Values**: literals; a list and a map; a loop and a loop reference; `args`, `data` and `state` references with string and integer parts; an event handler; a switch with a default case as a value; a state setter; a widget builder and its argument reference; theme, media and qualified symbol references encoded, and the three Craft tags decoded; tag `06` and tag `10` outside a switch are rejected; a widget builder whose body is a reference is rejected; repeated switch cases: two default cases, `1` and `1.0`, two equal strings, two `true` keys, `0.0` and `-0.0`, the integer 2⁵³ and the double 2⁵³, and two equal symbol references, with control cases where `1` and `2`, the integers 2⁵³+1 and 2⁵³, the integer 2⁵³+1 and the double 2⁵³, two NaN keys, two equal lists, two equal `args` references, and symbol references `A.1` and `A."1"` are distinct; a loop index is not validated.
- **Data values and data blobs**: a data file encoded; a widget call in a data blob is rejected; skipped extension values are left out of data maps and lists; an extension value as the root is rejected; an initial state leaves out a skipped extension value, and one whose entries are all skipped is empty.
- **Tag ranges and extensions**: extension values at both ends of the range are skipped, as an argument (`80`) and as a list element (`EF`); a switch case keyed by an extension value is removed; the first and last future core tags and reserved tags are rejected; an extension value as a reference part and as a builder body is rejected.
- **RFW blobs**: a library and a data value with the RFW signature; an extension tag in a version 0 blob is rejected; the minimal and all-nodes libraries as Craft wrote them under the RFW signature, including Craft tags, decode to their sources.
- **Encoders**: a string with an unpaired surrogate is rejected; the minimal and the all-nodes library encode to their exact blobs; every encoder case of the other requirements pins exact bytes too.
- **Errors**: a blob shorter than a signature; a truncated header; a string and a double that run past the end; trailing bytes after a library and after a data value; a negative length; a count beyond the end; invalid UTF-8; an extension payload beyond the end.
- **Round trip**: an empty initial state decodes as none; every other encoder case round-trips.

In addition, the engine's tests include RFW 2.0.0's binary tests, adapted to run outside Flutter and to the Craft signatures, version header and declaration flags (the test file lists each change), and unit tests for what the shared cases can't state: an encoder rejects a missing value, which no source produces, and a decoded switch keeps the integer 2⁵³+1 and the double 2⁵³ as two cases that lookups tell apart.

---

## **Implementation Steps**

1. Fork RFW's binary encoder and decoder and add the theme, media and symbol reference tags.
2. Write and read the Craft signatures, the version header and the declaration flags; decode RFW signatures as version 0.
3. Classify tags by range: skip extension values where values are allowed, and reject the rest.
4. Report every error with its kind and offset; check lengths before allocating; reject repeated keys.
5. Run the conformance cases and RFW's binary tests.
