import { getStatusValues } from '../components/roadmap/status.js';

describe('getStatusValues', () => {
    it('should throw an error if status, values, or allStatuses is missing', () => {
        expect(() => {
            getStatusValues({});
        }).toThrow('status, values, and allStatuses must be provided');
    });

    it('should throw an error if values object is missing keys for allStatuses', () => {
        const data = {
            status: 'pending',
            values: {
                pending: 'Pending',
                approved: 'Approved',
                rejected: 'Rejected',
            },
            allStatuses: ['pending', 'approved', 'rejected', 'canceled'],
        };

        expect(() => {
            getStatusValues(data);
        }).toThrow(
            'The values object must contain keys for pending,approved,rejected,canceled',
        );
    });

    it('should return the value corresponding to the provided status', () => {
        const data = {
            status: 'approved',
            values: {
                pending: 'Pending',
                approved: 'Approved',
                rejected: 'Rejected',
            },
            allStatuses: ['pending', 'approved', 'rejected'],
        };

        const result = getStatusValues(data);
        expect(result).toEqual('Approved');
    });
});
