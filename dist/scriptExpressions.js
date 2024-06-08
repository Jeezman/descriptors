"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wpkhLedger = exports.shWpkhLedger = exports.pkhLedger = exports.wpkhBIP32 = exports.shWpkhBIP32 = exports.pkhBIP32 = void 0;
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const keyExpressions_1 = require("./keyExpressions");
function assertStandardKeyPath(keyPath) {
    // Regular expression to match "/change/index" or "/change/*" format
    const regex = /^\/[01]\/(\d+|\*)$/;
    if (!regex.test(keyPath)) {
        throw new Error("Error: Key path must be in the format '/change/index', where change is either 0 or 1 and index is a non-negative integer.");
    }
}
function standardExpressionsBIP32Maker(purpose, scriptTemplate) {
    /**
     * Computes the standard descriptor based on given parameters.
     *
     * You can define the output location either by:
     * - Providing the full `keyPath` (e.g., "/0/2").
     * OR
     * - Specifying the `change` and `index` values separately (e.g., `{change:0, index:2}`).
     *
     * For ranged indexing, the `index` can be set as a wildcard '*'. For example:
     * - `keyPath="/0/*"`
     * OR
     * - `{change:0, index:'*'}`.
     */
    function standardScriptExpressionBIP32({ masterNode, network = bitcoinjs_lib_1.networks.bitcoin, keyPath, account, change, index, isPublic = true }) {
        const originPath = `/${purpose}'/${network === bitcoinjs_lib_1.networks.bitcoin ? 0 : 1}'/${account}'`;
        if (keyPath !== undefined)
            assertStandardKeyPath(keyPath);
        const keyExpression = (0, keyExpressions_1.keyExpressionBIP32)({
            masterNode,
            originPath,
            keyPath,
            change,
            index,
            isPublic
        });
        return scriptTemplate.replace('KEYEXPRESSION', keyExpression);
    }
    return standardScriptExpressionBIP32;
}
exports.pkhBIP32 = standardExpressionsBIP32Maker(44, 'pkh(KEYEXPRESSION)');
exports.shWpkhBIP32 = standardExpressionsBIP32Maker(49, 'sh(wpkh(KEYEXPRESSION))');
exports.wpkhBIP32 = standardExpressionsBIP32Maker(84, 'wpkh(KEYEXPRESSION)');
function standardExpressionsLedgerMaker(purpose, scriptTemplate) {
    /** @hidden */
    async function standardScriptExpressionLedger({ ledgerClient, ledgerState, ledgerManager, network, account, keyPath, change, index }) {
        if (ledgerManager && (ledgerClient || ledgerState))
            throw new Error(`ledgerClient and ledgerState have been deprecated`);
        if (ledgerManager && network)
            throw new Error(`ledgerManager already includes the network object`);
        if (!ledgerManager && !network)
            network = bitcoinjs_lib_1.networks.bitcoin;
        if (ledgerManager)
            ({ ledgerClient, ledgerState, network } = ledgerManager);
        if (!ledgerClient || !ledgerState)
            throw new Error(`Could not retrieve ledgerClient or ledgerState`);
        const originPath = `/${purpose}'/${network === bitcoinjs_lib_1.networks.bitcoin ? 0 : 1}'/${account}'`;
        if (keyPath !== undefined)
            assertStandardKeyPath(keyPath);
        const keyExpression = await (0, keyExpressions_1.keyExpressionLedger)({
            ledgerClient,
            ledgerState,
            originPath,
            keyPath,
            change,
            index
        });
        return scriptTemplate.replace('KEYEXPRESSION', keyExpression);
    }
    return standardScriptExpressionLedger;
}
exports.pkhLedger = standardExpressionsLedgerMaker(44, 'pkh(KEYEXPRESSION)');
exports.shWpkhLedger = standardExpressionsLedgerMaker(49, 'sh(wpkh(KEYEXPRESSION))');
exports.wpkhLedger = standardExpressionsLedgerMaker(84, 'wpkh(KEYEXPRESSION)');
