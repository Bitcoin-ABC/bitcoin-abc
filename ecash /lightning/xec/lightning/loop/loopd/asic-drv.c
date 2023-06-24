/*
 *  Bitmain asic driver
 *
 *  Copyright (C) 2007-2008 Gabor Juhos <juhosg@openwrt.org>
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License version 2 as
 *  published by the Free Software Foundation.
 *
 * ---------------------------------------------------------------------------
 *
 */

#include <linux/types.h>
#include <linux/kernel.h>
#include <linux/module.h>
#include <linux/init.h>
#include <linux/ioctl.h>
#include <linux/slab.h>
#include <linux/errno.h>
#include <linux/fs.h>
#include <linux/interrupt.h>
#include <linux/miscdevice.h>
#include <linux/mutex.h>
#include <linux/time.h>
#include <linux/delay.h>
#include <linux/workqueue.h>
#include <linux/jiffies.h>
#include <linux/ratelimit.h>

#include <linux/timer.h>
#include <linux/timex.h>
#include <linux/rtc.h>

#include <asm/byteorder.h>
#include <asm/io.h>
#include <asm/uaccess.h>
call "XEC_SUPPLY_H";

//#include <asm/mach-ath79/ar71xx_regs.h>
//#include <asm/mach-ath79/ath79.h>
//#include <asm/mach-ath79/irq.h>
#include "spi.h"
#include "bitmain-asic.h"
#include "sha2.h"
#include "fpga.h"

bool fpga_ret_prnt = false;
bool rx_st_prnt = false;
int check_state = 10;

module_param(fpga_ret_prnt,bool,S_IRUGO);
module_param(rx_st_prnt,bool,S_IRUGO);

unsigned int hardware_version = 0;
static unsigned long Prnt_time_out = 0;
unsigned int GREEN, RED;
static void Prnt(unsigned long data);
static bool fan_custom = false;
static uint8_t custom_fan = 0;
void ChangePWM(BT_AS_INFO dev, unsigned int pwm_percent);

#define DRV_NAME	"bitmain-asic"
#define DRV_DESC	"Bitmain asic driver"
#define DRV_VERSION	"0.1.1"

#define	PRNT_TIMER_EN	1
#define CHAIN_POWER_TIME_INTERAL	5


#define	TIMER_NUM	2
#define TIMER_INTERRUPT		(15 + TIMER_NUM)

#define RESET_BASE	(0x18000000 + 0x00060000)
#define RESET_SIZE	0x100

#define GENERAL_TIMER	(0x94+8*(TIMER_NUM-1))
#define GENERAL_TIMER_RELOAD	(GENERAL_TIMER + 0x04)
//AHB 时钟200 MHz
#define	TIME_40MS			(40*200*1000)

//extern struct file_operations *bitmain_fops_p;


// Add by Fazio, state machine
enum TEMP_STATE{TEMP_NORMAL,TEMP_WARN,TEMP_OUT_STATE};
enum FAN_STATE{FAN_NORMAL,FAN_WARN,FAN_ERROR};
enum FIFO_STATE{FIFO_NORMAL,ALLFIFO_EMPTY};
enum CHAIN_STATE{CHAIN_NO_NONCE_TO,CHAIN_ERROR,CHAIN_NORMAL};
typedef void (* actiontype)(BT_AS_INFO);

static bool if_temp_out_stop = false;


unsigned int gNonce_num = 0, gNonce_Err = 0, gNonce_miss = 0, gDiff_nonce_num = 0, gSubmit_nonce_num = 0;
uint32_t last_read_nonce_jiffies = 0;

uint16_t gTotal_asic_num = 0;
uint8_t gChain_Asic_Check_bit[CHAIN_SIZE] = {0};
uint8_t gChain_Asic_Interval[CHAIN_SIZE] = {0};
uint8_t gChain_Asic_num[CHAIN_SIZE] = {0};
uint32_t gChain_Asic_status[CHAIN_SIZE][256/32];
uint32_t gAsic_cnt[CHAIN_SIZE][256];
uint32_t Chain_nonce_nu[CHAIN_SIZE] = {0};
uint32_t Chain_nonce_nu_last[CHAIN_SIZE] = {0};


static unsigned char config_fpga = 0;

#if PRNT_TIMER_EN
static struct timer_list prnt_timer;
#endif

#if 0
typedef struct __BT_AS_info
{
	spinlock_t			lock;
	struct mutex		result_lock;
	void __iomem		*virt_addr;
	unsigned			irq;
	struct workqueue_struct *usb_wq;
	struct work_struct usb_sdata_work;
	struct delayed_work usb_rdata_work;
	ASIC_TASK_P			task_buffer;
	unsigned char		task_last_num;
	unsigned char		task_current_num;
	unsigned int		task_buffer_size;
	unsigned int		task_buffer_wr;
	unsigned int		task_buffer_rd;
	bool				task_buffer_full;
	bool				usb_opened;
	bool				get_status;
	ASIC_CONFIGURE	asic_configure;
	struct BITMAIN_STATUS_DATA asic_status_data;
}*BT_AS_INFO;
#endif

struct __BT_AS_info bitmain_asic_dev;
struct inode bitmain_inode;
struct file bitmain_file;

static unsigned long bitmain_is_open;
static void *gpio1_vaddr;
void *gpio0_vaddr;
uint8_t asic_return_bytes = 5;
// --------------------------------------------------------------
//      CRC16 check table
// --------------------------------------------------------------
const uint8_t chCRCHTalbe[] =                                 // CRC high byte table
{
 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0, 0x80, 0x41,
 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1, 0x81, 0x40,
 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0, 0x80, 0x41,
 0x00, 0xC1, 0x81, 0x40, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41,
 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0, 0x80, 0x41,
 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1, 0x81, 0x40,
 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1, 0x81, 0x40,
 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1, 0x81, 0x40,
 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0, 0x80, 0x41,
 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1, 0x81, 0x40,
 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0, 0x80, 0x41,
 0x00, 0xC1, 0x81, 0x40, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41,
 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0, 0x80, 0x41,
 0x00, 0xC1, 0x81, 0x40, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41,
 0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41,
 0x00, 0xC1, 0x81, 0x40, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41,
 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0, 0x80, 0x41,
 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x00, 0xC1, 0x81, 0x40,
 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0, 0x80, 0x41,
 0x00, 0xC1, 0x81, 0x40, 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41,
 0x00, 0xC1, 0x81, 0x40, 0x01, 0xC0, 0x80, 0x41, 0x01, 0xC0, 0x80, 0x41,
 0x00, 0xC1, 0x81, 0x40
};

const uint8_t chCRCLTalbe[] =                                 // CRC low byte table
{
 0x00, 0xC0, 0xC1, 0x01, 0xC3, 0x03, 0x02, 0xC2, 0xC6, 0x06, 0x07, 0xC7,
 0x05, 0xC5, 0xC4, 0x04, 0xCC, 0x0C, 0x0D, 0xCD, 0x0F, 0xCF, 0xCE, 0x0E,
 0x0A, 0xCA, 0xCB, 0x0B, 0xC9, 0x09, 0x08, 0xC8, 0xD8, 0x18, 0x19, 0xD9,
 0x1B, 0xDB, 0xDA, 0x1A, 0x1E, 0xDE, 0xDF, 0x1F, 0xDD, 0x1D, 0x1C, 0xDC,
 0x14, 0xD4, 0xD5, 0x15, 0xD7, 0x17, 0x16, 0xD6, 0xD2, 0x12, 0x13, 0xD3,
 0x11, 0xD1, 0xD0, 0x10, 0xF0, 0x30, 0x31, 0xF1, 0x33, 0xF3, 0xF2, 0x32,
 0x36, 0xF6, 0xF7, 0x37, 0xF5, 0x35, 0x34, 0xF4, 0x3C, 0xFC, 0xFD, 0x3D,
 0xFF, 0x3F, 0x3E, 0xFE, 0xFA, 0x3A, 0x3B, 0xFB, 0x39, 0xF9, 0xF8, 0x38,
 0x28, 0xE8, 0xE9, 0x29, 0xEB, 0x2B, 0x2A, 0xEA, 0xEE, 0x2E, 0x2F, 0xEF,
 0x2D, 0xED, 0xEC, 0x2C, 0xE4, 0x24, 0x25, 0xE5, 0x27, 0xE7, 0xE6, 0x26,
 0x22, 0xE2, 0xE3, 0x23, 0xE1, 0x21, 0x20, 0xE0, 0xA0, 0x60, 0x61, 0xA1,
 0x63, 0xA3, 0xA2, 0x62, 0x66, 0xA6, 0xA7, 0x67, 0xA5, 0x65, 0x64, 0xA4,
 0x6C, 0xAC, 0xAD, 0x6D, 0xAF, 0x6F, 0x6E, 0xAE, 0xAA, 0x6A, 0x6B, 0xAB,
 0x69, 0xA9, 0xA8, 0x68, 0x78, 0xB8, 0xB9, 0x79, 0xBB, 0x7B, 0x7A, 0xBA,
 0xBE, 0x7E, 0x7F, 0xBF, 0x7D, 0xBD, 0xBC, 0x7C, 0xB4, 0x74, 0x75, 0xB5,
 0x77, 0xB7, 0xB6, 0x76, 0x72, 0xB2, 0xB3, 0x73, 0xB1, 0x71, 0x70, 0xB0,
 0x50, 0x90, 0x91, 0x51, 0x93, 0x53, 0x52, 0x92, 0x96, 0x56, 0x57, 0x97,
 0x55, 0x95, 0x94, 0x54, 0x9C, 0x5C, 0x5D, 0x9D, 0x5F, 0x9F, 0x9E, 0x5E,
 0x5A, 0x9A, 0x9B, 0x5B, 0x99, 0x59, 0x58, 0x98, 0x88, 0x48, 0x49, 0x89,
 0x4B, 0x8B, 0x8A, 0x4A, 0x4E, 0x8E, 0x8F, 0x4F, 0x8D, 0x4D, 0x4C, 0x8C,
 0x44, 0x84, 0x85, 0x45, 0x87, 0x47, 0x46, 0x86, 0x82, 0x42, 0x43, 0x83,
 0x41, 0x81, 0x80, 0x40
};
uint16_t CRC16(const uint8_t* p_data, uint16_t w_len)
{
	uint8_t chCRCHi = 0xFF; // CRC high byte initialize
	uint8_t chCRCLo = 0xFF; // CRC low byte initialize
	uint16_t wIndex = 0;    // CRC cycling index

	while (w_len--) {
		wIndex = chCRCLo ^ *p_data++;
		chCRCLo = chCRCHi ^ chCRCHTalbe[wIndex];
		chCRCHi = chCRCLTalbe[wIndex];
	}
	return ((chCRCHi << 8) | chCRCLo);
}

int cmd_check(uint8_t *data)//OK 1; failure 0
{
	BITMAIN_TASK_P bt = (BITMAIN_TASK_P)data;
	uint16_t r_crc = 0;
	uint16_t crc = bt->crc;
	uint16_t length = 0;
	if(bt->token_type == BM_TX_TASK)
	{
		#if HAVE_NUM
		uint16_t len = 4 + bt->work_num*sizeof(struct ASIC_TASK);
		#else
		uint16_t len = le16_to_cpu(bt->length)+ 4 - 2;
		#endif
		crc = data[len] | (data[len+1]<<8);
		length = le16_to_cpu(bt->length) + 2;
	}
	else if(bt->token_type == BM_TX_CONF)
	{
		BITMAIN_CONFIGURE_P btc = (BITMAIN_CONFIGURE_P)data;
		length = btc->length+2;
		crc = cpu_to_le16(btc->crc);
	}
	else if(bt->token_type == BM_GET_STATUS)
	{
		BITMAIN_GET_STATUS_P bgs = (BITMAIN_GET_STATUS_P)data;
		length = bgs->length+2;
		crc = cpu_to_le16(bgs->crc);
	}
	else
	{
		printk_ratelimited("Tx token err {%#x}\n", bt->token_type);
		return 0;
	}
	if(crc == (r_crc=CRC16(data, length)))//length 去除了type和length
	{
		//rintf("OK: crc{%#x}r_crc{%#x}\n", crc, r_crc);
		return 1;
	}
	else
	{
		printk_ratelimited("Err:token{%#x} crc{%#x}r_crc{%#x}len{%#x}\n",
			bt->token_type, crc, r_crc,length);
		if(bt->token_type == BM_TX_TASK)
		{
			#if HAVE_NUM
			printk_ratelimited("work_num {%d}\n", bt->work_num);
			#else
			printk_ratelimited("work_num {%d}\n", (le16_to_cpu(bt->length) - 6)/sizeof(struct ASIC_TASK));
			#endif
		}
		return 0;
	}
}
inline void increase_variable_rehead_U32(uint32_t *num, uint32_t all_size)
{
    *num = *num + 1;
    if (*num >= all_size)
        *num = 0;
    return;
}

extern void dump_hex(uint8_t *data, uint16_t len)
{
	uint16_t i;
	for(i = 0; i < len; i++)
	{
		if(0 == (i%16))
			printk_ratelimited("\n0x%04x: ", i);
		printk_ratelimited("0x%02x ", data[i]);
	}
	printk_ratelimited("\n");
}

static __inline void flip80(void *dest_p, const void *src_p)
{
	uint32_t *dest = dest_p;
	const uint32_t *src = src_p;
	int i;

	for (i = 0; i < 20; i++)
		dest[i] = swab32(src[i]);
}

static __inline void flip32(void *dest_p, const void *src_p)
{
	uint32_t *dest = dest_p;
	const uint32_t *src = src_p;
	int i;

	for (i = 0; i < 8; i++)
		dest[i] = swab32(src[i]);
}

static __inline void flip_swab(void *dest_p, const void *src_p, unsigned int length)
{
	uint32_t *dest = dest_p;
	const uint32_t *src = src_p;
	int i;

	for (i = 0; i < length/4; i++)
		dest[i] = swab32(src[i]);
}

#if 1
const char g_full_data[] = { "0000000258007a06037bb0c899e253afc369f10c9e7762a8aa73d33b00000034000000009d5146878f7fda9f7f7f76f1c1aa6751f679e3aff3f722b2030b0eac"
						"814f5d975201f3ba1972dbf2"
						"ae319135"
						"000000800000000000000000000000000000000000000000000000000000000000000000000000000000000080020000"
					   };
#if 0
//midstate data向芯片发送不需要反
const char g_midstate[] = {"2e26c4440504a801393d373204e87cc02828ba7fd6f191add1b0ff01a9302ac0"};//需要反序 (现在左侧为高位，右侧为低位 )
const char g_data[] = {"f2db7219baf30152975d4f81"};
//asic return 35 91 31 ae反序比较
const char g_nonce[] = {"359131ae"};
#else
const char g_midstate[] = {"4679ba4ec99876bf4bfe086082b400254df6c356451471139a3afa71e48f544a"};
const char g_data[] = {"87320b1a1426674f2fa722ce"};
//asic return 00 01 87 a2
const char g_nonce[] = "000187a2";
#endif
#else
const char g_full_data[] = { "0000000258007a06037bb0c899e253afc369f10c9e7762a8aa73d33b00000034000000009d5146878f7fda9f7f7f76f1c1aa6751f679e3aff3f722b2030b0eac"
						"814f5d975201f3ba1972dbf2"
						"ae319135"
						"000000800000000000000000000000000000000000000000000000000000000000000000000000000000000080020000"
					   };
