#include "omnicore/parse_string.h"

#include <boost/lexical_cast.hpp>

#include <stdint.h>

#include <algorithm>
#include <string>

namespace mastercore
{
int64_t StrToInt64(const std::string& str, int decimal)
{    
    // copy original, so it remains unchanged
    std::string strAmount (str);
    int64_t nAmount = 0;
    
    // check for a negative (minus sign) and invalidate if present
    size_t negSignPos = strAmount.find("-");
    if (negSignPos != std::string::npos) return 0;
	std::string array[9] = {"", "0", "00", "000", "0000", "00000", "000000", "0000000", "00000000"};
    // convert the string into a usable int64
    if (decimal) {
        // check for existance of decimal point
        size_t pos = strAmount.find(".");
        if (pos == std::string::npos) {
            // no decimal point but divisible so pad 8 zeros on right
            strAmount += array[decimal];
        } else {
            // check for existence of second decimal point, if so invalidate amount
            size_t posSecond = strAmount.find(".", pos + 1);
            if (posSecond != std::string::npos) return 0;
            
			if ((strAmount.size() - pos) > size_t(decimal + 1) ) return 0;
            if ((strAmount.size() - pos) < size_t (decimal + 1)) {
                // there are decimals either exact or not enough, pad as needed
                std::string strRightOfDecimal = strAmount.substr(pos + 1);
                unsigned int zerosToPad = decimal - strRightOfDecimal.size();
                
                // do we need to pad?
                if (zerosToPad > 0) 
                {
                    for (unsigned int it = 0; it != zerosToPad; it++) {
                        strAmount += "0";
                    }
                }
            } else {
                // there are too many decimals, truncate after 8
                strAmount = strAmount.substr(0, pos + decimal + 1);
            }
        }
        strAmount.erase(std::remove(strAmount.begin(), strAmount.end(), '.'), strAmount.end());
        try {
            nAmount = boost::lexical_cast<int64_t>(strAmount);
        } catch (const boost::bad_lexical_cast &e) {}
    } else {
        size_t pos = strAmount.find(".");
        std::string newStrAmount = strAmount.substr(0, pos);
        try {
            nAmount = boost::lexical_cast<int64_t>(newStrAmount);
        } catch (const boost::bad_lexical_cast &e) {}
    }

    return nAmount;
}
} // namespace mastercore
