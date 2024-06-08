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
exports.ledger = exports.scriptExpressions = exports.keyExpressionLedger = exports.keyExpressionBIP32 = exports.finalizePsbt = exports.signers = exports.checksum = exports.DescriptorsFactory = void 0;
var descriptors_1 = require("./descriptors");
Object.defineProperty(exports, "DescriptorsFactory", { enumerable: true, get: function () { return descriptors_1.DescriptorsFactory; } });
var checksum_1 = require("./checksum");
Object.defineProperty(exports, "checksum", { enumerable: true, get: function () { return checksum_1.DescriptorChecksum; } });
const signers = __importStar(require("./signers"));
exports.signers = signers;
/**
 * @hidden
 * To be removed in v3.0 and replaced by the version with the signature that
 * does not accept descriptors
 */
function finalizePsbt({ psbt, outputs, descriptors, validate = true }) {
    if (descriptors && outputs)
        throw new Error(`descriptors param has been deprecated`);
    outputs = descriptors || outputs;
    if (!outputs)
        throw new Error(`outputs not provided`);
    outputs.forEach((output, inputIndex) => output.finalizePsbtInput({ index: inputIndex, psbt, validate }));
}
exports.finalizePsbt = finalizePsbt;
var keyExpressions_1 = require("./keyExpressions");
Object.defineProperty(exports, "keyExpressionBIP32", { enumerable: true, get: function () { return keyExpressions_1.keyExpressionBIP32; } });
Object.defineProperty(exports, "keyExpressionLedger", { enumerable: true, get: function () { return keyExpressions_1.keyExpressionLedger; } });
const scriptExpressions = __importStar(require("./scriptExpressions"));
exports.scriptExpressions = scriptExpressions;
const ledger_1 = require("./ledger");
exports.ledger = {
    getLedgerMasterFingerPrint: ledger_1.getLedgerMasterFingerPrint,
    getLedgerXpub: ledger_1.getLedgerXpub,
    registerLedgerWallet: ledger_1.registerLedgerWallet,
    assertLedgerApp: ledger_1.assertLedgerApp
};
