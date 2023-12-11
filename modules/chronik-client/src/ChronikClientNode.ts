import * as proto from '../proto/chronikNode';
import { BlockchainInfo } from './ChronikClient';
import { FailoverProxy } from './failoverProxy';
import { toHexRev } from './hex';

/**
 * Client to access an in-node Chronik instance.
 * Plain object, without any connections.
 */
export class ChronikClientNode {
    private _proxyInterface: FailoverProxy;
    /**
     * Create a new client. This just creates an object, without any connections.
     *
     * @param {string[]} urls Array of valid urls. A valid url comes with schema and without a trailing slash.
     * e.g. '['https://chronik.be.cash/xec2', 'https://chronik-native.fabien.cash']
     * The approach of accepting an array of urls as input is to ensure redundancy if the
     * first url encounters downtime.
     * @throws {error} throws error on invalid constructor inputs
     */
    constructor(urls: string[]) {
        // Instantiate FailoverProxy with the urls array
        this._proxyInterface = new FailoverProxy(urls);
    }

    // For unit test verification
    public proxyInterface(): FailoverProxy {
        return this._proxyInterface;
    }

    /** Fetch current info of the blockchain, such as tip hash and height. */
    public async blockchainInfo(): Promise<BlockchainInfo> {
        const data = await this._proxyInterface.get(`/blockchain-info`);
        const blockchainInfo = proto.BlockchainInfo.decode(data);
        return convertToBlockchainInfo(blockchainInfo);
    }
}

function convertToBlockchainInfo(
    blockchainInfo: proto.BlockchainInfo,
): BlockchainInfo {
    return {
        tipHash: toHexRev(blockchainInfo.tipHash),
        tipHeight: blockchainInfo.tipHeight,
    };
}
