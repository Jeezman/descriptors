import type { Psbt } from 'bitcoinjs-lib';
import type { ECPairInterface } from 'ecpair';
import type { BIP32Interface } from 'bip32';
import type { DescriptorInstance } from './descriptors';
import { LedgerState, LedgerManager } from './ledger';
export declare function signInputECPair({ psbt, index, ecpair }: {
    psbt: Psbt;
    index: number;
    ecpair: ECPairInterface;
}): void;
export declare function signECPair({ psbt, ecpair }: {
    psbt: Psbt;
    ecpair: ECPairInterface;
}): void;
export declare function signInputBIP32({ psbt, index, node }: {
    psbt: Psbt;
    index: number;
    node: BIP32Interface;
}): void;
export declare function signBIP32({ psbt, masterNode }: {
    psbt: Psbt;
    masterNode: BIP32Interface;
}): void;
/**
 * Signs an input of the `psbt` where the keys are controlled by a Ledger
 * device.
 *
 * The function will throw an error if it's unable to sign the input.
 */
export declare function signInputLedger({ psbt, index, ledgerManager }: {
    psbt: Psbt;
    index: number;
    ledgerManager: LedgerManager;
}): Promise<void>;
/**
 * @deprecated
 * @hidden
 */
export declare function signInputLedger({ psbt, index, descriptor, ledgerClient, ledgerState }: {
    psbt: Psbt;
    index: number;
    descriptor: DescriptorInstance;
    ledgerClient: unknown;
    ledgerState: LedgerState;
}): Promise<void>;
/**
 * Signs the inputs of the `psbt` where the keys are controlled by a Ledger
 * device.
 *
 * `signLedger` can sign multiple inputs of the same wallet policy in a single
 * pass by grouping inputs by their wallet policy type before the signing
 * process.
 *
 * The function will throw an error if it's unable to sign any input.
 */
export declare function signLedger({ psbt, ledgerManager }: {
    psbt: Psbt;
    ledgerManager: LedgerManager;
}): Promise<void>;
/**
 * @deprecated
 * @hidden
 */
export declare function signLedger({ psbt, descriptors, ledgerClient, ledgerState }: {
    psbt: Psbt;
    descriptors: DescriptorInstance[];
    ledgerClient: unknown;
    ledgerState: LedgerState;
}): Promise<void>;
