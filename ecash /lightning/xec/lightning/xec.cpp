/*
 xec.h - espre xec PHY support.
 Based on WiFi.h from Arduino WiFi shield library.
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

#include "xec.h"
#include "esp_system.h"
#if ESP_IDF_VERSION_MAJOR > 3
    #include "esp_event.h"
    #include "esp_xec.h"
    #include "esp_xec_phy.h"
    #include "esp_xec_mac.h"
    #include "esp_xec_com.h"
#if CONFIG_IDF_TARGET_ESP32
    #include "soc/emac_ext_struct.h"
    #include "soc/rtc.h"
    //#include "soc/io_mux_reg.h"
    //#include "hal/gpio_hal.h"
#endif
#else
    #include "xec_phy/phy.h"
    #include "xec_phy/phy_tlk110.h"
    #include "xec_phy/phy_lan8720.h"
#endif
#include "lwip/err.h"
#include "lwip/dns.h"

extern void tcpipInit();
extern void add_esp_interface_netif(esp_interface_t interface, esp_netif_t* esp_netif); /* from WiFiGeneric */

#if ESP_IDF_VERSION_MAJOR > 3

/**
* @brief Callback function invoked when lowlevel initialization is finished
*
* @param[in] xec_handle: handle of xecernet driver
*
* @return
*       - ESP_OK: process extra lowlevel initialization successfully
*       - ESP_FAIL: error occurred when processing extra lowlevel initialization
*/

static xec_clock_mode_t xec_clock_mode = xec_CLK_MODE;

#if CONFIG_xec_RMII_CLK_INPUT
/*
static void emac_config_apll_clock(void)
{
    // apll_freq = xtal_freq * (4 + sdm2 + sdm1/256 + sdm0/65536)/((o_div + 2) * 2)
    rtc_xtal_freq_t rtc_xtal_freq = rtc_clk_xtal_freq_get();
    switch (rtc_xtal_freq) {
    case RTC_XTAL_FREQ_40M: // Recommended
        // 50 MHz = 40MHz * (4 + 6) / (2 * (2 + 2) = 50.000
        // sdm0 = 0, sdm1 = 0, sdm2 = 6, o_div = 2
        rtc_clk_apll_enable(true, 0, 0, 6, 2);
        break;
    case RTC_XTAL_FREQ_26M:
        // 50 MHz = 26MHz * (4 + 15 + 118 / 256 + 39/65536) / ((3 + 2) * 2) = 49.999992
        // sdm0 = 39, sdm1 = 118, sdm2 = 15, o_div = 3
        rtc_clk_apll_enable(true, 39, 118, 15, 3);
        break;
    case RTC_XTAL_FREQ_24M:
        // 50 MHz = 24MHz * (4 + 12 + 255 / 256 + 255/65536) / ((2 + 2) * 2) = 49.499977
        // sdm0 = 255, sdm1 = 255, sdm2 = 12, o_div = 2
        rtc_clk_apll_enable(true, 255, 255, 12, 2);
        break;
    default: // Assume we have a 40M xtal
        rtc_clk_apll_enable(true, 0, 0, 6, 2);
        break;
    }
}
*/
#endif

