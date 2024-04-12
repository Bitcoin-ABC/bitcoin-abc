// data table rendering utilities
const renderInt = number => {
    var fmt = Intl.NumberFormat('en-EN').format(number);
    var parts = fmt.split(',');
    var str = '';
    for (var i = 0; i < parts.length - 1; ++i) {
        str += '<span class="digit-sep">' + parts[i] + '</span>';
    }
    str += '<span>' + parts[parts.length - 1] + '</span>';
    return str;
};
const renderAge = timestamp => moment(timestamp * 1000).fromNow();
const renderTemplate = height =>
    '<a href="/block-height/' + height + '">' + renderInt(height) + '</a>';
const renderFinal = isFinal => {
    if (isFinal) {
        return 'Yes';
    }
    return 'No';
};
const renderHash = (hash, _type, _row, meta) => {
    const api = new $.fn.dataTable.Api(meta.settings);
    const isHidden = !api.column(4).responsiveHidden();
    let minifiedHash = minifyHash(hash);

    if (isHidden) {
        minifiedHash = '0...' + minifiedHash.slice(minifiedHash.length - 6);
    }

    return `<a href="/block/${hash}">${minifiedHash}</a>`;
};
const renderNumtTxs = numTxs => renderInt(numTxs);
const renderSize = size => {
    if (size < 1024) {
        return size + ' B';
    } else if (size < 1024 * 1024) {
        return (size / 1000).toFixed(2) + ' kB';
    } else {
        return (size / 1000000).toFixed(2) + ' MB';
    }
};
const renderDifficulty = difficulty => {
    const estHashrate = (difficulty * 0xffffffff) / 600;

    if (estHashrate < 1e12) {
        return (estHashrate / 1e9).toFixed(2) + ' GH/s';
    } else if (estHashrate < 1e15) {
        return (estHashrate / 1e12).toFixed(2) + ' TH/s';
    } else if (estHashrate < 1e18) {
        return (estHashrate / 1e15).toFixed(2) + ' PH/s';
    } else {
        return (estHashrate / 1e18).toFixed(2) + ' EH/s';
    }
};
const renderTimestamp = timestamp => moment(timestamp * 1000).format('ll, LTS');

const updateLoading = status => {
    if (status) {
        $('#blocks-table > tbody').addClass('blur');
        $('.loader__container--fullpage').removeClass('hidden');
        $('#pagination').addClass('hidden');
        $('#footer').addClass('hidden');
    } else {
        $('#blocks-table > tbody').removeClass('blur');
        $('.loader__container--fullpage').addClass('hidden');
        $('#pagination').removeClass('hidden');
        $('#footer').removeClass('hidden');
    }
};

// data fetching
const updateTable = (startPosition, endPosition) => {
    updateLoading(true);
    $('#blocks-table')
        .dataTable()
        .api()
        .ajax.url(`/api/blocks/${endPosition}/${startPosition}`)
        .load();
};

// UI actions
const goToPage = (event, page) => {
    event.preventDefault();
    reRenderPage({ page });
};

// UI presentation elements
const dataTable = () => {
    const tzOffset = new Date().getTimezoneOffset();
    let tzString;

    if (tzOffset < 0) {
        tzString = moment
            .utc(moment.duration(-tzOffset, 'minutes').asMilliseconds())
            .format('+HH:mm');
    } else {
        tzString = moment
            .utc(moment.duration(tzOffset, 'minutes').asMilliseconds())
            .format('-HH:mm');
    }

    $('#date').text(`Date (${tzString})`);

    $('#blocks-table').DataTable({
        searching: false,
        retrieve: true,
        lengthMenu: [50, 100, 250, 500, 1000],
        pageLength: DEFAULT_ROWS_PER_PAGE,
        language: {
            loadingRecords: '',
            zeroRecords: '',
            emptyTable: '',
        },
        order: [[0, 'desc']],
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
                data: 'height',
                render: renderTemplate,
                orderSequence: ['desc', 'asc'],
            },
            {
                name: 'final',
                data: 'isFinal',
                orderable: false,
                render: renderFinal,
            },
            {
                data: 'hash',
                orderable: false,
                className: 'hash',
                render: renderHash,
            },
            {
                data: 'numTxs',
                render: renderNumtTxs,
                className: 'text-right',
                orderSequence: ['desc', 'asc'],
            },
            {
                name: 'age',
                data: 'timestamp',
                orderable: false,
                render: renderAge,
                className: 'text-right',
            },
            {
                data: 'difficulty',
                orderable: false,
                render: renderDifficulty,
                className: 'text-right',
            },
            {
                data: 'size',
                orderable: false,
                render: renderSize,
                className: 'text-right',
            },
            { name: 'responsive', render: () => '' },
        ],
    });

    params = window.state.getParameters();
    $('#blocks-table').dataTable().api().page.len(params.rows);
};

// events
$(window).resize(() => {
    const { currentPage, pageArray } =
        window.pagination.generatePaginationUIParams();
    window.pagination.generatePaginationUI(currentPage, pageArray);
    $('#blocks-table').DataTable().responsive.rebuild();
    $('#blocks-table').DataTable().responsive.recalc();
});

// datatable events
$('#blocks-table').on('init.dt', () => {
    $('.datatable__length-placeholder').remove();
});

$('#blocks-table').on('length.dt', (e, settings, rows) => {
    params = window.state.getParameters();

    if (params.rows !== rows) {
        reRenderPage({ rows });
    }
});

$('#blocks-table').on('xhr.dt', () => {
    updateLoading(false);
});

// Basically a fake refresh, dynamically updates everything
// according to new params
// updates: URL, table and pagination
const reRenderPage = params => {
    if (params) {
        window.state.updateParameters(params);
    }

    const [startPosition, endPosition] =
        window.pagination.generatePaginationRequestRange();
    updateTable(startPosition, endPosition);

    const { currentPage, pageArray } =
        window.pagination.generatePaginationUIParams();
    window.pagination.generatePaginationUI(currentPage, pageArray);
};

// main
$(document).ready(() => {
    // init all UI elements
    dataTable();

    // global state update
    reRenderPage();
});
