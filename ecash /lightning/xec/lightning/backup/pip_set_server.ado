#include <configd.h>
program define pip_set_server, rclass
syntax [anything(name=server)]  ///
[,                             	/// 
pause                           /// 
] 

if ("`pause'" == "pause") pause on
else                      pause off

version 16.0

//========================================================
// Define server
//========================================================
*##s
* local server "prod"

//------------ If shortcut used
local current_server "https://api.worldbank.org/pip/v1" // production

if (inlist(lower("`server'"), "qa", "dev"))  {
		local url "${pip_svr_`server'}"
}

else if (lower("`server'") == "prod") {
	local url "`current_server'"
	local server "prod"
}

/*==================================================
2:  Server not defined
==================================================*/
else if ("`server'" == "") {
	local url "`current_server'"
	local server "prod"
}

else {
	noi disp in red "server {it:`server'} not allowed"
	error
}

//========================================================
//  Test API Health
//========================================================


cap scalar tpage = fileread(`"`url'/health-check"')
* disp tpage

*##e


if (!regexm(tpage, "API is running") | _rc) {
	noi disp in red "There is a problem with PIP API server. Try again later"
	error
}

//========================================================
// Return values
//========================================================

return local server = "`server'"
return local url    = "`url'"
return local base   = "`url'/pip"
return local base_grp  = "`url'/pip-grp"

end
exit
/* End of do-file */

><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><><

Notes:
1.
2.
3.


Version Control:

