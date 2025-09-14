// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

import React from 'react';
import styled from 'styled-components';

const PaginationContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 20px 0;
    align-items: center;
`;

const PaginationInfo = styled.div`
    color: ${props => props.theme.secondaryText};
    font-size: var(--text-sm);
    line-height: var(--text-sm--line-height);
    text-align: center;

    @media (max-width: 400px) {
        font-size: var(--text-xs);
        line-height: var(--text-xs--line-height);
    }
`;

const PageContainer = styled.div`
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: nowrap;
    justify-content: center;
    overflow-x: auto;
    padding: 0 4px;

    @media (max-width: 400px) {
        gap: 4px;
        padding: 0 2px;
    }
`;

const PageButton = styled.button<{ active?: boolean }>`
    padding: 6px 8px;
    border-radius: 4px;
    border: 1px solid ${props => props.theme.accent};
    background: ${props => (props.active ? props.theme.accent : 'transparent')};
    color: ${props =>
        props.active ? props.theme.primaryText : props.theme.secondaryText};
    font-size: var(--text-xs);
    line-height: var(--text-xs--line-height);
    cursor: pointer;
    transition: all 0.2s ease;
    min-width: 28px;

    @media (max-width: 400px) {
        padding: 4px 6px;
        min-width: 24px;
        font-size: 11px;
    }

    &:hover {
        background: ${props => props.theme.accent};
        color: ${props => props.theme.primaryText};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ArrowButton = styled(PageButton)`
    padding: 6px 8px;
    min-width: auto;

    @media (max-width: 400px) {
        padding: 4px 6px;
    }
`;

const Ellipsis = styled.span`
    padding: 6px 4px;
    font-size: var(--text-xs);
    color: ${props => props.theme.secondaryText};

    @media (max-width: 400px) {
        padding: 4px 2px;
        font-size: 10px;
    }
`;

interface TxHistoryPaginationProps {
    currentPage: number;
    totalPages: number;
    loading: boolean;
    onPageChange: (page: number) => void;
}

const TxHistoryPagination: React.FC<TxHistoryPaginationProps> = ({
    currentPage,
    totalPages,
    loading,
    onPageChange,
}) => {
    // Don't show pagination if there's only one page
    if (totalPages <= 1) {
        return null;
    }

    const getVisiblePages = (
        currentPage: number,
        totalPages: number,
        maxVisible = 5,
    ) => {
        // Helper to generate range of pages
        const range = (start: number, end: number) =>
            Array.from({ length: end - start + 1 }, (_, i) => start + i);

        // If total pages are less than or equal to maxVisible, show all
        if (totalPages <= maxVisible) {
            return range(0, totalPages - 1);
        }

        // Determine start and end based on currentPage position
        if (currentPage <= 2) {
            // Start: [0, 1, 2, 3, ..., last]
            return [
                ...range(0, Math.min(3, totalPages - 1)),
                -1,
                totalPages - 1,
            ];
        } else if (currentPage >= totalPages - 3) {
            // End: [0, ..., last-3, last-2, last-1, last]
            return [
                0,
                -1,
                ...range(Math.max(1, totalPages - 4), totalPages - 1),
            ];
        } else {
            // Middle: [0, ..., current-1, current, current+1, ..., last]
            return [
                0,
                -1,
                ...range(currentPage - 1, currentPage + 1),
                -1,
                totalPages - 1,
            ];
        }
    };

    const visiblePages = getVisiblePages(currentPage, totalPages);

    return (
        <PaginationContainer>
            <PaginationInfo>
                Page {currentPage + 1} of {totalPages}
            </PaginationInfo>

            <PageContainer>
                {/* Previous button */}
                <ArrowButton
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={loading || currentPage === 0}
                >
                    ←
                </ArrowButton>

                {/* Page numbers */}
                {visiblePages.map((page, index) => {
                    if (page === -1) {
                        return (
                            <Ellipsis key={`ellipsis-${index}`}>...</Ellipsis>
                        );
                    }

                    return (
                        <PageButton
                            key={page}
                            active={page === currentPage}
                            onClick={() => onPageChange(page)}
                            disabled={loading}
                        >
                            {page + 1}
                        </PageButton>
                    );
                })}

                {/* Next button */}
                <ArrowButton
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={loading || currentPage === totalPages - 1}
                >
                    →
                </ArrowButton>
            </PageContainer>
        </PaginationContainer>
    );
};

export default TxHistoryPagination;
