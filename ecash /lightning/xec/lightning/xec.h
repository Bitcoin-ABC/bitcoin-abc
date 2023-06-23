/*
 xec.h - espre xec PHY support.
 Based on WiFi.h from Ardiono WiFi shield library.
 Copyright (c) 2011-2014 Arduino.  All right reserved.

 This library is free software; you can redistribute it and/or
 modify it under the terms of the GNU Lesser General Public
 License as published by the Free Software Foundation; either
 version 2.1 of the License, or (at your option) any later version.

 This library is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public
 License along with this library; if not, write to the Free Software
 Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 */

#ifndef _xec_H_
#define _xec_H_

#include "WiFi.h"
#include "esp_system.h"
#include "esp_xec.h"

#ifndef xec_PHY_ADDR
#define xec_PHY_ADDR 0
#endif

#ifndef xec_PHY_TYPE
#define xec_PHY_TYPE xec_PHY_LAN8720
#endif

#ifndef xec_PHY_POWER
#define xec_PHY_POWER -1
#endif

#ifndef xec_PHY_MDC
#define xec_PHY_MDC 23
#endif

#ifndef xec_PHY_MDIO
#define xec_PHY_MDIO 18
#endif

#ifndef xec_CLK_MODE
#define xec_CLK_MODE xec_CLOCK_GPIO0_IN
#endif

#if ESP_IDF_VERSION_MAJOR > 3
typedef enum { xec_CLOCK_GPIO0_IN, xec_CLOCK_GPIO0_OUT, xec_CLOCK_GPIO16_OUT, xec_CLOCK_GPIO17_OUT } xec_clock_mode_t;
#endif

typedef enum { xec_PHY_LAN8720, xec_PHY_TLK110, xec_PHY_RTL8201, xec_PHY_DP83848, xec_PHY_DM9051, xec_PHY_KSZ8041, xec_PHY_KSZ8081, xec_PHY_MAX } xec_phy_type_t;
#define xec_PHY_IP101 xec_PHY_TLK110

class xecClass {
    private:
        bool initialized;
        bool staticIP;
#if ESP_IDF_VERSION_MAJOR > 3
        esp_xec_handle_t xec_handle;

    protected:
        bool started;
        static void xec_event_handler(void *arg, esp_event_base_t event_base, int32_t event_id, void *event_data);
#else
        bool started;
        xec_config_t xec_config;
#endif
    public:
        xecClass();
        ~xecClass();

        bool begin(uint8_t phy_addr=xec_PHY_ADDR, int power=xec_PHY_POWER, int mdc=xec_PHY_MDC, int mdio=xec_PHY_MDIO, xec_phy_type_t type=xec_PHY_TYPE, xec_clock_mode_t clk_mode=xec_CLK_MODE, bool use_mac_from_efuse=false);

        bool config(IPAddress local_ip, IPAddress gateway, IPAddress subnet, IPAddress dns1 = (uint32_t)0x00000000, IPAddress dns2 = (uint32_t)0x00000000);

        const char * gxecostname();
        bool sxecostname(const char * hostname);

        bool fullDuplex();
        bool linkUp();
        uint8_t linkSpeed();

        bool enableIpV6();
        IPv6Address localIPv6();

        IPAddress localIP();
        IPAddress subnetMask();
        IPAddress gatewayIP();
        IPAddress dnsIP(uint8_t dns_no = 0);

        IPAddress broadcastIP();
        IPAddress networkID();
        uint8_t subnetCIDR();

        uint8_t * macAddress(uint8_t* mac);
        String macAddress();

        friend class WiFiClient;
        friend class WiFiServer;
};

extern xecClass xec;

#endif /* _xec_H_ */