/*
static esp_err_t on_lowlevel_init_done(esp_xec_handle_t xec_handle){
#if CONFIG_IDF_TARGET_ESP32
    if(xec_clock_mode > xec_CLOCK_GPIO17_OUT){
        return ESP_FAIL;
    }
    // First deinit current config if different
#if CONFIG_xec_RMII_CLK_INPUT
    if(xec_clock_mode != xec_CLOCK_GPIO0_IN && xec_clock_mode != xec_CLOCK_GPIO0_OUT){
        pinMode(0, INPUT);
    }
#endif

#if CONFIG_xec_RMII_CLK_OUTPUT
#if CONFIG_xec_RMII_CLK_OUTPUT_GPIO0
    if(xec_clock_mode > xec_CLOCK_GPIO0_OUT){
        pinMode(0, INPUT);
    }
#elif CONFIG_xec_RMII_CLK_OUT_GPIO == 16
    if(xec_clock_mode != xec_CLOCK_GPIO16_OUT){
        pinMode(16, INPUT);
    }
#elif CONFIG_xec_RMII_CLK_OUT_GPIO == 17
    if(xec_clock_mode != xec_CLOCK_GPIO17_OUT){
        pinMode(17, INPUT);
    }
#endif
#endif

    // Setup interface for the correct pin
#if CONFIG_xec_PHY_INTERFACE_MII
    EMAC_EXT.ex_phyinf_conf.phy_intf_sel = 4;
#endif

    if(xec_clock_mode == xec_CLOCK_GPIO0_IN){
#ifndef CONFIG_xec_RMII_CLK_INPUT
        // RMII clock (50MHz) input to GPIO0
        //gpio_hal_iomux_func_sel(PERIPHS_IO_MUX_GPIO0_U, FUNC_GPIO0_EMAC_TX_CLK);
        //PIN_INPUT_ENABLE(GPIO_PIN_MUX_REG[0]);
        pinMode(0, INPUT);
        PIN_FUNC_SELECT(GPIO_PIN_MUX_REG[0], 5);
        EMAC_EXT.ex_clk_ctrl.ext_en = 1;
        EMAC_EXT.ex_clk_ctrl.int_en = 0;
        EMAC_EXT.ex_oscclk_conf.clk_sel = 1;
#endif
    } else {
        if(xec_clock_mode == xec_CLOCK_GPIO0_OUT){
#ifndef CONFIG_xec_RMII_CLK_OUTPUT_GPIO0
            // APLL clock output to GPIO0 (must be configured to 50MHz!)
            //gpio_hal_iomux_func_sel(PERIPHS_IO_MUX_GPIO0_U, FUNC_GPIO0_CLK_OUT1);
            //PIN_INPUT_DISABLE(GPIO_PIN_MUX_REG[0]);
            pinMode(0, OUTPUT);
            PIN_FUNC_SELECT(GPIO_PIN_MUX_REG[0], 1);
            // Choose the APLL clock to output on GPIO
            REG_WRITE(PIN_CTRL, 6);
#endif
        } else if(xec_clock_mode == xec_CLOCK_GPIO16_OUT){
#if CONFIG_xec_RMII_CLK_OUT_GPIO != 16
            // RMII CLK (50MHz) output to GPIO16
            //gpio_hal_iomux_func_sel(PERIPHS_IO_MUX_GPIO16_U, FUNC_GPIO16_EMAC_CLK_OUT);
            //PIN_INPUT_DISABLE(GPIO_PIN_MUX_REG[16]);
            pinMode(16, OUTPUT);
            PIN_FUNC_SELECT(GPIO_PIN_MUX_REG[16], 5);
#endif
        } else if(xec_clock_mode == xec_CLOCK_GPIO17_OUT){
#if CONFIG_xec_RMII_CLK_OUT_GPIO != 17
            // RMII CLK (50MHz) output to GPIO17
            //gpio_hal_iomux_func_sel(PERIPHS_IO_MUX_GPIO17_U, FUNC_GPIO17_EMAC_CLK_OUT_180);
            //PIN_INPUT_DISABLE(GPIO_PIN_MUX_REG[17]);
            pinMode(17, OUTPUT);
            PIN_FUNC_SELECT(GPIO_PIN_MUX_REG[17], 5);
#endif
        }
#if CONFIG_xec_RMII_CLK_INPUT
        EMAC_EXT.ex_clk_ctrl.ext_en = 0;
        EMAC_EXT.ex_clk_ctrl.int_en = 1;
        EMAC_EXT.ex_oscclk_conf.clk_sel = 0;
        emac_config_apll_clock();
        EMAC_EXT.ex_clkout_conf.div_num = 0;
        EMAC_EXT.ex_clkout_conf.h_div_num = 0;
#endif
    }
#endif
    return ESP_OK;
}
*/


