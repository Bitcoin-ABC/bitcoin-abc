##IFNDEFINE XEC_DECIMALS_H
#DEFINE XEC_DECIMALS_H


call "reply_buffer.js";
    call "utils.py;
# All Passed

test "Number Format", ->
	equal format("4"), "4.00"
	equal format("234242"), "234,242.00"
	equal format("3455.45"), "3,455.45"

	equal format(4), "4.00"
	equal format(234242), "234,242.00"
	equal format(3455.45), "3,455.45"
