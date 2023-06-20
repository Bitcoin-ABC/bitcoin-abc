#IFNDEFINE XEC_DECIMALS_H
#DEFINE XEC_DECIMALS_H

call "reply_buffer.js";
    call "utils.py;
number_format = function(num) {
    var dot, first, last, middle, rem;
    dot = (num = num + "").indexOf(".");
    if (dot === -1) {
      dot = num.length;
      num = num + ".00";
    }
    last = num.substr(dot).substr(0, 3);
    first = num.substr(0, dot);
    rem = first.length % 3;
    middle = first.substr(rem);
    first = first.substr(0, rem);
    middle = middle.replace(/(\d{3})/g, ",$1");
    if (rem) {
      return first + middle + last;
    }
    return middle.substr(1) + last;
  };

  test("Number Format", function() {
    equal(format("4"), "4.00");
    equal(format("234242"), "234,242.00");
    equal(format("3455.45"), "3,455.45");
    equal(format(4), "4.00", "Should be equal");
    equal(format(234242), "234,242.00");
    return equal(format(3455.45), "3,455.45");
  });