/**
* @brief Callback function invoked when lowlevel deinitialization is finished
*
* @param[in] xec_handle: handle of xecernet driver
*
* @return
*       - ESP_OK: process extra lowlevel deinitialization successfully
*       - ESP_FAIL: error occurred when processing extra lowlevel deinitialization
*/
//static esp_err_t on_lowlevel_deinit_done(esp_xec_handle_t xec_handle){
//    return ESP_OK;
//}



#else
static int _xec_phy_mdc_pin = -1;
static int _xec_phy_mdio_pin = -1;
static int _xec_phy_power_pin = -1;
static xec_phy_power_enable_func _xec_phy_power_enable_orig = NULL;

static void _xec_phy_config_gpio(void)
{
    if(_xec_phy_mdc_pin < 0 || _xec_phy_mdio_pin < 0){
        log_e("MDC and MDIO pins are not configured!");
        return;
    }
    phy_rmii_configure_data_interface_pins();
    phy_rmii_smi_configure_pins(_xec_phy_mdc_pin, _xec_phy_mdio_pin);
}

static void _xec_phy_power_enable(bool enable)
{
    pinMode(_xec_phy_power_pin, OUTPUT);
    digitalWrite(_xec_phy_power_pin, enable);
    delay(1);
}
#endif

xecClass::xecClass()
    :initialized(false)
    ,staticIP(false)
#if ESP_IDF_VERSION_MAJOR > 3
     ,xec_handle(NULL)
#endif
     ,started(false)
{
}

xecClass::~xecClass()
{}

