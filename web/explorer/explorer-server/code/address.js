const getAddress = () => window.location.pathname.split('/')[2];

function renderTxHashCoins(row) {
    return (
        '<a href="/tx/' +
        row.txHash +
        '">' +
        minifyBlockID(row.txHash) +
        ':' +
        row.outIdx +
        (row.isCoinbase
            ? '<div class="ui green horizontal label cointable-coinbase">Coinbase</div>'
            : '') +
        '</a>'
    );
}

function renderRowsCoins(row, type, decimals, ticker) {
    if (type === 'token') {
        return (
            '<div class="coin-row">' +
            '<div>' +
            renderTxHashCoins(row) +
            '</div>' +
            '<div>' +
            '<a href="/block-height/' +
            row.blockHeight +
            '">' +
            renderInteger(row.blockHeight) +
            '</a>' +
            '</div>' +
            '<div>' +
            renderAmount(row.tokenAmount, decimals) +
            ' ' +
            ticker +
            '</div>' +
            '</div>'
        );
    } else
        return (
            '<div class="coin-row">' +
            '<div>' +
            renderTxHashCoins(row) +
            '</div>' +
            '<div>' +
            '<a href="/block-height/' +
            row.blockHeight +
            '">' +
            renderInteger(row.blockHeight) +
            '</a>' +
            '</div>' +
            '<div>' +
            renderSats(row.satsAmount) +
            ' XEC' +
            '</div>' +
            '</div>'
        );
}

var isSatsTableLoaded = false;
function loadSatsTable() {
    const listArray = [];
    for (let i = 0; i < addrBalances['main'].utxos.length; i++) {
        listArray.push(renderRowsCoins(addrBalances['main'].utxos[i]));
    }
    const numberOfItems = listArray.length;
    const numberPerPage = 10;
    const currentPage = 0;
    const numberOfPages = Math.ceil(numberOfItems / numberPerPage);

    function buildPagination(clickedPage) {
        $('.paginator').empty();
        const currPageNum = clickedPage;
        if (numberOfPages >= 3) {
            if (currPageNum === 0) {
                $('.paginator').append(
                    `<button class="page_btn" value="${0}">&#171;</button>`,
                );
                $('.paginator').append(
                    `<button class="page_btn active-pagination-btn" value="${currPageNum}">${
                        currPageNum + 1
                    }</button>`,
                );
                $('.paginator').append(
                    `<button class="page_btn" value="${currPageNum + 1}">${
                        currPageNum + 2
                    }</button>`,
                );
                $('.paginator').append(
                    `<button class="page_btn" value="${currPageNum + 2}">${
                        currPageNum + 3
                    }</button>`,
                );
                $('.paginator').append(
                    `<button class="page_btn" value="${
                        numberOfPages - 1
                    }">&#187;</button>`,
                );
            } else if (currPageNum === numberOfPages - 1) {
                $('.paginator').append(
                    `<button class="page_btn" value="${0}">&#171;</button>`,
                );
                $('.paginator').append(
                    `<button class="page_btn" value="${currPageNum - 2}">${
                        currPageNum - 1
                    }</button>`,
                );
                $('.paginator').append(
                    `<button class="page_btn" value="${
                        currPageNum - 1
                    }">${currPageNum}</button>`,
                );
                $('.paginator').append(
                    `<button class="page_btn active-pagination-btn" value="${currPageNum}">${
                        currPageNum + 1
                    }</button>`,
                );
                $('.paginator').append(
                    `<button class="page_btn" value="${
                        numberOfPages - 1
                    }">&#187;</button>`,
                );
            } else {
                $('.paginator').append(
                    `<button class="page_btn" value="${0}">&#171;</button>`,
                );
                $('.paginator').append(
                    `<button class="page_btn" value="${
                        currPageNum - 1
                    }">${currPageNum}</button>`,
                );
                $('.paginator').append(
                    `<button class="page_btn active-pagination-btn" value="${currPageNum}">${
                        currPageNum + 1
                    }</button>`,
                );
                $('.paginator').append(
                    `<button class="page_btn" value="${currPageNum + 1}">${
                        currPageNum + 2
                    }</button>`,
                );
                $('.paginator').append(
                    `<button class="page_btn" value="${
                        numberOfPages - 1
                    }">&#187;</button>`,
                );
            }
        } else {
            for (let i = 0; i < numberOfPages; i++) {
                if (i === currPageNum) {
                    $('.paginator').append(
                        `<button class="page_btn active-pagination-btn" value="${i}">${
                            i + 1
                        }</button>`,
                    );
                } else {
                    $('.paginator').append(
                        `<button class="page_btn" value="${i}">${
                            i + 1
                        }</button>`,
                    );
                }
            }
        }
    }

    function buildPage(currPage) {
        const trimStart = currPage * numberPerPage;
        const trimEnd = trimStart + numberPerPage;
        $('#sats-coins-table')
            .empty()
            .append(listArray.slice(trimStart, trimEnd));
    }

    $(document).ready(function () {
        buildPage(0);
        buildPagination(currentPage);

        $('.paginator').on('click', 'button', function () {
            var clickedPage = parseInt($(this).val());
            buildPagination(clickedPage);
            buildPage(clickedPage);
        });
    });
}