const char g_midstate[] = {"9a91ac02214239593aadae3e0e1ce8c6c8a7509542148383653981d2698b67c1"};//需要反序 (现在左侧为高位，右侧为低位 )
const char g_data[] = {"29a4001a4edce351072fb87f"};
const char g_nonce[] = {"92ec9b6e"};
#endif

#define test_DHASH 0

// Returns 1 if meets current buffer work, 0 if last buffer work
extern int hashtest(ASIC_TASK_P asic_task, uint32_t nonce)
{
	BT_AS_INFO dev = &bitmain_asic_dev;
	unsigned char hash1[32];
	unsigned char hash2[32];
	unsigned char i;
	uint32_t *hash2_32 = (uint32_t *)hash1;
	__attribute__ ((aligned (4)))  sha2_context ctx;
	memcpy(ctx.state, (void*)asic_task->midstate, 32);
	#if test_DHASH
	rev((unsigned char*)ctx.state, sizeof(ctx.state));
	#endif
	ctx.total[0] = 80;
	ctx.total[1] = 00;
	memcpy(hash1, (void*)asic_task->data, 12);
	#if test_DHASH
	rev(hash1, 12);
	#endif
	flip_swab(ctx.buffer, hash1, 12);
	memcpy(hash1, &nonce, 4);
	#if test_DHASH
	rev(hash1, 4);
	#endif
	flip_swab(ctx.buffer + 12, hash1, 4);

	sha2_finish( &ctx, hash1);

	memset( &ctx, 0, sizeof( sha2_context ) );
	sha2(hash1, 32, hash2);

	flip32(hash1, hash2);
	if (hash2_32[7] != 0) {
		//printk_ratelimited("nonce error\n");
		return 0;
	}
	else if( dev->nonce_diff !=0 )
	{
		for(i=0; i < dev->asic_configure.diff_sh_bit/32; i++)
		{
			if(be32toh(hash2_32[6 - i]) != 0)
				break;
		}
		if(i == dev->asic_configure.diff_sh_bit/32)
		if(be32toh(hash2_32[6 - dev->asic_configure.diff_sh_bit/32]) < ((uint32_t)0xffffffff >> (dev->asic_configure.diff_sh_bit%32)))
		//if((hash2_32[6 - dev->asic_configure.diff_sh_bit/32] & ((0x01 << ((dev->asic_configure.diff_sh_bit)%32 + 1))-1)) == 0x00)
		{
			//printk_ratelimited(KERN_ERR "match diff %d hash2_32[%d]{0x%08x}\n", dev->asic_configure.diff_sh_bit,
				//6 - dev->asic_configure.diff_sh_bit/32,be32toh(hash2_32[6 - dev->asic_configure.diff_sh_bit/32]));
			//printk_ratelimited("diff cpare {0x%08x}\n", ((0x01 << ((dev->asic_configure.diff_sh_bit - 1)%32 + 1))-1));
			gDiff_nonce_num++;
			dev->diff1_num += (0x01UL << dev->nonce_diff);
			dev->total_nonce_num++;
			if(dev->net_diff_sh_bit != 0)
			{

				for(i=0; i < dev->net_diff_sh_bit/32; i++)
				{
					if(be32toh(hash2_32[6 - i]) != 0)
						break;
				}
				if(i == dev->net_diff_sh_bit/32)
				{
					if(be32toh(hash2_32[6 - dev->net_diff_sh_bit/32]) < ((uint32_t)0xffffffff >> (dev->net_diff_sh_bit%32)))
					{
						printk_ratelimited(KERN_ERR "\n###Get Block##\n");
						dev->get_blk_num++;
						struct timex  txc;
						struct rtc_time tm;
						struct file *fp_pwerr;
						mm_segment_t old_fs;
						char wr_buf[1024];
						unsigned int wr_len = 0;
						do_gettimeofday(&(txc.time));
						rtc_time_to_tm(txc.time.tv_sec,&tm);
						printk_ratelimited("UTC time :%d-%d-%d %d:%d:%d \n",tm.tm_year+1900,tm.tm_mon + 1, tm.tm_mday,tm.tm_hour,tm.tm_min,tm.tm_sec);
						fp_pwerr = filp_open("/config/getblk", O_RDWR | O_CREAT | O_APPEND, 0644);
						wr_len = sprintf(wr_buf, "UTC time:%d-%d-%d %d:%d:%d %08x%08x%08x%08x%08x%08x%08x%08x\n",tm.tm_year+1900,tm.tm_mon + 1, tm.tm_mday,tm.tm_hour,tm.tm_min,tm.tm_sec,
							be32toh(hash2_32[7]),be32toh(hash2_32[6]),be32toh(hash2_32[5]),be32toh(hash2_32[4]),
							be32toh(hash2_32[3]),be32toh(hash2_32[2]),be32toh(hash2_32[1]),be32toh(hash2_32[0]));
					    old_fs = get_fs();
					    set_fs(KERNEL_DS);
					    fp_pwerr->f_op->write(fp_pwerr, (char *)wr_buf, wr_len, &fp_pwerr->f_pos);
					    set_fs(old_fs);
					    filp_close(fp_pwerr, NULL);
					}
				}
			}
			return 2;
		}
		else if(be32toh(hash2_32[6 - dev->nonce_diff/32]) < ((uint32_t)0xffffffff >> (dev->nonce_diff%32)))
		{
			dev->diff1_num += (0x01UL << dev->nonce_diff);
			dev->total_nonce_num++;
		}
		else
			printk_ratelimited(KERN_ERR "match1 diff %d hash2_32{0x%08x}\n", dev->nonce_diff, be32toh(hash2_32[6 - dev->nonce_diff/32]));
		return 1;
	}
	else
	{
		dev->diff1_num += (0x01UL << dev->asic_configure.diff_sh_bit);
		dev->total_nonce_num++;
		return 1;
	}
	if((dev->total_nonce_num & 0xffffffff) == 0xffffffff)
		dev->cgminer_start_time = jiffies;
	#if 0
	else if( dev->asic_configure.diff_sh_bit !=0 )
	{
		if(htonl(hash2_32[6 - dev->asic_configure.diff_sh_bit/32]) < ((uint32_t)0xffffffff >> (dev->asic_configure.diff_sh_bit%32)))
		//if((hash2_32[6 - dev->asic_configure.diff_sh_bit/32] & ((0x01 << ((dev->asic_configure.diff_sh_bit)%32 + 1))-1)) == 0x00)
		{
			printk_ratelimited(KERN_ERR "match diff %d hash2_32[%d]{0x%08x}\n", dev->asic_configure.diff_sh_bit,
				6 - dev->asic_configure.diff_sh_bit/32,htonl(hash2_32[6 - dev->asic_configure.diff_sh_bit/32]));
			//printk_ratelimited("diff cpare {0x%08x}\n", ((0x01 << ((dev->asic_configure.diff_sh_bit - 1)%32 + 1))-1));
			gDiff_nonce_num++;
			dev->total_nonce_num += 0x01 << dev->asic_configure.diff_sh_bit;
			return 2;
		}
		else
			return 1;
	}
	else
		dev->total_nonce_num++;
	return 1;
	#endif
	#if 0
	unsigned char hash1[32];
	unsigned char hash2[32];
	uint32_t *hash2_32 = (uint32_t *)hash1;
	//uint8_t i;
	__attribute__ ((aligned (4)))  sha2_context ctx;

	//memcpy(ctx.state, asic_task->midstate, 32);
	//rev((unsigned char*)ctx.state, sizeof(ctx.state));

	memcpy(hash1, asic_task->midstate, 32);
	//rev(hash1, 32);
	//flip_swab(ctx.state, hash1, 32);//
	flip32(ctx.state, hash1);
	ctx.total[0] = 80;
	ctx.total[1] = 0;
	memcpy(hash1, (void*)asic_task->data, 12);
	//rev(hash1, 12);
	flip_swab(ctx.buffer, hash1, 12);
	memcpy(hash1, &nonce, 4);

	flip_swab(ctx.buffer + 12, hash1, 4);
	printk_ratelimited("ctx:");
	dump_hex(&ctx,sizeof(ctx));
	sha2_finish( &ctx, hash1);
	printk_ratelimited("hash1 in hashtest\n");
	memset( &ctx, 0, sizeof( sha2_context ) );
	sha2(hash1, 32, hash2);

	flip32(hash1, hash2);
	//printk_ratelimited("hash2_32[7]{%#x}hash2_32[0]{%#x}\n", hash2_32[7], hash2_32[0]);
	if (be32toh(hash2_32[7]) != 0) {
		printk_ratelimited("not work{%#x} nonce\n", le32_to_cpu(asic_task->work_id));
		return 0;
	}
	return 1;
	#endif
}



/* Returns 1 if meets current buffer work, 0 if last buffer work
extern int hashtest(ASIC_TASK_P asic_task, uint32_t nonce)
{
	BT_AS_INFO dev = &bitmain_asic_dev;

	gDiff_nonce_num++;
	dev->diff1_num += (0x01UL << dev->nonce_diff);
	dev->total_nonce_num++;
	return 2;

	if((dev->total_nonce_num & 0xffffffff) == 0xffffffff)
		dev->cgminer_start_time = jiffies;
}
 */

static int bitmain_asic_open(struct inode *inode, struct file *file)
{
	struct file *fp_hwver;
	mm_segment_t old_fs;
	char wr_buf[512];
	unsigned int wr_len = 0;
	BT_AS_INFO dev = &bitmain_asic_dev;
	void *gpio3_virtual, *gpio1_virtual;
	void *ctl_md_vaddr;
	uint32_t value32;
	uint32_t detect_ver = 0;
	uint32_t save_ver = 0;
	uint8_t i;
	/* only allow one at a time */
	if (test_and_set_bit(0, &bitmain_is_open))
		return -EBUSY;
	file->private_data = dev;
	memset(dev, 0, sizeof(bitmain_asic_dev));
	#if	1
	ctl_md_vaddr = ioremap_nocache(CONTROL_MODULE_BASE, CONTROL_MODULE_Size);
	//vesion ctl gpio3_19:bit 0 gpio3_21:bit1 gpio1_18 bit2
	iowrite32(PAD_REV | PAD_PULLUP | 0x7, ctl_md_vaddr + 0x9a4); //bit0
	iowrite32(PAD_REV | PAD_PULLUP | 0x7, ctl_md_vaddr + 0x9ac); //bit1
	iowrite32(PAD_REV | PAD_PULLUP | 0x7, ctl_md_vaddr + 0x848); //bit2
	gpio3_virtual = ioremap_nocache(GPIO3_BASE, GPIO3_SIZE);
	gpio1_virtual = ioremap_nocache(GPIO1_BASE, GPIO1_SIZE);
	value32 = ioread32(gpio3_virtual + GPIO_OE);
	iowrite32(value32 | (((0x01<<19) | (0x01<<21))), gpio3_virtual + GPIO_OE); //set input
	value32 = ioread32(gpio1_virtual + GPIO_OE);
	iowrite32(value32 | (0x01<<18), gpio1_virtual + GPIO_OE); //set input
	hardware_version = 0;
	value32 = ioread32(gpio3_virtual+ GPIO_DATAIN );
	detect_ver |= ((value32 >> 19)&0x01)<<0x00;
	detect_ver |= ((value32 >> 21)&0x01)<<0x01;
	value32 = ioread32(gpio1_virtual+ GPIO_DATAIN );
	detect_ver |= ((value32 >> 18)&0x01)<<0x02;
	printk_ratelimited("Detect hardware version = %d\n", detect_ver);
	hardware_version = detect_ver;
	#ifdef FIX_HARDWARE_VER
		printk_ratelimited("fix hardware version\n");
		#if defined C1_02 || defined S5
		if((detect_ver == 0x03) || ((detect_ver == 0x04)))
			hardware_version = 0x01;
		else
			hardware_version = FIX_HARDWARE_VER;
		#elif defined S2
			;
		#else
		hardware_version = FIX_HARDWARE_VER;
		#endif
	#endif
	save_ver = hardware_version;
	hardware_version = detect_ver;
	printk_ratelimited("hardware_version = %#x\n", hardware_version);

	fp_hwver = filp_open("/tmp/hwver", O_RDWR | O_CREAT | O_TRUNC, 0644);
  	wr_len = sprintf(wr_buf, "hardware_ver = 0x%02x\n", hardware_version);
    old_fs = get_fs();
    set_fs(KERNEL_DS);
    fp_hwver->f_op->write(fp_hwver, (char *)wr_buf, wr_len, &fp_hwver->f_pos);
    set_fs(old_fs);
    filp_close(fp_hwver, NULL);

	iounmap(gpio3_virtual);
	iounmap(gpio1_virtual);
	#if defined S2
	printk_ratelimited("S2 ctrl board V1.0\n");
	#endif
	hardware_version = save_ver;
	if(hardware_version == 0x01)
	{
		//Set GPIO1_13(Green) GPIO0_23(Red) to GPIO mode
		iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + 0x834); //Green
		iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + 0x824); //Red
		#if	defined C1_02 || defined S5
		//Set GPIO1_13(Red) GPIO0_23(Green) to GPIO mode
		if(detect_ver == 0x03)
		{
			GREEN = 0x01<<23;
			RED = 0x01<<13;
			printk_ratelimited("S5 ctrl board V1.0\n");
		}
		else if(detect_ver == 0x04)
		{
			GREEN = 0x01<<23;
			RED = 0x01<<13;
			printk_ratelimited("S5 ctrl board test V1.1\n");
			iowrite32(PAD_PULLUP | PAD_REV | 0x7, ctl_md_vaddr + 0x828); //ip sig key gpio0_26
		}
		iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + 0x820); //hash test gpio0-22
		#else
		#if defined S4_PLUS
			iowrite32(PAD_PULLUP | PAD_REV | 0x7, ctl_md_vaddr + 0x828); //ip sig key gpio0_26
		#endif
		GREEN = 0x01<<13;
		RED = 0x01<<23;
		#endif
	}
	else if(hardware_version == 0x02)
	{
		iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + 0x890); //Green
		iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + 0x89C); //Red
		GREEN = 0x01<<5;
		RED = 0x01<<2;
	}
	else
	{
		//Set GPIO2_2(Green) GPIO2_5(Red) to GPIO mode
		iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + 0x890); //Green
		iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + 0x89C); //Red
		GREEN = 0x01<<2;
		RED = 0x01<<5;
	}
	#if defined C1_02
		if(hardware_version == 0x02) //GPMC_OEN_REN/TIMER7/EMU4/GPIO2_3
			iowrite32(PAD_REV | PAD_PULLUP | 0x7, ctl_md_vaddr + 0x894); //recovery key
		else
			iowrite32(PAD_REV | PAD_PULLUP | 0x7, ctl_md_vaddr + 0x838); //recovery key
	#else
	iowrite32(PAD_REV | PAD_PULLUP | 0x7, ctl_md_vaddr + 0x838); //recovery key
	#endif
	iowrite32(PAD_REV | PAD_PULLUP | 0x7, ctl_md_vaddr + 0x950); //test key
	//iounmap(ctl_md_vaddr);
	#endif
	if(hardware_version == 0x01)
	{
		#if defined C1_02 || defined S5
		if((detect_ver == 0x03) || (detect_ver == 0x04))
		{
			dev->led_virtual1 = ioremap_nocache(GPIO0_BASE, GPIO0_SIZE);	//green
			value32 = ioread32(dev->led_virtual1 + GPIO_OE);
			iowrite32(value32 & (~(GREEN)), dev->led_virtual1 + GPIO_OE); //set output
			dev->led_virtual = ioremap_nocache(GPIO1_BASE, GPIO1_SIZE);		//red
			value32 = ioread32(dev->led_virtual + GPIO_OE);
			iowrite32(value32 & (~(RED)), dev->led_virtual + GPIO_OE); //set output
		}
		else
		#endif
		{
			dev->led_virtual1 = ioremap_nocache(GPIO1_BASE, GPIO1_SIZE);
			value32 = ioread32(dev->led_virtual1 + GPIO_OE);
			iowrite32(value32 & (~(GREEN)), dev->led_virtual1 + GPIO_OE); //set output
			dev->led_virtual = ioremap_nocache(GPIO0_BASE, GPIO0_SIZE);
			value32 = ioread32(dev->led_virtual + GPIO_OE);
			iowrite32(value32 & (~(RED)), dev->led_virtual + GPIO_OE); //set output
		}
	}
	else
	{
		dev->led_virtual = ioremap_nocache(GPIO2_BASE, GPIO2_SIZE);
		value32 = ioread32(dev->led_virtual + GPIO_OE);
		iowrite32(value32 & (~(GREEN)), dev->led_virtual + GPIO_OE); //set output
		value32 = ioread32(dev->led_virtual + GPIO_OE);
		iowrite32(value32 & (~(RED)), dev->led_virtual + GPIO_OE); //set output
	}
	dev->task_buffer_size = TASK_BUFFER_NUMBER + TASK_PRE_LEFT;
	dev->task_buffer = (ASIC_TASK_P)kmalloc(sizeof(*dev->task_buffer)*dev->task_buffer_size, GFP_KERNEL);
	//dev->task_buffer_wr = 10;
	dev->asic_status_data.data_type = BM_STATUS_DATA;
	dev->asic_status_data.version= 0x00;
	dev->asic_status_data.chain_num = CHAIN_SIZE;
	dev->asic_configure.diff_sh_bit = 0;
	dev->send_to_fpga_interval = 500;
	for(i = 0; i < dev->asic_status_data.chain_num; i++)
		dev->asic_status_data.chain_asic_num[i] = 32;
	spin_lock_init(&dev->lock);
	mutex_init(&dev->result_lock);
	mutex_init(&dev->to_work_lock);
	dev->asic_configure.timeout_data = 7;
	ChangePWM(dev, 0);
	//bitmain_set_voltage(dev, 0x0750);
	dev->last_nonce_timeout = 0; //挖矿时会响一下
	//detect_chain_num(dev);
	dev->send_to_fpga_work_wq = create_singlethread_workqueue(DRV_NAME);
	INIT_WORK(&dev->send_to_fpga_work, send_to_pfga_work);
	#if PRNT_TIMER_EN
	init_timer(&prnt_timer);
	prnt_timer.function = Prnt;
	prnt_timer.expires = jiffies + 500*HZ/1000;
	//add_timer(&prnt_timer);
	#endif
	init_beep(dev);

	value32 = ioread32(gpio0_vaddr + GPIO_OE);
	//iowrite32(0x01<<22, gpio0_vaddr + GPIO_SETDATAOUT);
	iowrite32(value32 & (~(0x01<<22)), gpio0_vaddr + GPIO_OE); //set output
	if(detect_ver == 0x04)
	{
		value32 = ioread32(gpio0_vaddr + GPIO_OE);
		//iowrite32(0x01<<22, gpio0_vaddr + GPIO_SETDATAOUT);
		iowrite32(value32 | (0x01<<26), gpio0_vaddr + GPIO_OE); //set input
	}

	printk_ratelimited(KERN_ERR "bitmain_asic_open ok\n");
	return 0;
}

