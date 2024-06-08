export type { KeyInfo, Expansion } from './types';
import type { Psbt } from 'bitcoinjs-lib';
import type { DescriptorInstance, OutputInstance } from './descriptors';
export { DescriptorsFactory, DescriptorInstance, DescriptorConstructor, OutputInstance, OutputConstructor } from './descriptors';
export { DescriptorChecksum as checksum } from './checksum';
import * as signers from './signers';
export { signers };
/**
 * @hidden @deprecated
 * To finalize the `psbt`, you can either call the method
 * `output.finalizePsbtInput({ index, psbt })` on each descriptor, passing as
 * arguments the `psbt` and its input `index`, or call this helper function:
 * `finalizePsbt({psbt, outputs })`. In the latter case, `outputs` is an
 * array of {@link _Internal_.Output | Output elements} ordered in the array by
 * their respective input index in the `psbt`.
 */
declare function finalizePsbt(params: {
    psbt: Psbt;
    outputs: OutputInstance[];
    validate?: boolean | undefined;
}): void;
/**
 * @deprecated
 * @hidden
 * To be removed in version 3.0
 */
declare function finalizePsbt(params: {
    psbt: Psbt;
    descriptors: DescriptorInstance[];
    validate?: boolean | undefined;
}): void;
export { finalizePsbt };
export { keyExpressionBIP32, keyExpressionLedger } from './keyExpressions';
import * as scriptExpressions from './scriptExpressions';
export { scriptExpressions };
import { LedgerState, getLedgerMasterFingerPrint, getLedgerXpub, registerLedgerWallet, assertLedgerApp, LedgerManager } from './ledger';
export declare const ledger: {
    getLedgerMasterFingerPrint: typeof getLedgerMasterFingerPrint;
    getLedgerXpub: typeof getLedgerXpub;
    registerLedgerWallet: typeof registerLedgerWallet;
    assertLedgerApp: typeof assertLedgerApp;
};
export type { LedgerState, LedgerManager };
