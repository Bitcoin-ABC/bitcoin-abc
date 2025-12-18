// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

const updateLoading = status => {
    if (status) {
        $('#txs-table > tbody').addClass('blur');
        $('.loader__container--fullpage').removeClass('hidden');
        $('#pagination').addClass('hidden');
        $('#footer').addClass('hidden');
    } else {
        $('#txs-table > tbody').removeClass('blur');
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

// UI presentation elements
const datatable = () => {
    const blockHash = $('#block-hash').text();

    $('#txs-table').DataTable({
        paging: false,
        searching: false,
        lengthMenu: [25, 50, 100, 200],
        pageLength: DEFAULT_ROWS_PER_PAGE,
        language: {
            loadingRecords: '',
            zeroRecords: '',
            emptyTable: '',
        },
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
                data: { txHash: 'txHash', blockHeight: 'blockHeight' },
                title: 'ID',
                className: 'hash',
                render: renderTxId,
                orderable: false,
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
    $('#txs-table').dataTable().api().page.len(page_size);
    refreshTxsTablePage(0);
};

// events
$(window).resize(() => {
    const { currentPage, pageArray } =
        window.pagination.generatePaginationUIParams();
    window.pagination.generatePaginationUI(currentPage, pageArray);
    $('#blocks-table').DataTable().responsive.rebuild();
    $('#blocks-table').DataTable().responsive.recalc();
});

$('#txs-table').on('init.dt', () => {
    $('.datatable__length-placeholder').remove();
});

$('#txs-table').on('length.dt', (e, settings, rows) => {
    params = window.state.getParameters();

    if (params.rows !== rows) {
        reRenderPage({ rows });
    }
});

$('#txs-table').on('xhr.dt', () => {
    updateLoading(false);
});

function refreshTxsTablePage(page) {
    const blockHash = $('#block-hash').text();
    params = window.state.getParameters();
    const page_size = params.rows;

    $('#txs-table')
        .dataTable()
        .api()
        .ajax.url(`/api/block/${blockHash}/transactions/${page}/${page_size}`)
        .load();
}

// Basically a fake refresh, dynamically updates everything
// according to new params
// updates: URL, table and pagination
const reRenderPage = params => {
    if (params) {
        window.state.updateParameters(params);

        if (params.page) {
            // DataTable pages start at index 0, so we oblige
            $('#txs-table')
                .DataTable()
                .page(params.page - 1)
                .draw(false);

            refreshTxsTablePage(params.page - 1);
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
