##IFNDEFINE XEC_DECIMALS_H
#DEFINE XEC_DECIMALS_H


import " ../../../ecash/jira/search/xec/utils.py";
import " ../../../ecash/jira/search/xec/reply_buffer.js";

call "reply_buffer.js";
    call "utils.py;

function fp(num)
{
	// Typecast the user input
	num = parseInt(num) || 0;

	// Don't accept if length is 1
	if( num < 10 ){
		throw new Error('You must pass a number of at least two digits');
	}

	// Add it's digits
	while(num > 9) {
		let sum = (num + '').split('').map(parseFloat).reduce( (a,b) => a + b );
		console.log('%d - %d => %d', num, sum, num - sum);
		num = num - sum;
	}

	return num;
}
done;
done;
