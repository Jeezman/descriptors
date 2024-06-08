"use strict";
// Copyright (c) 2023 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePsbt = exports.finalScriptsFuncFactory = void 0;
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const varuint_bitcoin_1 = require("varuint-bitcoin");
function reverseBuffer(buffer) {
    if (buffer.length < 1)
        return buffer;
    let j = buffer.length - 1;
    let tmp = 0;
    for (let i = 0; i < buffer.length / 2; i++) {
        tmp = buffer[i];
        buffer[i] = buffer[j];
        buffer[j] = tmp;
        j--;
    }
    return buffer;
}
function witnessStackToScriptWitness(witness) {
    let buffer = Buffer.allocUnsafe(0);
    function writeSlice(slice) {
        buffer = Buffer.concat([buffer, Buffer.from(slice)]);
    }
    function writeVarInt(i) {
        const currentLen = buffer.length;
        const varintLen = (0, varuint_bitcoin_1.encodingLength)(i);
        buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)]);
        (0, varuint_bitcoin_1.encode)(i, buffer, currentLen);
    }
    function writeVarSlice(slice) {
        writeVarInt(slice.length);
        writeSlice(slice);
    }
    function writeVector(vector) {
        writeVarInt(vector.length);
        vector.forEach(writeVarSlice);
    }
    writeVector(witness);
    return buffer;
}
function finalScriptsFuncFactory(scriptSatisfaction, network) {
    const finalScriptsFunc = (_index, _input, lockingScript /*witnessScript or redeemScript*/, isSegwit, isP2SH, _isP2WSH) => {
        let finalScriptWitness;
        let finalScriptSig;
        //p2wsh
        if (isSegwit && !isP2SH) {
            const payment = bitcoinjs_lib_1.payments.p2wsh({
                redeem: { input: scriptSatisfaction, output: lockingScript },
                network
            });
            if (!payment.witness)
                throw new Error(`Error: p2wsh failed producing a witness`);
            finalScriptWitness = witnessStackToScriptWitness(payment.witness);
        }
        //p2sh-p2wsh
        else if (isSegwit && isP2SH) {
            const payment = bitcoinjs_lib_1.payments.p2sh({
                redeem: bitcoinjs_lib_1.payments.p2wsh({
                    redeem: { input: scriptSatisfaction, output: lockingScript },
                    network
                }),
                network
            });
            if (!payment.witness)
                throw new Error(`Error: p2sh-p2wsh failed producing a witness`);
            finalScriptWitness = witnessStackToScriptWitness(payment.witness);
            finalScriptSig = payment.input;
        }
        //p2sh
        else {
            finalScriptSig = bitcoinjs_lib_1.payments.p2sh({
                redeem: { input: scriptSatisfaction, output: lockingScript },
                network
            }).input;
        }
        return {
            finalScriptWitness,
            finalScriptSig
        };
    };
    return finalScriptsFunc;
}
exports.finalScriptsFuncFactory = finalScriptsFuncFactory;
/**
 * Important: Read comments on descriptor.updatePsbt regarding not passing txHex
 */
function updatePsbt({ psbt, vout, txHex, txId, value, sequence, locktime, keysInfo, scriptPubKey, isSegwit, witnessScript, redeemScript }) {
    //Some data-sanity checks:
    if (!isSegwit && txHex === undefined)
        throw new Error(`Error: txHex is mandatory for Non-Segwit inputs`);
    if (isSegwit &&
        txHex === undefined &&
        (txId === undefined || value === undefined))
        throw new Error(`Error: pass txHex or txId+value for Segwit inputs`);
    if (txHex !== undefined) {
        const tx = bitcoinjs_lib_1.Transaction.fromHex(txHex);
        const out = tx?.outs?.[vout];
        if (!out)
            throw new Error(`Error: tx ${txHex} does not have vout ${vout}`);
        const outputScript = out.script;
        if (!outputScript)
            throw new Error(`Error: could not extract outputScript for txHex ${txHex} and vout ${vout}`);
        if (Buffer.compare(outputScript, scriptPubKey) !== 0)
            throw new Error(`Error: txHex ${txHex} for vout ${vout} does not correspond to scriptPubKey ${scriptPubKey}`);
        if (txId !== undefined) {
            if (tx.getId() !== txId)
                throw new Error(`Error: txId for ${txHex} and vout ${vout} does not correspond to ${txId}`);
        }
        else {
            txId = tx.getId();
        }
        if (value !== undefined) {
            if (out.value !== value)
                throw new Error(`Error: value for ${txHex} and vout ${vout} does not correspond to ${value}`);
        }
        else {
            value = out.value;
        }
    }
    if (txId === undefined || !value)
        throw new Error(`Error: txHex+vout required. Alternatively, but ONLY for Segwit inputs, txId+value can also be passed.`);
    if (locktime) {
        if (psbt.locktime && psbt.locktime !== locktime)
            throw new Error(`Error: transaction locktime was already set with a different value: ${locktime} != ${psbt.locktime}`);
        // nLockTime only works if at least one of the transaction inputs has an
        // nSequence value that is below 0xffffffff. Let's make sure that at least
        // this input's sequence < 0xffffffff
        if (sequence === undefined) {
            //NOTE: if sequence is undefined, bitcoinjs-lib uses 0xffffffff as default
            sequence = 0xfffffffe;
        }
        else if (sequence > 0xfffffffe) {
            throw new Error(`Error: incompatible sequence: ${sequence} and locktime: ${locktime}`);
        }
        psbt.setLocktime(locktime);
    }
    const input = {
        hash: reverseBuffer(Buffer.from(txId, 'hex')),
        index: vout
    };
    if (txHex !== undefined) {
        input.nonWitnessUtxo = bitcoinjs_lib_1.Transaction.fromHex(txHex).toBuffer();
    }
    const bip32Derivation = keysInfo
        .filter((keyInfo) => keyInfo.pubkey && keyInfo.masterFingerprint && keyInfo.path)
        .map((keyInfo) => {
        const pubkey = keyInfo.pubkey;
        if (!pubkey)
            throw new Error(`key ${keyInfo.keyExpression} missing pubkey`);
        return {
            masterFingerprint: keyInfo.masterFingerprint,
            pubkey,
            path: keyInfo.path
        };
    });
    if (bip32Derivation.length)
        input.bip32Derivation = bip32Derivation;
    if (isSegwit && txHex !== undefined) {
        //There's no need to put both witnessUtxo and nonWitnessUtxo
        input.witnessUtxo = { script: scriptPubKey, value };
    }
    if (sequence !== undefined)
        input.sequence = sequence;
    if (witnessScript)
        input.witnessScript = witnessScript;
    if (redeemScript)
        input.redeemScript = redeemScript;
    psbt.addInput(input);
    return psbt.data.inputs.length - 1;
}
exports.updatePsbt = updatePsbt;
