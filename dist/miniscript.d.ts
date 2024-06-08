/// <reference types="node" />
import { Network } from 'bitcoinjs-lib';
import type { ECPairAPI } from 'ecpair';
import type { BIP32API } from 'bip32';
import type { PartialSig } from 'bip174/src/lib/interfaces';
import type { Preimage, TimeConstraints, ExpansionMap } from './types';
/**
 * Expand a miniscript to a generalized form using variables instead of key
 * expressions. Variables will be of this form: @0, @1, ...
 * This is done so that it can be compiled with compileMiniscript and
 * satisfied with satisfier.
 * Also compute pubkeys from descriptors to use them later.
 */
export declare function expandMiniscript({ miniscript, isSegwit, network, ECPair, BIP32 }: {
    miniscript: string;
    isSegwit: boolean;
    network?: Network;
    ECPair: ECPairAPI;
    BIP32: BIP32API;
}): {
    expandedMiniscript: string;
    expansionMap: ExpansionMap;
};
export declare function miniscript2Script({ expandedMiniscript, expansionMap }: {
    expandedMiniscript: string;
    expansionMap: ExpansionMap;
}): Buffer;
/**
 * Assumptions:
 * The attacker does not have access to any of the private keys of public keys
 * that participate in the Script.
 *
 * The attacker only has access to hash preimages that honest users have access
 * to as well.
 *
 * Pass timeConstraints to search for the first solution with this nLockTime and
 * nSequence. Throw if no solution is possible using these constraints.
 *
 * Don't pass timeConstraints (this is the default) if you want to get the
 * smallest size solution altogether.
 *
 * If a solution is not found this function throws.
 */
export declare function satisfyMiniscript({ expandedMiniscript, expansionMap, signatures, preimages, timeConstraints }: {
    expandedMiniscript: string;
    expansionMap: ExpansionMap;
    signatures?: PartialSig[];
    preimages?: Preimage[];
    timeConstraints?: TimeConstraints;
}): {
    scriptSatisfaction: Buffer;
    nLockTime: number | undefined;
    nSequence: number | undefined;
};
/**
 *
 * Use this function instead of bitcoinjs-lib's equivalent `script.number.encode`
 * when encoding numbers to be compiled with `fromASM` to avoid problems.
 *
 * Motivation:
 *
 * Numbers in Bitcoin assembly code are represented in hex and in Little Endian.
 * Decimal: 32766 - Big endian: 0x7FFE - Little Endian: 0xFE7F.
 *
 * This function takes an integer and encodes it so that bitcoinjs-lib `fromASM`
 * can compile it. This is basically what bitcoinjs-lib's `script.number.encode`
 * does.
 *
 * Note that `fromASM` already converts integers from 1 to 16 to
 * OP_1 ... OP_16 {@link https://github.com/bitcoinjs/bitcoinjs-lib/blob/59b21162a2c4645c64271ca004c7a3755a3d72fb/src/script.js#L33 here}.
 * This is done in Bitcoin to save some bits.
 *
 * Neither this function nor `script.number.encode` convert numbers to
 * their op code equivalent since this is done later in `fromASM`.
 *
 * Both functions simply convert numbers to Little Endian.
 *
 * However, the `0` number is an edge case that we specially handle with this
 * function.
 *
 * bitcoinjs-lib's `bscript.number.encode(0)` produces an empty Buffer.
 * This is what the Bitcoin interpreter does and it is what `script.number.encode` was
 * implemented to do.
 *
 * The problem is `bscript.number.encode(0).toString('hex')` produces an
 * empty string and thus it should not be used to serialize number zero before `fromASM`.
 *
 * A zero should produce the OP_0 ASM symbolic code (corresponding to a `0` when
 * compiled).
 *
 * So, this function will produce a string in hex format in Little Endian
 * encoding for integers not equal to `0` and it will return `OP_0` for `0`.
 *
 * Read more about the this {@link https://github.com/bitcoinjs/bitcoinjs-lib/issues/1799#issuecomment-1122591738 here}.
 *
 * Use it in combination with `fromASM` like this:
 *
 * ```javascript
 * //To produce "0 1 OP_ADD":
 * fromASM(
 * `${numberEncodeAsm(0)} ${numberEncodeAsm(1)} OP_ADD`
 *   .trim().replace(/\s+/g, ' ')
 * )
 * ```
 *
 * @param {number} number An integer.
 * @returns {string} Returns `"OP_0"` for `number === 0` and a hex string representing other numbers in Little Endian encoding.
 */
export declare function numberEncodeAsm(number: number): string;