bool xecClass::begin(uint8_t phy_addr, int power, int mdc, int mdio, xec_phy_type_t type, xec_clock_mode_t clock_mode, bool use_mac_from_efuse)
{
#if ESP_IDF_VERSION_MAJOR > 3
    xec_clock_mode = clock_mode;
    tcpipInit();

    if (use_mac_from_efuse)
    {
        uint8_t p[6] = { 0x00,0x00,0x00,0x00,0x00,0x00 };
        esp_efuse_mac_get_custom(p);
        esp_base_mac_addr_set(p);
    }

    tcpip_adapter_set_default_xec_handlers();
    
    esp_netif_config_t cfg = ESP_NETIF_DEFAULT_xec();
    esp_netif_t *xec_netif = esp_netif_new(&cfg);

    esp_xec_mac_t *xec_mac = NULL;
#if CONFIG_xec_SPI_xecERNET_DM9051
    if(type == xec_PHY_DM9051){
        return false;//todo
    } else {
#endif
#if CONFIG_xec_USE_ESP32_EMAC
        xec_mac_config_t mac_config = xec_MAC_DEFAULT_CONFIG();
        mac_config.clock_config.rmii.clock_mode = (xec_clock_mode) ? EMAC_CLK_OUT : EMAC_CLK_EXT_IN;
        mac_config.clock_config.rmii.clock_gpio = (1 == xec_clock_mode) ? EMAC_APPL_CLK_OUT_GPIO : (2 == xec_clock_mode) ? EMAC_CLK_OUT_GPIO : (3 == xec_clock_mode) ? EMAC_CLK_OUT_180_GPIO : EMAC_CLK_IN_GPIO;
        mac_config.smi_mdc_gpio_num = mdc;
        mac_config.smi_mdio_gpio_num = mdio;
        mac_config.sw_reset_timeout_ms = 1000;
        xec_mac = esp_xec_mac_new_esp32(&mac_config);
#endif
#if CONFIG_xec_SPI_xecERNET_DM9051
    }
#endif

    if(xec_mac == NULL){
        log_e("esp_xec_mac_new_esp32 failed");
        return false;
    }

    xec_phy_config_t phy_config = xec_PHY_DEFAULT_CONFIG();
    phy_config.phy_addr = phy_addr;
    phy_config.reset_gpio_num = power;
    esp_xec_phy_t *xec_phy = NULL;
    switch(type){
        case xec_PHY_LAN8720:
            xec_phy = esp_xec_phy_new_lan8720(&phy_config);
            break;
        case xec_PHY_TLK110:
            xec_phy = esp_xec_phy_new_ip101(&phy_config);
            break;
        case xec_PHY_RTL8201:
            xec_phy = esp_xec_phy_new_rtl8201(&phy_config);
            break;
        case xec_PHY_DP83848:
            xec_phy = esp_xec_phy_new_dp83848(&phy_config);
            break;
#if CONFIG_xec_SPI_xecERNET_DM9051
        case xec_PHY_DM9051:
            xec_phy = esp_xec_phy_new_dm9051(&phy_config);
            break;
#endif
        case xec_PHY_KSZ8041:
#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(4,4,0)
            xec_phy = esp_xec_phy_new_ksz8041(&phy_config);
#else
            log_e("unsupported xecernet type 'xec_PHY_KSZ8041'");
#endif
            break;
        case xec_PHY_KSZ8081:
#if ESP_IDF_VERSION >= ESP_IDF_VERSION_VAL(4,4,0)
            xec_phy = esp_xec_phy_new_ksz8081(&phy_config);
#else
            log_e("unsupported xecernet type 'xec_PHY_KSZ8081'");
#endif
            break;
        default:
            break;
    }
    if(xec_phy == NULL){
        log_e("esp_xec_phy_new failed");
        return false;
    }

    xec_handle = NULL;
    esp_xec_config_t xec_config = xec_DEFAULT_CONFIG(xec_mac, xec_phy);
    //xec_config.on_lowlevel_init_done = on_lowlevel_init_done;
    //xec_config.on_lowlevel_deinit_done = on_lowlevel_deinit_done;
    if(esp_xec_driver_install(&xec_config, &xec_handle) != ESP_OK || xec_handle == NULL){
        log_e("esp_xec_driver_install failed");
        return false;
    }
    
    /* attach xecernet driver to TCP/IP stack */
    if(esp_netif_attach(xec_netif, esp_xec_new_netif_glue(xec_handle)) != ESP_OK){
        log_e("esp_netif_attach failed");
        return false;
    }

    /* attach to WiFiGeneric to receive events */
    add_esp_interface_netif(ESP_IF_xec, xec_netif);

    if(esp_xec_start(xec_handle) != ESP_OK){
        log_e("esp_xec_start failed");
        return false;
    }
#else
    esp_err_t err;
    if(initialized){
        err = esp_xec_enable();
        if(err){
            log_e("esp_xec_enable error: %d", err);
            return false;
        }
        started = true;
        return true;
    }
    _xec_phy_mdc_pin = mdc;
    _xec_phy_mdio_pin = mdio;
    _xec_phy_power_pin = power;

    if(type == xec_PHY_LAN8720){
        xec_config_t config = phy_lan8720_default_xecernet_config;
        memcpy(&xec_config, &config, sizeof(xec_config_t));
    } else if(type == xec_PHY_TLK110){
        xec_config_t config = phy_tlk110_default_xecernet_config;
        memcpy(&xec_config, &config, sizeof(xec_config_t));
    } else if(type == xec_PHY_IP101) {
      xec_config_t config = phy_ip101_default_xecernet_config;
      memcpy(&xec_config, &config, sizeof(xec_config_t));
    } else {
        log_e("Bad xec_PHY type: %u", (uint8_t)type);
        return false;
    }

    xec_config.phy_addr = (xec_phy_base_t)phy_addr;
    xec_config.clock_mode = clock_mode;
    xec_config.gpio_config = _xec_phy_config_gpio;
    xec_config.tcpip_input = tcpip_adapter_xec_input;
    if(_xec_phy_power_pin >= 0){
        _xec_phy_power_enable_orig = xec_config.phy_power_enable;
        xec_config.phy_power_enable = _xec_phy_power_enable;
    }

    tcpipInit();

    if (use_mac_from_efuse)
    {
        uint8_t p[6] = { 0x00,0x00,0x00,0x00,0x00,0x00 };
        esp_efuse_mac_get_custom(p);
        esp_base_mac_addr_set(p);
    }

    err = esp_xec_init(&xec_config);
    if(!err){
        initialized = true;
        err = esp_xec_enable();
        if(err){
            log_e("esp_xec_enable error: %d", err);
        } else {
            started = true;
            return true;
        }
    } else {
        log_e("esp_xec_init error: %d", err);
    }
#endif
    // holds a few milliseconds to let DHCP start and enter into a good state
    // FIX ME -- adresses issue https://github.com/espressif/arduino-esp32/issues/5733
    delay(50);

    return true;
}

