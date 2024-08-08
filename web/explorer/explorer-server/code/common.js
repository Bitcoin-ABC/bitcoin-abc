const DEFAULT_ROWS_PER_PAGE = 100;

var tzOffset;

{
    var offsetMinutes = new Date().getTimezoneOffset();
    if (offsetMinutes < 0) {
        tzOffset = moment
            .utc(moment.duration(-offsetMinutes, 'minutes').asMilliseconds())
            .format('+HH:mm');
    } else {
        tzOffset = moment
            .utc(moment.duration(offsetMinutes, 'minutes').asMilliseconds())
            .format('-HH:mm');
    }
}

function formatByteSize(size) {
    if (size < 1024) {
        return '<div class="num-col-suffix" data-suffix="B">' + size + '</div>';
    } else if (size < 1024 * 1024) {
        return (
            '<div class="num-col-suffix" data-suffix="kB">' +
            (size / 1000).toFixed(2) +
            '</div>'
        );
    } else {
        return (
            '<div class="num-col-suffix" data-suffix="MB">' +
            (size / 1000000).toFixed(2) +
            '</div>'
        );
    }
}

function renderInteger(number) {
    var fmt = Intl.NumberFormat('en-EN').format(number);
    return fmt;
}

function renderAmount(baseAmount, decimals) {
    if (decimals === 0) {
        return renderInteger(baseAmount);
    }
    var factor = Math.pow(10, decimals);
    var humanAmount = baseAmount / factor;
    var fmt = humanAmount.toFixed(decimals);
    var parts = fmt.split('.');
    var integerPart = parseInt(parts[0]);
    var fractPart = parts[1];
    var numFractSections = Math.ceil(decimals / 3);
    var fractRendered = '';
    var allZeros = true;
    for (var sectionIdx = numFractSections - 1; sectionIdx >= 0; --sectionIdx) {
        var section = fractPart.substr(sectionIdx * 3, 3);
        if (parseInt(section) !== 0) {
            allZeros = false;
        }
        var classes =
            (allZeros ? 'zeros ' : '') +
            (sectionIdx != numFractSections - 1 ? 'digit-sep ' : '');
        fractRendered =
            '<small class="' +
            classes +
            '">' +
            section +
            '</small>' +
            fractRendered;
    }
    return renderInteger(integerPart) + '.' + fractRendered;
}

function renderSats(sats) {
    var coins = sats / 100;
    var fmt = coins.toFixed('2');
    var parts = fmt.split('.');
    var integerPart = parseInt(parts[0]);
    var fractPart = parts[1];
    var fractZero = fractPart === '00';

    if (fractZero) {
        return renderInteger(integerPart) + '.<small>' + fractPart + '</small>';
    } else {
        return renderInteger(integerPart) + '.<small>' + fractPart + '</small>';
    }
}

const renderFee = (_value, _type, row) => {
    if (row.isCoinbase) {
        return '<div class="ui green horizontal label">Coinbase</div>';
    }

    const fee = renderInteger(
        (row.stats.satsInput - row.stats.satsOutput) / 100,
    );
    let markup = '';

    markup += `<div class="num-col-suffix fee-per-byte" data-suffix="(${renderFeePerByte(
        _value,
        _type,
        row,
    )})">${fee}</div>`;

    return markup;
};

const renderFeePerByte = (_value, _type, row) => {
    if (row.isCoinbase) {
        return '';
    }
    const fee = row.stats.satsInput - row.stats.satsOutput;
    const feePerByte = fee / row.size;
    return renderInteger(Math.round(feePerByte * 1000)) + '/kB';
};

function renderTxHash(txHash) {
    return txHash.substr(0, 10) + '&hellip;' + txHash.substr(60, 4);
}

var regHex32 = /^[0-9a-fA-F]{64}$/;
function searchBarChange() {
    if (event.key == 'Enter') {
        return searchButton();
    }
    var search = $('#search-bar').val();
    if (search.match(regHex32) !== null) {
        location.href = '/search/' + search;
    }
}

function searchButton() {
    var search = $('#search-bar').val();
    location.href = '/search/' + search;
}

