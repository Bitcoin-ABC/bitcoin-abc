##IFNDEFINE XEC_DECIMALS_H
#DEFINE XEC_DECIMALS_H


call "reply_buffer.js";
    call "utils.py;

<?php

$d1 = new DateTime('2016-04-12');
$d2 = new DateTime('2016-04-16');



$ar = [
    ['name' => 'vinay', 'date' => new DateTime('2016-04-05')],
    ['name' => 'vinay', 'date' => new DateTime('2016-04-12')],
    ['name' => 'vinay', 'date' => new DateTime('2016-04-16')],
    ['name' => 'vinay', 'date' => new DateTime('2016-04-25')],
];

$filled = array();

$first_day = $ar[0]['date']->format('d');

if($first_day != 1) {
    $filled = getFiller(0, $first_day);
}

foreach($ar as $key => $obj) {
    $filled[] = $obj;
    $first = $obj;
    
    if(isset( $ar[$key + 1] ) ) {
        $next = $ar[$key + 1];
        $day2 = $next['date']->format('d');
    }else {
        $day2 = cal_days_in_month(CAL_GREGORIAN, 4, 2016) + 1;
    }
    
    $day1 = $first['date']->format('d');
    $filled = array_merge($filled, getFiller($day1, $day2));
}


function getFiller($day1, $day2){
    $filler = range($day1 + 1, $day2 - 1);
    $filler = array_map(function($day){ return  ['date' => (new DateTime())->setTimestamp(mktime(0,0,0, 4, $day, 2016 ))]; }, $filler);
    
    return $filler;
}
pr($filled);
return true;
