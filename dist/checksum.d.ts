export declare const CHECKSUM_CHARSET: string;
/**
 * Implements the Bitcoin descriptor's checksum algorithm described in
 * {@link https://github.com/bitcoin/bitcoin/blob/master/src/script/descriptor.cpp}
 */
export declare const DescriptorChecksum: (span: string) => string;
