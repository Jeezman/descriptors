import { Network } from 'bitcoinjs-lib';
import type { LedgerState, LedgerManager } from './ledger';
import type { BIP32Interface } from 'bip32';
export declare const pkhBIP32: ({ masterNode, network, keyPath, account, change, index, isPublic }: {
    masterNode: BIP32Interface;
    /** @default networks.bitcoin */
    network?: Network;
    account: number;
    change?: number | undefined;
    index?: number | undefined | '*';
    keyPath?: string;
    /**
     * Compute an xpub or xprv
     * @default true
     */
    isPublic?: boolean;
}) => string;
export declare const shWpkhBIP32: ({ masterNode, network, keyPath, account, change, index, isPublic }: {
    masterNode: BIP32Interface;
    /** @default networks.bitcoin */
    network?: Network;
    account: number;
    change?: number | undefined;
    index?: number | undefined | '*';
    keyPath?: string;
    /**
     * Compute an xpub or xprv
     * @default true
     */
    isPublic?: boolean;
}) => string;
export declare const wpkhBIP32: ({ masterNode, network, keyPath, account, change, index, isPublic }: {
    masterNode: BIP32Interface;
    /** @default networks.bitcoin */
    network?: Network;
    account: number;
    change?: number | undefined;
    index?: number | undefined | '*';
    keyPath?: string;
    /**
     * Compute an xpub or xprv
     * @default true
     */
    isPublic?: boolean;
}) => string;
export declare const pkhLedger: {
    ({ ledgerManager, account, keyPath, change, index }: {
        ledgerManager: LedgerManager;
        account: number;
        keyPath?: string;
        change?: number | undefined;
        index?: number | undefined | '*';
    }): Promise<string>;
    ({ ledgerClient, ledgerState, network, account, keyPath, change, index }: {
        ledgerClient: unknown;
        ledgerState: LedgerState;
        /** @default networks.bitcoin */
        network?: Network;
        account: number;
        keyPath?: string;
        change?: number | undefined;
        index?: number | undefined | '*';
    }): Promise<string>;
};
export declare const shWpkhLedger: {
    ({ ledgerManager, account, keyPath, change, index }: {
        ledgerManager: LedgerManager;
        account: number;
        keyPath?: string;
        change?: number | undefined;
        index?: number | undefined | '*';
    }): Promise<string>;
    ({ ledgerClient, ledgerState, network, account, keyPath, change, index }: {
        ledgerClient: unknown;
        ledgerState: LedgerState;
        /** @default networks.bitcoin */
        network?: Network;
        account: number;
        keyPath?: string;
        change?: number | undefined;
        index?: number | undefined | '*';
    }): Promise<string>;
};
export declare const wpkhLedger: {
    ({ ledgerManager, account, keyPath, change, index }: {
        ledgerManager: LedgerManager;
        account: number;
        keyPath?: string;
        change?: number | undefined;
        index?: number | undefined | '*';
    }): Promise<string>;
    ({ ledgerClient, ledgerState, network, account, keyPath, change, index }: {
        ledgerClient: unknown;
        ledgerState: LedgerState;
        /** @default networks.bitcoin */
        network?: Network;
        account: number;
        keyPath?: string;
        change?: number | undefined;
        index?: number | undefined | '*';
    }): Promise<string>;
};