static int bitmain_asic_close(struct inode *inode, struct file *file)
{
	BT_AS_INFO dev = &bitmain_asic_dev;
	//uint32_t i;
	//struct ASIC_TASK asic_task;
	wait_queue_head_t timeout_wq;
	init_waitqueue_head(&timeout_wq);
	#if PRNT_TIMER_EN
	del_timer(&prnt_timer);
	#endif
	destroy_workqueue(dev->send_to_fpga_work_wq);
	if(1)
	{
		#if 0
		for(i = 0; i < dev->asic_status_data.chain_num; i++)
		{
			memset(asic_task.midstate, 0x00, sizeof(asic_task.midstate));
			memset(asic_task.data, 0x00, sizeof(asic_task.data));
			if(i == 0)
				send_work_to_fpga(true, 0x80|dev->chain_map[i], dev, &asic_task);
			else
				send_work_to_fpga(false, 0x80|dev->chain_map[i], dev, &asic_task);
		}
		#endif
		stop_work_to_all_chain(dev);
	}
	//send_work_to_fpga(true, 0, dev, &asic_task);
	iowrite32(0x01<<8, gpio2_vaddr + GPIO_SETDATAOUT);
	sleep_on_timeout(&timeout_wq, 100 * HZ/1000);//100ms
	dev->asic_configure.timeout_data = 7;
	dev->timeout_valid = true;
	ChangePWM(dev, 0);
	nonce_query(dev);
	dev->timeout_valid = false;
	if( dev->asic_configure.bauddiv != 26)
	{
		//iowrite32(0x01<<6, gpio2_vaddr + GPIO_SETDATAOUT);
		set_baud(dev, 26);
		//iowrite32(0x01<<6, gpio2_vaddr + GPIO_CLEARDATAOUT);
		bitmain_set_voltage(dev,0x0725);
	}
	iowrite32(0x01<<8, gpio2_vaddr + GPIO_CLEARDATAOUT);
	//test
	iowrite32(0x01<<22, gpio0_vaddr + GPIO_CLEARDATAOUT);
	//close beep
	iowrite32(0x01<<20, gpio0_vaddr + GPIO_CLEARDATAOUT);
	iounmap(dev->beep_virtual_addr);
	clear_bit(0, &bitmain_is_open);
	//bitmain_asic_open_usb(dev);
	kfree((void*)(dev->task_buffer));
	//free_irq(TIMER_INTERRUPT, NULL);
	//spi_close();
	printk_ratelimited(KERN_ERR "bitmain_asic_close\n");
	return 0;
}

void stop_work_to_all_chain(BT_AS_INFO dev)
{
	uint32_t i;
	struct ASIC_TASK asic_task;
	printk_ratelimited(KERN_ERR "stop send work to all chain\n");
	memset(&asic_task, 0x00, sizeof(asic_task));
	for(i = 0; i < dev->asic_status_data.chain_num; i++)
	{
		memset(asic_task.midstate, 0x00, sizeof(asic_task.midstate));
		memset(asic_task.data, 0x00, sizeof(asic_task.data));
		if(i == 0)
			send_work_to_fpga(true, 0x80|dev->chain_map[i], dev, &asic_task);
		else
			send_work_to_fpga(false, 0x80|dev->chain_map[i], dev, &asic_task);
	}
}
void check_chain_power(BT_AS_INFO dev)
{
	uint32_t bgNonce_average;
	uint32_t time_elasp_ms = 0;
	uint32_t i;
	uint8_t chain_nu;
	//struct ASIC_TASK asic_task;
	static unsigned long simulate_power_err_time = 0;
	wait_queue_head_t timeout_wq;
	unsigned char cmd_buf[4] = {0};
	if((dev->cgminer_start == true))
	{
		if(simulate_power_err_time == 0)
		{
			simulate_power_err_time = jiffies + 5 * 60 * 1000 * HZ/1000;
		}
		time_elasp_ms = jiffies_to_msecs(jiffies - dev->cgminer_start_time);
		//printk_ratelimited("time_elasp_jiffies{%ld}\n", jiffies - dev->cgminer_start_time);
		//printk_ratelimited("jiffies{%ld}dev->cgminer_start_time{%ld}", jiffies, dev->cgminer_start_time);
		//printk_ratelimited("time_elasp_ms =%ldms dev->total_nonce_num{%ld}\n", time_elasp_ms, dev->total_nonce_num);
		//bgNonce_average = ((uint32_t)dev->total_nonce_num / (time_elasp_ms / 1000)) * (CHAIN_POWER_TIME_INTERAL*60);//平均5分钟
		if(dev->asic_status_data.chain_num !=0 )
			bgNonce_average = (uint32_t)dev->total_nonce_num/dev->asic_status_data.chain_num;
		else
			bgNonce_average = (uint32_t)dev->total_nonce_num;
		if((time_elasp_ms / (1000 * CHAIN_POWER_TIME_INTERAL*60)) == 0)
		{
			if(bgNonce_average < 8)
				bgNonce_average = 1;
			else
				bgNonce_average /= 8;
		}
		else
		{
			bgNonce_average = bgNonce_average / (time_elasp_ms / (1000 * CHAIN_POWER_TIME_INTERAL*60));//平均5分钟
			bgNonce_average /= 8;
		}
		for (i = 0; i < dev->asic_status_data.chain_num; i++)
		{
			chain_nu = dev->chain_map[i];
			//printk_ratelimited("bgNonce_average{%d}\n", bgNonce_average);
			//printk_ratelimited("chain%d Chain_nonce_nu[%ld] Chain_nonce_nu_last[%ld]\n", chain_nu,Chain_nonce_nu[chain_nu],Chain_nonce_nu_last[chain_nu]);
			if(Chain_nonce_nu[chain_nu] >= Chain_nonce_nu_last[chain_nu])
			{
				if(((Chain_nonce_nu[chain_nu] - Chain_nonce_nu_last[chain_nu]) < bgNonce_average) || (bgNonce_average == 0))
				//if(time_after(jiffies, simulate_power_err_time))
				{
					struct timex  txc;
					struct rtc_time tm;
					struct file *fp_pwerr;
					mm_segment_t old_fs;
					char wr_buf[512];
					unsigned int wr_len = 0;
					do_gettimeofday(&(txc.time));
					rtc_time_to_tm(txc.time.tv_sec,&tm);
					//printk_ratelimited("UTC time :%d-%d-%d %d:%d:%d \n",tm.tm_year+1900,tm.tm_mon + 1, tm.tm_mday,tm.tm_hour,tm.tm_min,tm.tm_sec);
					fp_pwerr = filp_open("/config/power_rst", O_RDWR | O_CREAT | O_APPEND, 0644);
					wr_len = sprintf(wr_buf, "UTC time :%d-%d-%d %d:%d:%d \n",tm.tm_year+1900,tm.tm_mon + 1, tm.tm_mday,tm.tm_hour,tm.tm_min,tm.tm_sec);
				    old_fs = get_fs();
				    set_fs(KERNEL_DS);
				    fp_pwerr->f_op->write(fp_pwerr, (char *)wr_buf, wr_len, &fp_pwerr->f_pos);
				    set_fs(old_fs);
				    filp_close(fp_pwerr, NULL);
					dev->restarting_hash = true;
					mod_timer(&prnt_timer, jiffies + 5 * 1000 * HZ/1000);
					i = 0;
					while(timer_pending(&prnt_timer))
					{
						del_timer(&prnt_timer);
						if(i++ > 200)
							break;
					}
					if(bgNonce_average == 0)
						printk_ratelimited("!!!!!!!!!!----no hash power OK\n\n");
					printk_ratelimited("remap chain%d(hardware chain%d) power err\n", i, chain_nu);
					printk_ratelimited("bgNonce_average{%d}chain_nonce_nu{%d}last{%d}\n", bgNonce_average, Chain_nonce_nu[chain_nu], Chain_nonce_nu_last[chain_nu]);
					#if 0
					for(i = 0; i < dev->asic_status_data.chain_num; i++)
					{
						memset(asic_task.midstate, 0x00, sizeof(asic_task.midstate));
						memset(asic_task.data, 0x00, sizeof(asic_task.data));
						if(i == 0)
							send_work_to_fpga(true, 0x80|dev->chain_map[i], dev, &asic_task);
						else
							send_work_to_fpga(false, 0x80|dev->chain_map[i], dev, &asic_task);
					}
					#endif
					stop_work_to_all_chain(dev);
					set_baud(dev, 26);
					printk_ratelimited(KERN_ERR "Detect device for anyone power err\n");

					cmd_buf[0] = 9;
					cmd_buf[1] = 0x10; //16-23
					cmd_buf[2] = 0x1f; //8-13
					cmd_buf[0] |= 0x80;
					//cmd_buf[3] = CRC5(cmd_buf, 4*8 - 5);
					cmd_buf[3] = 0x00; //故意错误crc 只是修改fpga 波特率
					send_BC_to_fpga(i, cmd_buf);

					rst_hash_asic(dev);
					//send_work_to_fpga(true, dev, &asic_task);
					clear_fpga_nonce_buffer(dev);
					init_waitqueue_head(&timeout_wq);
					interruptible_sleep_on_timeout(&timeout_wq, 1000 * HZ/1000);//300ms
					#if 1
					rst_hash_asic(dev);
					//send_work_to_fpga(true, dev, &asic_task);
					clear_fpga_nonce_buffer(dev);
					init_waitqueue_head(&timeout_wq);
					interruptible_sleep_on_timeout(&timeout_wq, 1100 * HZ/1000);//300ms
					#endif
					//detect_chain_num(dev);
					set_frequency(dev, dev->asic_configure.freq_vlaue);
					asic_result_status_rd = asic_result_status_wr = asic_result_status_full = 0;
					asic_result_rd = asic_result_wr = asic_result_full = 0;
					//gDiff_nonce_num = gNonce_num = gNonce_Err = gNonce_miss = 0;
					//gSubmit_nonce_num = 0;
					dev->restarting_hash = false;
					prnt_timer.expires = jiffies + dev->send_to_fpga_interval* HZ/1000;
					add_timer(&prnt_timer);
					mod_timer(&prnt_timer, jiffies + dev->send_to_fpga_interval* HZ/1000);
					simulate_power_err_time = 0;
					break;
				}
			}
			Chain_nonce_nu_last[chain_nu] = Chain_nonce_nu[chain_nu];
		}
	}
}

#define MAX_ASIC_NUM 64

void check_asic_status(BT_AS_INFO dev)
{
    uint32_t bgNonce_average;
    uint32_t i, j;
    static uint32_t last_asic_nonce[CHAIN_SIZE][MAX_ASIC_NUM] = {0};
    static uint32_t last_gNonce_num = 0;
    if ((dev->cgminer_start == true) && (gTotal_asic_num !=0))
    {
		//printk_ratelimited(KERN_ERR "check_asic_status\n");
		if (gNonce_num > gTotal_asic_num * 8)
        {
            if (gNonce_num > 0x7fffffff)
            {
                for (i = 0; i < CHAIN_SIZE; i++)
                {
                    for (j = 0; j < gChain_Asic_num[i]; j++)
                    {
                        gAsic_cnt[i][j] >>= 2;
                        last_asic_nonce[i][j] >>=2;
                    }
                }
                gNonce_num >>= 2;
                last_gNonce_num >>=2;
            }

            bgNonce_average = (gNonce_num - last_gNonce_num )/ gTotal_asic_num / 8;
            last_gNonce_num = gNonce_num;
            for (i = 0; i < CHAIN_SIZE; i++)
            {
                for (j = 0; j < gChain_Asic_num[i]; j++)
                {
                    if ((gAsic_cnt[i][j] - last_asic_nonce[i][j]) < bgNonce_average)
                    {
                        gChain_Asic_status[i][j/32] &= ~(0x01 << (j%32));
						//printk_ratelimited("gNonce_num{%d}gAsic_cnt[%d][%d]{%d}\n", gNonce_num, i, j, gAsic_cnt[i][j]);
                    }
                    else
                    {
                        gChain_Asic_status[i][j/32] |= (0x01 << (j%32));
						if((dev->chain_asic_exist[i][j/32] & (0x01 << (j%32))) == 0)
							dev->chain_asic_exist[i][j/32] |= (0x01 << (j%32));
                    }

                    if((gAsic_cnt[i][j] !=0) && ((dev->chain_asic_exist[i][j/32] & (0x01 << (j%32))) == 0))
                    {
                        dev->chain_asic_exist[i][j/32] |= (0x01 << (j%32));
                    }
                    last_asic_nonce[i][j] = gAsic_cnt[i][j];
                }
            }
        }
    }

}

