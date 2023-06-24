package perms

import "gopkg.in/macaroon-bakery.v2/bakery"

// RequiredPermissions is a map of all loop RPC methods and their
// required macaroon permissions to access loopd.
var RequiredPermissions = map[string][]bakery.Op{
	"/looprpc.SwapClient/LoopOut": {{
		Entity: "swap",
		Action: "execute",
	}, {
		Entity: "loop",
		Action: "out",
	}},
	"/looprpc.SwapClient/LoopIn": {{
		Entity: "swap",
		Action: "execute",
	}, {
		Entity: "loop",
		Action: "in",
	}},
	"/looprpc.SwapClient/Monitor": {{
		Entity: "swap",
		Action: "read",
	}},
	"/looprpc.SwapClient/ListSwaps": {{
		Entity: "swap",
		Action: "read",
	}},
	"/looprpc.SwapClient/SwapInfo": {{
		Entity: "swap",
		Action: "read",
	}},
	"/looprpc.SwapClient/LoopOutTerms": {{
		Entity: "terms",
		Action: "read",
	}, {
		Entity: "loop",
		Action: "out",
	}},
	"/looprpc.SwapClient/LoopOutQuote": {{
		Entity: "swap",
		Action: "read",
	}, {
		Entity: "loop",
		Action: "out",
	}},
	"/looprpc.SwapClient/GetLoopInTerms": {{
		Entity: "terms",
		Action: "read",
	}, {
		Entity: "loop",
		Action: "in",
	}},
	"/looprpc.SwapClient/GetLoopInQuote": {{
		Entity: "swap",
		Action: "read",
	}, {
		Entity: "loop",
		Action: "in",
	}},
	"/looprpc.SwapClient/GetLsatTokens": {{
		Entity: "auth",
		Action: "read",
	}},
	"/looprpc.SwapClient/SuggestSwaps": {{
		Entity: "suggestions",
		Action: "read",
	}},
	"/looprpc.SwapClient/GetInfo": {{
		Entity: "suggestions",
		Action: "read",
	}},
	"/looprpc.SwapClient/GetLiquidityParams": {{
		Entity: "suggestions",
		Action: "read",
	}},
	"/looprpc.SwapClient/SetLiquidityParams": {{
		Entity: "suggestions",
		Action: "write",
	}},
	"/looprpc.SwapClient/Probe": {{
		Entity: "swap",
		Action: "execute",
	}, {
		Entity: "loop",
		Action: "in",
	}},
}
