"use strict";
// Copyright (c) 2023 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license
Object.defineProperty(exports, "__esModule", { value: true });
exports.reWshMiniscriptAnchored = exports.reShWshMiniscriptAnchored = exports.reShMiniscriptAnchored = exports.rePtrAnchored = exports.reShWpkhAnchored = exports.reWpkhAnchored = exports.rePkhAnchored = exports.reAddrAnchored = exports.rePkAnchored = exports.anchorStartAndEnd = exports.reKeyExp = exports.reXprvKey = exports.reXpubKey = exports.rePath = exports.reXprv = exports.reXpub = exports.reWIF = exports.rePubKey = exports.reChecksum = exports.reOrigin = exports.reMasterFingerprint = exports.reOriginPath = void 0;
const checksum_1 = require("./checksum");
//Regular expressions cheat sheet:
//https://www.keycdn.com/support/regex-cheat-sheet
//hardened characters
const reHardened = String.raw `(['hH])`;
//a level is a series of integers followed (optional) by a hardener char
const reLevel = String.raw `(\d+${reHardened}?)`;
//a path component is a level followed by a slash "/" char
const rePathComponent = String.raw `(${reLevel}\/)`;
//A path formed by a series of path components that can be hardened: /2'/23H/23
exports.reOriginPath = String.raw `(\/${rePathComponent}*${reLevel})`; //The "*" means: "match 0 or more of the previous"
//an origin is something like this: [d34db33f/44'/0'/0'] where the path is optional. The fingerPrint is 8 chars hex
exports.reMasterFingerprint = String.raw `[0-9a-fA-F]{8}`;
exports.reOrigin = String.raw `(\[${exports.reMasterFingerprint}(${exports.reOriginPath})?\])`;
exports.reChecksum = String.raw `(#[${checksum_1.CHECKSUM_CHARSET}]{8})`;
//Something like this: 0252972572d465d016d4c501887b8df303eee3ed602c056b1eb09260dfa0da0ab2
//as explained here: github.com/bitcoin/bitcoin/blob/master/doc/descriptors.md#reference
const reCompressedPubKey = String.raw `((02|03)[0-9a-fA-F]{64})`;
const reUncompressedPubKey = String.raw `(04[0-9a-fA-F]{128})`;
exports.rePubKey = String.raw `(${reCompressedPubKey}|${reUncompressedPubKey})`;
//https://learnmeabitcoin.com/technical/wif
//5, K, L for mainnet, 5: uncompressed, {K, L}: compressed
//c, 9, testnet, c: compressed, 9: uncompressed
exports.reWIF = String.raw `([5KLc9][1-9A-HJ-NP-Za-km-z]{50,51})`;
//x for mainnet, t for testnet
exports.reXpub = String.raw `([xXtT]pub[1-9A-HJ-NP-Za-km-z]{79,108})`;
exports.reXprv = String.raw `([xXtT]prv[1-9A-HJ-NP-Za-km-z]{79,108})`;
//reRangeLevel is like reLevel but using a wildcard "*"
const reRangeLevel = String.raw `(\*(${reHardened})?)`;
//A path can be finished with stuff like this: /23 or /23h or /* or /*'
exports.rePath = String.raw `(\/(${rePathComponent})*(${reRangeLevel}|${reLevel}))`;
//rePath is optional (note the "zero"): Followed by zero or more /NUM or /NUM' path elements to indicate unhardened or hardened derivation steps between the fingerprint and the key or xpub/xprv root that follows
exports.reXpubKey = String.raw `(${exports.reXpub})(${exports.rePath})?`;
exports.reXprvKey = String.raw `(${exports.reXprv})(${exports.rePath})?`;
//actualKey is the keyExpression without optional origin
const reActualKey = String.raw `(${exports.reXpubKey}|${exports.reXprvKey}|${exports.rePubKey}|${exports.reWIF})`;
//reOrigin is optional: Optionally, key origin information, consisting of:
//Matches a key expression: wif, xpub, xprv or pubkey:
exports.reKeyExp = String.raw `(${exports.reOrigin})?(${reActualKey})`;
const rePk = String.raw `pk\((.*?)\)`; //Matches anything. We assert later in the code that the pubkey is valid.
const reAddr = String.raw `addr\((.*?)\)`; //Matches anything. We assert later in the code that the address is valid.
const rePkh = String.raw `pkh\(${exports.reKeyExp}\)`;
const reWpkh = String.raw `wpkh\(${exports.reKeyExp}\)`;
const reShWpkh = String.raw `sh\(wpkh\(${exports.reKeyExp}\)\)`;
const rePtr = String.raw `tr\(${exports.reKeyExp}\)`;
const reMiniscript = String.raw `(.*?)`; //Matches anything. We assert later in the code that miniscripts are valid and sane.
//RegExp makers:
const makeReSh = (re) => String.raw `sh\(${re}\)`;
const makeReWsh = (re) => String.raw `wsh\(${re}\)`;
const makeReShWsh = (re) => makeReSh(makeReWsh(re));
const anchorStartAndEnd = (re) => String.raw `^${re}$`; //starts and finishes like re (not composable)
exports.anchorStartAndEnd = anchorStartAndEnd;
const composeChecksum = (re) => String.raw `${re}(${exports.reChecksum})?`; //it's optional (note the "?")
exports.rePkAnchored = (0, exports.anchorStartAndEnd)(composeChecksum(rePk));
exports.reAddrAnchored = (0, exports.anchorStartAndEnd)(composeChecksum(reAddr));
exports.rePkhAnchored = (0, exports.anchorStartAndEnd)(composeChecksum(rePkh));
exports.reWpkhAnchored = (0, exports.anchorStartAndEnd)(composeChecksum(reWpkh));
exports.reShWpkhAnchored = (0, exports.anchorStartAndEnd)(composeChecksum(reShWpkh));
exports.rePtrAnchored = (0, exports.anchorStartAndEnd)(composeChecksum(rePtr));
exports.reShMiniscriptAnchored = (0, exports.anchorStartAndEnd)(composeChecksum(makeReSh(reMiniscript)));
exports.reShWshMiniscriptAnchored = (0, exports.anchorStartAndEnd)(composeChecksum(makeReShWsh(reMiniscript)));
exports.reWshMiniscriptAnchored = (0, exports.anchorStartAndEnd)(composeChecksum(makeReWsh(reMiniscript)));
