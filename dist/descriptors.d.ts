/// <reference types="node" />
import { Network, Payment, Psbt } from 'bitcoinjs-lib';
import type { PartialSig } from 'bip174/src/lib/interfaces';
import { BIP32API } from 'bip32';
import { ECPairAPI } from 'ecpair';
import type { TinySecp256k1Interface, Preimage, TimeConstraints, Expansion, ExpansionMap, ParseKeyExpression } from './types';
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
export declare function DescriptorsFactory(ecc: TinySecp256k1Interface): {
    /** @deprecated */ Descriptor: {
        new ({ expression, ...rest }: {
            expression: string;
            index?: number;
            checksumRequired?: boolean;
            allowMiniscriptInP2SH?: boolean;
            network?: Network;
            preimages?: Preimage[];
            signersPubKeys?: Buffer[];
        }): {
            readonly "__#1@#payment": Payment;
            readonly "__#1@#preimages": Preimage[];
            readonly "__#1@#signersPubKeys": Buffer[];
            readonly "__#1@#miniscript"?: string;
            readonly "__#1@#witnessScript"?: Buffer;
            readonly "__#1@#redeemScript"?: Buffer;
            readonly "__#1@#isSegwit"?: boolean;
            readonly "__#1@#expandedExpression"?: string;
            readonly "__#1@#expandedMiniscript"?: string;
            readonly "__#1@#expansionMap"?: ExpansionMap;
            readonly "__#1@#network": Network;
            /**
             * Gets the TimeConstraints (nSequence and nLockTime) of the miniscript
             * descriptor as passed in the constructor, just using the expression,
             * the signersPubKeys and preimages.
             *
             * We just need to know which will be the signatures that will be
             * used (signersPubKeys) but final signatures are not necessary for
             * obtaning nLockTime and nSequence.
             *
             * Remember: nSequence and nLockTime are part of the hash that is signed.
             * Thus, they must not change after computing the signatures.
             * When running getScriptSatisfaction, using the final signatures,
             * satisfyMiniscript verifies that the time constraints did not change.
             */
            "__#1@#getTimeConstraints"(): TimeConstraints | undefined;
            /**
             * Creates and returns an instance of bitcoinjs-lib
             * [`Payment`](https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/ts_src/payments/index.ts)'s interface with the `scriptPubKey` of this `Output`.
             */
            getPayment(): Payment;
            /**
             * Returns the Bitcoin Address of this `Output`.
             */
            getAddress(): string;
            /**
             * Returns this `Output`'s scriptPubKey.
             */
            getScriptPubKey(): Buffer;
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
            getScriptSatisfaction(signatures: PartialSig[] | 'DANGEROUSLY_USE_FAKE_SIGNATURES'): Buffer;
            /**
             * Gets the nSequence required to fulfill this `Output`.
             */
            getSequence(): number | undefined;
            /**
             * Gets the nLockTime required to fulfill this `Output`.
             */
            getLockTime(): number | undefined;
            /**
             * Gets the witnessScript required to fulfill this `Output`. Only applies to
             * Segwit outputs.
             */
            getWitnessScript(): Buffer | undefined;
            /**
             * Gets the redeemScript required to fullfill this `Output`. Only applies to
             * SH outputs: sh(wpkh), sh(wsh), sh(lockingScript).
             */
            getRedeemScript(): Buffer | undefined;
            /**
             * Gets the bitcoinjs-lib [`network`](https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/ts_src/networks.ts) used to create this `Output`.
             */
            getNetwork(): Network;
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
            isSegwit(): boolean | undefined;
            /**
             * Returns the tuple: `{ isPKH: boolean; isWPKH: boolean; isSH: boolean; }`
             * for this Output.
             */
            guessOutput(): {
                isPKH: boolean;
                isWPKH: boolean;
                isSH: boolean;
            };
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
            inputWeight(isSegwitTx: boolean, signatures: PartialSig[] | 'DANGEROUSLY_USE_FAKE_SIGNATURES'): number;
            /**
             * Computes the Weight Unit contributions of this Output as if it were the
             * output in a tx.
             */
            outputWeight(): number;
            /** @deprecated - Use updatePsbtAsInput instead
             * @hidden
             */
            updatePsbt(params: {
                psbt: Psbt;
                txHex?: string;
                txId?: string;
                value?: number;
                vout: number;
            }): number;
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
            updatePsbtAsInput({ psbt, txHex, txId, value, vout }: {
                psbt: Psbt;
                txHex?: string;
                txId?: string;
                value?: number;
                vout: number;
            }): ({ psbt, validate }: {
                psbt: Psbt;
                /** Runs further test on the validity of the signatures.
                 * It speeds down the finalization process but makes sure the psbt will
                 * be valid.
                 * @default true */
                validate?: boolean | undefined;
            }) => void;
            /**
             * Adds this output as an output of the provided `psbt` with the given
             * value.
             *
             * @param psbt - The Partially Signed Bitcoin Transaction.
             * @param value - The value for the output in satoshis.
             */
            updatePsbtAsOutput({ psbt, value }: {
                psbt: Psbt;
                value: number;
            }): void;
            "__#1@#assertPsbtInput"({ psbt, index }: {
                psbt: Psbt;
                index: number;
            }): void;
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
            finalizePsbtInput({ index, psbt, validate }: {
                index: number;
                psbt: Psbt;
                /** Runs further test on the validity of the signatures.
                 * It speeds down the finalization process but makes sure the psbt will
                 * be valid.
                 * @default true */
                validate?: boolean | undefined;
            }): void;
            /**
             * Decomposes the descriptor used to form this `Output` into its elemental
             * parts. See {@link ExpansionMap ExpansionMap} for a detailed explanation.
             */
            expand(): {
                expansionMap?: ExpansionMap;
                expandedMiniscript?: string;
                miniscript?: string;
                expandedExpression?: string;
            };
        };
    };
    Output: {
        new ({ descriptor, index, checksumRequired, allowMiniscriptInP2SH, network, preimages, signersPubKeys }: {
            /**
             * The descriptor string in ASCII format. It may include a "*" to denote an arbitrary index (aka ranged descriptors).
             */
            descriptor: string;
            /**
             * The descriptor's index in the case of a range descriptor (must be an integer >=0).
             */
            index?: number;
            /**
             * An optional flag indicating whether the descriptor is required to include a checksum.
             * @defaultValue false
             */
            checksumRequired?: boolean;
            /**
             * A flag indicating whether this instance can parse and generate script satisfactions for sh(miniscript) top-level expressions of miniscripts. This is not recommended.
             * @defaultValue false
             */
            allowMiniscriptInP2SH?: boolean;
            /**
             * One of bitcoinjs-lib [`networks`](https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/src/networks.js) (or another one following the same interface).
             * @defaultValue networks.bitcoin
             */
            network?: Network;
            /**
             * An array of preimages if the miniscript-based descriptor uses them.
             *
             * This info is necessary to finalize Psbts. Leave it `undefined` if your
             * miniscript-based descriptor does not use preimages or you don't know
             * or don't wanto use them.
             *
             * You can also leave it `undefined` if only need to generate the
             * `scriptPubKey` or `address` for a descriptor.
             *
             * @defaultValue `[]`
             */
            preimages?: Preimage[];
            /**
             * An array of the public keys used for signing the transaction when
             * spending the previous output associated with this descriptor.
             *
             * This parameter is only used if the descriptor object is being used to
             * finalize a transaction. It is necessary to specify the spending path
             * when working with miniscript-based expressions that have multiple
             * spending paths.
             *
             * Set this parameter to an array containing the public
             * keys involved in the desired spending path. Leave it `undefined` if you
             * only need to generate the `scriptPubKey` or `address` for a descriptor,
             * or if all the public keys involved in the descriptor will sign the
             * transaction. In the latter case, the satisfier will automatically
             * choose the most optimal spending path (if more than one is available).
             *
             * For more details on using this parameter, refer to [this Stack Exchange
             * answer](https://bitcoin.stackexchange.com/a/118036/89665).
             */
            signersPubKeys?: Buffer[];
        }): {
            readonly "__#1@#payment": Payment;
            readonly "__#1@#preimages": Preimage[];
            readonly "__#1@#signersPubKeys": Buffer[];
            readonly "__#1@#miniscript"?: string;
            readonly "__#1@#witnessScript"?: Buffer;
            readonly "__#1@#redeemScript"?: Buffer;
            readonly "__#1@#isSegwit"?: boolean;
            readonly "__#1@#expandedExpression"?: string;
            readonly "__#1@#expandedMiniscript"?: string;
            readonly "__#1@#expansionMap"?: ExpansionMap;
            readonly "__#1@#network": Network;
            /**
             * Gets the TimeConstraints (nSequence and nLockTime) of the miniscript
             * descriptor as passed in the constructor, just using the expression,
             * the signersPubKeys and preimages.
             *
             * We just need to know which will be the signatures that will be
             * used (signersPubKeys) but final signatures are not necessary for
             * obtaning nLockTime and nSequence.
             *
             * Remember: nSequence and nLockTime are part of the hash that is signed.
             * Thus, they must not change after computing the signatures.
             * When running getScriptSatisfaction, using the final signatures,
             * satisfyMiniscript verifies that the time constraints did not change.
             */
            "__#1@#getTimeConstraints"(): TimeConstraints | undefined;
            /**
             * Creates and returns an instance of bitcoinjs-lib
             * [`Payment`](https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/ts_src/payments/index.ts)'s interface with the `scriptPubKey` of this `Output`.
             */
            getPayment(): Payment;
            /**
             * Returns the Bitcoin Address of this `Output`.
             */
            getAddress(): string;
            /**
             * Returns this `Output`'s scriptPubKey.
             */
            getScriptPubKey(): Buffer;
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
            getScriptSatisfaction(signatures: PartialSig[] | 'DANGEROUSLY_USE_FAKE_SIGNATURES'): Buffer;
            /**
             * Gets the nSequence required to fulfill this `Output`.
             */
            getSequence(): number | undefined;
            /**
             * Gets the nLockTime required to fulfill this `Output`.
             */
            getLockTime(): number | undefined;
            /**
             * Gets the witnessScript required to fulfill this `Output`. Only applies to
             * Segwit outputs.
             */
            getWitnessScript(): Buffer | undefined;
            /**
             * Gets the redeemScript required to fullfill this `Output`. Only applies to
             * SH outputs: sh(wpkh), sh(wsh), sh(lockingScript).
             */
            getRedeemScript(): Buffer | undefined;
            /**
             * Gets the bitcoinjs-lib [`network`](https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/ts_src/networks.ts) used to create this `Output`.
             */
            getNetwork(): Network;
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
            isSegwit(): boolean | undefined;
            /**
             * Returns the tuple: `{ isPKH: boolean; isWPKH: boolean; isSH: boolean; }`
             * for this Output.
             */
            guessOutput(): {
                isPKH: boolean;
                isWPKH: boolean;
                isSH: boolean;
            };
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
            inputWeight(isSegwitTx: boolean, signatures: PartialSig[] | 'DANGEROUSLY_USE_FAKE_SIGNATURES'): number;
            /**
             * Computes the Weight Unit contributions of this Output as if it were the
             * output in a tx.
             */
            outputWeight(): number;
            /** @deprecated - Use updatePsbtAsInput instead
             * @hidden
             */
            updatePsbt(params: {
                psbt: Psbt;
                txHex?: string;
                txId?: string;
                value?: number;
                vout: number;
            }): number;
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
            updatePsbtAsInput({ psbt, txHex, txId, value, vout }: {
                psbt: Psbt;
                txHex?: string;
                txId?: string;
                value?: number;
                vout: number;
            }): ({ psbt, validate }: {
                psbt: Psbt;
                /** Runs further test on the validity of the signatures.
                 * It speeds down the finalization process but makes sure the psbt will
                 * be valid.
                 * @default true */
                validate?: boolean | undefined;
            }) => void;
            /**
             * Adds this output as an output of the provided `psbt` with the given
             * value.
             *
             * @param psbt - The Partially Signed Bitcoin Transaction.
             * @param value - The value for the output in satoshis.
             */
            updatePsbtAsOutput({ psbt, value }: {
                psbt: Psbt;
                value: number;
            }): void;
            "__#1@#assertPsbtInput"({ psbt, index }: {
                psbt: Psbt;
                index: number;
            }): void;
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
            finalizePsbtInput({ index, psbt, validate }: {
                index: number;
                psbt: Psbt;
                /** Runs further test on the validity of the signatures.
                 * It speeds down the finalization process but makes sure the psbt will
                 * be valid.
                 * @default true */
                validate?: boolean | undefined;
            }): void;
            /**
             * Decomposes the descriptor used to form this `Output` into its elemental
             * parts. See {@link ExpansionMap ExpansionMap} for a detailed explanation.
             */
            expand(): {
                expansionMap?: ExpansionMap;
                expandedMiniscript?: string;
                miniscript?: string;
                expandedExpression?: string;
            };
        };
    };
    parseKeyExpression: ParseKeyExpression;
    expand: {
        (params: {
            /**
             * The descriptor expression to be expanded.
             */
            descriptor: string;
            /**
             * The descriptor index, if ranged.
             */
            index?: number;
            /**
             * A flag indicating whether the descriptor is required to include a checksum.
             * @defaultValue false
             */
            checksumRequired?: boolean;
            /**
             * The Bitcoin network to use.
             * @defaultValue `networks.bitcoin`
             */
            network?: Network;
            /**
             * Flag to allow miniscript in P2SH.
             * @defaultValue false
             */
            allowMiniscriptInP2SH?: boolean;
        }): Expansion;
        (params: {
            expression: string;
            index?: number;
            checksumRequired?: boolean;
            network?: Network;
            allowMiniscriptInP2SH?: boolean;
        }): Expansion;
    };
    ECPair: ECPairAPI;
    BIP32: BIP32API;
};
/** @hidden @deprecated */
type DescriptorConstructor = ReturnType<typeof DescriptorsFactory>['Descriptor'];
/** @hidden  @deprecated */
type DescriptorInstance = InstanceType<DescriptorConstructor>;
export { DescriptorInstance, DescriptorConstructor };
type OutputConstructor = ReturnType<typeof DescriptorsFactory>['Output'];
/**
 * The {@link DescriptorsFactory | `DescriptorsFactory`} function internally
 * creates and returns the {@link _Internal_.Output | `Descriptor`} class.
 * This class is specialized for the provided `TinySecp256k1Interface`.
 * Use `OutputInstance` to declare instances for this class:
 * `const: OutputInstance = new Output();`
 *
 * See the {@link _Internal_.Output | documentation for the internal `Output`
 * class} for a complete list of available methods.
 */
type OutputInstance = InstanceType<OutputConstructor>;
export { OutputInstance, OutputConstructor };