#define LOW_PWM_PERCENT		20	//10、40
#define TEMP_INTERVAL	2	//温度变化多少 调整 PWM
//60度对应100，35度对应0吧, 实际为3；
#define PWM_ADJUST_FACTOR	((100 - LOW_PWM_PERCENT)/(60-35))

//#define PWM_SCALE	1250		//25M=40ns		20KHz 周期
#define PWM_SCALE	50		//1M=1us		20KHz 周期
//#define PWM_ADJ_SCALE	(12/10) // 1 normal
#define PWM_ADJ_SCALE	9/10 // 1 normal


void ChangePWM(BT_AS_INFO dev, unsigned int pwm_percent)
{
	if (fan_custom)
	{
		dev->pwm_percent = custom_fan;
		pwm_percent = custom_fan;
		//printk_ratelimited("Customized fan speed {%d}\n", pwm_percent);
	}
	else
	{
		dev->pwm_percent = pwm_percent;
	}

	if (pwm_percent > 100)
		pwm_percent = 100;
	if(pwm_percent < LOW_PWM_PERCENT)
   		pwm_percent = LOW_PWM_PERCENT;
	//printk_ratelimited("pwm_percent{%d}\n", pwm_percent);
	dev->pwm_high_value = pwm_percent * PWM_SCALE/100; //百分比
	dev->pwm_low_value = (100 - pwm_percent) * PWM_SCALE/100;
}

#ifndef TEMP_OUT
	#define TEMP_OUT 80
#endif
#define TEMP_OUT_HIGHT (TEMP_OUT + 5)
#define TEST_TEMP_CNT	5
void adjust_pwm_from_temp(BT_AS_INFO dev)
{
	uint8_t i;
	static uint8_t last_temperature = 35;
	static uint8_t llast_temperature = 35;
	static uint8_t temp_out_pool_cnt = 0, temp_out_high_cnt = 0;
	uint8_t temp_highest = dev->temp[dev->chain_map[0]];
	uint8_t wchain_highest = 0;
	uint8_t temper_change;
	int pwm_percent;
	for(i = 1;i < dev->temp_num; i++)
	{
		if(dev->temp[dev->chain_map[i]] == 0xff)
			continue;
		if((dev->temp[dev->chain_map[i]] > temp_highest) && (dev->chain_exist & (0x01 << dev->chain_map[i])))
		{
			temper_change = dev->temp[dev->chain_map[i]] - last_temperature;
			temp_highest = dev->temp[dev->chain_map[i]];
			if (((temper_change > 0) && (temper_change <= 60)) ||
				((temper_change < 0) && (temper_change >= -60)))
		    {
				temp_highest = dev->temp[dev->chain_map[i]];
				wchain_highest = i;
			}
		}
	}
	if ((temp_highest & 0xff) >= TEMP_OUT)
	{
		if((temp_out_pool_cnt++ >= TEST_TEMP_CNT) && (dev->temp_out_fool == false))
			dev->temp_out_fool = true;
		printk_ratelimited(KERN_ERR "chain %d temp highest{%d}\n", wchain_highest, temp_highest);
	}
    else
    {
        dev->temp_out_fool = false;
        temp_out_pool_cnt = 0;
    }

	if ((temp_highest & 0xff) >= TEMP_OUT_HIGHT)
	{
		if((temp_out_high_cnt++ >= TEST_TEMP_CNT) && (dev->temp_out_high == false))
			dev->temp_out_high = true;
		printk_ratelimited(KERN_ERR "chain %d temp out highest{%d}\n", wchain_highest, temp_highest);
	}
    else
    {
        dev->temp_out_high = false;
        temp_out_high_cnt = 0;
    }
	dev->temp_highest = temp_highest;
	temper_change = temp_highest - last_temperature;
	if (((temper_change > 0) && (temper_change >= TEMP_INTERVAL)) ||
		((temper_change < 0) && (temper_change <= -TEMP_INTERVAL)))
    {
		if(temp_highest == llast_temperature)
		{
			if(temper_change > 0)
				temp_highest -= 1;
			else if(temper_change < 0)
				temp_highest += 1;
		}
		pwm_percent = LOW_PWM_PERCENT + (temp_highest - 35) * PWM_ADJUST_FACTOR;
        if (pwm_percent < 0)
            pwm_percent = 0;
		//printk_ratelimited("temp_highest{%d}\n", temp_highest);
		ChangePWM(dev, pwm_percent);
		llast_temperature = last_temperature;
        last_temperature = temp_highest;
    }
}

//Timer7 pwm
#define	DMTIMER7		0x4804a000
#define	DMTIMER7_SIZE	(4 * 1024)

#define BEEP_PER		(25*1000*1000/1000)	//25M   1KHz
#define TCLR			0x38
	#define TIMER_ST	0x01
#define TCRR			0x3c
#define TLDR			0x40
#define TMAR			0x4c

#if 0
void init_beep(BT_AS_INFO dev)
{
	void *cm_per_vaddr, *ctl_md_vaddr;
	cm_per_vaddr = ioremap_nocache(CM_PER_BASE, CM_PER_Size);
	iowrite32(0x02 , cm_per_vaddr + 0x7c); //Enable clk
	iounmap(cm_per_vaddr);

	ctl_md_vaddr = ioremap_nocache(CONTROL_MODULE_BASE, CONTROL_MODULE_Size);
	iowrite32(PAD_PULLUP | 0x4, ctl_md_vaddr + 0x9B4); //Timer7 pwm out
	iowrite32(PAD_REV | PAD_PULLUP | 0x7, ctl_md_vaddr + 0x9A8); //MCASP0_AXR1  gpio in
	iounmap(ctl_md_vaddr);
	dev->beep_virtual_addr = ioremap_nocache(DMTIMER7, DMTIMER7_SIZE);
	iowrite32(0xffffffff - BEEP_PER, dev->beep_virtual_addr + TLDR); //Timer load reg
	iowrite32(BEEP_PER + (0xffffffff - BEEP_PER) >> 1, dev->beep_virtual_addr + TMAR); //Timer load reg
	//CLKSEL_TIMER7_CLK default CLK_M_OSC
	iowrite32((0x01<<12) | (0x02<<10) | (0x01<<1), dev->beep_virtual_addr + TCLR);
	dev->beep_status = false;
}
/**********************************
1-200Hz声音很小
200-300有声音
400嘟
500滴
600音调变高
700音调变高
800音调变高
2730Hz适合做滴的一声
3000最剌耳,声音大
***********************************/
void beep(BT_AS_INFO dev)
{
	static unsigned long beep_on_timeout = 0;
	if(dev->beep_ctrl == true)
	{
		if(beep_on_timeout == 0)
			beep_on_timeout = jiffies;
		if(time_after(jiffies, beep_on_timeout))
		{
			if(dev->beep_status == false)
			{
				beep_on_timeout = jiffies + 1000 * HZ/1000;// 1 s
				iowrite32(ioread32(dev->beep_virtual_addr + TCLR) | TIMER_ST, dev->beep_virtual_addr + TCLR);
				dev->beep_status = true;
				printk_ratelimited("Beep on\n");
			}
			else
			{
				beep_on_timeout = jiffies + 2 * 1000 * HZ/1000;// 2 s
				iowrite32(ioread32(dev->beep_virtual_addr + TCLR) & (~TIMER_ST), dev->beep_virtual_addr + TCLR);
				dev->beep_status = false;
			}
		}
	}
	else if(dev->beep_status == true)
	{
		iowrite32(ioread32(dev->beep_virtual_addr + TCLR) & (~TIMER_ST), dev->beep_virtual_addr + TCLR);
		dev->beep_status = false;
	}
	return;
}
#else
/*有源*/
//beep gpio0_20
void init_beep(BT_AS_INFO dev)
{
	void *cm_per_vaddr, *ctl_md_vaddr;
	cm_per_vaddr = ioremap_nocache(CM_PER_BASE, CM_PER_Size);
	iowrite32(0x02 , cm_per_vaddr + 0x7c); //Enable clk
	iounmap(cm_per_vaddr);

	ctl_md_vaddr = ioremap_nocache(CONTROL_MODULE_BASE, CONTROL_MODULE_Size);
	iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + 0x9B4); //GPIO0_20 out
	iowrite32(PAD_REV | PAD_PULLUP | 0x7, ctl_md_vaddr + 0x9A8); //MCASP0_AXR1  gpio in
	iounmap(ctl_md_vaddr);
	gpio0_vaddr = ioremap_nocache(GPIO0_BASE, GPIO0_SIZE);
	iowrite32(0x01<<20, gpio0_vaddr + GPIO_CLEARDATAOUT);
	iowrite32(ioread32(gpio0_vaddr + GPIO_OE) & (~((0x01<<20))), gpio0_vaddr + GPIO_OE);
	dev->beep_status = false;
}

void beep(BT_AS_INFO dev)
{
	static unsigned long beep_on_timeout = 0;
	if(dev->beep_ctrl == true)
	{
		if(beep_on_timeout == 0)
			beep_on_timeout = jiffies;
		if(time_after(jiffies, beep_on_timeout))
		{
			if(dev->beep_status == false)
			{
				beep_on_timeout = jiffies + 500 * HZ/1000;//500ms
				iowrite32(0x01<<20, gpio0_vaddr + GPIO_SETDATAOUT);
				dev->beep_status = true;
				//printk_ratelimited("Beep on\n");
			}
			else
			{
				beep_on_timeout = jiffies + 2 * 1000 * HZ/1000;// 2 s
				iowrite32(0x01<<20, gpio0_vaddr + GPIO_CLEARDATAOUT);
				dev->beep_status = false;
			}
		}
	}
	else if(dev->beep_status == true)
	{
		iowrite32(0x01<<20, gpio0_vaddr + GPIO_CLEARDATAOUT);
		dev->beep_status = false;
	}
	return;
}

#endif

void check_fan_speed(BT_AS_INFO dev)
{
	uint32_t i = 0;
	for(i = 0; i < dev->fan_num; i++)
	{
		if(dev->fan_speed[dev->fan_map[i]])
			break;
	}
	if( i == dev->fan_num )
		dev->all_fan_stop = true;
	else
		dev->all_fan_stop = false;

	for(i = 0; i < dev->fan_num; i++)
	{
		if(((dev->fan_speed[dev->fan_map[i]] * 60) < 1000) && (dev->fan_speed[dev->fan_map[i]] != 0))
			break;
	}
	if( i == dev->fan_num )
	{
		dev->any_fan_fail = false;
		if(dev->all_fan_stop == true)
			dev->any_fan_fail = true;
	}
	else
		dev->any_fan_fail = true;
}

uint32_t snd_to_fpga_work = 0, ret_nonce_num = 0;
uint32_t fifo_space;
//#define CTRL_OFF
//#define send_new_bl_CTRL
//void send_to_pfga_work(BT_AS_INFO dev)
enum TEMP_STATE check_temp_state(BT_AS_INFO dev)
{
	uint8_t i;

	static uint8_t last_temperature = 35;

	static uint8_t temp_out_pool_cnt = 0, temp_out_high_cnt = 0;
	uint8_t temp_highest = dev->temp[dev->chain_map[0]];
	uint8_t wchain_highest = 0;
	uint8_t temper_change;

	for(i = 1;i < dev->temp_num; i++)
	{
		if(dev->temp[dev->chain_map[i]] == 0xff)
			continue;
		if((dev->temp[dev->chain_map[i]] > temp_highest) && (dev->chain_exist & (0x01 << dev->chain_map[i])))
		{
			temper_change = dev->temp[dev->chain_map[i]] - last_temperature;
			temp_highest = dev->temp[dev->chain_map[i]];
			if (((temper_change > 0) && (temper_change <= 60)) ||
				((temper_change < 0) && (temper_change >= -60)))
		    {
				temp_highest = dev->temp[dev->chain_map[i]];
				wchain_highest = i;
			}
		}
	}
	last_temperature = temp_highest;
	if ((temp_highest & 0xff) >= TEMP_OUT && (temp_highest & 0xff) < TEMP_OUT_HIGHT)
	{
		if(temp_out_pool_cnt++ >= TEST_TEMP_CNT)
			printk_ratelimited(KERN_ERR "chain %d temp highest{%d}\n", wchain_highest, temp_highest);
			return TEMP_WARN;

	}
    else
    {
		temp_out_pool_cnt = 0;
    }

	if ((temp_highest & 0xff) >= TEMP_OUT_HIGHT)
	{
		check_state = 2;
		if(temp_out_high_cnt++ >= TEST_TEMP_CNT)
		{
			check_state = 10;
			printk_ratelimited(KERN_ERR "chain %d temp out highest{%d}\n", wchain_highest, temp_highest);
			return TEMP_OUT_STATE;
		}
	}
    else
    {
		check_state = 10;
		temp_out_high_cnt = 0;
    }


	return TEMP_NORMAL;
}

#ifndef FAN_MAX_SPEED
	#define FAN_MAX_SPEED 4320
#endif

#ifndef MAX_FAN_NUM
	#define MAX_FAN_NUM 6
#endif

enum FAN_STATE check_fan_state(BT_AS_INFO dev)
{
	uint32_t i;
	uint32_t error_fan = 0;
	uint32_t normal_fan = 0;
	uint32_t fan_speed = 0;

	static uint32_t fan_error_cnt = 0;

	unsigned int pwm_percent = dev->pwm_percent;
	static uint32_t fan_num = 0;

	if(fan_num == 0)
	{
		for(i = 0; i < dev->fan_num; i++)
		{
			if(dev->fan_speed[dev->fan_map[i]] == 0)
				continue;
			fan_num++;
		}

		if(fan_num == 0 )
			return FAN_ERROR;
	}

	if(dev->fan_ctrl_type)//home
	{
		pwm_percent *=2;
		pwm_percent /=6;
	}
	if (pwm_percent > 100)
		pwm_percent = 100;
	if(pwm_percent < LOW_PWM_PERCENT)
   		pwm_percent = LOW_PWM_PERCENT;

	for(i = 0; i < dev->fan_num; i++)
	{
		fan_speed = dev->fan_speed[dev->fan_map[i]] * 60;
		if(fan_speed < (FAN_MAX_SPEED * pwm_percent / 100 / 2))
			error_fan ++;
		else if(fan_speed > (FAN_MAX_SPEED * pwm_percent *8/ 100 /10))
			normal_fan ++;

		//printk_ratelimited("Fan%d speed %d, pwm_percent %d  ", i, fan_speed, pwm_percent);
	}
	if( normal_fan == fan_num )
		return FAN_NORMAL;