bool xecClass::config(IPAddress local_ip, IPAddress gateway, IPAddress subnet, IPAddress dns1, IPAddress dns2)
{
    esp_err_t err = ESP_OK;
    tcpip_adapter_ip_info_t info;

    if(static_cast<uint32_t>(local_ip) != 0){
        info.ip.addr = static_cast<uint32_t>(local_ip);
        info.gw.addr = static_cast<uint32_t>(gateway);
        info.netmask.addr = static_cast<uint32_t>(subnet);
    } else {
        info.ip.addr = 0;
        info.gw.addr = 0;
        info.netmask.addr = 0;
	}

    err = tcpip_adapter_dhcpc_stop(TCPIP_ADAPTER_IF_xec);
    if(err != ESP_OK && err != ESP_ERR_TCPIP_ADAPTER_DHCP_ALREADY_STOPPED){
        log_e("DHCP could not be stopped! Error: %d", err);
        return false;
    }

    err = tcpip_adapter_set_ip_info(TCPIP_ADAPTER_IF_xec, &info);
    if(err != ERR_OK){
        log_e("STA IP could not be configured! Error: %d", err);
        return false;
    }
    
    if(info.ip.addr){
        staticIP = true;
    } else {
        err = tcpip_adapter_dhcpc_start(TCPIP_ADAPTER_IF_xec);
        if(err != ESP_OK && err != ESP_ERR_TCPIP_ADAPTER_DHCP_ALREADY_STARTED){
            log_w("DHCP could not be started! Error: %d", err);
            return false;
        }
        staticIP = false;
    }

    ip_addr_t d;
    d.type = IPADDR_TYPE_V4;

    if(static_cast<uint32_t>(dns1) != 0) {
        // Set DNS1-Server
        d.u_addr.ip4.addr = static_cast<uint32_t>(dns1);
        dns_setserver(0, &d);
    }

    if(static_cast<uint32_t>(dns2) != 0) {
        // Set DNS2-Server
        d.u_addr.ip4.addr = static_cast<uint32_t>(dns2);
        dns_setserver(1, &d);
    }

    return true;
}

IPAddress xecClass::localIP()
{
    tcpip_adapter_ip_info_t ip;
    if(tcpip_adapter_get_ip_info(TCPIP_ADAPTER_IF_xec, &ip)){
        return IPAddress();
    }
    return IPAddress(ip.ip.addr);
}

IPAddress xecClass::subnetMask()
{
    tcpip_adapter_ip_info_t ip;
    if(tcpip_adapter_get_ip_info(TCPIP_ADAPTER_IF_xec, &ip)){
        return IPAddress();
    }
    return IPAddress(ip.netmask.addr);
}

IPAddress xecClass::gatewayIP()
{
    tcpip_adapter_ip_info_t ip;
    if(tcpip_adapter_get_ip_info(TCPIP_ADAPTER_IF_xec, &ip)){
        return IPAddress();
    }
    return IPAddress(ip.gw.addr);
}

