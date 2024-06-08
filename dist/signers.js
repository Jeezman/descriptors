"use strict";
// Copyright (c) 2023 Jose-Luis Landabaso - https://bitcoinerlab.com
// Distributed under the MIT software license
Object.defineProperty(exports, "__esModule", { value: true });
exports.signLedger = exports.signInputLedger = exports.signBIP32 = exports.signInputBIP32 = exports.signECPair = exports.signInputECPair = void 0;
const ledger_1 = require("./ledger");
function signInputECPair({ psbt, index, ecpair }) {
    psbt.signInput(index, ecpair);
}
exports.signInputECPair = signInputECPair;
function signECPair({ psbt, ecpair }) {
    psbt.signAllInputs(ecpair);
}
exports.signECPair = signECPair;
function signInputBIP32({ psbt, index, node }) {
    psbt.signInputHD(index, node);
}
exports.signInputBIP32 = signInputBIP32;
function signBIP32({ psbt, masterNode }) {
    psbt.signAllInputsHD(masterNode);
}
exports.signBIP32 = signBIP32;
const ledgerSignaturesForInputIndex = (index, ledgerSignatures) => ledgerSignatures
    .filter(([i]) => i === index)
    .map(([_i, partialSignature]) => ({
    pubkey: partialSignature.pubkey,
    signature: partialSignature.signature
}));
/**
 * To be removed in v3.0 and replaced by a version that does not accept
 * descriptor
 * @hidden
 */
async function signInputLedger({ psbt, index, descriptor, ledgerClient, ledgerState, ledgerManager }) {
    if (!descriptor && !ledgerManager)
        throw new Error(`ledgerManager not provided`);
    if (descriptor && ledgerManager)
        throw new Error(`Invalid usage: don't pass descriptor`);
    if (ledgerManager && (ledgerClient || ledgerState))
        throw new Error(`Invalid usage: either ledgerManager or ledgerClient + ledgerState`);
    const output = descriptor;
    if (ledgerManager)
        ({ ledgerClient, ledgerState } = ledgerManager);
    if (!ledgerClient)
        throw new Error(`ledgerManager not provided`);
    if (!ledgerState)
        throw new Error(`ledgerManager not provided`);
    const { PsbtV2, DefaultWalletPolicy, WalletPolicy, AppClient } = (await (0, ledger_1.importAndValidateLedgerBitcoin)(ledgerClient));
    if (!(ledgerClient instanceof AppClient))
        throw new Error(`Error: pass a valid ledgerClient`);
    let ledgerSignatures;
    if (ledgerManager) {
        const policy = await (0, ledger_1.ledgerPolicyFromPsbtInput)({
            psbt,
            index,
            ledgerManager
        });
        if (!policy)
            throw new Error(`Error: the ledger cannot sign this pstb input`);
        if (policy.policyName && policy.policyHmac && policy.policyId) {
            //non-standard policy
            const walletPolicy = new WalletPolicy(policy.policyName, policy.ledgerTemplate, policy.keyRoots);
            ledgerSignatures = await ledgerClient.signPsbt(new PsbtV2().fromBitcoinJS(psbt), walletPolicy, policy.policyHmac);
        }
        else {
            //standard policy
            ledgerSignatures = await ledgerClient.signPsbt(new PsbtV2().fromBitcoinJS(psbt), new DefaultWalletPolicy(policy.ledgerTemplate, policy.keyRoots[0]), null);
        }
    }
    else {
        if (!output)
            throw new Error(`outputs not provided`);
        const result = await (0, ledger_1.ledgerPolicyFromOutput)({
            output,
            ledgerClient,
            ledgerState
        });
        if (!result)
            throw new Error(`Error: output does not have a ledger input`);
        const { ledgerTemplate, keyRoots } = result;
        const standardPolicy = await (0, ledger_1.ledgerPolicyFromStandard)({
            output,
            ledgerClient,
            ledgerState
        });
        if (standardPolicy) {
            ledgerSignatures = await ledgerClient.signPsbt(new PsbtV2().fromBitcoinJS(psbt), new DefaultWalletPolicy(ledgerTemplate, keyRoots[0]), null);
        }
        else {
            const policy = await (0, ledger_1.ledgerPolicyFromState)({
                output,
                ledgerClient,
                ledgerState
            });
            if (!policy || !policy.policyName || !policy.policyHmac)
                throw new Error(`Error: the descriptor's policy is not registered`);
            const walletPolicy = new WalletPolicy(policy.policyName, ledgerTemplate, keyRoots);
            ledgerSignatures = await ledgerClient.signPsbt(new PsbtV2().fromBitcoinJS(psbt), walletPolicy, policy.policyHmac);
        }
    }
    //Add the signatures to the Psbt object using PartialSig format:
    psbt.updateInput(index, {
        partialSig: ledgerSignaturesForInputIndex(index, ledgerSignatures)
    });
}
exports.signInputLedger = signInputLedger;
/**
 * To be removed in v3.0 and replaced by a version that does not accept
 * descriptors
 * @hidden
 */