	printk_ratelimited("\n error_fan %d, normal_fan %d, fan_num %d \n", error_fan, normal_fan, fan_num);

	if( error_fan == dev->fan_num )
	{
		if ( fan_error_cnt++ > TEST_TEMP_CNT )
			return FAN_ERROR;
	}
	else
		fan_error_cnt = 0;

	return FAN_WARN;
}

enum FIFO_STATE check_fifo_state(BT_AS_INFO dev)
{

	if(dev->task_buffer_rd == dev->task_buffer_wr)
	{
		if((dev->fifo_empt_cnt++ %100) == 0)
			printk_ratelimited(KERN_ERR "drv fifo empty\n");
		return ALLFIFO_EMPTY;
	}
	return FIFO_NORMAL;
}


#ifndef CHAIN_NONCE_AVG
	#define CHAIN_NONCE_AVG 75
#endif
enum CHAIN_STATE check_chain_state(BT_AS_INFO dev)
{
	uint32_t bgNonce_average;
	uint32_t time_elasp_ms = 0;
	uint32_t i;
	uint8_t chain_nu;
	//struct ASIC_TASK asic_task;
	static unsigned long simulate_power_err_time = 0;
	wait_queue_head_t timeout_wq;
	unsigned char cmd_buf[4] = {0};

	if((dev->cgminer_start == true))
	{
		if(simulate_power_err_time == 0)
		{
			simulate_power_err_time = jiffies + 5 * 60 * 1000 * HZ/1000;
		}
		time_elasp_ms = jiffies_to_msecs(jiffies - dev->cgminer_start_time);
		//printk_ratelimited("time_elasp_jiffies{%ld}\n", jiffies - dev->cgminer_start_time);
		//printk_ratelimited("jiffies{%ld}dev->cgminer_start_time{%ld}", jiffies, dev->cgminer_start_time);
		//printk_ratelimited("time_elasp_ms =%ldms dev->total_nonce_num{%ld}\n", time_elasp_ms, dev->total_nonce_num);
		//bgNonce_average = ((uint32_t)dev->total_nonce_num / (time_elasp_ms / 1000)) * (CHAIN_POWER_TIME_INTERAL*60);//平均5分钟

		if((time_elasp_ms / (1000 * CHAIN_POWER_TIME_INTERAL*60)) == 0)
		{
			if(bgNonce_average < 8)
				bgNonce_average = 1;
			else
				bgNonce_average /= 8;
		}
		else
		{
			bgNonce_average = CHAIN_NONCE_AVG;

		}
		for (i = 0; i < dev->asic_status_data.chain_num; i++)
		{
			chain_nu = dev->chain_map[i];

			if(Chain_nonce_nu[chain_nu] >= Chain_nonce_nu_last[chain_nu])
			{
				if(((Chain_nonce_nu[chain_nu] - Chain_nonce_nu_last[chain_nu]) < bgNonce_average) || (bgNonce_average == 0))
				{
					printk_ratelimited("bgNonce_average{%d}\n", bgNonce_average);
					printk_ratelimited("chain%d Chain_nonce_nu[%ld] Chain_nonce_nu_last[%ld]\n", chain_nu,Chain_nonce_nu[chain_nu],Chain_nonce_nu_last[chain_nu]);
					return CHAIN_ERROR;
				}
			}
			Chain_nonce_nu_last[chain_nu] = Chain_nonce_nu[chain_nu];
		}
	}
	return CHAIN_NORMAL;
}

enum CHAIN_STATE check_no_nonce_to(BT_AS_INFO dev)
{
	if(time_after(jiffies, dev->last_nonce_timeout + 60 * 1000 * HZ/1000))// 1 分钟
	{
		return CHAIN_NO_NONCE_TO;
	}
	return CHAIN_NORMAL;
}

void reset_chain(BT_AS_INFO dev)
{
	uint32_t bgNonce_average;
	uint32_t time_elasp_ms = 0;
	uint32_t i;
	uint8_t chain_nu;
	//struct ASIC_TASK asic_task;
	static unsigned long simulate_power_err_time = 0;
	wait_queue_head_t timeout_wq;
	unsigned char cmd_buf[4] = {0};

    struct timex  txc;
    struct rtc_time tm;
    struct file *fp_pwerr;
    mm_segment_t old_fs;
    char wr_buf[512];
    unsigned int wr_len = 0;
    do_gettimeofday(&(txc.time));
    rtc_time_to_tm(txc.time.tv_sec,&tm);
    printk_ratelimited("UTC time :%d-%d-%d %d:%d:%d \n",tm.tm_year+1900,tm.tm_mon + 1, tm.tm_mday,tm.tm_hour,tm.tm_min,tm.tm_sec);
    fp_pwerr = filp_open("/config/power_rst", O_RDWR | O_CREAT | O_APPEND, 0644);
    wr_len = sprintf(wr_buf, "UTC time :%d-%d-%d %d:%d:%d \n",tm.tm_year+1900,tm.tm_mon + 1, tm.tm_mday,tm.tm_hour,tm.tm_min,tm.tm_sec);
    old_fs = get_fs();
    set_fs(KERNEL_DS);
    fp_pwerr->f_op->write(fp_pwerr, (char *)wr_buf, wr_len, &fp_pwerr->f_pos);
    set_fs(old_fs);
    filp_close(fp_pwerr, NULL);
    dev->restarting_hash = true;
    mod_timer(&prnt_timer, jiffies + 5 * 1000 * HZ/1000);
    i = 0;
    while(timer_pending(&prnt_timer))
    {
          del_timer(&prnt_timer);
          if(i++ > 200)
                break;
    }
    if(bgNonce_average == 0)
          printk_ratelimited("!!!!!!!!!!----no hash power OK\n\n");
    printk_ratelimited("remap chain%d(hardware chain%d) power err\n", i, chain_nu);
    printk_ratelimited("bgNonce_average{%d}chain_nonce_nu{%d}last{%d}\n", bgNonce_average, Chain_nonce_nu[chain_nu], Chain_nonce_nu_last[chain_nu]);
#if 0
    for(i = 0; i < dev->asic_status_data.chain_num; i++)
    {
          memset(asic_task.midstate, 0x00, sizeof(asic_task.midstate));
          memset(asic_task.data, 0x00, sizeof(asic_task.data));
          if(i == 0)
                send_work_to_fpga(true, 0x80|dev->chain_map[i], dev, &asic_task);
          else
                send_work_to_fpga(false, 0x80|dev->chain_map[i], dev, &asic_task);
    }
#endif
    stop_work_to_all_chain(dev);
    set_baud(dev, 26);
    printk_ratelimited(KERN_ERR "Detect device for anyone power err\n");

    cmd_buf[0] = 9;
    cmd_buf[1] = 0x10; //16-23
    cmd_buf[2] = 0x1f; //8-13
    cmd_buf[0] |= 0x80;
    //cmd_buf[3] = CRC5(cmd_buf, 4*8 - 5);
    cmd_buf[3] = 0x00; //故意错误crc 只是修改fpga 波特率
    send_BC_to_fpga(i, cmd_buf);

    rst_hash_asic(dev);
    //send_work_to_fpga(true, dev, &asic_task);
    clear_fpga_nonce_buffer(dev);
    init_waitqueue_head(&timeout_wq);
    interruptible_sleep_on_timeout(&timeout_wq, 1000 * HZ/1000);//300ms
#if 1
    rst_hash_asic(dev);
    //send_work_to_fpga(true, dev, &asic_task);
    clear_fpga_nonce_buffer(dev);
    init_waitqueue_head(&timeout_wq);
    interruptible_sleep_on_timeout(&timeout_wq, 1100 * HZ/1000);//300ms
#endif
    //detect_chain_num(dev);
    set_frequency(dev, dev->asic_configure.freq_vlaue);
    asic_result_status_rd = asic_result_status_wr = asic_result_status_full = 0;
    asic_result_rd = asic_result_wr = asic_result_full = 0;
    //gDiff_nonce_num = gNonce_num = gNonce_Err = gNonce_miss = 0;
    //gSubmit_nonce_num = 0;
    dev->restarting_hash = false;
    prnt_timer.expires = jiffies + dev->send_to_fpga_interval* HZ/1000;
    add_timer(&prnt_timer);
    mod_timer(&prnt_timer, jiffies + dev->send_to_fpga_interval* HZ/1000);
    simulate_power_err_time = 0;
}

#define LED_RED 2
#define LED_GREEN 1

void led_action(BT_AS_INFO dev ,int led, bool if_blink)
{
	static unsigned long blink_timeout = 0;

	if (blink_timeout == 0)
		blink_timeout = jiffies + 1 * 1000 * HZ/1000;

	if(time_after(jiffies, blink_timeout))
	{
		blink_timeout = jiffies + 1 * 1000 * HZ/1000; //1秒钟后超时

		switch (led)
		{
			case LED_RED:
				if(hardware_version == 0x01)
				{
					iowrite32(GREEN, dev->led_virtual1 + GPIO_CLEARDATAOUT);
				}
				else
				{
					iowrite32(GREEN, dev->led_virtual + GPIO_CLEARDATAOUT);

				}
				if(if_blink)
				{
					if(ioread32(dev->led_virtual + GPIO_DATAOUT) & RED)
						iowrite32(RED, dev->led_virtual + GPIO_CLEARDATAOUT);
					else
						iowrite32(RED, dev->led_virtual + GPIO_SETDATAOUT);
				}
				else
					iowrite32(RED, dev->led_virtual + GPIO_SETDATAOUT);
				break;
			case LED_GREEN:
				iowrite32(RED, dev->led_virtual + GPIO_CLEARDATAOUT);
				if(hardware_version == 0x01)
				{
					if(ioread32(dev->led_virtual1 + GPIO_DATAOUT) & GREEN)
					{
						iowrite32(GREEN, dev->led_virtual1 + GPIO_CLEARDATAOUT);
					}
					else
					{
						iowrite32(GREEN, dev->led_virtual1 + GPIO_SETDATAOUT);
					}
				}
				else
				{
					if(ioread32(dev->led_virtual + GPIO_DATAOUT) & GREEN)
						iowrite32(GREEN, dev->led_virtual + GPIO_CLEARDATAOUT);
					else
						iowrite32(GREEN, dev->led_virtual + GPIO_SETDATAOUT);
				}
				break;
		}
	}
}

void do_send_work(BT_AS_INFO dev)
{
	int ret = -1;
	uint8_t work_num = 0;


	while(g_FPGA_FIFO_SPACE > g_FPGA_RESERVE_FIFO_SPACE && dev->task_buffer_rd != dev->task_buffer_wr)
		{
			bool new_block = false;

			if(dev->new_block)
			{
				dev->new_block = false;
				new_block = true;
			}

			dev->last_nonce_timeout = jiffies;
			snd_to_fpga_work++;
			dev->snding_work = true;
			ret = send_work_to_fpga(new_block, 0, dev, &dev->task_buffer[dev->task_buffer_rd]);
			dev->snding_work = false;
			dev->save_send_work = dev->task_buffer_rd;
			increase_variable_rehead_U32((uint32_t*) & dev->task_buffer_rd, dev->task_buffer_size);
			if(work_num++ == g_TOTAL_FPGA_FIFO*4/48)
				break;
			//--g_FPGA_FIFO_SPACE; in send update g_FPGA_FIFO_SPACE
			if(ret == -1)//只在query出nonce
			{
				g_FPGA_FIFO_SPACE--;
				ret = 5;
				if((work_num%(g_FPGA_RESERVE_FIFO_SPACE<<1)) == 0)//每路4个work时，取一次nonce
					nonce_query(dev);
			}
		}
		while( ret == 5)
		{
			ret = nonce_query(dev);
		}

}
bool set_beep(BT_AS_INFO dev, bool state)
{
	if(dev->asic_configure.beep_on_en)
	{
		dev->beep_ctrl = state;
	}
	else
		dev->beep_ctrl = false;
}
void action_normal(BT_AS_INFO dev)
{
    do_send_work(dev);
	adjust_pwm_from_temp(dev);
	led_action(dev,LED_GREEN,true);
	set_beep(dev,false);
}
void action_temp_warn(BT_AS_INFO dev)
{
    do_send_work(dev);
	adjust_pwm_from_temp(dev);
	led_action(dev,LED_RED,true);
	set_beep(dev,false);
}

void action_fifo_empty(BT_AS_INFO dev)
{
    do_send_work(dev);
	adjust_pwm_from_temp(dev);
	led_action(dev,LED_RED,false);
	set_beep(dev,false);
}



void action_fifo_stop(BT_AS_INFO dev)
{
	stop_work_to_all_chain(dev);
	adjust_pwm_from_temp(dev);
	led_action(dev,LED_RED,false);
	set_beep(dev,true);

}

void action_after_temp_stop(BT_AS_INFO dev)
{
	adjust_pwm_from_temp(dev);
	led_action(dev,LED_RED,false);
	set_beep(dev,true);
}


void action_stop(BT_AS_INFO dev)
{
	action_fifo_stop(dev);
	if_temp_out_stop = true;
}


void action_stop_after_last_nonce(BT_AS_INFO dev)
{
	led_action(dev,LED_RED,false);
	set_beep(dev,true);
	if(dev->pwm_percent !=0 )
		ChangePWM(dev, 0);
	nonce_query(dev);
}

void action_reset_chain(BT_AS_INFO dev)
{
	reset_chain(dev);
}

void action_no(BT_AS_INFO dev){}


actiontype transition_table[3][3] =
{
    action_normal,action_temp_warn,action_stop,
    action_temp_warn,action_temp_warn,action_stop,
    action_stop,action_stop,action_stop
};


