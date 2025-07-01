// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import { expect } from 'chai';
import ChronikService from '../chronik';

// Mock the ChronikService to test only the volume calculation logic
class MockChronikService extends ChronikService {
    public testCalculateAgoraVolumeFromTxs(blockTxs: any[]) {
        // @ts-expect-error - Testing private method access
        return super.calculateAgoraVolumeFromTxs(blockTxs);
    }
}

describe('Agora Volume Processing', () => {
    let chronikService: MockChronikService;

    beforeEach(() => {
        chronikService = new MockChronikService({
            urls: ['http://localhost:8080'],
            connectionStrategy: 'closestFirst',
        });
    });

    it('should correctly identify XECX transactions and calculate volume', () => {
        const mockTxs = [
            {
                // XECX transaction from the example
                txid: 'f162a19206231bceef4ce78a96987da95c3c292f701e1b7588a870f1ae3d249f',
                inputs: [
                    {
                        inputScript:
                            '21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1404be55b60853431522dead3a889bd789500b70bdaf5fccf89f698b33692e21fc924f9ecc643d63faf291448ca2af9496181324336cddf5338147eab30e121ac6b4422020000000000001976a914bda1653f5bca215690e449da0281bebfa13aae5488ac03310d00000000001976a914bda1653f5bca215690e449da0281bebfa13aae5488ac4d26013dbc83a5a4085fa411a72c9755b60e260fe14c27a60c240f70c424f4ee226a2e01000000cd7b63817b6ea26976025307a26976559700887d945279012a7f757892635358807e7855965667525868807e5279559655807e827c7e5379012a7f777c7e825980bc7c7e01007e7b5493559657807e041976a914707501577f77a97e0288ac7e7e6b7d02220258800317a9147e024c7872587d807e7e7e01ab7e537901257f7702c1007f5c7f7701207f547f75049172ad3f886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501577f7768ac2202000000000000ffffffff2044880f4fdad5513c617842083bebe47ceb9c62321901b55388c1b81312c9a29172ad3f',
                        plugins: {
                            agora: {
                                groups: [
                                    '5003e4d137b0fd6d8cfbb6aeb1d83c6cb33b19143e7faeacc1d79cf6f052dc56f650',
                                    '54c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                                    '46c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                                ],
                                data: [
                                    '5041525449414c',
                                    '01',
                                    '01',
                                    '0500000000000000',
                                    '0500000000000000',
                                    '5307000000000000',
                                    '9172ad3f',
                                ],
                            },
                        },
                    },
                ],
                outputs: [
                    { sats: 0n },
                    { sats: 15000000000n }, // This should be counted as XECX volume
                    { sats: 546n },
                    { sats: 546n },
                    { sats: 3711557917n },
                ],
                tokenEntries: [
                    {
                        tokenId:
                            'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                    },
                ],
            },
        ];

        const result = chronikService.testCalculateAgoraVolumeFromTxs(mockTxs);

        expect(result.agora_volume_sats).to.equal(15000000000n);
        expect(result.agora_volume_xecx_sats).to.equal(15000000000n);
        expect(result.agora_volume_firma_sats).to.equal(0n);
    });

    it('should correctly identify Firma transactions and calculate volume', () => {
        const mockTxs = [
            {
                // Firma transaction from the example
                txid: '99386750b2217b6e7a3efd32b523be94020c0b832026b51a94352e47478807d7',
                inputs: [
                    {
                        inputScript:
                            '21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1404be55b60853431522dead3a889bd789500b70bdaf5fccf89f698b33692e21fc924f9ecc643d63faf291448ca2af9496181324336cddf5338147eab30e121ac6b4422020000000000001976a91446edb4fc4b5762248bd4ea0b3f4b176dd7dbbd4588ac03310d00000000001976a91446edb4fc4b5762248bd4ea0b3f4b176dd7dbbd4588ac4d26013dbc83a5a4085fa411a72c9755b60e260fe14c27a60c240f70c424f4ee226a2e01000000cd7b63817b6ea2697603430c3aa2697603b7d1009700887d945279012a7f757892635358807e7803b7d100965667525868807e527903b7d1009655807e827c7e5379012a7f777c7e825980bc7c7e01007e7b01609301619657807e041976a914707501577f77a97e0288ac7e7e6b7d02220258800317a9147e024c7872587d807e7e7e01ab7e537901257f7702cd007f5c7f7701207f547f7504e6778950886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501577f7768ac2202000000000000ffffffffd2709e8834274d9d64131b18ab7596c7f526aa58d69404d6acbdb1735ef1a556e6778950',
                        plugins: {
                            agora: {
                                groups: [
                                    '5003fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
                                    '540387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                                    '460387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                                ],
                                data: [
                                    '5041525449414c',
                                    '01',
                                    '01',
                                    'b7d1000000000000',
                                    '6100000000000000',
                                    '430c3a0000000000',
                                    'e6778950',
                                ],
                            },
                        },
                    },
                ],
                outputs: [
                    { sats: 0n },
                    { sats: 16577792n }, // This should be counted as Firma volume
                    { sats: 546n },
                    { sats: 546n },
                    { sats: 864515n },
                ],
                tokenEntries: [
                    {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                    },
                ],
            },
        ];

        const result = chronikService.testCalculateAgoraVolumeFromTxs(mockTxs);

        expect(result.agora_volume_sats).to.equal(16577792n);
        expect(result.agora_volume_xecx_sats).to.equal(0n);
        expect(result.agora_volume_firma_sats).to.equal(16577792n);
    });

    it('should handle mixed transactions correctly', () => {
        const mockTxs = [
            {
                // XECX transaction
                inputs: [
                    {
                        inputScript:
                            '21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1404be55b60853431522dead3a889bd789500b70bdaf5fccf89f698b33692e21fc924f9ecc643d63faf291448ca2af9496181324336cddf5338147eab30e121ac6b4422020000000000001976a914bda1653f5bca215690e449da0281bebfa13aae5488ac03310d00000000001976a914bda1653f5bca215690e449da0281bebfa13aae5488ac4d26013dbc83a5a4085fa411a72c9755b60e260fe14c27a60c240f70c424f4ee226a2e01000000cd7b63817b6ea26976025307a26976559700887d945279012a7f757892635358807e7855965667525868807e5279559655807e827c7e5379012a7f777c7e825980bc7c7e01007e7b5493559657807e041976a914707501577f77a97e0288ac7e7e6b7d02220258800317a9147e024c7872587d807e7e7e01ab7e537901257f7702c1007f5c7f7701207f547f75049172ad3f886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501577f7768ac2202000000000000ffffffff2044880f4fdad5513c617842083bebe47ceb9c62321901b55388c1b81312c9a29172ad3f',
                        plugins: {
                            agora: {
                                groups: [
                                    '5003e4d137b0fd6d8cfbb6aeb1d83c6cb33b19143e7faeacc1d79cf6f052dc56f650',
                                    '54c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                                    '46c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                                ],
                                data: [
                                    '5041525449414c',
                                    '01',
                                    '01',
                                    '0500000000000000',
                                    '0500000000000000',
                                    '5307000000000000',
                                    '9172ad3f',
                                ],
                            },
                        },
                    },
                ],
                outputs: [
                    { sats: 0n },
                    { sats: 15000000000n }, // XECX volume
                    { sats: 546n },
                    { sats: 546n },
                    { sats: 3711557917n },
                ],
                tokenEntries: [
                    {
                        tokenId:
                            'c67bf5c2b6d91cfb46a5c1772582eff80d88686887be10aa63b0945479cf4ed4',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                    },
                ],
            },
            {
                // Firma transaction
                inputs: [
                    {
                        inputScript:
                            '21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1404be55b60853431522dead3a889bd789500b70bdaf5fccf89f698b33692e21fc924f9ecc643d63faf291448ca2af9496181324336cddf5338147eab30e121ac6b4422020000000000001976a91446edb4fc4b5762248bd4ea0b3f4b176dd7dbbd4588ac03310d00000000001976a91446edb4fc4b5762248bd4ea0b3f4b176dd7dbbd4588ac4d26013dbc83a5a4085fa411a72c9755b60e260fe14c27a60c240f70c424f4ee226a2e01000000cd7b63817b6ea2697603430c3aa2697603b7d1009700887d945279012a7f757892635358807e7803b7d100965667525868807e527903b7d1009655807e827c7e5379012a7f777c7e825980bc7c7e01007e7b01609301619657807e041976a914707501577f77a97e0288ac7e7e6b7d02220258800317a9147e024c7872587d807e7e7e01ab7e537901257f7702cd007f5c7f7701207f547f7504e6778950886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501577f7768ac2202000000000000ffffffffd2709e8834274d9d64131b18ab7596c7f526aa58d69404d6acbdb1735ef1a556e6778950',
                        plugins: {
                            agora: {
                                groups: [
                                    '5003fba49912622cf8bb5b3729b1b5da3e72c6b57d369c8647f6cc7c6cbed510d105',
                                    '540387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                                    '460387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                                ],
                                data: [
                                    '5041525449414c',
                                    '01',
                                    '01',
                                    'b7d1000000000000',
                                    '6100000000000000',
                                    '430c3a0000000000',
                                    'e6778950',
                                ],
                            },
                        },
                    },
                ],
                outputs: [
                    { sats: 0n },
                    { sats: 16577792n }, // Firma volume
                    { sats: 546n },
                    { sats: 546n },
                    { sats: 864515n },
                ],
                tokenEntries: [
                    {
                        tokenId:
                            '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                    },
                ],
            },
            {
                // Other Agora transaction (not XECX or Firma)
                inputs: [
                    {
                        inputScript:
                            '21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1404be55b60853431522dead3a889bd789500b70bdaf5fccf89f698b33692e21fc924f9ecc643d63faf291448ca2af9496181324336cddf5338147eab30e121ac6b4422020000000000001976a914bda1653f5bca215690e449da0281bebfa13aae5488ac03310d00000000001976a914bda1653f5bca215690e449da0281bebfa13aae5488ac4d26013dbc83a5a4085fa411a72c9755b60e260fe14c27a60c240f70c424f4ee226a2e01000000cd7b63817b6ea26976025307a26976559700887d945279012a7f757892635358807e7855965667525868807e5279559655807e827c7e5379012a7f777c7e825980bc7c7e01007e7b5493559657807e041976a914707501577f77a97e0288ac7e7e6b7d02220258800317a9147e024c7872587d807e7e7e01ab7e537901257f7702c1007f5c7f7701207f547f75049172ad3f886b7ea97e01877e7c92647500687b8292697e6c6c7b7eaa88520144807c7ea86f7bbb7501c17e7c677501577f7768ac2202000000000000ffffffff2044880f4fdad5513c617842083bebe47ceb9c62321901b55388c1b81312c9a29172ad3f',
                        plugins: {
                            agora: {
                                groups: [
                                    '5003e4d137b0fd6d8cfbb6aeb1d83c6cb33b19143e7faeacc1d79cf6f052dc56f650',
                                    '54someothertokenid',
                                    '46someothertokenid',
                                ],
                                data: [
                                    '5041525449414c',
                                    '01',
                                    '01',
                                    '0500000000000000',
                                    '0500000000000000',
                                    '5307000000000000',
                                    '9172ad3f',
                                ],
                            },
                        },
                    },
                ],
                outputs: [
                    { sats: 0n },
                    { sats: 5000000000n }, // Other volume
                    { sats: 546n },
                    { sats: 546n },
                    { sats: 1000000000n },
                ],
                tokenEntries: [
                    {
                        tokenId: 'someothertokenid',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                    },
                ],
            },
        ];

        const result = chronikService.testCalculateAgoraVolumeFromTxs(mockTxs);

        expect(result.agora_volume_sats).to.equal(
            15000000000n + 16577792n + 5000000000n,
        );
        expect(result.agora_volume_xecx_sats).to.equal(15000000000n);
        expect(result.agora_volume_firma_sats).to.equal(16577792n);
    });

    it('should handle non-Agora transactions correctly', () => {
        const mockTxs = [
            {
                // Regular transaction (not Agora)
                inputs: [
                    {
                        inputScript:
                            '21023c72addb4fdf09af94f0c94d7fe92a386a7e70cf8a1d85916386bb2535c7b1b1404be55b60853431522dead3a889bd789500b70bdaf5fccf89f698b33692e21fc924f9ecc643d63faf291448ca2af9496181324336cddf5338147eab30e121ac6b4422020000000000001976a914bda1653f5bca215690e449da0281bebfa13aae5488ac03310d00000000001976a914bda1653f5bca215690e449da0281bebfa13aae5488ac',
                        // No plugins.agora
                    },
                ],
                outputs: [{ sats: 1000000000n }, { sats: 2000000000n }],
                tokenEntries: [
                    {
                        tokenId: 'someothertokenid',
                        tokenType: {
                            protocol: 'ALP',
                            type: 'ALP_TOKEN_TYPE_STANDARD',
                            number: 0,
                        },
                    },
                ],
            },
        ];

        const result = chronikService.testCalculateAgoraVolumeFromTxs(mockTxs);

        expect(result.agora_volume_sats).to.equal(0n);
        expect(result.agora_volume_xecx_sats).to.equal(0n);
        expect(result.agora_volume_firma_sats).to.equal(0n);
    });
});
