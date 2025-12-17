// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const updateLoading = status => {
    if (status) {
        $('#mempool-txs-table > tbody').addClass('blur');
        $('.loader__container--fullpage').removeClass('hidden');
        $('#pagination').addClass('hidden');
        $('#footer').addClass('hidden');
    } else {
        $('#mempool-txs-table > tbody').removeClass('blur');
        $('.loader__container--fullpage').addClass('hidden');
        $('#pagination').removeClass('hidden');
        $('#footer').removeClass('hidden');
    }
};

// UI actions
const goToPage = (event, page) => {
    event.preventDefault();
    reRenderPage({ page });
};

const renderAge = timestamp => moment(timestamp * 1000).fromNow();

// UI presentation elements
const datatable = () => {
    $('#mempool-txs-table').DataTable({
        layout: {
            // Remove the pagination buttons (we use our own)
            bottomEnd: null,
        },
        searching: false,
        lengthMenu: [25, 50, 100, 200],
        pageLength: DEFAULT_ROWS_PER_PAGE,
        language: {
            loadingRecords: '',
            zeroRecords: '',
            emptyTable: '',
        },
        order: [[2, 'desc']],
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
                data: { txHash: 'txHash', blockHeight: 'blockHeight' },
                title: 'ID',
                className: 'hash',
                render: renderTxId,
                orderable: false,
            },
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
                render: renderAge,
                orderSequence: ['desc', 'asc'],
                // Use timestamp to sort first, then this column. Since the data
                // will be the same there is no change in the sort whatsoever,
                // but this causes the sorting icons to be highlighted correctly
                // in the sorted column (and not only the hidden one). See
                // https://datatables.net/forums/discussion/comment/236616
                orderData: [1, 2],
            },
            {
                data: 'size',
                title: 'Size',
                render: renderSize,
                className: 'text-right',
                orderSequence: ['desc', 'asc'],
                type: 'file-size',
                targets: 0,
            },
            {
                name: 'fee',
                title: 'Fee',
                css: 'fee',
                render: renderFee,
                className: 'text-right',
                orderSequence: ['desc', 'asc'],
                type: 'html-num-fmt',
            },
            {
                data: { numInputs: 'numInputs' },
                title: 'Inputs',
                className: 'text-right',
                render: renderInput,
                orderSequence: ['desc', 'asc'],
            },
            {
                data: 'numOutputs',
                title: 'Outputs',
                className: 'text-right',
                orderSequence: ['desc', 'asc'],
            },
            {
                data: 'satsOutput',
                title: 'Output Amount',
                render: renderOutput,
                className: 'text-right',
                orderSequence: ['desc', 'asc'],
            },
            { name: 'responsive', render: () => '' },
        ],
    });

    params = window.state.getParameters();
    const page_size = params.rows;
    $('#mempool-txs-table').dataTable().api().page.len(page_size);
    refreshTxsTable();
};

$('#mempool-txs-table').on('init.dt', () => {
    $('.datatable__length-placeholder').remove();
});

$('#mempool-txs-table').on('length.dt', (e, settings, rows) => {
    params = window.state.getParameters();

    if (params.rows !== rows) {
        reRenderPage({ rows });
    }
});

$('#mempool-txs-table').on('xhr.dt', () => {
    updateLoading(false);
});

function refreshTxsTable() {
    params = window.state.getParameters();

    $('#mempool-txs-table').dataTable().api().ajax.url(`/api/mempool`).load();
}

// Basically a fake refresh, dynamically updates everything
// according to new params
// updates: URL, table and pagination
const reRenderPage = params => {
    if (params) {
        window.state.updateParameters(params);

        if (params.page) {
            // DataTable pages start at index 0, so we oblige
            $('#mempool-txs-table')
                .DataTable()
                .page(params.page - 1)
                .draw(false);
        }
    }

    const { currentPage, pageArray } =
        window.pagination.generatePaginationUIParams();
    window.pagination.generatePaginationUI(currentPage, pageArray);
};

// main
$(document).ready(() => {
    // init all UI elements
    datatable();

    // global state update
    reRenderPage();
});
