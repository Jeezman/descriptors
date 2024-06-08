/// <reference types="node" />
import { DescriptorInstance, OutputInstance } from './descriptors';
import { Network, Psbt } from 'bitcoinjs-lib';
import type { TinySecp256k1Interface } from './types';
/**
 * Dynamically imports the 'ledger-bitcoin' module and, if provided, checks if `ledgerClient` is an instance of `AppClient`.
 *
 * @async
 * @param {unknown} ledgerClient - An optional parameter that, if provided, is checked to see if it's an instance of `AppClient`.
 * @throws {Error} Throws an error if `ledgerClient` is provided but is not an instance of `AppClient`.
 * @throws {Error} Throws an error if the 'ledger-bitcoin' module cannot be imported. This typically indicates that the 'ledger-bitcoin' peer dependency is not installed.
 * @returns {Promise<unknown>} Returns a promise that resolves with the entire 'ledger-bitcoin' module if it can be successfully imported. We force it to return an unknown type so that the declaration of this function won't break projects that don't use ledger-bitcoin as dependency
 *
 * @example
 *
 * importAndValidateLedgerBitcoin(ledgerClient)
 *   .then((module) => {
 *     const { AppClient, PsbtV2, DefaultWalletPolicy, WalletPolicy, DefaultDescriptorTemplate, PartialSignature } = module;
 *     // Use the imported objects...
 *   })
 *   .catch((error) => console.error(error));
 */
export declare function importAndValidateLedgerBitcoin(ledgerClient?: unknown): Promise<unknown>;
/**
 * Verifies if the Ledger device is connected, if the required Bitcoin App is opened,
 * and if the version of the app meets the minimum requirements.
 *
 * @throws Will throw an error if the Ledger device is not connected, the required
 * Bitcoin App is not opened, or if the version is below the required number.
 *
 * @returns Promise<void> - A promise that resolves if all assertions pass, or throws otherwise.
 */
export declare function assertLedgerApp({ transport, name, minVersion }: {
    /**
     * Connection transport with the Ledger device.
     * One of these: https://github.com/LedgerHQ/ledger-live#libs---libraries
     */
    transport: any;
    /**
     * The name of the Bitcoin App. "Bitcoin" for mainnet or "Bitcoin Test" for testnet.
     */
    name: string;
    /**
     * The minimum acceptable version of the Bitcoin App in semver format (major.minor.patch).
     */
    minVersion: string;
}): Promise<void>;
export type LedgerPolicy = {
    policyName?: string;
    ledgerTemplate: string;
    keyRoots: string[];
    policyId?: Buffer;
    policyHmac?: Buffer;
};
/**
 * Ledger devices operate in a state-less manner. Therefore, policy information
 * needs to be maintained in a separate data structure, `ledgerState`. For optimization,
 * `ledgerState` also stores cached xpubs and the masterFingerprint.
 */
export type LedgerState = {
    masterFingerprint?: Buffer;
    policies?: LedgerPolicy[];
    xpubs?: {
        [key: string]: string;
    };
};
export type LedgerManager = {
    ledgerClient: unknown;
    ledgerState: LedgerState;
    ecc: TinySecp256k1Interface;
    network: Network;
};
/** Retrieves the masterFingerPrint of a Ledger device */
export declare function getLedgerMasterFingerPrint({ ledgerManager }: {
    ledgerManager: LedgerManager;
}): Promise<Buffer>;
/** @deprecated @hidden */
export declare function getLedgerMasterFingerPrint({ ledgerClient, ledgerState }: {
    ledgerClient: unknown;
    ledgerState: LedgerState;
}): Promise<Buffer>;
/** Retrieves the xpub of a certain originPath of a Ledger device */
export declare function getLedgerXpub({ originPath, ledgerManager }: {
    originPath: string;
    ledgerManager: LedgerManager;
}): Promise<string>;
/** @deprecated @hidden */
export declare function getLedgerXpub({ originPath, ledgerClient, ledgerState }: {
    originPath: string;
    ledgerClient: unknown;
    ledgerState: LedgerState;
}): Promise<string>;
/**
 * Checks whether there is a policy in ledgerState that the ledger
 * could use to sign this psbt input.
 *
 * It found return the policy, otherwise, return undefined
 *
 * All considerations in the header of this file are applied
 */
