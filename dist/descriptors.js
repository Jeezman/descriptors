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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DescriptorsFactory = void 0;
const lodash_memoize_1 = __importDefault(require("lodash.memoize"));
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const varuint_bitcoin_1 = require("varuint-bitcoin");
const { p2sh, p2wpkh, p2pkh, p2pk, p2wsh, p2tr } = bitcoinjs_lib_1.payments;
const bip32_1 = require("bip32");
const ecpair_1 = require("ecpair");
const psbt_1 = require("./psbt");
const checksum_1 = require("./checksum");
const keyExpressions_1 = require("./keyExpressions");
const RE = __importStar(require("./re"));
const miniscript_1 = require("./miniscript");
//See "Resource limitations" https://bitcoin.sipa.be/miniscript/
//https://lists.linuxfoundation.org/pipermail/bitcoin-dev/2019-September/017306.html
const MAX_SCRIPT_ELEMENT_SIZE = 520;
const MAX_STANDARD_P2WSH_SCRIPT_SIZE = 3600;
const MAX_OPS_PER_SCRIPT = 201;
function countNonPushOnlyOPs(script) {
    const decompile = bitcoinjs_lib_1.script.decompile(script);
    if (!decompile)
        throw new Error(`Error: cound not decompile ${script}`);
    return decompile.filter(op => typeof op === 'number' && op > bitcoinjs_lib_1.script.OPS['OP_16']).length;
}
function vectorSize(someVector) {
    const length = someVector.length;
    return ((0, varuint_bitcoin_1.encodingLength)(length) +
        someVector.reduce((sum, witness) => {
            return sum + varSliceSize(witness);
        }, 0));
}
function varSliceSize(someScript) {
    const length = someScript.length;
    return (0, varuint_bitcoin_1.encodingLength)(length) + length;
}
/**
 * This function will typically return 73; since it assumes a signature size of
 * 72 bytes (this is the max size of a DER encoded signature) and it adds 1
 * extra byte for encoding its length
 */
function signatureSize(signature) {
    const length = signature === 'DANGEROUSLY_USE_FAKE_SIGNATURES'
        ? 72
        : signature.signature.length;
    return (0, varuint_bitcoin_1.encodingLength)(length) + length;
}
/*
 * Returns a bare descriptor without checksum and particularized for a certain
 * index (if desc was a range descriptor)
 * @hidden
 */
function evaluate({ descriptor, checksumRequired, index }) {
    if (!descriptor)
        throw new Error('You must provide a descriptor.');
    const mChecksum = descriptor.match(String.raw `(${RE.reChecksum})$`);
    if (mChecksum === null && checksumRequired === true)
        throw new Error(`Error: descriptor ${descriptor} has not checksum`);
    //evaluatedDescriptor: a bare desc without checksum and particularized for a certain
    //index (if desc was a range descriptor)
    let evaluatedDescriptor = descriptor;
    if (mChecksum !== null) {
        const checksum = mChecksum[0].substring(1); //remove the leading #
        evaluatedDescriptor = descriptor.substring(0, descriptor.length - mChecksum[0].length);
        if (checksum !== (0, checksum_1.DescriptorChecksum)(evaluatedDescriptor)) {
            throw new Error(`Error: invalid descriptor checksum for ${descriptor}`);
        }
    }
    if (index !== undefined) {
        const mWildcard = evaluatedDescriptor.match(/\*/g);
        if (mWildcard && mWildcard.length > 0) {
            //From  https://github.com/bitcoin/bitcoin/blob/master/doc/descriptors.md
            //To prevent a combinatorial explosion of the search space, if more than
            //one of the multi() key arguments is a BIP32 wildcard path ending in /* or
            //*', the multi() descriptor only matches multisig scripts with the ith
            //child key from each wildcard path in lockstep, rather than scripts with
            //any combination of child keys from each wildcard path.
            //We extend this reasoning for musig for all cases
            evaluatedDescriptor = evaluatedDescriptor.replaceAll('*', index.toString());
        }
        else
            throw new Error(`Error: index passed for non-ranged descriptor: ${descriptor}`);
    }
    return evaluatedDescriptor;
}
/**
 * Constructs the necessary functions and classes for working with descriptors
 * using an external elliptic curve (ecc) library.
 *
 * Notably, it returns the {@link _Internal_.Output | `Output`} class, which
 * provides methods to create, sign, and finalize PSBTs based on descriptor
 * expressions.
 *
 * While this Factory function includes the `Descriptor` class, note that
 * this class was deprecated in v2.0 in favor of `Output`. For backward
 * compatibility, the `Descriptor` class remains, but using `Output` is advised.
 *
 * The Factory also returns utility methods like `expand` (detailed below)
 * and `parseKeyExpression` (see {@link ParseKeyExpression}).
 *
 * Additionally, for convenience, the function returns `BIP32` and `ECPair`.
 * These are {@link https://github.com/bitcoinjs bitcoinjs-lib} classes designed
 * for managing {@link https://github.com/bitcoinjs/bip32 | `BIP32`} keys and
 * public/private key pairs:
 * {@link https://github.com/bitcoinjs/ecpair | `ECPair`}, respectively.
 *
 * @param {Object} ecc - An object with elliptic curve operations, such as
 * [tiny-secp256k1](https://github.com/bitcoinjs/tiny-secp256k1) or
 * [@bitcoinerlab/secp256k1](https://github.com/bitcoinerlab/secp256k1).
 */
