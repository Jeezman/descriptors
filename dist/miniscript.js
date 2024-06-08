"use strict";
// Copyright (c) 2023 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.numberEncodeAsm = exports.satisfyMiniscript = exports.miniscript2Script = exports.expandMiniscript = void 0;
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const keyExpressions_1 = require("./keyExpressions");
const RE = __importStar(require("./re"));
const miniscript_1 = require("@bitcoinerlab/miniscript");
/**
 * Expand a miniscript to a generalized form using variables instead of key
 * expressions. Variables will be of this form: @0, @1, ...
 * This is done so that it can be compiled with compileMiniscript and
 * satisfied with satisfier.
 * Also compute pubkeys from descriptors to use them later.
 */
function expandMiniscript({ miniscript, isSegwit, network = bitcoinjs_lib_1.networks.bitcoin, ECPair, BIP32 }) {
    const expansionMap = {};
    const expandedMiniscript = miniscript.replace(RegExp(RE.reKeyExp, 'g'), (keyExpression) => {
        const key = '@' + Object.keys(expansionMap).length;
        expansionMap[key] = (0, keyExpressions_1.parseKeyExpression)({
            keyExpression,
            isSegwit,
            network,
            ECPair,
            BIP32
        });
        return key;
    });
    //Do some assertions. Miniscript must not have duplicate keys, also all
    //keyExpressions must produce a valid pubkey (unless it's ranged and we want
    //to expand a generalized form, then we don't check)
    const pubkeysHex = Object.values(expansionMap)
        .filter(keyInfo => keyInfo.keyExpression.indexOf('*') === -1)
        .map(keyInfo => {
        if (!keyInfo.pubkey)
            throw new Error(`Error: keyExpression ${keyInfo.keyExpression} does not have a pubkey`);
        return keyInfo.pubkey.toString('hex');
    });
    if (new Set(pubkeysHex).size !== pubkeysHex.length) {
        throw new Error(`Error: miniscript ${miniscript} is not sane: contains duplicate public keys.`);
    }
    return { expandedMiniscript, expansionMap };
}
exports.expandMiniscript = expandMiniscript;
/**
 * Particularize an expanded ASM expression using the variables in
 * expansionMap.
 * This is the kind of the opposite to what expandMiniscript does.
 * Signatures and preimages are already subsituted by the satisfier calling
 * this function.
 */
function substituteAsm({ expandedAsm, expansionMap }) {
    //Replace back variables into the pubkeys previously computed.
    let asm = Object.keys(expansionMap).reduce((accAsm, key) => {
        const pubkey = expansionMap[key]?.pubkey;
        if (!pubkey) {
            throw new Error(`Error: invalid expansionMap for ${key}`);
        }
        return accAsm
            .replaceAll(`<${key}>`, `<${pubkey.toString('hex')}>`)
            .replaceAll(`<HASH160(${key})>`, `<${bitcoinjs_lib_1.crypto.hash160(pubkey).toString('hex')}>`);
    }, expandedAsm);
    //Now clean it and prepare it so that fromASM can be called:
    asm = asm
        .trim()
        //Replace one or more consecutive whitespace characters (spaces, tabs,
        //or line breaks) with a single space.
        .replace(/\s+/g, ' ')
        //Now encode numbers to little endian hex. Note that numbers are not
        //enclosed in <>, since <> represents hex code already encoded.
        //The regex below will match one or more digits within a string,
        //except if the sequence is surrounded by "<" and ">"
        .replace(/(<\d+>)|\b\d+\b/g, match => match.startsWith('<') ? match : numberEncodeAsm(Number(match)))
        //we don't have numbers anymore, now it's safe to remove < and > since we
        //know that every remaining is either an op_code or a hex encoded number
        .replace(/[<>]/g, '');
    return asm;
}
function miniscript2Script({ expandedMiniscript, expansionMap }) {
    const compiled = (0, miniscript_1.compileMiniscript)(expandedMiniscript);
    if (compiled.issane !== true) {
        throw new Error(`Error: Miniscript ${expandedMiniscript} is not sane`);
    }
    return bitcoinjs_lib_1.script.fromASM(substituteAsm({ expandedAsm: compiled.asm, expansionMap }));
}
exports.miniscript2Script = miniscript2Script;
/**
 * Assumptions:
 * The attacker does not have access to any of the private keys of public keys
 * that participate in the Script.
 *
 * The attacker only has access to hash preimages that honest users have access
 * to as well.
 *
 * Pass timeConstraints to search for the first solution with this nLockTime and
 * nSequence. Throw if no solution is possible using these constraints.
 *
 * Don't pass timeConstraints (this is the default) if you want to get the
 * smallest size solution altogether.
 *
 * If a solution is not found this function throws.
 */
