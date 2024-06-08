/// <reference types="node" />
import type { PsbtInput } from 'bip174/src/lib/interfaces';
import type { KeyInfo } from './types';
import { Network, Psbt } from 'bitcoinjs-lib';
/**
 * This function must do two things:
 * 1. Check if the `input` can be finalized. If it can not be finalized, throw.
 *   ie. `Can not finalize input #${inputIndex}`
 * 2. Create the finalScriptSig and finalScriptWitness Buffers.
 */
type FinalScriptsFunc = (inputIndex: number, // Which input is it?
input: PsbtInput, // The PSBT input contents
script: Buffer, // The "meaningful" locking script Buffer (redeemScript for P2SH etc.)
isSegwit: boolean, // Is it segwit?
isP2SH: boolean, // Is it P2SH?
isP2WSH: boolean) => {
    finalScriptSig: Buffer | undefined;
    finalScriptWitness: Buffer | undefined;
};
export declare function finalScriptsFuncFactory(scriptSatisfaction: Buffer, network: Network): FinalScriptsFunc;
/**
 * Important: Read comments on descriptor.updatePsbt regarding not passing txHex
 */
export declare function updatePsbt({ psbt, vout, txHex, txId, value, sequence, locktime, keysInfo, scriptPubKey, isSegwit, witnessScript, redeemScript }: {
    psbt: Psbt;
    vout: number;
    txHex?: string;
    txId?: string;
    value?: number;
    sequence: number | undefined;
    locktime: number | undefined;
    keysInfo: KeyInfo[];
    scriptPubKey: Buffer;
    isSegwit: boolean;
    witnessScript: Buffer | undefined;
    redeemScript: Buffer | undefined;
}): number;
export {};