function DescriptorsFactory(ecc) {
    var _Output_instances, _Output_payment, _Output_preimages, _Output_signersPubKeys, _Output_miniscript, _Output_witnessScript, _Output_redeemScript, _Output_isSegwit, _Output_expandedExpression, _Output_expandedMiniscript, _Output_expansionMap, _Output_network, _Output_getTimeConstraints, _Output_assertPsbtInput;
    const BIP32 = (0, bip32_1.BIP32Factory)(ecc);
    const ECPair = (0, ecpair_1.ECPairFactory)(ecc);
    const signatureValidator = (pubkey, msghash, signature) => ECPair.fromPublicKey(pubkey).verify(msghash, signature);
    /**
     * Takes a string key expression (xpub, xprv, pubkey or wif) and parses it
     */
    const parseKeyExpression = ({ keyExpression, isSegwit, network = bitcoinjs_lib_1.networks.bitcoin }) => {
        return (0, keyExpressions_1.parseKeyExpression)({
            keyExpression,
            network,
            ...(typeof isSegwit === 'boolean' ? { isSegwit } : {}),
            ECPair,
            BIP32
        });
    };
    /**
     * @hidden
     * To be removed in v3.0 and replaced by the version with the signature that
     * does not accept descriptors
     */
    function expand({ descriptor, expression, index, checksumRequired = false, network = bitcoinjs_lib_1.networks.bitcoin, allowMiniscriptInP2SH = false }) {
        if (descriptor && expression)
            throw new Error(`expression param has been deprecated`);
        descriptor = descriptor || expression;
        if (!descriptor)
            throw new Error(`descriptor not provided`);
        let expandedExpression;
        let miniscript;
        let expansionMap;
        let isSegwit;
        let expandedMiniscript;
        let payment;
        let witnessScript;
        let redeemScript;
        const isRanged = descriptor.indexOf('*') !== -1;
        if (index !== undefined)
            if (!Number.isInteger(index) || index < 0)
                throw new Error(`Error: invalid index ${index}`);
        //Verify and remove checksum (if exists) and
        //particularize range descriptor for index (if desc is range descriptor)
        const canonicalExpression = evaluate({
            descriptor,
            ...(index !== undefined ? { index } : {}),
            checksumRequired
        });
        const isCanonicalRanged = canonicalExpression.indexOf('*') !== -1;
        //addr(ADDR)
        if (canonicalExpression.match(RE.reAddrAnchored)) {
            if (isRanged)
                throw new Error(`Error: addr() cannot be ranged`);
            const matchedAddress = canonicalExpression.match(RE.reAddrAnchored)?.[1]; //[1]-> whatever is found addr(->HERE<-)
            if (!matchedAddress)
                throw new Error(`Error: could not get an address in ${descriptor}`);
            let output;
            try {
                output = bitcoinjs_lib_1.address.toOutputScript(matchedAddress, network);
            }
            catch (e) {
                throw new Error(`Error: invalid address ${matchedAddress}`);
            }
            try {
                payment = p2pkh({ output, network });
                isSegwit = false;
            }
            catch (e) { }
            try {
                payment = p2sh({ output, network });
                // It assumes that an addr(SH_ADDRESS) is always a add(SH_WPKH) address
                isSegwit = true;
            }
            catch (e) { }
            try {
                payment = p2wpkh({ output, network });
                isSegwit = true;
            }
            catch (e) { }
            try {
                payment = p2wsh({ output, network });
                isSegwit = true;
            }
            catch (e) { }
            try {
                payment = p2tr({ output, network });
                isSegwit = true;
            }
            catch (e) { }
            if (!payment) {
                throw new Error(`Error: invalid address ${matchedAddress}`);
            }
        }
        //pk(KEY)
        else if (canonicalExpression.match(RE.rePkAnchored)) {
            isSegwit = false;
            const keyExpression = canonicalExpression.match(RE.reKeyExp)?.[0];
            if (!keyExpression)
                throw new Error(`Error: keyExpression could not me extracted`);
            if (canonicalExpression !== `pk(${keyExpression})`)
                throw new Error(`Error: invalid expression ${descriptor}`);
            expandedExpression = 'pk(@0)';
            const pKE = parseKeyExpression({ keyExpression, network, isSegwit });
            expansionMap = { '@0': pKE };
            if (!isCanonicalRanged) {
                const pubkey = pKE.pubkey;
                //Note there exists no address for p2pk, but we can still use the script
                if (!pubkey)
                    throw new Error(`Error: could not extract a pubkey from ${descriptor}`);
                payment = p2pk({ pubkey, network });
            }
        }
        //pkh(KEY) - legacy
        else if (canonicalExpression.match(RE.rePkhAnchored)) {
            isSegwit = false;
            const keyExpression = canonicalExpression.match(RE.reKeyExp)?.[0];
            if (!keyExpression)
                throw new Error(`Error: keyExpression could not me extracted`);
            if (canonicalExpression !== `pkh(${keyExpression})`)
                throw new Error(`Error: invalid expression ${descriptor}`);
            expandedExpression = 'pkh(@0)';
            const pKE = parseKeyExpression({ keyExpression, network, isSegwit });
            expansionMap = { '@0': pKE };
            if (!isCanonicalRanged) {
                const pubkey = pKE.pubkey;
                if (!pubkey)
                    throw new Error(`Error: could not extract a pubkey from ${descriptor}`);
                payment = p2pkh({ pubkey, network });
            }
        }
        //sh(wpkh(KEY)) - nested segwit
        else if (canonicalExpression.match(RE.reShWpkhAnchored)) {
            isSegwit = true;
            const keyExpression = canonicalExpression.match(RE.reKeyExp)?.[0];
            if (!keyExpression)
                throw new Error(`Error: keyExpression could not me extracted`);
            if (canonicalExpression !== `sh(wpkh(${keyExpression}))`)
                throw new Error(`Error: invalid expression ${descriptor}`);
            expandedExpression = 'sh(wpkh(@0))';
            const pKE = parseKeyExpression({ keyExpression, network, isSegwit });
            expansionMap = { '@0': pKE };
            if (!isCanonicalRanged) {
                const pubkey = pKE.pubkey;
                if (!pubkey)
                    throw new Error(`Error: could not extract a pubkey from ${descriptor}`);
                payment = p2sh({ redeem: p2wpkh({ pubkey, network }), network });
                redeemScript = payment.redeem?.output;
                if (!redeemScript)
                    throw new Error(`Error: could not calculate redeemScript for ${descriptor}`);
            }
        }
        //wpkh(KEY) - native segwit
        else if (canonicalExpression.match(RE.reWpkhAnchored)) {
            isSegwit = true;
            const keyExpression = canonicalExpression.match(RE.reKeyExp)?.[0];
            if (!keyExpression)
                throw new Error(`Error: keyExpression could not me extracted`);
            if (canonicalExpression !== `wpkh(${keyExpression})`)
                throw new Error(`Error: invalid expression ${descriptor}`);
            expandedExpression = 'wpkh(@0)';
            const pKE = parseKeyExpression({ keyExpression, network, isSegwit });
            expansionMap = { '@0': pKE };
            if (!isCanonicalRanged) {
                const pubkey = pKE.pubkey;
                if (!pubkey)
                    throw new Error(`Error: could not extract a pubkey from ${descriptor}`);
                payment = p2wpkh({ pubkey, network });
            }
        }
        //tr(KEY) - taproot
        else if (canonicalExpression.match(RE.rePtrAnchored)) {
            isSegwit = true;
            const keyExpression = canonicalExpression.match(RE.reKeyExp)?.[0];
            if (!keyExpression)
                throw new Error(`Error: keyExpression could not me extracted`);
            if (canonicalExpression !== `tr(${keyExpression})`)
                throw new Error(`Error: invalid expression ${expression}`);
            expandedExpression = 'tr(@0)';
            const pKE = parseKeyExpression({ keyExpression, network, isSegwit });
            expansionMap = { '@0': pKE };
            if (!isCanonicalRanged) {
                const pubkey = pKE.pubkey;
                if (!pubkey)
                    throw new Error(`Error: could not extract a pubkey from ${expression}`);
                payment = p2tr({ pubkey, network });
            }
        }
        //sh(wsh(miniscript))
        else if (canonicalExpression.match(RE.reShWshMiniscriptAnchored)) {
            isSegwit = true;
            miniscript = canonicalExpression.match(RE.reShWshMiniscriptAnchored)?.[1]; //[1]-> whatever is found sh(wsh(->HERE<-))
            if (!miniscript)
                throw new Error(`Error: could not get miniscript in ${descriptor}`);
            ({ expandedMiniscript, expansionMap } = expandMiniscript({
                miniscript,
                isSegwit,
                network
            }));
            expandedExpression = `sh(wsh(${expandedMiniscript}))`;
            if (!isCanonicalRanged) {
                const script = (0, miniscript_1.miniscript2Script)({ expandedMiniscript, expansionMap });
                witnessScript = script;
                if (script.byteLength > MAX_STANDARD_P2WSH_SCRIPT_SIZE) {
                    throw new Error(`Error: script is too large, ${script.byteLength} bytes is larger than ${MAX_STANDARD_P2WSH_SCRIPT_SIZE} bytes`);
                }
                const nonPushOnlyOps = countNonPushOnlyOPs(script);
                if (nonPushOnlyOps > MAX_OPS_PER_SCRIPT) {
                    throw new Error(`Error: too many non-push ops, ${nonPushOnlyOps} non-push ops is larger than ${MAX_OPS_PER_SCRIPT}`);
                }
                payment = p2sh({
                    redeem: p2wsh({ redeem: { output: script, network }, network }),
                    network
                });
                redeemScript = payment.redeem?.output;
                if (!redeemScript)
                    throw new Error(`Error: could not calculate redeemScript for ${descriptor}`);
            }
        }
        //sh(miniscript)
        else if (canonicalExpression.match(RE.reShMiniscriptAnchored)) {
            //isSegwit false because we know it's a P2SH of a miniscript and not a
            //P2SH that embeds a witness payment.
            isSegwit = false;
            miniscript = canonicalExpression.match(RE.reShMiniscriptAnchored)?.[1]; //[1]-> whatever is found sh(->HERE<-)
            if (!miniscript)
                throw new Error(`Error: could not get miniscript in ${descriptor}`);
            if (allowMiniscriptInP2SH === false &&
                //These top-level expressions within sh are allowed within sh.
                //They can be parsed with miniscript2Script, but first we must make sure
                //that other expressions are not accepted (unless forced with allowMiniscriptInP2SH).
                miniscript.search(/^(pk\(|pkh\(|wpkh\(|combo\(|multi\(|sortedmulti\(|multi_a\(|sortedmulti_a\()/) !== 0) {
                throw new Error(`Error: Miniscript expressions can only be used in wsh`);
            }
            ({ expandedMiniscript, expansionMap } = expandMiniscript({
                miniscript,
                isSegwit,
                network
            }));
            expandedExpression = `sh(${expandedMiniscript})`;
            if (!isCanonicalRanged) {
                const script = (0, miniscript_1.miniscript2Script)({ expandedMiniscript, expansionMap });
                redeemScript = script;
                if (script.byteLength > MAX_SCRIPT_ELEMENT_SIZE) {
                    throw new Error(`Error: P2SH script is too large, ${script.byteLength} bytes is larger than ${MAX_SCRIPT_ELEMENT_SIZE} bytes`);
                }
                const nonPushOnlyOps = countNonPushOnlyOPs(script);
                if (nonPushOnlyOps > MAX_OPS_PER_SCRIPT) {
                    throw new Error(`Error: too many non-push ops, ${nonPushOnlyOps} non-push ops is larger than ${MAX_OPS_PER_SCRIPT}`);
                }
                payment = p2sh({ redeem: { output: script, network }, network });
            }
        }
        //wsh(miniscript)
        else if (canonicalExpression.match(RE.reWshMiniscriptAnchored)) {
            isSegwit = true;
            miniscript = canonicalExpression.match(RE.reWshMiniscriptAnchored)?.[1]; //[1]-> whatever is found wsh(->HERE<-)
            if (!miniscript)
                throw new Error(`Error: could not get miniscript in ${descriptor}`);
            ({ expandedMiniscript, expansionMap } = expandMiniscript({
                miniscript,
                isSegwit,
                network
            }));
            expandedExpression = `wsh(${expandedMiniscript})`;
            if (!isCanonicalRanged) {
                const script = (0, miniscript_1.miniscript2Script)({ expandedMiniscript, expansionMap });
                witnessScript = script;
                if (script.byteLength > MAX_STANDARD_P2WSH_SCRIPT_SIZE) {
                    throw new Error(`Error: script is too large, ${script.byteLength} bytes is larger than ${MAX_STANDARD_P2WSH_SCRIPT_SIZE} bytes`);
                }
                const nonPushOnlyOps = countNonPushOnlyOPs(script);
                if (nonPushOnlyOps > MAX_OPS_PER_SCRIPT) {
                    throw new Error(`Error: too many non-push ops, ${nonPushOnlyOps} non-push ops is larger than ${MAX_OPS_PER_SCRIPT}`);
                }
                payment = p2wsh({ redeem: { output: script, network }, network });
            }
        }
        else {
            throw new Error(`Error: Could not parse descriptor ${descriptor}`);
        }
        return {
            ...(payment !== undefined ? { payment } : {}),
            ...(expandedExpression !== undefined ? { expandedExpression } : {}),
            ...(miniscript !== undefined ? { miniscript } : {}),
            ...(expansionMap !== undefined ? { expansionMap } : {}),
            ...(isSegwit !== undefined ? { isSegwit } : {}),
            ...(expandedMiniscript !== undefined ? { expandedMiniscript } : {}),
            ...(redeemScript !== undefined ? { redeemScript } : {}),
            ...(witnessScript !== undefined ? { witnessScript } : {}),
            isRanged,
            canonicalExpression
        };
    }
    /**
     * Expand a miniscript to a generalized form using variables instead of key
     * expressions. Variables will be of this form: @0, @1, ...
     * This is done so that it can be compiled with compileMiniscript and
     * satisfied with satisfier.
     * Also compute pubkeys from descriptors to use them later.
     */
    function expandMiniscript({ miniscript, isSegwit, network = bitcoinjs_lib_1.networks.bitcoin }) {
        return (0, miniscript_1.expandMiniscript)({
            miniscript,
            isSegwit,
            network,
            BIP32,
            ECPair
        });
    }
    /**
     * The `Output` class is the central component for managing descriptors.
     * It facilitates the creation of outputs to receive funds and enables the
     * signing and finalization of PSBTs (Partially Signed Bitcoin Transactions)
     * for spending UTXOs (Unspent Transaction Outputs).
     */
    class Output {
        /**
         * @param options
         * @throws {Error} - when descriptor is invalid
         */
        constructor({ descriptor, index, checksumRequired = false, allowMiniscriptInP2SH = false, network = bitcoinjs_lib_1.networks.bitcoin, preimages = [], signersPubKeys }) {
            _Output_instances.add(this);
            _Output_payment.set(this, void 0);
            _Output_preimages.set(this, []);
            _Output_signersPubKeys.set(this, void 0);
            _Output_miniscript.set(this, void 0);
            _Output_witnessScript.set(this, void 0);
            _Output_redeemScript.set(this, void 0);
            //isSegwit true if witnesses are needed to the spend coins sent to this descriptor.
            //may be unset because we may get addr(P2SH) which we don't know if they have segwit.
            _Output_isSegwit.set(this, void 0);
            _Output_expandedExpression.set(this, void 0);
            _Output_expandedMiniscript.set(this, void 0);
            _Output_expansionMap.set(this, void 0);
            _Output_network.set(this, void 0);
            __classPrivateFieldSet(this, _Output_network, network, "f");
            __classPrivateFieldSet(this, _Output_preimages, preimages, "f");
            if (typeof descriptor !== 'string')
                throw new Error(`Error: invalid descriptor type`);
            const expandedResult = expand({
                descriptor,
                ...(index !== undefined ? { index } : {}),
                checksumRequired,
                network,
                allowMiniscriptInP2SH
            });
            if (expandedResult.isRanged && index === undefined)
                throw new Error(`Error: index was not provided for ranged descriptor`);
            if (!expandedResult.payment)
                throw new Error(`Error: could not extract a payment from ${descriptor}`);
            __classPrivateFieldSet(this, _Output_payment, expandedResult.payment, "f");
            if (expandedResult.expandedExpression !== undefined)
                __classPrivateFieldSet(this, _Output_expandedExpression, expandedResult.expandedExpression, "f");
            if (expandedResult.miniscript !== undefined)
                __classPrivateFieldSet(this, _Output_miniscript, expandedResult.miniscript, "f");
            if (expandedResult.expansionMap !== undefined)
                __classPrivateFieldSet(this, _Output_expansionMap, expandedResult.expansionMap, "f");
            if (expandedResult.isSegwit !== undefined)
                __classPrivateFieldSet(this, _Output_isSegwit, expandedResult.isSegwit, "f");
            if (expandedResult.expandedMiniscript !== undefined)
                __classPrivateFieldSet(this, _Output_expandedMiniscript, expandedResult.expandedMiniscript, "f");
            if (expandedResult.redeemScript !== undefined)
                __classPrivateFieldSet(this, _Output_redeemScript, expandedResult.redeemScript, "f");
            if (expandedResult.witnessScript !== undefined)
                __classPrivateFieldSet(this, _Output_witnessScript, expandedResult.witnessScript, "f");
            if (signersPubKeys) {
                __classPrivateFieldSet(this, _Output_signersPubKeys, signersPubKeys, "f");
            }
            else {
                if (__classPrivateFieldGet(this, _Output_expansionMap, "f")) {
                    __classPrivateFieldSet(this, _Output_signersPubKeys, Object.values(__classPrivateFieldGet(this, _Output_expansionMap, "f")).map(keyInfo => {
                        const pubkey = keyInfo.pubkey;
                        if (!pubkey)
                            throw new Error(`Error: could not extract a pubkey from ${descriptor}`);
                        return pubkey;
                    }), "f");
                }
                else {
                    //We should only miss expansionMap in addr() expressions:
                    if (!expandedResult.canonicalExpression.match(RE.reAddrAnchored)) {
                        throw new Error(`Error: expansionMap not available for expression ${descriptor} that is not an address`);
                    }
                    __classPrivateFieldSet(this, _Output_signersPubKeys, [this.getScriptPubKey()], "f");
                }
            }
            this.getSequence = (0, lodash_memoize_1.default)(this.getSequence);
            this.getLockTime = (0, lodash_memoize_1.default)(this.getLockTime);
            const getSignaturesKey = (signatures) => signatures === 'DANGEROUSLY_USE_FAKE_SIGNATURES'
                ? signatures
                : signatures
                    .map(s => `${s.pubkey.toString('hex')}-${s.signature.toString('hex')}`)
                    .join('|');
            this.getScriptSatisfaction = (0, lodash_memoize_1.default)(this.getScriptSatisfaction, 
            // resolver function:
            getSignaturesKey);
            this.guessOutput = (0, lodash_memoize_1.default)(this.guessOutput);
            this.inputWeight = (0, lodash_memoize_1.default)(this.inputWeight, 
            // resolver function:
            (isSegwitTx, signatures) => {
                const segwitKey = isSegwitTx ? 'segwit' : 'non-segwit';
                const signaturesKey = getSignaturesKey(signatures);
                return `${segwitKey}-${signaturesKey}`;
            });
            this.outputWeight = (0, lodash_memoize_1.default)(this.outputWeight);
        }
        /**
         * Creates and returns an instance of bitcoinjs-lib
         * [`Payment`](https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/ts_src/payments/index.ts)'s interface with the `scriptPubKey` of this `Output`.
         */
        getPayment() {
            return __classPrivateFieldGet(this, _Output_payment, "f");
        }
        /**
         * Returns the Bitcoin Address of this `Output`.
         */
        getAddress() {
            if (!__classPrivateFieldGet(this, _Output_payment, "f").address)
                throw new Error(`Error: could extract an address from the payment`);
            return __classPrivateFieldGet(this, _Output_payment, "f").address;
        }
        /**
         * Returns this `Output`'s scriptPubKey.
         */
        getScriptPubKey() {
            if (!__classPrivateFieldGet(this, _Output_payment, "f").output)
                throw new Error(`Error: could extract output.script from the payment`);
            return __classPrivateFieldGet(this, _Output_payment, "f").output;
        }
        /**
         * Returns the compiled Script Satisfaction if this `Output` was created
         * using a miniscript-based descriptor.
         *
         * The Satisfaction is the unlocking script that fulfills
         * (satisfies) this `Output` and it is derived using the Safisfier algorithm
         * [described here](https://bitcoin.sipa.be/miniscript/).
         *
         * Important: As mentioned above, note that this function only applies to
         * miniscript descriptors.
         */
        getScriptSatisfaction(
        /**
         * An array with all the signatures needed to
         * build the Satisfaction of this miniscript-based `Output`.
         *
         * `signatures` must be passed using this format (pairs of `pubKey/signature`):
         * `interface PartialSig { pubkey: Buffer; signature: Buffer; }`
         *
         *  * Alternatively, if you do not have the signatures, you can use the option
         * `'DANGEROUSLY_USE_FAKE_SIGNATURES'`. This will generate script satisfactions
         * using 72-byte zero-padded signatures. While this can be useful in
         * modules like coinselector that require estimating transaction size before
         * signing, it is critical to understand the risks:
         * - Using this option generales invalid unlocking scripts.
         * - It should NEVER be used with real transactions.
         * - Its primary use is for testing and size estimation purposes only.
         *
         * ⚠️ Warning: Misuse of 'DANGEROUSLY_USE_FAKE_SIGNATURES' can lead to security
         * vulnerabilities, including but not limited to invalid transaction generation.
         * Ensure you fully understand the implications before use.
         *
         */
        signatures) {
            if (signatures === 'DANGEROUSLY_USE_FAKE_SIGNATURES')
                signatures = __classPrivateFieldGet(this, _Output_signersPubKeys, "f").map(pubkey => ({
                    pubkey,
                    // https://transactionfee.info/charts/bitcoin-script-ecdsa-length/
                    signature: Buffer.alloc(72, 0)
                }));
            const miniscript = __classPrivateFieldGet(this, _Output_miniscript, "f");
            const expandedMiniscript = __classPrivateFieldGet(this, _Output_expandedMiniscript, "f");
            const expansionMap = __classPrivateFieldGet(this, _Output_expansionMap, "f");
            if (miniscript === undefined ||
                expandedMiniscript === undefined ||
                expansionMap === undefined)
                throw new Error(`Error: cannot get satisfaction from not expanded miniscript ${miniscript}`);
            //Note that we pass the nLockTime and nSequence that is deduced
            //using preimages and signersPubKeys.
            //satisfyMiniscript will make sure
            //that the actual solution given, using real signatures, still meets the
            //same nLockTime and nSequence constraints
            const scriptSatisfaction = (0, miniscript_1.satisfyMiniscript)({
                expandedMiniscript,
                expansionMap,
                signatures,
                preimages: __classPrivateFieldGet(this, _Output_preimages, "f"),
                //Here we pass the TimeConstraints obtained using signersPubKeys to
                //verify that the solutions found using the final signatures have not
                //changed
                timeConstraints: {
                    nLockTime: this.getLockTime(),
                    nSequence: this.getSequence()
                }
            }).scriptSatisfaction;
            if (!scriptSatisfaction)
                throw new Error(`Error: could not produce a valid satisfaction`);
            return scriptSatisfaction;
        }
        /**
         * Gets the nSequence required to fulfill this `Output`.
         */
        getSequence() {
            return __classPrivateFieldGet(this, _Output_instances, "m", _Output_getTimeConstraints).call(this)?.nSequence;
        }
        /**
         * Gets the nLockTime required to fulfill this `Output`.
         */
        getLockTime() {
            return __classPrivateFieldGet(this, _Output_instances, "m", _Output_getTimeConstraints).call(this)?.nLockTime;
        }
        /**
         * Gets the witnessScript required to fulfill this `Output`. Only applies to
         * Segwit outputs.
         */
        getWitnessScript() {
            return __classPrivateFieldGet(this, _Output_witnessScript, "f");
        }
        /**
         * Gets the redeemScript required to fullfill this `Output`. Only applies to
         * SH outputs: sh(wpkh), sh(wsh), sh(lockingScript).
         */
        getRedeemScript() {
            return __classPrivateFieldGet(this, _Output_redeemScript, "f");
        }
        /**
         * Gets the bitcoinjs-lib [`network`](https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/ts_src/networks.ts) used to create this `Output`.
         */
        getNetwork() {
            return __classPrivateFieldGet(this, _Output_network, "f");
        }
        /**
         * Whether this `Output` is Segwit.
         *
         * *NOTE:* When the descriptor in an input is `addr(address)`, it is assumed
         * that any `addr(SH_TYPE_ADDRESS)` is in fact a Segwit `SH_WPKH`
         * (Script Hash-Witness Public Key Hash).
         * For inputs using arbitrary scripts (not standard addresses),
         * use a descriptor in the format `sh(MINISCRIPT)`.
         *
         */
        isSegwit() {
            return __classPrivateFieldGet(this, _Output_isSegwit, "f");
        }
        /**
         * Returns the tuple: `{ isPKH: boolean; isWPKH: boolean; isSH: boolean; }`
         * for this Output.
         */
        guessOutput() {
            function guessSH(output) {
                try {
                    bitcoinjs_lib_1.payments.p2sh({ output });
                    return true;
                }
                catch (err) {
                    return false;
                }
            }
            function guessWPKH(output) {
                try {
                    bitcoinjs_lib_1.payments.p2wpkh({ output });
                    return true;
                }
                catch (err) {
                    return false;
                }
            }
            function guessPKH(output) {
                try {
                    bitcoinjs_lib_1.payments.p2pkh({ output });
                    return true;
                }
                catch (err) {
                    return false;
                }
            }
            const isPKH = guessPKH(this.getScriptPubKey());
            const isWPKH = guessWPKH(this.getScriptPubKey());
            const isSH = guessSH(this.getScriptPubKey());
            if ([isPKH, isWPKH, isSH].filter(Boolean).length > 1)
                throw new Error('Cannot have multiple output types.');
            return { isPKH, isWPKH, isSH };
        }
        // References for inputWeight & outputWeight:
        // https://gist.github.com/junderw/b43af3253ea5865ed52cb51c200ac19c
        // https://bitcoinops.org/en/tools/calc-size/
        // Look for byteLength: https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/ts_src/transaction.ts
        // https://github.com/bitcoinjs/coinselect/blob/master/utils.js
        /**
         * Computes the Weight Unit contributions of this Output as if it were the
         * input in a tx.
         *
         * *NOTE:* When the descriptor in an input is `addr(address)`, it is assumed
         * that any `addr(SH_TYPE_ADDRESS)` is in fact a Segwit `SH_WPKH`
         * (Script Hash-Witness Public Key Hash).
         * For inputs using arbitrary scripts (not standard addresses),
         * use a descriptor in the format `sh(MINISCRIPT)`.
         */
        inputWeight(
        /**
         * Indicates if the transaction is a Segwit transaction.
         * If a transaction isSegwitTx, a single byte is then also required for
         * non-witness inputs to encode the length of the empty witness stack:
         * encodeLength(0) + 0 = 1
         * Read more:
         * https://gist.github.com/junderw/b43af3253ea5865ed52cb51c200ac19c?permalink_comment_id=4760512#gistcomment-4760512
         */
        isSegwitTx, 
        /*
         *  Array of `PartialSig`. Each `PartialSig` includes
         *  a public key and its corresponding signature. This parameter
         *  enables the accurate calculation of signature sizes.
         *  Pass 'DANGEROUSLY_USE_FAKE_SIGNATURES' to assume 72 bytes in length.
         *  Mainly used for testing.
         */
        signatures) {
            if (this.isSegwit() && !isSegwitTx)
                throw new Error(`a tx is segwit if at least one input is segwit`);
            const errorMsg = 'Input type not implemented. Currently supported: pkh(KEY), wpkh(KEY), \
    sh(wpkh(KEY)), sh(wsh(MINISCRIPT)), sh(MINISCRIPT), wsh(MINISCRIPT), \
    addr(PKH_ADDRESS), addr(WPKH_ADDRESS), addr(SH_WPKH_ADDRESS).';
            //expand any miniscript-based descriptor. If not miniscript-based, then it's
            //an addr() descriptor. For those, we can only guess their type.
            const expansion = this.expand().expandedExpression;
            const { isPKH, isWPKH, isSH } = this.guessOutput();
            if (!expansion && !isPKH && !isWPKH && !isSH)
                throw new Error(errorMsg);
            const firstSignature = signatures && typeof signatures[0] === 'object'
                ? signatures[0]
                : 'DANGEROUSLY_USE_FAKE_SIGNATURES';
            if (expansion ? expansion.startsWith('pkh(') : isPKH) {
                return (
                // Non-segwit: (txid:32) + (vout:4) + (sequence:4) + (script_len:1) + (sig:73) + (pubkey:34)
                (32 + 4 + 4 + 1 + signatureSize(firstSignature) + 34) * 4 +
                    //Segwit:
                    (isSegwitTx ? 1 : 0));
            }
            else if (expansion ? expansion.startsWith('wpkh(') : isWPKH) {
                if (!isSegwitTx)
                    throw new Error('Should be SegwitTx');
                return (
                // Non-segwit: (txid:32) + (vout:4) + (sequence:4) + (script_len:1)
                41 * 4 +
                    // Segwit: (push_count:1) + (sig:73) + (pubkey:34)
                    (1 + signatureSize(firstSignature) + 34));
            }
            else if (expansion ? expansion.startsWith('sh(wpkh(') : isSH) {
                if (!isSegwitTx)
                    throw new Error('Should be SegwitTx');
                return (
                // Non-segwit: (txid:32) + (vout:4) + (sequence:4) + (script_len:1) + (p2wpkh:23)
                //  -> p2wpkh_script: OP_0 OP_PUSH20 <public_key_hash>
                //  -> p2wpkh: (script_len:1) + (script:22)
                64 * 4 +
                    // Segwit: (push_count:1) + (sig:73) + (pubkey:34)
                    (1 + signatureSize(firstSignature) + 34));
            }
            else if (expansion?.startsWith('sh(wsh(')) {
                if (!isSegwitTx)
                    throw new Error('Should be SegwitTx');
                const witnessScript = this.getWitnessScript();
                if (!witnessScript)
                    throw new Error('sh(wsh) must provide witnessScript');
                const payment = bitcoinjs_lib_1.payments.p2sh({
                    redeem: bitcoinjs_lib_1.payments.p2wsh({
                        redeem: {
                            input: this.getScriptSatisfaction(signatures || 'DANGEROUSLY_USE_FAKE_SIGNATURES'),
                            output: witnessScript
                        }
                    })
                });
                if (!payment || !payment.input || !payment.witness)
                    throw new Error('Could not create payment');
                return (
                //Non-segwit
                4 * (40 + varSliceSize(payment.input)) +
                    //Segwit
                    vectorSize(payment.witness));
            }
            else if (expansion?.startsWith('sh(')) {
                const redeemScript = this.getRedeemScript();
                if (!redeemScript)
                    throw new Error('sh() must provide redeemScript');
                const payment = bitcoinjs_lib_1.payments.p2sh({
                    redeem: {
                        input: this.getScriptSatisfaction(signatures || 'DANGEROUSLY_USE_FAKE_SIGNATURES'),
                        output: redeemScript
                    }
                });
                if (!payment || !payment.input)
                    throw new Error('Could not create payment');
                if (payment.witness?.length)
                    throw new Error('A legacy p2sh payment should not cointain a witness');
                return (
                //Non-segwit
                4 * (40 + varSliceSize(payment.input)) +
                    //Segwit:
                    (isSegwitTx ? 1 : 0));
            }
            else if (expansion?.startsWith('wsh(')) {
                const witnessScript = this.getWitnessScript();
                if (!witnessScript)
                    throw new Error('wsh must provide witnessScript');
                const payment = bitcoinjs_lib_1.payments.p2wsh({
                    redeem: {
                        input: this.getScriptSatisfaction(signatures || 'DANGEROUSLY_USE_FAKE_SIGNATURES'),
                        output: witnessScript
                    }
                });
                if (!payment || !payment.input || !payment.witness)
                    throw new Error('Could not create payment');
                return (
                //Non-segwit
                4 * (40 + varSliceSize(payment.input)) +
                    //Segwit
                    vectorSize(payment.witness));
            }
            else {
                throw new Error(errorMsg);
            }
        }
        /**
         * Computes the Weight Unit contributions of this Output as if it were the
         * output in a tx.
         */
        outputWeight() {
            const errorMsg = 'Output type not implemented. Currently supported: pkh(KEY), wpkh(KEY), \
    sh(ANYTHING), wsh(ANYTHING), addr(PKH_ADDRESS), addr(WPKH_ADDRESS), \
    addr(SH_WPKH_ADDRESS)';
            //expand any miniscript-based descriptor. If not miniscript-based, then it's
            //an addr() descriptor. For those, we can only guess their type.
            const expansion = this.expand().expandedExpression;
            const { isPKH, isWPKH, isSH } = this.guessOutput();
            if (!expansion && !isPKH && !isWPKH && !isSH)
                throw new Error(errorMsg);
            if (expansion ? expansion.startsWith('pkh(') : isPKH) {
                // (p2pkh:26) + (amount:8)
                return 34 * 4;
            }
            else if (expansion ? expansion.startsWith('wpkh(') : isWPKH) {
                // (p2wpkh:23) + (amount:8)
                return 31 * 4;
            }
            else if (expansion ? expansion.startsWith('sh(') : isSH) {
                // (p2sh:24) + (amount:8)
                return 32 * 4;
            }
            else if (expansion?.startsWith('wsh(')) {
                // (p2wsh:35) + (amount:8)
                return 43 * 4;
            }
            else {
                throw new Error(errorMsg);
            }
        }
        /** @deprecated - Use updatePsbtAsInput instead
         * @hidden
         */
        updatePsbt(params) {
            this.updatePsbtAsInput(params);
            return params.psbt.data.inputs.length - 1;
        }
        /**
         * Sets this output as an input of the provided `psbt` and updates the
         * `psbt` locktime if required by the descriptor.
         *
         * `psbt` and `vout` are mandatory. Include `txHex` as well. The pair
         * `vout` and `txHex` define the transaction and output number this instance
         * pertains to.
         *
         * Though not advised, for Segwit inputs you can pass `txId` and `value`
         * in lieu of `txHex`. If doing so, ensure `value` accuracy to avoid
         * potential fee attacks -
         * [See this issue](https://github.com/bitcoinjs/bitcoinjs-lib/issues/1625).
         *
         * Note: Hardware wallets need the [full `txHex` for Segwit](https://blog.trezor.io/details-of-firmware-updates-for-trezor-one-version-1-9-1-and-trezor-model-t-version-2-3-1-1eba8f60f2dd).
         *
         * When unsure, always use `txHex`, and skip `txId` and `value` for safety.
         *
         * @returns A finalizer function to be used after signing the `psbt`.
         * This function ensures that this input is properly finalized.
         * The finalizer has this signature:
         *
         * `( { psbt, validate = true } : { psbt: Psbt; validate: boolean | undefined } ) => void`
         *
         */
        updatePsbtAsInput({ psbt, txHex, txId, value, vout //vector output index
         }) {
            if (txHex === undefined) {
                console.warn(`Warning: missing txHex may allow fee attacks`);
            }
            const isSegwit = this.isSegwit();
            if (isSegwit === undefined) {
                //This should only happen when using addr() expressions
                throw new Error(`Error: could not determine whether this is a segwit descriptor`);
            }
            const index = (0, psbt_1.updatePsbt)({
                psbt,
                vout,
                ...(txHex !== undefined ? { txHex } : {}),
                ...(txId !== undefined ? { txId } : {}),
                ...(value !== undefined ? { value } : {}),
                sequence: this.getSequence(),
                locktime: this.getLockTime(),
                keysInfo: __classPrivateFieldGet(this, _Output_expansionMap, "f") ? Object.values(__classPrivateFieldGet(this, _Output_expansionMap, "f")) : [],
                scriptPubKey: this.getScriptPubKey(),
                isSegwit,
                witnessScript: this.getWitnessScript(),
                redeemScript: this.getRedeemScript()
            });
            const finalizer = ({ psbt, validate = true }) => this.finalizePsbtInput({ index, psbt, validate });
            return finalizer;
        }
        /**
         * Adds this output as an output of the provided `psbt` with the given
         * value.
         *
         * @param psbt - The Partially Signed Bitcoin Transaction.
         * @param value - The value for the output in satoshis.
         */
        updatePsbtAsOutput({ psbt, value }) {
            psbt.addOutput({ script: this.getScriptPubKey(), value });
        }
        /**
         * Finalizes a PSBT input by adding the necessary unlocking script that satisfies this `Output`'s
         * spending conditions.
         *
         * 🔴 IMPORTANT 🔴
         * It is STRONGLY RECOMMENDED to use the finalizer function returned by
         * {@link _Internal_.Output.updatePsbtAsInput | `updatePsbtAsInput`} instead
         * of calling this method directly.
         * This approach eliminates the need to manage the `Output` instance and the
         * input's index, simplifying the process.
         *
         * The `finalizePsbtInput` method completes a PSBT input by adding the
         * unlocking script (`scriptWitness` or `scriptSig`) that satisfies
         * this `Output`'s spending conditions. Bear in mind that both
         * `scriptSig` and `scriptWitness` incorporate signatures. As such, you
         * should complete all necessary signing operations before calling this
         * method.
         *
         * For each unspent output from a previous transaction that you're
         * referencing in a `psbt` as an input to be spent, apply this method as
         * follows: `output.finalizePsbtInput({ index, psbt })`.
         *
         * It's essential to specify the exact position (or `index`) of the input in
         * the `psbt` that references this unspent `Output`. This `index` should
         * align with the value returned by the `updatePsbtAsInput` method.
         * Note:
         * The `index` corresponds to the position of the input in the `psbt`.
         * To get this index, right after calling `updatePsbtAsInput()`, use:
         * `index = psbt.data.inputs.length - 1`.
         */
        finalizePsbtInput({ index, psbt, validate = true }) {
            if (validate &&
                !psbt.validateSignaturesOfInput(index, signatureValidator)) {
                throw new Error(`Error: invalid signatures on input ${index}`);
            }
            //An index must be passed since finding the index in the psbt cannot be
            //done:
            //Imagine the case where you received money twice to
            //the same miniscript-based address. You would have the same scriptPubKey,
            //same sequences, ... The descriptor does not store the hash of the previous
            //transaction since it is a general Descriptor object. Indices must be kept
            //out of the scope of this class and then passed.
            const signatures = psbt.data.inputs[index]?.partialSig;
            if (!signatures)
                throw new Error(`Error: cannot finalize without signatures`);
            __classPrivateFieldGet(this, _Output_instances, "m", _Output_assertPsbtInput).call(this, { index, psbt });
            if (!__classPrivateFieldGet(this, _Output_miniscript, "f")) {
                //Use standard finalizers
                psbt.finalizeInput(index);
            }
            else {
                const scriptSatisfaction = this.getScriptSatisfaction(signatures);
                psbt.finalizeInput(index, (0, psbt_1.finalScriptsFuncFactory)(scriptSatisfaction, __classPrivateFieldGet(this, _Output_network, "f")));
            }
        }
        /**
         * Decomposes the descriptor used to form this `Output` into its elemental
         * parts. See {@link ExpansionMap ExpansionMap} for a detailed explanation.
         */
        expand() {
            return {
                ...(__classPrivateFieldGet(this, _Output_expandedExpression, "f") !== undefined
                    ? { expandedExpression: __classPrivateFieldGet(this, _Output_expandedExpression, "f") }
                    : {}),
                ...(__classPrivateFieldGet(this, _Output_miniscript, "f") !== undefined
                    ? { miniscript: __classPrivateFieldGet(this, _Output_miniscript, "f") }
                    : {}),
                ...(__classPrivateFieldGet(this, _Output_expandedMiniscript, "f") !== undefined
                    ? { expandedMiniscript: __classPrivateFieldGet(this, _Output_expandedMiniscript, "f") }
                    : {}),
                ...(__classPrivateFieldGet(this, _Output_expansionMap, "f") !== undefined
                    ? { expansionMap: __classPrivateFieldGet(this, _Output_expansionMap, "f") }
                    : {})
            };
        }
    }
    _Output_payment = new WeakMap(), _Output_preimages = new WeakMap(), _Output_signersPubKeys = new WeakMap(), _Output_miniscript = new WeakMap(), _Output_witnessScript = new WeakMap(), _Output_redeemScript = new WeakMap(), _Output_isSegwit = new WeakMap(), _Output_expandedExpression = new WeakMap(), _Output_expandedMiniscript = new WeakMap(), _Output_expansionMap = new WeakMap(), _Output_network = new WeakMap(), _Output_instances = new WeakSet(), _Output_getTimeConstraints = function _Output_getTimeConstraints() {
        const miniscript = __classPrivateFieldGet(this, _Output_miniscript, "f");
        const preimages = __classPrivateFieldGet(this, _Output_preimages, "f");
        const expandedMiniscript = __classPrivateFieldGet(this, _Output_expandedMiniscript, "f");
        const expansionMap = __classPrivateFieldGet(this, _Output_expansionMap, "f");
        const signersPubKeys = __classPrivateFieldGet(this, _Output_signersPubKeys, "f");
        //Create a method. solvePreimages to solve them.
        if (miniscript) {
            if (expandedMiniscript === undefined || expansionMap === undefined)
                throw new Error(`Error: cannot get time constraints from not expanded miniscript ${miniscript}`);
            //We create some fakeSignatures since we may not have them yet.
            //We only want to retrieve the nLockTime and nSequence of the satisfaction and
            //signatures don't matter
            const fakeSignatures = signersPubKeys.map(pubkey => ({
                pubkey,
                // https://transactionfee.info/charts/bitcoin-script-ecdsa-length/
                signature: Buffer.alloc(72, 0)
            }));
            const { nLockTime, nSequence } = (0, miniscript_1.satisfyMiniscript)({
                expandedMiniscript,
                expansionMap,
                signatures: fakeSignatures,
                preimages
            });
            return { nLockTime, nSequence };
        }
        else
            return undefined;
    }, _Output_assertPsbtInput = function _Output_assertPsbtInput({ psbt, index }) {
        const input = psbt.data.inputs[index];
        const txInput = psbt.txInputs[index];
        if (!input || !txInput)
            throw new Error(`Error: invalid input or txInput`);
        const { sequence: inputSequence, index: vout } = txInput;
        let scriptPubKey;
        if (input.witnessUtxo)
            scriptPubKey = input.witnessUtxo.script;
        else {
            if (!input.nonWitnessUtxo)
                throw new Error(`Error: input should have either witnessUtxo or nonWitnessUtxo`);
            const tx = bitcoinjs_lib_1.Transaction.fromBuffer(input.nonWitnessUtxo);
            const out = tx.outs[vout];
            if (!out)
                throw new Error(`Error: utxo should exist`);
            scriptPubKey = out.script;
        }
        const locktime = this.getLockTime() || 0;
        let sequence = this.getSequence();
        if (sequence === undefined && locktime !== 0)
            sequence = 0xfffffffe;
        if (sequence === undefined && locktime === 0)
            sequence = 0xffffffff;
        const eqBuffers = (buf1, buf2) => buf1 instanceof Buffer && buf2 instanceof Buffer
            ? Buffer.compare(buf1, buf2) === 0
            : buf1 === buf2;
        if (Buffer.compare(scriptPubKey, this.getScriptPubKey()) !== 0 ||
            sequence !== inputSequence ||
            locktime !== psbt.locktime ||
            !eqBuffers(this.getWitnessScript(), input.witnessScript) ||
            !eqBuffers(this.getRedeemScript(), input.redeemScript)) {
            throw new Error(`Error: cannot finalize psbt index ${index} since it does not correspond to this descriptor`);
        }
    };
    /**
     * @hidden
     * @deprecated Use `Output` instead
     */
    class Descriptor extends Output {
        constructor({ expression, ...rest }) {
            super({ descriptor: expression, ...rest });
        }
    }
    return {
        // deprecated TAG must also be below so it is exported to descriptors.d.ts
        /** @deprecated */ Descriptor,
        Output,
        parseKeyExpression,
        expand,
        ECPair,
        BIP32
    };
}
exports.DescriptorsFactory = DescriptorsFactory;
