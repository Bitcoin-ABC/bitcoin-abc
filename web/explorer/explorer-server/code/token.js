// Copyright (c) 2026 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const getTokenId = () => window.location.pathname.split('/')[2];

const renderTokenAmount = (_value, _type, row) => {
    if (row.token !== null) {
        let amount = row.stats.tokenOutput;
        let color = '';
        let sign = '';
        if (row.stats.doesBurnSlp) {
            amount = row.stats.tokenInput;
            color = '#ff4444';
            sign = '-';
        } else if (row.stats.deltaTokens > 0) {
            color = '#15ee3e';
            sign = '+';
        }
        const style = color ? ' style="color:' + color + '"' : '';
        return (
            '<span' +
            style +
            '>' +
            sign +
            renderAmount(amount, row.token.decimals) +
            ' ' +
            escapeHtml(row.token.tokenTicker) +
            '</span>'
        );
    }
    return '';
};

const updateTableLoading = isLoading => {
    if (isLoading) {
        $('#token-txs-table > tbody').addClass('blur');
        $('#pagination').addClass('hidden');
        $('#footer').addClass('hidden');
    } else {
        $('#token-txs-table > tbody').removeClass('blur');
        $('#pagination').removeClass('hidden');
        $('#footer').removeClass('hidden');
    }
};

const datatable = () => {
    const tokenId = getTokenId();

    $('#token-txs-table').DataTable({
        paging: false,
        searching: false,
        lengthMenu: [50, 100, 200],
        pageLength: DEFAULT_ROWS_PER_PAGE,
        language: {
            loadingRecords: '',
            zeroRecords: '',
            emptyTable: '',
        },
        ajax: `/api/token/${tokenId}/transactions`,
        order: [],
        responsive: {
            details: {
                type: 'column',
                target: -1,
            },
        },
        columnDefs: [
            {
                className: 'dtr-control',
                orderable: false,
                targets: -1,
            },
        ],
        columns: [
            {
                name: 'timestamp',
                data: 'timestamp',
                title: 'Timestamp',
                visible: false,
            },
            {
                name: 'age',
                data: 'timestamp',
                title: 'Age',
                render: renderTxAge,
                orderSequence: ['desc', 'asc'],
                orderData: [0],
            },
            {
                name: 'final',
                data: 'isFinal',
                orderable: false,
                render: renderFinal,
            },
            {
                name: 'datetime',
                data: 'timestamp',
                title: 'Date (UTC' + tzOffset + ')',
                render: renderTxTimestamp,
                orderSequence: ['desc', 'asc'],
                orderData: [0],
            },
            {
                name: 'txHash',
                data: { txHash: 'txHash', blockHeight: 'blockHeight' },
                title: 'Transaction ID',
                className: 'hex',
                render: renderTxId,
                orderable: false,
            },
            {
                name: 'blockHeight',
                title: 'Block Height',
                render: renderBlockHeight,
                orderSequence: ['desc', 'asc'],
            },
            {
                name: 'size',
                data: 'size',
                title: 'Size',
                render: renderSize,
                orderSequence: ['desc', 'asc'],
                type: 'file-size',
            },
            {
                name: 'deltaTokens',
                title: 'Amount Token',
                render: renderTokenAmount,
            },
            { name: 'responsive', render: () => '' },
        ],
    });
};

$('#token-txs-table').on('xhr.dt', () => {
    updateTableLoading(false);
});

const updateTable = paginationRequest => {
    const params = new URLSearchParams(paginationRequest).toString();
    const tokenId = getTokenId();

    updateTableLoading(true);
    $('#token-txs-table')
        .dataTable()
        .api()
        .ajax.url(`/api/token/${tokenId}/transactions?${params}`)
        .load();
};

const goToPage = (event, page) => {
    event.preventDefault();
    reRenderPage({ page });
};

$(document).on('change', '[name="token-txs-table_length"]', event => {
    reRenderPage({ rows: event.target.value, page: 1 });
});

const reRenderPage = params => {
    if (params) {
        window.state.updateParameters(params);
    }

    const paginationRequest = window.pagination.generatePaginationRequest();
    updateTable(paginationRequest);

    const { currentPage, pageArray } =
        window.pagination.generatePaginationUIParams();
    window.pagination.generatePaginationUI(currentPage, pageArray);
};

$(document).ready(() => {
    datatable();
    reRenderPage();
});
