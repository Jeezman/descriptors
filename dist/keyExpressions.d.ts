import { Network } from 'bitcoinjs-lib';
import type { ECPairAPI } from 'ecpair';
import type { BIP32API, BIP32Interface } from 'bip32';
import type { KeyInfo } from './types';
import { LedgerState, LedgerManager } from './ledger';
/**
 * Parses a key expression (xpub, xprv, pubkey or wif) into {@link KeyInfo | `KeyInfo`}.
 *
 * For example, given this `keyExpression`: `"[d34db33f/49'/0'/0']tpubDCdxmvzJ5QBjTN8oCjjyT2V58AyZvA1fkmCeZRC75QMoaHcVP2m45Bv3hmnR7ttAwkb2UNYyoXdHVt4gwBqRrJqLUU2JrM43HippxiWpHra/1/2/3/4/*"`, this is its parsed result:
 *
 * ```javascript
 *  {
 *    keyExpression:
 *      "[d34db33f/49'/0'/0']tpubDCdxmvzJ5QBjTN8oCjjyT2V58AyZvA1fkmCeZRC75QMoaHcVP2m45Bv3hmnR7ttAwkb2UNYyoXdHVt4gwBqRrJqLUU2JrM43HippxiWpHra/1/2/3/4/*",
 *    keyPath: '/1/2/3/4/*',
 *    originPath: "/49'/0'/0'",
 *    path: "m/49'/0'/0'/1/2/3/4/*",
 *    // Other relevant properties of the type `KeyInfo`: `pubkey`, `ecpair` & `bip32` interfaces, `masterFingerprint`, etc.
 *  }
 * ```
 */
export declare function parseKeyExpression({ keyExpression, isSegwit, ECPair, BIP32, network }: {
    keyExpression: string;
    /** @default networks.bitcoin */
    network?: Network;
    /**
     * Indicates if this key expression belongs to a a SegWit output. When set,
     * further checks are done to ensure the public key (if present in the
     * expression) is compressed (33 bytes).
     */
    isSegwit?: boolean;
    ECPair: ECPairAPI;
    BIP32: BIP32API;
}): KeyInfo;
/**
 * Constructs a key expression string for a Ledger device from the provided
 * components.
 *
 * This function assists in crafting key expressions tailored for Ledger
 * hardware wallets. It fetches the master fingerprint and xpub for a
 * specified origin path and then combines them with the input parameters.
 *
 * For detailed understanding and examples of terms like `originPath`,
 * `change`, and `keyPath`, refer to the documentation of
 * {@link _Internal_.ParseKeyExpression | ParseKeyExpression}, which consists
 * of the reverse procedure.
 *
 * @returns {string} - The formed key expression for the Ledger device.
 */
export declare function keyExpressionLedger({ ledgerManager, originPath, keyPath, change, index }: {
    ledgerManager: LedgerManager;
    originPath: string;
    change?: number | undefined;
    index?: number | undefined | '*';
    keyPath?: string | undefined;
}): Promise<string>;
/** @deprecated @hidden */
export declare function keyExpressionLedger({ ledgerClient, ledgerState, originPath, keyPath, change, index }: {
    ledgerClient: unknown;
    ledgerState: LedgerState;
    originPath: string;
    change?: number | undefined;
    index?: number | undefined | '*';
    keyPath?: string | undefined;
}): Promise<string>;
/**
 * Constructs a key expression string from its constituent components.
 *
 * This function essentially performs the reverse operation of
 * {@link _Internal_.ParseKeyExpression | ParseKeyExpression}. For detailed
 * explanations and examples of the terms used here, refer to
 * {@link _Internal_.ParseKeyExpression | ParseKeyExpression}.
 */
export declare function keyExpressionBIP32({ masterNode, originPath, keyPath, change, index, isPublic }: {
    masterNode: BIP32Interface;
    originPath: string;
    change?: number | undefined;
    index?: number | undefined | '*';
    keyPath?: string | undefined;
    /**
     * Compute an xpub or xprv
     * @default true
     */
    isPublic?: boolean;
}): string;