function toggleTransactionScriptData() {
    $('.tx-transaction__script-data').each(function () {
        $(this).toggleClass('display-none');
    });
}

function minifyHash(hash) {
    return `${hash.slice(0, 1)}...${hash.slice(39, 64)}`;
}

function minifyBlockID(hash) {
    return `${hash.slice(0, 6)}...${hash.slice(54, 64)}`;
}

const generateRange = (start, end) =>
    [...Array(end - start + 1)].map((_, i) => start + i);

const findClosest = (haystack, needle) =>
    haystack.reduce((a, b) =>
        Math.abs(b - needle) < Math.abs(a - needle) ? b : a,
    );

const scrollToBottom = () => {
    $('html,body').animate({ scrollTop: 0 }, 'slow');
    return false;
};

(function (state, $) {
    const DEFAULT_PAGE = 1;
    const DEFAULT_ROWS_PER_PAGE = 100;
    const DEFAULT_ORDER = 'desc';

    const validatePaginationInts = (value, fallback) => {
        parsedValue = parseInt(value);
        return isNaN(parsedValue) ? fallback : Math.max(parsedValue, 1);
    };

    state.getPaginationTotalEntries = () =>
        $('#pagination').data('total-entries');

    state.getParameters = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const page =
            validatePaginationInts(urlParams.get('page'), DEFAULT_PAGE) - 1;
        const humanPage = page + 1;
        const rows = validatePaginationInts(
            urlParams.get('rows'),
            DEFAULT_ROWS_PER_PAGE,
        );
        const order = urlParams.get('order') || DEFAULT_ORDER;
        const start = parseInt(urlParams.get('start')) || 0;
        const end =
            parseInt(urlParams.get('end')) || state.getPaginationTotalEntries();

        return { page, humanPage, rows, order, start, end };
    };

    state.updateParameters = params => {
        const path = window.location.pathname;
        const currentURLParams = Object.fromEntries(
            new URLSearchParams(window.location.search).entries(),
        );
        const newURLParams = new URLSearchParams({
            ...currentURLParams,
            ...params,
        });

        window.history.pushState(
            '',
            document.title,
            `${path}?${newURLParams.toString()}`,
        );
    };

    state.updateLoading = status => {
        if (status) {
            $('.loader__container').removeClass('display-none');
            $('#pagination').addClass('hidden');
            $('#footer').addClass('hidden');
        } else {
            $('.loader__container').addClass('display-none');
            $('#pagination').removeClass('hidden');
            $('#footer').removeClass('hidden');
        }
    };
})((window.state = window.state || {}), jQuery);