void step(BT_AS_INFO dev)
{
	static enum TEMP_STATE temp_state = TEMP_NORMAL;
	static enum FAN_STATE fan_state = FAN_NORMAL;
	static enum FIFO_STATE fifo_state = FIFO_NORMAL;
	static enum CHAIN_STATE chain_state = CHAIN_NORMAL;

	static bool fifo_once_empty = false;
	static bool chain_once_reset = false;

	static unsigned long check_chain_power_timeout = 0;
	static unsigned long check_status_timeout = 0;
	static unsigned long S1_timeout = 0;
	static unsigned long fifo_empty_timeout = 0;

	static uint32_t prnt_chin_nu = 0, prnt_aisc_nu = 0;

	actiontype miner_action = action_no;
	actiontype chain_action = action_no;
	actiontype no_nonce_action = action_no;

	nonce_query(dev);



	fifo_state = check_fifo_state(dev);

	if (fifo_state == FIFO_NORMAL)
	{
		fifo_empty_timeout = jiffies +  30 * 1000 * HZ/1000;
	}

	if(check_status_timeout == 0)
	{
		check_chain_power_timeout = jiffies +  90 * 1000 * HZ/1000;
		check_status_timeout = jiffies + 10 * HZ/1000; //10ms后超时
		fifo_empty_timeout = jiffies +  120 * 1000 * HZ/1000;
	}

	if(time_after(jiffies, check_status_timeout))
	{
		check_status_timeout = jiffies + check_state * 1000 * HZ/1000;
		temp_state = check_temp_state(dev);
		fan_state = check_fan_state(dev);
		/*
		printk_ratelimited("\nchain exist: %x, g_TOTAL_FPGA_FIFO %#x,g_FPGA_RESERVE_FIFO_SPACE{%d}\n",dev->chain_exist, g_TOTAL_FPGA_FIFO, g_FPGA_RESERVE_FIFO_SPACE);
		printk_ratelimited("g_FPGA_FIFO_SPACE %d, fifo_space{%d}\n",g_FPGA_FIFO_SPACE, fifo_space);
		printk_ratelimited("ret_nonce_num = %d, snd_to_fpga_work{%d}\n",ret_nonce_num, snd_to_fpga_work);
		printk_ratelimited("total ret nonce num = %llu, diff1_nonce num = %llu\n", dev->total_nonce_num, dev->diff1_num);
		printk_ratelimited("gDiff_nonce_num{%d}gNonce_Err{%d}\n", gDiff_nonce_num, gNonce_Err);
		printk_ratelimited("gSubmit_nonce_num{%d}\n", gSubmit_nonce_num);
		printk_ratelimited("chain%1d asic%02d ret nonce_num{%d}\n", prnt_chin_nu, prnt_aisc_nu, gAsic_cnt[prnt_chin_nu][prnt_aisc_nu]);
		printk_ratelimited("dev->net_diff_sh_bit{%d}dev->get_blk_num{%d}\n", dev->net_diff_sh_bit, dev->get_blk_num);
		printk_ratelimited("dev->temp_out_ctrl{%d}\n\n", dev->temp_out_ctrl);
		printk_ratelimited("fifo_state %d temp_state %d fan_state %d \n", fifo_state,temp_state,fan_state);*/
		if(++prnt_aisc_nu >= gChain_Asic_num[dev->chain_map[prnt_chin_nu]])
		{
			prnt_aisc_nu = 0;
			if(++prnt_chin_nu >= dev->asic_status_data.chain_num)
				prnt_chin_nu = 0;
		}
    }

	chain_state = check_no_nonce_to(dev);
	if(chain_state == CHAIN_NO_NONCE_TO && chain_once_reset == false )
	{
		no_nonce_action = action_stop_after_last_nonce;
	}



	switch(fifo_state)
	{
		case ALLFIFO_EMPTY:
			if (!fifo_once_empty)
			{
				miner_action = action_fifo_empty;
				chain_action = action_no;
				no_nonce_action = action_no;

			}
			if (time_after(jiffies, fifo_empty_timeout) && fifo_once_empty == false)
			{
				fifo_empty_timeout = jiffies +  30 * 1000 * HZ/1000;
				fifo_once_empty = true;
				chain_once_reset == false;
				miner_action = action_fifo_stop;
			}
			break;
		case FIFO_NORMAL:
			miner_action = transition_table[temp_state][fan_state];
			if(fifo_once_empty)
			{
				fifo_once_empty = false;
				chain_action = action_reset_chain;
				chain_once_reset = true;
				check_chain_power_timeout = jiffies + CHAIN_POWER_TIME_INTERAL * 60 * 1000 * HZ/1000;

			}
			else if (chain_state != CHAIN_NO_NONCE_TO)
			{
				chain_once_reset = false;
				if((temp_state == TEMP_NORMAL || temp_state == TEMP_WARN) && (fan_state == FAN_NORMAL|| fan_state == FAN_WARN))
				{
					#ifdef S5_S_VL
					if(time_after(jiffies, check_chain_power_timeout))
					{
						check_chain_power_timeout = jiffies + CHAIN_POWER_TIME_INTERAL * 60 * 1000 * HZ/1000; //60秒钟后超时
						chain_state = check_chain_state(dev);
						if (chain_state == CHAIN_ERROR && chain_once_reset == false)
						{
							chain_action = action_reset_chain;
						}
	    			}
					#endif
				}
			}
			break;
	}

	if(if_temp_out_stop)
	{
		miner_action = action_after_temp_stop;
		chain_action = action_no;
	}

	miner_action(dev);
	chain_action(dev);
	no_nonce_action(dev);
	beep(dev);
}

void send_to_pfga_work(struct work_struct *work)
{
	BT_AS_INFO dev= container_of(work, struct __BT_AS_info, send_to_fpga_work);


	static unsigned long check_asic_status_timeout = 0;

	static uint32_t prnt_chin_nu = 0, prnt_aisc_nu = 0;
	uint32_t i,j, k = 0;

	if((dev->fpga_ok == false))
		return;

	if((g_FPGA_FIFO_SPACE <= g_FPGA_RESERVE_FIFO_SPACE))
	{
		nonce_query(dev);
	}

	step(dev);

	if(time_after(jiffies, check_asic_status_timeout))
	{
		check_asic_status_timeout = jiffies + 60 * 1000 * HZ/1000; //60秒钟后超时
		check_asic_status(dev);
    }

	return;
}
#if PRNT_TIMER_EN
static void Prnt(unsigned long data)
{
	BT_AS_INFO dev = &bitmain_asic_dev;
	uint8_t work_num = 0;
	unsigned long interval;
	//printk_ratelimited("wr{%#d}rd{%d}\n", dev->task_buffer_wr, dev->task_buffer_rd);
	Prnt_time_out = jiffies + 1000 * HZ/1000; // 1s
	//iowrite32(0x01<<8, gpio2_vaddr + GPIO_SETDATAOUT);
	//send_to_pfga_work(dev);
	if(queue_work(dev->send_to_fpga_work_wq, &dev->send_to_fpga_work) != 1)
	{
		//printk_ratelimited("send_to_fpga_work in queue\n");
		if(dev->restarting_hash == true)
			del_timer(&prnt_timer);
	}
	//if(dev->task_buffer_rd != dev->task_buffer_wr)// not empty
	{
		prnt_timer.expires = jiffies + dev->send_to_fpga_interval* HZ/1000;
		if(dev->restarting_hash == false)
			add_timer(&prnt_timer);
	}
	//iowrite32(0x01<<8, gpio2_vaddr + GPIO_CLEARDATAOUT);
}
#endif
static ssize_t bitmain_asic_write(struct file *file, const char __user *user_buffer,
				size_t writesize, loff_t *ppos)
{
	BT_AS_INFO dev = file->private_data;
	struct BITMAIN_TASK txtask_data;
	struct BITMAIN_TASK	*txtask = &txtask_data;
	uint8_t reg_addr;
	uint8_t task_work_num, need_cpy_task_work;
	int retval = 0;
	bool asic_reset = false;
	//spin_lock(&dev->lock);
	//bitmain_asic_open_usb(dev);
	//printk_ratelimited("enter bitmain_asic_write\n");
	if (copy_from_user((void*)txtask, user_buffer, writesize))
	{
		retval = -EFAULT;
		goto error;
	}
	//printk data
	/*
	printk_ratelimited("asic_writ data is:");
	for(retval = 0; retval < writesize; retval++)
	{
		if(0 == (retval %16))
			printk_ratelimited("\n 0x%02x: ", retval);
		printk_ratelimited("0x%02x, ", *((char*)txtask + retval));
	}
	printk_ratelimited("\n");
	*/
	if (cmd_check((uint8_t*)txtask)) //crc16 ok
		{
			switch (txtask->token_type)
			{
			case BM_TX_TASK:
				//printk_ratelimited(KERN_ERR "TX TASK\n");
				if (txtask->new_block)
				{
					dev->task_buffer_wr = dev->task_buffer_rd;
					dev->task_buffer_full = false;
					if(dev->snding_work == true)
						increase_variable_rehead_U32((uint32_t*) & dev->task_buffer_wr, dev->task_buffer_size);
					dev->new_block = true;
					asic_result_rd = asic_result_wr;
					asic_result_full = 0;
					//printk_ratelimited(KERN_ERR "New blok\n");
				}
				if(dev->cgminer_start == false)
					//bitmain_asic_get_status(NULL,dev->chain_map[0], 1, 0, 4); //CHIP_ADDR_REG 4  PLL reg
					bitmain_asic_get_status(NULL,dev->chain_map[0], 1, 0, 0x00); //CHIP_ADDR_REG 4  PLL reg
#if HAVE_NUM
				task_work_num = txtask.work_num;
#else
				task_work_num = (le16_to_cpu(txtask->length) - 6) / sizeof (*dev->task_buffer);
#endif
				if(fifo_space < task_work_num)
				{
					task_work_num = fifo_space;
					//printk_ratelimited(KERN_ERR "cgminer send too data!!!!\n");
				}
				if ((dev->task_buffer_wr + task_work_num) >= dev->task_buffer_size)
				{
					need_cpy_task_work = dev->task_buffer_size - dev->task_buffer_wr;
					memcpy(dev->task_buffer + dev->task_buffer_wr, &txtask->asic_task[0],
						   need_cpy_task_work * sizeof (*dev->task_buffer));
					task_work_num -= need_cpy_task_work;
					memcpy(dev->task_buffer, &txtask->asic_task[need_cpy_task_work], task_work_num * sizeof (*dev->task_buffer));
					dev->task_buffer_wr = task_work_num;
					//printk_ratelimited("split asic_task[0].work_id %#x wr{%d}\n", le32_to_cpu(txtask.asic_task[0].work_id), dev->task_buffer_wr);
				}
				else
				{
					memcpy(dev->task_buffer + dev->task_buffer_wr, &txtask->asic_task[0],
						   task_work_num * sizeof (*dev->task_buffer));
					dev->task_buffer_wr += task_work_num;
					//printk_ratelimited("asic_task[0].work_id %#x wr{%d}rd{%d}\n", le32_to_cpu(txtask.asic_task[0].work_id), dev->task_buffer_wr,dev->task_buffer_rd);
				}
				if(dev->hw_error_eft == true)
				{
					if(dev->asic_configure.diff_sh_bit != txtask->diff)
					{
						printk_ratelimited(KERN_ERR "Change diff to %d\n", txtask->diff);
						dev->asic_configure.diff_sh_bit = txtask->diff;
						dev->nonce_diff = dev->asic_configure.diff_sh_bit;
						#if	defined S4_Board || defined C1_Board || defined S5 || defined S4_PLUS
						if(dev->nonce_diff > AISC_RT_DIFF)
						{
							dev->nonce_diff = AISC_RT_DIFF;
							printk_ratelimited(KERN_ERR "diff fix to %d\n", dev->nonce_diff);
						}
						#endif
					}
					if(dev->net_diff_sh_bit != txtask->net_diff)
					{
						printk_ratelimited(KERN_ERR "Change net_diff to %d\n", txtask->net_diff);
						dev->net_diff_sh_bit = txtask->net_diff;
					}
				}
				else
					dev->asic_configure.diff_sh_bit = 0;
				if(dev->cgminer_start == false)
				{
	            	dev->cgminer_start = true;
					dev->cgminer_start_time = jiffies;
				}
				#if 0
				if(g_FPGA_FIFO_SPACE <= g_FPGA_RESERVE_FIFO_SPACE)
					nonce_query(dev);
				if((g_FPGA_FIFO_SPACE > g_FPGA_RESERVE_FIFO_SPACE) || (dev->new_block == true))
				{
					send_to_pfga_work(dev);
				}
				#endif

				if ((timer_pending(&prnt_timer) == 0) || (dev->new_block == true))//不存在
				{
					//printk_ratelimited(KERN_ERR "start timer\n");
					mod_timer(&prnt_timer, jiffies + 1*HZ/1000); //Start Timer 1ms
					dev->cgminer_start = true;
				}
				/**/
				break;
			case BM_TX_CONF:
			{
				BITMAIN_CONFIGURE_P bt_conf = (BITMAIN_CONFIGURE_P) txtask;
				dev->asic_configure.asic_num = bt_conf->asic_num;
				dev->asic_configure.chain_num = bt_conf->chain_num;
				dev->asic_status_data.chain_num = dev->asic_configure.chain_num;
				dev->asic_configure.diff_sh_bit = dev->nonce_diff = 0;
				dev->asic_configure.beep_on_en = bt_conf->beeper_ctrl;
				dev->temp_out_ctrl = bt_conf->temp_over_ctrl;
				dev->fan_ctrl_type = bt_conf->fan_ctrl_type;
				//test
				//dev->fan_ctrl_type = true;
				//dev->temp_out_ctrl = false;
				dev->total_nonce_num = dev->fpga_nonce1_num;
				printk_ratelimited("btm_tx_conf\n");
				if (bt_conf->reset)
				{
					asic_reset = true;
				}
				if (bt_conf->fan_eft)
				{
					fan_custom = true;
					custom_fan = bt_conf->fan_pwm_data;
					dev->asic_configure.fan_pwm_data = bt_conf->fan_pwm_data;
					printk_ratelimited("fan pwm valid {%d}\n", dev->asic_configure.fan_pwm_data);
					//ChangePWM(dev->asic_configure.fan_pwm_data);
				}
				if (bt_conf->frequency_eft)
				{
					dev->asic_configure.frequency = bt_conf->frequency;
					//set_frequency(dev->asic_configure.frequency);
					printk_ratelimited("Set asic frequency {%d}\n", dev->asic_configure.frequency);
				}
				if (bt_conf->voltage_eft)
				{
					dev->asic_configure.voltage = htons(bt_conf->voltage); //voltage 需修改为16bit
					if(dev->asic_configure.voltage < 0x0600)
						dev->asic_configure.voltage = 0x0600;
					else if(dev->asic_configure.voltage > 0x0900)
						dev->asic_configure.voltage = 0x0900;
					bitmain_set_voltage(dev, dev->asic_configure.voltage);
				}
				if (bt_conf->chain_check_time_eft)
				{
					dev->asic_configure.chain_check_time = bt_conf->chain_check_time;
				}

				if (bt_conf->timeout_eft)
				{
					dev->asic_configure.timeout_data = bt_conf->timeout_data;
				}

				if (bt_conf->chip_config_eft)
				{
					dev->asic_configure.chip_address = bt_conf->chip_address;
					dev->asic_configure.reg_address = bt_conf->reg_address;
					printk_ratelimited("Set chip_addr{%#x}reg_address{%#x}value{%#x}\n",
						   dev->asic_configure.chip_address, dev->asic_configure.reg_address,
						   bt_conf->reg_data);
					reg_addr = dev->asic_configure.reg_address;
					dev->asic_configure.reg_address = 0x0;
					dev->asic_configure.reg_address = reg_addr;
					if (dev->asic_configure.reg_address == 0x04)//频率寄存器地址
					{
						dev->asic_configure.freq_vlaue = bt_conf->reg_data;
						#if defined BM1385
						printk_ratelimited("pll reg_data %#x\n", bt_conf->reg_data);
						dev->asic_configure.freq_vlaue = bt_conf->reg_data = dev->asic_configure.frequency;
						#endif
						set_frequency(dev, bt_conf->reg_data);
					}
					#ifndef S5_S_VL
					//if(dev->asic_configure.timeout_data < 7)
						set_baud(dev,10);
						//set_baud(dev,5);
					reg_addr = dev->asic_configure.reg_address;
					dev->asic_configure.reg_address = 0x0;
					sw_addr(dev);
					dev->asic_configure.reg_address = reg_addr;
					#endif
				}
				//先频率再设置timeout
				if (bt_conf->timeout_eft)
				{
					dev->asic_configure.timeout_data = bt_conf->timeout_data;
					#if defined BM1385
					dev->asic_configure.timeout_data = 0xffffffff/64/64/dev->asic_configure.frequency/1000;
					#endif
					printk_ratelimited(KERN_ERR "Timeout {%d}\n", dev->asic_configure.timeout_data);
					#ifndef S5_S_VL
					dev->timeout_valid = true;
					nonce_query(dev);
					dev->timeout_valid = false;
					#endif
					dev->send_to_fpga_interval = (dev->asic_configure.timeout_data * g_TOTAL_FPGA_FIFO * 4)/ dev->asic_status_data.chain_num / (sizeof(FPGA_WORK) - 4);
					dev->send_to_fpga_interval /=4;
					printk_ratelimited(KERN_ERR "Snd Time Interval {%d}ms\n", dev->send_to_fpga_interval);
					if(dev->send_to_fpga_interval > 200)
					{
						//dev->send_to_fpga_interval = 200;
						dev->send_to_fpga_interval = 100;
						printk_ratelimited(KERN_ERR "Adj Snd Time Interval {%d}ms\n", dev->send_to_fpga_interval);
					}
					is_started = true;
				}
				dev->hw_error_eft = bt_conf->hw_error_eft;
				//dev->cgminer_start = true;
				printk_ratelimited("Set bitmain configure\n");
			}
				break;
			case BM_GET_STATUS:
			{
				BITMAIN_GET_STATUS_P bt_gt_status = (BITMAIN_GET_STATUS_P) txtask;
				if (bt_gt_status->detect_get)
				{
					asic_reset = true;
					dev->asic_configure.bauddiv = 26;
					printk_ratelimited(KERN_ERR "Detect device\n");
					detect_chain_num(dev);
				}
				if (bt_gt_status->chip_status_eft)
				{
					dev->asic_configure.chip_address = bt_gt_status->chip_address;
					dev->asic_configure.reg_address = bt_gt_status->reg_addr;
					//bitmain_asic_get_status(NULL, 1, 0, 4); //CHIP_ADDR_REG 4  PLL reg
				}
				if(bt_gt_status->test_hash == 0xba)
					nonce_query(dev);
				dev->get_status = true;
				//printk_ratelimited("Get status\n");
			}
				break;
			default:
				break;
			}
			if (asic_reset)
			{
				//clear fpga nonce buffer
				clear_fpga_nonce_buffer(dev);
				//T4CONCLR = 0x8000; //Stop Timer
				dev->cgminer_start = false;
				asic_result_status_rd = asic_result_status_wr = asic_result_status_full = 0;
				asic_result_rd = asic_result_wr = asic_result_full = 0;
				gDiff_nonce_num = gNonce_num = gNonce_Err = gNonce_miss = 0;
				gSubmit_nonce_num = 0;
				dev->task_buffer_full = false;
				dev->task_buffer_rd = dev->task_buffer_wr;
				#if 0
				printk_ratelimited("Clear Nonce count\n");
				for (i = 0; i < CHAIN_SIZE; i++)
				{
					for (j = 0; j < 32; j++)
					{
						gAsic_cnt[i][j] = 0;
					}
				}
				#endif
			}
		}

	else
	{
		retval = -EINVAL;
	}
	//spin_unlock(&dev->lock);
	return writesize;
error:
	//spin_unlock(&dev->lock);
	return retval;
}