var isTokenTableLoaded = {};
function loadTokenTable(tokenId) {
    if (!isTokenTableLoaded[tokenId]) {
        for (let i = 0; i < addrBalances[tokenId].utxos.length; i++) {
            $('#tokens-coins-table-' + tokenId).append(
                renderRowsCoins(
                    addrBalances[tokenId].utxos[i],
                    'token',
                    addrBalances[tokenId].token?.decimals,
                    addrBalances[tokenId].token?.tokenTicker,
                ),
            );
        }
        isTokenTableLoaded[tokenId] = true;
    }
}

const renderAge = timestamp => {
    if (timestamp == 0) {
        return '<div class="ui gray horizontal label">Mempool</div>';
    }
    return moment(timestamp * 1000).fromNow();
};

const renderTimestamp = timestamp => {
    if (timestamp == 0) {
        return '<div class="ui gray horizontal label">Mempool</div>';
    }
    return moment(timestamp * 1000).format('ll, LTS');
};

const renderTxID = data => {
    if (data.blockHeight === 0) {
        return (
            '<a style="color:#CD0BC3" href="/tx/' +
            data.txHash +
            '">' +
            renderTxHash(data.txHash) +
            '</a>'
        );
    } else {
        return (
            '<a href="/tx/' +
            data.txHash +
            '">' +
            renderTxHash(data.txHash) +
            '</a>'
        );
    }
};

const renderBlockHeight = (_value, _type, row) => {
    if (row.blockHeight === null) {
        return '<div class="ui red horizontal label">Unconfirmed</div>';
    }
    return (
        '<a href="/block-height/' +
        row.blockHeight +
        '">' +
        renderInteger(row.blockHeight) +
        '</a>'
    );
};

const renderSize = size => formatByteSize(size);

const renderAmountXEC = (_value, _type, row) => {
    if (row.stats.deltaSats < 0) {
        return (
            '<span class="num-col-suffix" data-suffix="XEC">' +
            renderSats(row.stats.deltaSats) +
            '</span>'
        );
    } else
        return (
            '<span style="color:#15ee3e" class="num-col-suffix" data-suffix="XEC">+' +
            renderSats(row.stats.deltaSats) +
            '</span>'
        );
};

const renderToken = (_value, _type, row) => {
    if (row.token !== null) {
        var ticker =
            ' <a href="/tx/' +
            row.txHash +
            '">' +
            row.token.tokenTicker +
            '</a>';
        return renderAmount(row.stats.deltaTokens, row.token.decimals) + ticker;
    }
    return '';
};

const updateTableLoading = (isLoading, tableId) => {
    if (isLoading) {
        $(`#${tableId} > tbody`).addClass('blur');
        $('#pagination').addClass('hidden');
        $('#footer').addClass('hidden');
    } else {
        $(`#${tableId} > tbody`).removeClass('blur');
        $('#pagination').removeClass('hidden');
        $('#footer').removeClass('hidden');
    }
};

const datatable = () => {
    const address = getAddress();

    $('#address-txs-table').DataTable({
        paging: false,
        buttons: [
            {
                extend: 'csv',
                text: 'Export to CSV',
            },
        ],
        searching: false,
        lengthMenu: [50, 100, 200],
        pageLength: DEFAULT_ROWS_PER_PAGE,
        language: {
            loadingRecords: '',
            zeroRecords: '',
            emptyTable: '',
        },
        ajax: `/api/address/${address}/transactions`,
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
                name: 'age',
                data: 'timestamp',
                title: 'Age',
                render: renderAge,
                orderSequence: ['desc', 'asc'],
            },
            {
                name: 'timestamp',
                data: 'timestamp',
                title: 'Date (UTC' + tzOffset + ')',
                render: renderTimestamp,
                orderSequence: ['desc', 'asc'],
            },
            {
                name: 'txHash',
                data: { txHash: 'txHash', blockHeight: 'blockHeight' },
                title: 'Transaction ID',
                className: 'hash',
                render: renderTxID,
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
                targets: 0,
            },
            {
                name: 'fee',
                title: 'Fee',
                className: 'fee',
                render: renderFee,
                orderSequence: ['desc', 'asc'],
            },
            {
                name: 'numInputs',
                data: 'numInputs',
                title: 'Inputs',
                orderSequence: ['desc', 'asc'],
            },
            {
                name: 'numOutputs',
                data: 'numOutputs',
                title: 'Outputs',
                orderSequence: ['desc', 'asc'],
            },
            {
                name: 'deltaSats',
                data: 'deltaSats',
                title: 'Amount',
                render: renderAmountXEC,
                orderSequence: ['desc', 'asc'],
                className: 'text-right',
            },
            { name: 'token', title: 'Amount Token', render: renderToken },
            { name: 'responsive', render: () => '' },
        ],
    });
};

$('#address-txs-table').on('xhr.dt', () => {
    updateTableLoading(false, 'address-txs-table');
});

const updateTable = paginationRequest => {
    const params = new URLSearchParams(paginationRequest).toString();
    const address = getAddress();

    updateTableLoading(true, 'address-txs-table');
    $('#address-txs-table')
        .dataTable()
        .api()
        .ajax.url(`/api/address/${address}/transactions?${params}`)
        .load();
};

const goToPage = (event, page) => {
    event.preventDefault();
    reRenderPage({ page });
};

$(document).on('change', '[name="address-txs-table_length"]', event => {
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

const rotateArrow = element => {
    $(element).find('.chevron').toggleClass('rotate-arrow');
};

$(document).ready(() => {
    datatable();
    reRenderPage();
});