async function signLedger({ psbt, descriptors, ledgerClient, ledgerState, ledgerManager }) {
    if (!descriptors && !ledgerManager)
        throw new Error(`ledgerManager not provided`);
    if (descriptors && ledgerManager)
        throw new Error(`Invalid usage: don't pass descriptors`);
    if (ledgerManager && (ledgerClient || ledgerState))
        throw new Error(`Invalid usage: either ledgerManager or ledgerClient + ledgerState`);
    const outputs = descriptors;
    if (ledgerManager)
        ({ ledgerClient, ledgerState } = ledgerManager);
    if (!ledgerClient)
        throw new Error(`ledgerManager not provided`);
    if (!ledgerState)
        throw new Error(`ledgerManager not provided`);
    const { PsbtV2, DefaultWalletPolicy, WalletPolicy, AppClient } = (await (0, ledger_1.importAndValidateLedgerBitcoin)(ledgerClient));
    if (!(ledgerClient instanceof AppClient))
        throw new Error(`Error: pass a valid ledgerClient`);
    const ledgerPolicies = [];
    if (ledgerManager)
        for (let index = 0; index < psbt.data.inputs.length; index++) {
            const policy = await (0, ledger_1.ledgerPolicyFromPsbtInput)({
                psbt,
                index,
                ledgerManager
            });
            if (policy)
                ledgerPolicies.push(policy);
        }
    else {
        if (!outputs)
            throw new Error(`outputs not provided`);
        for (const output of outputs) {
            const policy = (await (0, ledger_1.ledgerPolicyFromState)({ output, ledgerClient, ledgerState })) ||
                (await (0, ledger_1.ledgerPolicyFromStandard)({ output, ledgerClient, ledgerState }));
            if (policy)
                ledgerPolicies.push(policy);
        }
        if (ledgerPolicies.length === 0)
            throw new Error(`Error: there are no inputs which could be signed`);
    }
    //cluster unique LedgerPolicies
    const uniquePolicies = [];
    for (const policy of ledgerPolicies) {
        if (!uniquePolicies.find((uniquePolicy) => (0, ledger_1.comparePolicies)(uniquePolicy, policy)))
            uniquePolicies.push(policy);
    }
    for (const uniquePolicy of uniquePolicies) {
        let ledgerSignatures;
        if (uniquePolicy.policyName &&
            uniquePolicy.policyHmac &&
            uniquePolicy.policyId) {
            //non-standard policy
            const walletPolicy = new WalletPolicy(uniquePolicy.policyName, uniquePolicy.ledgerTemplate, uniquePolicy.keyRoots);
            ledgerSignatures = await ledgerClient.signPsbt(new PsbtV2().fromBitcoinJS(psbt), walletPolicy, uniquePolicy.policyHmac);
        }
        else {
            //standard policy
            ledgerSignatures = await ledgerClient.signPsbt(new PsbtV2().fromBitcoinJS(psbt), new DefaultWalletPolicy(uniquePolicy.ledgerTemplate, uniquePolicy.keyRoots[0]), null);
        }
        for (const [index, ,] of ledgerSignatures) {
            psbt.updateInput(index, {
                partialSig: ledgerSignaturesForInputIndex(index, ledgerSignatures)
            });
        }
    }
}
exports.signLedger = signLedger;