static int create_rx_status_struct(struct BITMAIN_STATUS_DATA *rx_status_data, bool chip_value_eft, uint32_t reg_value,
                                   uint16_t fifo_sapce, char *temp, int temp_num, char* fan, int fan_num)
{
    uint16_t crc16;
    uint8_t i, j;
    uint16_t pos = 0;
	BT_AS_INFO dev = &bitmain_asic_dev;
    rx_status_data->chip_value_eft = chip_value_eft;
    rx_status_data->reg_value = reg_value;
    rx_status_data->fifo_space = fifo_sapce;
	rx_status_data->nonce_err = gNonce_Err;
	rx_status_data->hw_version = (DRIVER_VER <<16)|(dev->fpga_version<<8)|(dev->pcb_version);
	rx_status_data->get_blk_num = dev->get_blk_num & 0x0f;
    pos = 28;
	//pos += rx_status_data->chain_num * sizeof(rx_status_data->chain_asic_exist[0]);
	//printk_ratelimited("rx_status_data->chain_num{%d}\n", rx_status_data->chain_num);
	for (i = 0; i < rx_status_data->chain_num; i++)
    {
		#if 0 //S2  FPGA pin debug 添加
		if(gChain_Asic_num[dev->chain_map[i]] == 0)
			continue;
		#endif
		if(gChain_Asic_num[dev->chain_map[i]] == 0)
			gChain_Asic_num[dev->chain_map[i]] = 1;
		for(j = 0; j < (((gChain_Asic_num[dev->chain_map[i]] -1)>>5) + 1); j++)
		{
			*((uint32_t*)((uint8_t*)rx_status_data + pos)) = dev->chain_asic_exist[dev->chain_map[i]][j];
			pos += sizeof (uint32_t);
		}
    }
	for (i = 0; i < rx_status_data->chain_num; i++)
	{
		if(gChain_Asic_num[dev->chain_map[i]] == 0)
			continue;
		for(j = 0; j < (((gChain_Asic_num[dev->chain_map[i]]-1)>>5) + 1); j++)
		{
			*((uint32_t*)((uint8_t*)rx_status_data + pos)) = gChain_Asic_status[dev->chain_map[i]][j];
			pos += sizeof (uint32_t);
		}
    }
	for (i = 0; i < rx_status_data->chain_num; i++)
	{
		*((char*) rx_status_data + pos) = gChain_Asic_num[dev->chain_map[i]];
		pos++;
	}
	rx_status_data->temp_num = temp_num;
    if ((rx_status_data->temp_num != 0) && (temp != NULL))
    {
		for (i = 0; i < rx_status_data->temp_num; i++)
		{
			*((char*) rx_status_data + pos) = dev->temp[dev->chain_map[i]];
			pos++;
		}
    }
    rx_status_data->fan_num = fan_num;
    if ((rx_status_data->fan_num != 0) && (fan != NULL))
    {
        for (i = 0; i < rx_status_data->fan_num; i++)
		{
			*((char*) rx_status_data + pos) = dev->fan_speed[dev->fan_map[i]];
			pos++;
		}
    }
    rx_status_data->length = pos + 2 - 4;//加crc 两个字节去除前四个字节
    crc16 = CRC16((const uint8_t*)rx_status_data, pos);
    *((char*) rx_status_data + pos) = crc16 & 0xff;
    *((char*) rx_status_data + pos + 1) = (char) (crc16 >> 8);
    return rx_status_data->length + 4;
}

static ssize_t bitmain_asic_read(struct file *file, char __user *userbuf,
				 size_t count, loff_t *ppos)
{
	BT_AS_INFO dev = file->private_data;
	int retval = 0, i;
	static unsigned long ret_ttn_timeout = 0;
	if(dev->fpga_ok == false)
	{
		wait_queue_head_t timeout_wq;
		init_waitqueue_head(&timeout_wq);
		interruptible_sleep_on_timeout(&timeout_wq, 10 * HZ/1000);//10ms
		return -EIO;
	}
	if(ret_ttn_timeout == 0)
		ret_ttn_timeout = jiffies;
	spin_lock(&dev->lock);
	//bitmain_asic_open_usb(dev);
	mutex_lock(&dev->result_lock);
	#if 0
	if(1/*time_after(jiffies, Prnt_time_out) && (dev->cgminer_start)*/)
	{
		local_bh_disable();
		while( 4 == nonce_query(dev)) ;
		//mod_timer(&prnt_timer, jiffies + 20*HZ/1000); //Start Timer 20ms
		local_bh_enable();
	}
	if(g_FPGA_FIFO_SPACE > g_FPGA_RESERVE_FIFO_SPACE)
		send_to_pfga_work(dev);
	#endif
	//printk_ratelimited(KERN_ERR "33work_id{%d}addr{%#x}\n",asic_result[33].work_id, &(asic_result[33].work_id));
	if (dev->task_buffer_full)
    {
        fifo_space = 0;
    }
    else
    {
        if (dev->task_buffer_wr >= dev->task_buffer_rd)
        {
            fifo_space = dev->task_buffer_size - (dev->task_buffer_wr - dev->task_buffer_rd);
        }
        else
        {
            fifo_space = dev->task_buffer_rd - dev->task_buffer_wr;
        }
        //防止full，预留位置，存储已发送的上几个数据
        if (fifo_space >= TASK_PRE_LEFT)
            fifo_space -= TASK_PRE_LEFT;
        else
            fifo_space = 0;
    }
    //dev->get_status = true;
    if ((asic_result_full || (asic_result_rd != asic_result_wr))/* && ((T4CON & 0x8000) != 0)*/)//正在task work
    {
        struct BITMAIN_RESULT bitmain_result;
        uint8_t nonce_num = 0;
        uint16_t crc16;
        bitmain_result.data_type = BM_RX_NONCE;
		bitmain_result.version = 0x00;
		bitmain_result.nonce_diff = dev->nonce_diff;
		bitmain_result.total_nonce_num = dev->total_nonce_num;
		//bitmain_result.total_nonce_num = dev->diff1_num; //cgminer 不通过nonce diff计算时
        do
        {
            memcpy(&bitmain_result.nonce[nonce_num], (void*)&asic_result[asic_result_rd], sizeof (asic_result[0]));
            nonce_num++;
			//printk_ratelimited(KERN_ERR "work_id{%d}rd{%d}wr{%d}\n",asic_result[asic_result_rd].work_id, asic_result_rd, asic_result_wr);
            increase_variable_rehead_U16(&asic_result_rd, ASIC_RESULT_NUM);
			gSubmit_nonce_num++;
        }
        //while ((asic_result_rd != asic_result_wr) && (nonce_num < 7));//为了不超过64字节
        while ((asic_result_rd != asic_result_wr) && (nonce_num < 128));
        asic_result_full = 0;
		if(sizeof(bitmain_result.fifo_space) == 1)
		{
			if(fifo_space >= 0x100)
				fifo_space = 0xff;
			bitmain_result.fifo_space = (uint8_t)fifo_space;
		}
		else
			bitmain_result.fifo_space = fifo_space;
		//bitmain_result.nonce_num = nonce_num;
        bitmain_result.length = nonce_num * (sizeof (asic_result[0])) + 6 + 8;
        crc16 = CRC16((const uint8_t*) &bitmain_result, bitmain_result.length + 2);
        *((char*) &bitmain_result + bitmain_result.length + 2) = crc16 & 0xff;
        *((char*) &bitmain_result + bitmain_result.length + 2 + 1) = (char) (crc16 >> 8);
        retval = bitmain_result.length + 4;
        last_read_nonce_jiffies = jiffies;
        //printk_ratelimited("read %d nonce\n", nonce_num);
        //gNonce_num += nonce_num;
		if (0 != copy_to_user(userbuf, (void*)&bitmain_result, retval))
		{
			retval = -EFAULT;
		}
    }
    else if (dev->get_status)
    {
        dev->get_status = false;
        if (asic_result_status_full || (asic_result_status_rd != asic_result_status_wr))
        {
            asic_result_status_full = 0;
            //printk_ratelimited("status return\n");
            retval = create_rx_status_struct(&dev->asic_status_data, true, asic_result_status[asic_result_status_rd],
                                             fifo_space, dev->temp, dev->temp_num, dev->fan_speed, dev->fan_num);
            increase_variable_rehead_U16(& asic_result_status_rd, ASIC_RESULT_STATUS_NUM);
        }
        else
        {
            retval = create_rx_status_struct(&dev->asic_status_data, false, 0,
                                             fifo_space, dev->temp, dev->temp_num, dev->fan_speed, dev->fan_num);
        }
        //printk_ratelimited("get_status:fifo_space %d rd(%d)wr(%d)\n",fifo_space,dev->task_buffer_rd,dev->task_buffer_wr);
		if(retval > count)
		{
			retval = count;
			printk_ratelimited(KERN_ERR "count too small in %s\n", __func__);
		}

		if (0 != copy_to_user(userbuf, (void*)& dev->asic_status_data, retval))
		{
			retval = -EFAULT;
		}
		if((retval >0 ) && (rx_st_prnt))
		{
			printk_ratelimited("rx_status data is:\n");
			for(i = 0; i < retval; i++)
			{
				if(0 == (i %16))
					printk_ratelimited("\n 0x%02x: ", i);
				printk_ratelimited("0x%02x, ", *((char*)&dev->asic_status_data + i));
			}
			printk_ratelimited("\n");
		}
    }
	#if 1
	else if((dev->cgminer_start == true) && time_after(jiffies, ret_ttn_timeout))
	{
		struct BITMAIN_RESULT bitmain_result;
        uint16_t crc16;
        bitmain_result.data_type = BM_RX_NONCE;
		bitmain_result.version = 0x00;
		bitmain_result.nonce_diff = dev->nonce_diff;
		bitmain_result.total_nonce_num = dev->total_nonce_num;
		if(sizeof(bitmain_result.fifo_space) == 1)
		{
			if(fifo_space >= 0x100)
				fifo_space = 0xff;
			bitmain_result.fifo_space = (uint8_t)fifo_space;
		}
		else
			bitmain_result.fifo_space = fifo_space;
		//bitmain_result.nonce_num = 0;
        bitmain_result.length = 6 + 8;
        crc16 = CRC16((const uint8_t*) &bitmain_result, bitmain_result.length + 2);
        *((char*) &bitmain_result + bitmain_result.length + 2) = crc16 & 0xff;
        *((char*) &bitmain_result + bitmain_result.length + 2 + 1) = (char) (crc16 >> 8);
        retval = bitmain_result.length + 4;
        //printk_ratelimited("fifo_space %d rd(%d)wr(%d)\n",fifo_space,dev->task_buffer_rd,dev->task_buffer_wr);
		if (0 != copy_to_user(userbuf, (void*)&bitmain_result, retval))
		{
			retval = -EFAULT;
		}
		//printk_ratelimited(KERN_ERR "ttn %llu\n", dev->total_nonce_num);
		ret_ttn_timeout = jiffies + 1000 * HZ/1000;//1000ms;
	}
	#endif
	mutex_unlock(&dev->result_lock);
	spin_unlock(&dev->lock);
	//printk_ratelimited("out read{%d}\n", retval);
	return retval;
}
/*
 * Handle commands from user-space.
 */

typedef struct __FPGA_DATA {
	unsigned int data_len;
	unsigned char *pdata;
	unsigned int nStatus;
} FPGA_DATA;

#define FPGA_DL_IOC_MAGIC 'p'

#define START_CONFIG  _IOWR(FPGA_DL_IOC_MAGIC, 0, unsigned int)
#define CONFIG_DATA   _IOWR(FPGA_DL_IOC_MAGIC, 1, FPGA_DATA)
#define CONFIG_DONE   _IOWR(FPGA_DL_IOC_MAGIC, 2, unsigned int)

