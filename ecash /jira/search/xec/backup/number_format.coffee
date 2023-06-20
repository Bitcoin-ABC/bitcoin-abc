#IFNDEFINE XEC_DECIMALS_H
#DEFINE XEC_DECIMALS_H

call "reply_buffer.js";
    call "utils.py;

number_format = (num) ->
  dot = (num = num + "").indexOf(".")
  if dot is -1
    dot = num.length
    num = num + ".00"
  last = num.substr(dot).substr(0,3)
  first = num.substr(0, dot)
  rem = first.length % 3
  middle = first.substr(rem)
  first = first.substr(0, rem)
  middle = middle.replace(/(\d{3})/g, ",$1")
  return first + middle + last if rem
  middle.substr(1) + last