(function (pagination, $) {
    const activeItem =
        '<a class="item active" href="HREF" onclick="goToPage(event, NUMBER)">NUMBER</a>';
    const disabledItem = '<div class="disabled item">...</div>';
    const item =
        '<a class="item" href="HREF" onclick="goToPage(event, NUMBER)">NUMBER</a>';

    const determinePaginationSlots = lastPage => {
        if (lastPage <= 0) {
            return Infinity;
        }

        // pagination slot
        const padding = 2 * 16;
        const letter = 8;
        const paginationWidth = padding + Math.log10(lastPage) * letter;

        let availableWidth = $('.ui.container').width();

        // Leave a 1-slot extra margin for a nicer rendering on mobile
        availableWidth -= paginationWidth;

        return Math.round(availableWidth / paginationWidth);
    };

    pagination.generatePaginationRequestRange = () => {
        const { page, rows, start, end } = window.state.getParameters();

        const startPosition = end - page * rows;
        const endPosition = Math.max(startPosition - rows, start);

        return [startPosition, endPosition];
    };

    pagination.generatePaginationRequest = () => {
        const { page, rows } = window.state.getParameters();
        return { page, take: rows };
    };

    const generatePaginationArray = (currentPage, max, slots) => {
        if (slots > max) {
            return [...Array(max).keys()].slice(1).map(x => ++x);
        }

        let increments;
        let pageArray = [];

        if (slots <= 6) {
            increments = [1, 100, 500, 1000, 2000, 4000];
        } else if (slots <= 10) {
            increments = [1, 10, 50, 100, 500, 1000, 2000, 4000];
        } else {
            increments = [1, 2, 10, 50, 100, 500, 1000, 2000, 4000];
        }

        for (i = 0; i < Math.floor(slots / 2); i++) {
            const currentIncrement = increments[i];

            if (!currentIncrement || currentPage - currentIncrement <= 1) {
                break;
            }

            const value = currentPage - currentIncrement;
            const precision = String(value).length - 1;

            if (currentIncrement >= 10 && precision) {
                pageArray.push(parseFloat(value.toPrecision(precision)));
            } else {
                pageArray.push(value);
            }
        }

        pageArray = pageArray.reverse();
        if (currentPage != 1) {
            pageArray.push(currentPage);
        }

        const remainingSlots = slots - pageArray.length;
        for (i = 0; i < remainingSlots; i++) {
            const currentIncrement = increments[i];
            const value = currentPage + currentIncrement;

            if (!currentIncrement || value > max) {
                break;
            }

            const precision = String(value).length - 1;

            if (currentIncrement >= 10 && precision) {
                const round = parseFloat(value.toPrecision(precision));

                if (round >= max) {
                    break;
                }

                pageArray.push(round);
            } else {
                pageArray.push(value);
            }
        }

        if (currentPage == max) {
            pageArray.pop();
        }

        if (max < 50000 && slots - pageArray.length > 10) {
            let index;
            const indexRound = pageArray.findIndex(x => !(x % 10));
            const indexPage = pageArray.indexOf(currentPage);

            if (indexRound <= 0) {
                index = 1;
            } else if (indexRound > indexPage && currentPage > 10) {
                index = indexPage - 2;
            } else {
                index = indexRound;
            }

            const extension = [...Array(9).keys()].map(x => ++x);

            if (pageArray[index] != 10) {
                extension.push(10);
            }

            pageArray = pageArray.slice(index);
            pageArray = extension.concat(pageArray);
            pageArray.shift();
        }
        return pageArray;
    };

    pagination.generatePaginationUIParams = () => {
        const { humanPage: currentPage, rows } = window.state.getParameters();
        const totalEntries = window.state.getPaginationTotalEntries();
        const lastPage = Math.ceil(totalEntries / rows);

        if (lastPage === 1) {
            return {};
        }

        const slots = determinePaginationSlots(lastPage);

        const pageArray = generatePaginationArray(currentPage, lastPage, slots);
        pageArray.unshift(1);

        if (lastPage !== pageArray.slice(-1)[0]) {
            pageArray.push(lastPage);
        }

        return { currentPage, pageArray };
    };

    pagination.generatePaginationUI = (currentPage, pageArray) => {
        if (!pageArray) {
            return;
        }

        const path = window.location.pathname;

        // DOM building blocks
        const activeItem = number => `<a class="item active">${number}</a>`;
        const item = number =>
            `<a class="item" href="${path}?page=${number}" onclick="goToPage(event, ${number})">${number}</a>`;

        let pagination = '';
        pagination += '<div class="ui pagination menu">';

        pageArray.forEach((pageNumber, i) => {
            if (pageNumber === currentPage) {
                pagination += activeItem(pageNumber);
                return;
            }

            pagination += item(pageNumber);
        });

        pagination += '</div>';

        $('#pagination').html(pagination);
    };
})((window.pagination = window.pagination || {}), jQuery);

const copyText = (id, iconid) => {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText)
        var textToCopy = document.getElementById(id).textContent;
    $('.tooltiptext')
        .text('Copied!')
        .delay(1300)
        .queue(function () {
            $(this).text('Copy to clipboard').dequeue();
        });
    return navigator.clipboard.writeText(textToCopy);
};

const copyString = string => {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        $('.tooltiptext')
            .text('Copied!')
            .delay(1300)
            .queue(function () {
                $(this).text('Copy to clipboard').dequeue();
            });
        return navigator.clipboard.writeText(string);
    }
};