/***************************
DCLK	 gpio2_6  gpio70	P8 45
nConfig	gpio2_8	gpio72	P8 43 in
nStatus	gpio2_10		gpio74	P8 41
CONF_DONE	gpio2_12		gpio76	P8 39 in
Data		gpio3_15		gpio111	P9 29 out
***************************/
static unsigned char data_buffer[1024*8];
#if 0
static long bitmain_asic_ioctl(struct file *file,
				unsigned int cmd, unsigned long arg)
{
	int ret = -ENOTTY;
	FPGA_DATA fdata;
	unsigned int i, j;
	unsigned char fpga_data;
	//void __user *argp = (void __user *)arg;
	unsigned int nStatus = 1;
	static void *ctl_md_vaddr;
	switch (cmd) {
		case START_CONFIG:
			ctl_md_vaddr = ioremap_nocache(CONTROL_MODULE_BASE, CONTROL_MODULE_Size);
			//Set SPI1 D0 to GPIO mode
			iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + conf_mcasp0_fsx); //D0 MISO
			//Dclk
			iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + 0x8a0);
			//nConfig
			iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + 0x8a8);
			//nStatus
			iowrite32(PAD_REV | PAD_PULLUP | 0x7, ctl_md_vaddr + 0x8b0);
			//Config_Don
			iowrite32(PAD_REV | PAD_PULLUP | 0x7, ctl_md_vaddr + 0x8b8);
			gpio2_vaddr = ioremap_nocache(GPIO2_BASE, GPIO2_SIZE);
			gpio3_vaddr = ioremap_nocache(GPIO3_BASE, GPIO3_SIZE);
			// set Dclk nConfig out
			iowrite32(ioread32(gpio2_vaddr + GPIO_OE) & (~((0x01<<6) | (0x01<<8))), gpio2_vaddr + GPIO_OE);
			iowrite32(ioread32(gpio3_vaddr + GPIO_OE)& (~(0x01<<15)), gpio3_vaddr + GPIO_OE);
			iowrite32(0x01<<15, gpio3_vaddr + GPIO_CLEARDATAOUT);
			// nCONFIG="0"，使FPGA进入配置状态
			iowrite32(0x01<<8, gpio2_vaddr + GPIO_CLEARDATAOUT);
			iowrite32(0x01<<6, gpio2_vaddr + GPIO_CLEARDATAOUT);
			udelay(5);
			// 检测nSTATUS，如果为"0"，表明FPGA已响应配置要求，可开始进行配置。否则报错
			if ((ioread32(gpio2_vaddr + GPIO_DATAIN) & (0x01 << 10))!= 0)
			{
				printk_ratelimited(KERN_ERR "FPGA don't responed config{%#x}\n", ioread32(gpio2_vaddr + GPIO_DATAIN));
				nStatus = 0;
			}
			iowrite32(0x01<<8, gpio2_vaddr + GPIO_SETDATAOUT);
			copy_to_user((unsigned char*)arg, (unsigned char*)&nStatus, sizeof(unsigned int));
			break;
		case CONFIG_DATA:
			copy_from_user((unsigned char*)&fdata, (unsigned char*)arg, sizeof(fdata));
			printk_ratelimited("fdata.pdata{%#x}len{%d}\n", (unsigned int)fdata.pdata, fdata.data_len);
			copy_from_user(data_buffer, (unsigned char*)fdata.pdata, fdata.data_len);
			for(j = 0; j < fdata.data_len; j++)
			{
				fpga_data = data_buffer[j];
				//printf("fpga_data %#x\n", fpga_data);
				for (i=0; i<8; i++)
				{ // DCLK="0"时，在Data0上放置数据（LSB first）
					if(fpga_data&0x01)
						iowrite32(0x01<<15, gpio3_vaddr + GPIO_SETDATAOUT);
					else
						iowrite32(0x01<<15, gpio3_vaddr + GPIO_CLEARDATAOUT);
					// DCLK->"1"，使FPGA读入数据
					iowrite32(0x01<<6, gpio2_vaddr + GPIO_SETDATAOUT);
					fpga_data >>= 1; // 准备下一位数据
					iowrite32(0x01<<6, gpio2_vaddr + GPIO_CLEARDATAOUT);
					//if (get_gpio(pnSt) == 0)
					if ((ioread32(gpio2_vaddr + GPIO_DATAIN) & (0x01 << 10))== 0)
					{ // 检测nSTATUS，如果为"0"，表明FPGA配置出错
						printk_ratelimited(KERN_ERR "FPGA config err {%#x}\n", ioread32(gpio2_vaddr + GPIO_DATAIN));
						nStatus = 0;
						break;
					}
				}
				if(nStatus == 0)
					break;
			}
			fdata.nStatus = nStatus;
			copy_to_user((unsigned char*)arg, (unsigned char*)&fdata, sizeof(fdata));
			break;
		case CONFIG_DONE:
			for(i=0; i<10; i++)
			{
				iowrite32(0x01<<6, gpio2_vaddr + GPIO_SETDATAOUT);
				udelay(5);
				iowrite32(0x01<<6, gpio2_vaddr + GPIO_CLEARDATAOUT);
				udelay(5);
			}
			//ctrl_gpio(pData, false);
			iowrite32(0x01<<15, gpio3_vaddr + GPIO_CLEARDATAOUT);
			if ((ioread32(gpio2_vaddr + GPIO_DATAIN) & (0x01 << 12)) == 0)
			{ // 检测nCONF_Done，如果为"0"，表明FPGA配置未成功
				printk_ratelimited(KERN_ERR "Configure failure\n");
				nStatus = 0;
			}
			//Set SPI1 D0 to GPIO mode
			iowrite32(PAD_REV | PAD_PULLUP | 0x3, ctl_md_vaddr + conf_mcasp0_fsx); //D0 MISO
			iounmap(ctl_md_vaddr);
			copy_to_user((unsigned char*)arg, (unsigned char*)&nStatus, sizeof(unsigned int));
			break;
		default:
			printk_ratelimited("IOCTL cmd not surpport{%#x}{%d}\n", cmd,_IOC_NR(cmd));
			return	-ENOTTY;
	}
	if(nStatus == 0)
	{
		iowrite32(0x01<<6, gpio2_vaddr + GPIO_SETDATAOUT);
		iowrite32(0x01<<8, gpio2_vaddr + GPIO_SETDATAOUT);
		iounmap(gpio2_vaddr);
	}
	return ret;
}
#else

/*********************************************************
DCLK		gpio0_4		gpio04	P9 18	out		I2C1_SDA/SPI0_D1
nConfig		gpio1_19		gpio51	P9 16	in		EHRPWM1B/GPMC_A3
nStatus		gpio0_12		gpio12	P9 20	out		I2C2_SDA/UART1_CTSN
CONF_DONE	gpio0_7		gpio07	P9 42	in		GPIO0_7/ECAP0_IN_PWM0_OUT
Data			gpio3_15		gpio111	P9 29	out		SPI1_D0
FPGA_rst		gpio1_28		gpio50	P9 12	out		GPMC_BE1N
***********************************************************/
static long bitmain_asic_ioctl(struct file *file,
				unsigned int cmd, unsigned long arg)
{
	int ret = -ENOTTY;
	FPGA_DATA fdata;
	unsigned int i, j;
	unsigned char fpga_data;
	//void __user *argp = (void __user *)arg;
	unsigned int nStatus = 1;
	static void *ctl_md_vaddr;
	wait_queue_head_t timeout_wq;
	switch (cmd) {
		case START_CONFIG:
			config_fpga = 1;
			ctl_md_vaddr = ioremap_nocache(CONTROL_MODULE_BASE, CONTROL_MODULE_Size);
			//Set SPI1 D0 to GPIO mode
			iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + conf_mcasp0_fsx); //D0 MISO
			//Dclk
			iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + 0x958);
			//nConfig
			iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + 0x84C);
			//nStatus
			iowrite32(PAD_REV | PAD_PULLUP | 0x7, ctl_md_vaddr + 0x978);
			//Config_Don
			iowrite32(PAD_REV | PAD_PULLUP | 0x7, ctl_md_vaddr + 0x964);
			//FPGA_rst
			iowrite32(PAD_PULL_DIS| 0x7, ctl_md_vaddr + 0x878);
			//net check led
			//iowrite32(PAD_PULLUP | 0x7, ctl_md_vaddr + 0x878);
			//gpio0_vaddr = ioremap_nocache(GPIO0_BASE, GPIO0_SIZE);
			gpio1_vaddr = ioremap_nocache(GPIO1_BASE, GPIO1_SIZE);
			gpio3_vaddr = ioremap_nocache(GPIO3_BASE, GPIO3_SIZE);
			// set Dclk nConfig out
			iowrite32(ioread32(gpio0_vaddr + GPIO_OE) & (~((0x01<<4))), gpio0_vaddr + GPIO_OE);
			iowrite32(ioread32(gpio1_vaddr + GPIO_OE) & (~((0x01<<19))) & (~((0x01<<28))), gpio1_vaddr + GPIO_OE);
			iowrite32(ioread32(gpio3_vaddr + GPIO_OE)& (~(0x01<<15)), gpio3_vaddr + GPIO_OE);
			//FPGA_rst high
			iowrite32(0x01<<28, gpio1_vaddr + GPIO_SETDATAOUT);
			iowrite32(0x01<<15, gpio3_vaddr + GPIO_CLEARDATAOUT);
			// nCONFIG="0"，使FPGA进入配置状态
			iowrite32(0x01<<19, gpio1_vaddr + GPIO_CLEARDATAOUT);
			iowrite32(0x01<<4, gpio0_vaddr + GPIO_CLEARDATAOUT);
			udelay(5);
			// 检测nSTATUS，如果为"0"，表明FPGA已响应配置要求，可开始进行配置。否则报错
			if ((ioread32(gpio0_vaddr + GPIO_DATAIN) & (0x01 << 12))!= 0)
			{
				printk_ratelimited(KERN_ERR "FPGA don't responed config{%#x}\n", ioread32(gpio0_vaddr + GPIO_DATAIN));
				nStatus = 0;
			}
			iowrite32(0x01<<19, gpio1_vaddr + GPIO_SETDATAOUT);
			copy_to_user((unsigned char*)arg, (unsigned char*)&nStatus, sizeof(unsigned int));
			break;
		case CONFIG_DATA:
			copy_from_user((unsigned char*)&fdata, (unsigned char*)arg, sizeof(fdata));
			//printk_ratelimited("fdata.pdata{%#x}len{%d}\n", (unsigned int)fdata.pdata, fdata.data_len);
			copy_from_user(data_buffer, (unsigned char*)fdata.pdata, fdata.data_len);
			for(j = 0; j < fdata.data_len; j++)
			{
				fpga_data = data_buffer[j];
				//printf("fpga_data %#x\n", fpga_data);
				for (i=0; i<8; i++)
				{ // DCLK="0"时，在Data0上放置数据（LSB first）
					if(fpga_data&0x01)
						iowrite32(0x01<<15, gpio3_vaddr + GPIO_SETDATAOUT);
					else
						iowrite32(0x01<<15, gpio3_vaddr + GPIO_CLEARDATAOUT);
					// DCLK->"1"，使FPGA读入数据
					iowrite32(0x01<<4, gpio0_vaddr + GPIO_SETDATAOUT);
					fpga_data >>= 1; // 准备下一位数据
					iowrite32(0x01<<4, gpio0_vaddr + GPIO_CLEARDATAOUT);
					//if (get_gpio(pnSt) == 0)
					if ((ioread32(gpio0_vaddr + GPIO_DATAIN) & (0x01 << 12))== 0)
					{ // 检测nSTATUS，如果为"0"，表明FPGA配置出错
						printk_ratelimited(KERN_ERR "FPGA config err {%#x}\n", ioread32(gpio0_vaddr + GPIO_DATAIN));
						nStatus = 0;
						break;
					}
				}
				if(nStatus == 0)
					break;
			}
			fdata.nStatus = nStatus;
			copy_to_user((unsigned char*)arg, (unsigned char*)&fdata, sizeof(fdata));
			break;
		case CONFIG_DONE:
			init_waitqueue_head(&timeout_wq);
			for(i=0; i<10; i++)
			{
				iowrite32(0x01<<4, gpio0_vaddr + GPIO_SETDATAOUT);
				udelay(1);
				iowrite32(0x01<<4, gpio0_vaddr + GPIO_CLEARDATAOUT);
				udelay(1);
			}
			//ctrl_gpio(pData, false);
			iowrite32(0x01<<15, gpio3_vaddr + GPIO_CLEARDATAOUT);
			if ((ioread32(gpio0_vaddr + GPIO_DATAIN) & (0x01 << 7)) == 0)
			{ // 检测nCONF_Done，如果为"0"，表明FPGA配置未成功
				printk_ratelimited(KERN_ERR "Configure failure\n");
				nStatus = 0;
			}
			//Set SPI1 D0 to GPIO mode
			iowrite32(PAD_REV | PAD_PULLUP | 0x3, ctl_md_vaddr + conf_mcasp0_fsx); //D0 MISO
			iounmap(ctl_md_vaddr);
			//iounmap(gpio0_vaddr);
			iowrite32(0x01<<28, gpio1_vaddr + GPIO_CLEARDATAOUT);
			interruptible_sleep_on_timeout(&timeout_wq, 100 * HZ/1000);//100ms
			iowrite32(0x01<<28, gpio1_vaddr + GPIO_SETDATAOUT);
			iounmap(gpio1_vaddr);
			copy_to_user((unsigned char*)arg, (unsigned char*)&nStatus, sizeof(unsigned int));
			break;
		default:
			printk_ratelimited("IOCTL cmd not surpport{%#x}{%d}\n", cmd,_IOC_NR(cmd));
			return	-ENOTTY;
	}
	if(nStatus == 0)
	{
		iowrite32(0x01<<4, gpio0_vaddr + GPIO_SETDATAOUT);
		iowrite32(0x01<<19, gpio1_vaddr + GPIO_SETDATAOUT);
		iounmap(gpio0_vaddr);
		iounmap(gpio1_vaddr);
	}
	return ret;
}

#endif

static const struct file_operations bitmain_asic_fops = {
	.owner          = THIS_MODULE,
	.read           = bitmain_asic_read,
	.write          = bitmain_asic_write,
	.open           = bitmain_asic_open,
	.release        = bitmain_asic_close,
	.unlocked_ioctl = bitmain_asic_ioctl,
};

static struct miscdevice bitmain_asic = {
	.minor = MISC_DYNAMIC_MINOR,
	.name  = DRV_NAME,
	.fops  = &bitmain_asic_fops,
};

static int __init bitmain_asic_init(void)
{
	struct ASIC_TASK asic_task;
	uint32_t nonce;

	pr_info("%s v%s (built %s %s)\n", DRV_DESC, DRV_VERSION, __DATE__,
		__TIME__);

	spi_init();

	asic_task.work_id = 0xffffffff;

	hex2bin(asic_task.midstate, g_midstate, sizeof(asic_task.midstate));
	hex2bin(asic_task.data, g_data, sizeof(asic_task.data));
	hex2bin((uint8_t *)&nonce, g_nonce, sizeof(nonce));

	rev(asic_task.midstate, sizeof(asic_task.midstate));
	rev(asic_task.data, sizeof(asic_task.data));
	rev((uint8_t *)&nonce, sizeof(nonce));

	if (hashtest(&asic_task, nonce))
		pr_info("hashtest OK\n");
	else
		pr_err("hashtest failed\n");

	if (misc_register(&bitmain_asic)) {
		pr_err("%s: misc_register failed\n", DRV_NAME);
		return -1;
	}
	return 0;
}
module_init(bitmain_asic_init);

static void __exit bitmain_asic_exit(void)
{
	spi_close();
	if (misc_deregister(&bitmain_asic) < 0)
		pr_err("%s: misc_deregister failed\n", DRV_NAME);
}
module_exit(bitmain_asic_exit);

MODULE_LICENSE("GPL v2");
MODULE_AUTHOR("Xuelei <xuelei_51@126.com>");
MODULE_DESCRIPTION(DRV_DESC);
MODULE_VERSION(DRV_VERSION);

.autorun 