export declare function ledgerPolicyFromPsbtInput({ ledgerManager, psbt, index }: {
    ledgerManager: LedgerManager;
    psbt: Psbt;
    index: number;
}): Promise<LedgerPolicy | undefined>;
/**
 * Given an output, it extracts its descriptor and converts it to a Ledger
 * Wallet Policy, that is, its keyRoots and template.
 *
 * keyRoots and template follow Ledger's specifications:
 * https://github.com/LedgerHQ/app-bitcoin-new/blob/develop/doc/wallet.md
 *
 * keyRoots and template are a generalization of a descriptor and serve to
 * describe internal and external addresses and any index.
 *
 * So, this function starts from a descriptor and obtains generalized Ledger
 * wallet policy.
 *
 * keyRoots is an array of strings, encoding xpub-type key expressions up to the origin.
 * F.ex.: [76223a6e/48'/1'/0'/2']tpubDE7NQymr4AFtewpAsWtnreyq9ghkzQBXpCZjWLFVRAvnbf7vya2eMTvT2fPapNqL8SuVvLQdbUbMfWLVDCZKnsEBqp6UK93QEzL8Ck23AwF
 *
 * Template encodes the descriptor script expression, where its key
 * expressions are represented using variables for each keyRoot and finished with "/**"
 * (for change 1 or 0 and any index). F.ex.:
 * wsh(sortedmulti(2,@0/**,@1/**)), where @0 corresponds the first element in the keyRoots array.
 *
 * If this descriptor does not contain any key that can be signed with the ledger
 * (non-matching masterFingerprint), then this function returns null.
 *
 * This function takes into account all the considerations regarding Ledger
 * policy implementation details expressed in the header of this file.
 */
export declare function ledgerPolicyFromOutput({ output, ledgerClient, ledgerState }: {
    output: OutputInstance;
    ledgerClient: unknown;
    ledgerState: LedgerState;
}): Promise<{
    ledgerTemplate: string;
    keyRoots: string[];
} | null>;
/**
 * Registers a policy based on a provided descriptor.
 *
 * This function will:
 * 1. Store the policy in `ledgerState` inside the `ledgerManager`.
 * 2. Avoid re-registering if the policy was previously registered.
 * 3. Skip registration if the policy is considered "standard".
 *
 * It's important to understand the nature of the Ledger Policy being registered:
 * - While a descriptor might point to a specific output index of a particular change address,
 *   the corresponding Ledger Policy abstracts this and represents potential outputs for
 *   all addresses (both external and internal).
 * - This means that the registered Ledger Policy is a generalized version of the descriptor,
 *   not assuming specific values for the keyPath.
 *
 */
export declare function registerLedgerWallet({ descriptor, ledgerManager, policyName }: {
    descriptor: string;
    ledgerManager: LedgerManager;
    /** The Name we want to assign to this specific policy */
    policyName: string;
}): Promise<void>;
/**
 * @deprecated
 * @hidden
 */
export declare function registerLedgerWallet({ descriptor, ledgerClient, ledgerState, policyName }: {
    descriptor: DescriptorInstance;
    ledgerClient: unknown;
    ledgerState: LedgerState;
    policyName: string;
}): Promise<void>;
/**
 * Retrieve a standard ledger policy or null if it does correspond.
 **/
export declare function ledgerPolicyFromStandard({ output, ledgerClient, ledgerState }: {
    output: OutputInstance;
    ledgerClient: unknown;
    ledgerState: LedgerState;
}): Promise<LedgerPolicy | null>;
export declare function comparePolicies(policyA: LedgerPolicy, policyB: LedgerPolicy): boolean;
/**
 * Retrieve a ledger policy from ledgerState or null if it does not exist yet.
 **/
export declare function ledgerPolicyFromState({ output, ledgerClient, ledgerState }: {
    output: OutputInstance;
    ledgerClient: unknown;
    ledgerState: LedgerState;
}): Promise<LedgerPolicy | null>;