function satisfyMiniscript({ expandedMiniscript, expansionMap, signatures = [], preimages = [], timeConstraints }) {
    //convert 'sha256(6c...33)' to: { ['<sha256_preimage(6c...33)>']: '10...5f'}
    const preimageMap = {};
    preimages.forEach(preimage => {
        preimageMap['<' + preimage.digest.replace('(', '_preimage(') + '>'] =
            '<' + preimage.preimage + '>';
    });
    //convert the pubkeys in signatures into [{['<sig(@0)>']: '30450221'}, ...]
    //get the keyExpressions: @0, @1 from the keys in expansionMap
    const expandedSignatureMap = {};
    signatures.forEach(signature => {
        const pubkeyHex = signature.pubkey.toString('hex');
        const keyExpression = Object.keys(expansionMap).find(k => expansionMap[k]?.pubkey?.toString('hex') === pubkeyHex);
        expandedSignatureMap['<sig(' + keyExpression + ')>'] =
            '<' + signature.signature.toString('hex') + '>';
    });
    const expandedKnownsMap = { ...preimageMap, ...expandedSignatureMap };
    const knowns = Object.keys(expandedKnownsMap);
    //satisfier verifies again internally whether expandedKnownsMap with given knowns is sane
    const { nonMalleableSats } = (0, miniscript_1.satisfier)(expandedMiniscript, { knowns });
    if (!Array.isArray(nonMalleableSats) || !nonMalleableSats[0])
        throw new Error(`Error: unresolvable miniscript ${expandedMiniscript}`);
    let sat;
    if (!timeConstraints) {
        sat = nonMalleableSats[0];
    }
    else {
        sat = nonMalleableSats.find(nonMalleableSat => nonMalleableSat.nSequence === timeConstraints.nSequence &&
            nonMalleableSat.nLockTime === timeConstraints.nLockTime);
        if (sat === undefined) {
            throw new Error(`Error: unresolvable miniscript ${expandedMiniscript}. Could not find solutions for sequence ${timeConstraints.nSequence} & locktime=${timeConstraints.nLockTime}. Signatures are applied to a hash that depends on sequence and locktime. Did you provide all the signatures wrt the signers keys declared and include all preimages?`);
        }
    }
    //substitute signatures and preimages:
    let expandedAsm = sat.asm;
    //replace in expandedAsm all the <sig(@0)> and <sha256_preimage(6c...33)>
    //to <304...01> and <107...5f> ...
    for (const search in expandedKnownsMap) {
        const replace = expandedKnownsMap[search];
        if (!replace || replace === '<>')
            throw new Error(`Error: invalid expandedKnownsMap`);
        expandedAsm = expandedAsm.replaceAll(search, replace);
    }
    const scriptSatisfaction = bitcoinjs_lib_1.script.fromASM(substituteAsm({ expandedAsm, expansionMap }));
    return {
        scriptSatisfaction,
        nLockTime: sat.nLockTime,
        nSequence: sat.nSequence
    };
}
exports.satisfyMiniscript = satisfyMiniscript;
/**
 *
 * Use this function instead of bitcoinjs-lib's equivalent `script.number.encode`
 * when encoding numbers to be compiled with `fromASM` to avoid problems.
 *
 * Motivation:
 *
 * Numbers in Bitcoin assembly code are represented in hex and in Little Endian.
 * Decimal: 32766 - Big endian: 0x7FFE - Little Endian: 0xFE7F.
 *
 * This function takes an integer and encodes it so that bitcoinjs-lib `fromASM`
 * can compile it. This is basically what bitcoinjs-lib's `script.number.encode`
 * does.
 *
 * Note that `fromASM` already converts integers from 1 to 16 to
 * OP_1 ... OP_16 {@link https://github.com/bitcoinjs/bitcoinjs-lib/blob/59b21162a2c4645c64271ca004c7a3755a3d72fb/src/script.js#L33 here}.
 * This is done in Bitcoin to save some bits.
 *
 * Neither this function nor `script.number.encode` convert numbers to
 * their op code equivalent since this is done later in `fromASM`.
 *
 * Both functions simply convert numbers to Little Endian.
 *
 * However, the `0` number is an edge case that we specially handle with this
 * function.
 *
 * bitcoinjs-lib's `bscript.number.encode(0)` produces an empty Buffer.
 * This is what the Bitcoin interpreter does and it is what `script.number.encode` was
 * implemented to do.
 *
 * The problem is `bscript.number.encode(0).toString('hex')` produces an
 * empty string and thus it should not be used to serialize number zero before `fromASM`.
 *
 * A zero should produce the OP_0 ASM symbolic code (corresponding to a `0` when
 * compiled).
 *
 * So, this function will produce a string in hex format in Little Endian
 * encoding for integers not equal to `0` and it will return `OP_0` for `0`.
 *
 * Read more about the this {@link https://github.com/bitcoinjs/bitcoinjs-lib/issues/1799#issuecomment-1122591738 here}.
 *
 * Use it in combination with `fromASM` like this:
 *
 * ```javascript
 * //To produce "0 1 OP_ADD":
 * fromASM(
 * `${numberEncodeAsm(0)} ${numberEncodeAsm(1)} OP_ADD`
 *   .trim().replace(/\s+/g, ' ')
 * )
 * ```
 *
 * @param {number} number An integer.
 * @returns {string} Returns `"OP_0"` for `number === 0` and a hex string representing other numbers in Little Endian encoding.
 */
function numberEncodeAsm(number) {
    if (Number.isSafeInteger(number) === false) {
        throw new Error(`Error: invalid number ${number}`);
    }
    if (number === 0) {
        return 'OP_0';
    }
    else
        return bitcoinjs_lib_1.script.number.encode(number).toString('hex');
}
exports.numberEncodeAsm = numberEncodeAsm;