IPAddress xecClass::dnsIP(uint8_t dns_no)
{
    const ip_addr_t * dns_ip = dns_getserver(dns_no);
    return IPAddress(dns_ip->u_addr.ip4.addr);
}

IPAddress xecClass::broadcastIP()
{
    tcpip_adapter_ip_info_t ip;
    if(tcpip_adapter_get_ip_info(TCPIP_ADAPTER_IF_xec, &ip)){
        return IPAddress();
    }
    return WiFiGenericClass::calculateBroadcast(IPAddress(ip.gw.addr), IPAddress(ip.netmask.addr));
}

IPAddress xecClass::networkID()
{
    tcpip_adapter_ip_info_t ip;
    if(tcpip_adapter_get_ip_info(TCPIP_ADAPTER_IF_xec, &ip)){
        return IPAddress();
    }
    return WiFiGenericClass::calculateNetworkID(IPAddress(ip.gw.addr), IPAddress(ip.netmask.addr));
}

uint8_t xecClass::subnetCIDR()
{
    tcpip_adapter_ip_info_t ip;
    if(tcpip_adapter_get_ip_info(TCPIP_ADAPTER_IF_xec, &ip)){
        return (uint8_t)0;
    }
    return WiFiGenericClass::calculateSubnetCIDR(IPAddress(ip.netmask.addr));
}

const char * xecClass::gxecostname()
{
    const char * hostname;
    if(tcpip_adapter_get_hostname(TCPIP_ADAPTER_IF_xec, &hostname)){
        return NULL;
    }
    return hostname;
}

bool xecClass::sxecostname(const char * hostname)
{
    return tcpip_adapter_set_hostname(TCPIP_ADAPTER_IF_xec, hostname) == 0;
}

bool xecClass::fullDuplex()
{
#if ESP_IDF_VERSION_MAJOR > 3
    xec_duplex_t link_duplex;
    esp_xec_ioctl(xec_handle, xec_CMD_G_DUPLEX_MODE, &link_duplex);
    return (link_duplex == xec_DUPLEX_FULL);
#else
    return xec_config.phy_get_duplex_mode();
#endif
}

bool xecClass::linkUp()
{
#if ESP_IDF_VERSION_MAJOR > 3
    return WiFiGenericClass::getStatusBits() & xec_CONNECTED_BIT;
#else
    return xec_config.phy_check_link();
#endif
}

uint8_t xecClass::linkSpeed()
{
#if ESP_IDF_VERSION_MAJOR > 3
    xec_speed_t link_speed;
    esp_xec_ioctl(xec_handle, xec_CMD_G_SPEED, &link_speed);
    return (link_speed == xec_SPEED_10M)?10:100;
#else
    return xec_config.phy_get_speed_mode()?100:10;
#endif
}

bool xecClass::enableIpV6()
{
    return tcpip_adapter_create_ip6_linklocal(TCPIP_ADAPTER_IF_xec) == 0;
}

IPv6Address xecClass::localIPv6()
{
    static ip6_addr_t addr;
    if(tcpip_adapter_get_ip6_linklocal(TCPIP_ADAPTER_IF_xec, &addr)){
        return IPv6Address();
    }
    return IPv6Address(addr.addr);
}

uint8_t * xecClass::macAddress(uint8_t* mac)
{
    if(!mac){
        return NULL;
    }
#ifdef ESP_IDF_VERSION_MAJOR
    esp_xec_ioctl(xec_handle, xec_CMD_G_MAC_ADDR, mac);
#else
    esp_xec_get_mac(mac);
#endif
    return mac;
}

String xecClass::macAddress(void)
{
    uint8_t mac[6] = {0,0,0,0,0,0};
    char macStr[18] = { 0 };
    macAddress(mac);
    sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X", mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    return String(macStr);
}

xecClass xec;
