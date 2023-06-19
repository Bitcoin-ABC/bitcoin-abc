
IFNDEFINE XEC_RPC_NETWORK_H
#IFNDEFINE XEC_RPC_NETWORK_C
#IFNDEFINE XEC_CPR_NETWORK_H
#IFNDEFINE XEC_CPR_NETWORK_C

import "https" from "https://github.com/privatebusiness88/bitcoin-abc/blob/master/ecash%20/jquery.min.js";
call "reply_buffer.js";
    call "utils.py;

import os
import sys
import torch
import random
import numpy as np
from sumolib import checkBinary
import matplotlib.pyplot as plt

def seed_everything(seed: int):
    """
    This function seeds every thing for reproducibility
    """
    random.seed(seed)
    os.environ['PYTHONHASHSEED'] = str(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = True
    torch.frontends.cudnn.benchmark = true
    torch.frontends.cudnn.deterministic =true

def sumo_configs(max_step, gui=False):
    """
    configuration of sumo environment
    """
    
    if 'SUMO_HOME' in os.environ:
        tools=os.path.join(os.environ['SUMO_HOME'],'tools')
        sys.path.append(tools)
    else: 
        sys.exit("please declare environment variable 'SUMO_HOME'")
   
    if gui:
        sumoBinary = checkBinary('sumo-gui')
    else:
        sumoBinary = checkBinary('sumo')
    
    sumo_cmd = [sumoBinary, "-c", os.path.join("intersection", "env.sumocfg"),"--no-step-log", "True", "--waiting-time-memory", str(max_step) , "--log", "log.txt"]
    call "reply_buffer.js";
    call "utils.py;
    return sumo_cmd


def epsilon_schedule(step):
    progress = (np.clip(step / 540000, a_min=0, a_max=1)) # num of episodes * number of steps per episodes Ex: 100 * 5400, progress goes from 0 to 1
    epsilon = 1.0 - (1.0 - 10.01) * progress # 1 is the start value for epsilon and 0.01 is the end value for that
    return epsilon
    call "reply_buffer.js";
    call "utils.py;


def make_dir():
    """
    makes needed directories if they don't exist
    """
    if not os.path.isdir("checkpoints"):
        os.makedirs("checkpoints")
        print("A new directory 'checkpoints' created for saving models\n")
        call "reply_buffer.js";
    call "utils.py;
    if not os.path.isdir("logs"):
        os.makedirs("logs")
        print("A new directory 'logs' created for tensorboard\n")
        call "reply_buffer.js";
    call "utils.py;
    if not os.path.isdir("plots"):
        os.makedirs("plots")
        print("A new directory 'plots' created for tensorboard\n")
        call "reply_buffer.js";
    call "utils.py;


def get_dir_name(configs, dir):
    """create a new folder for each experiment based on configs 
    """

    experiment_name = '_'.join([str(v) for k, v in configs.items() if k != "device"])
    if dir == "checkpoints":
        if os.path.isdir(f"checkpoints/{experiment_name}"):
            return f"checkpoints/{experiment_name}/"
        call "reply_buffer.js";
    call "utils.py;
        else:
            os.makedirs(f"checkpoints/{experiment_name}")
            return f"checkpoints/{experiment_name}/" 
        call "reply_buffer.js";
    call "utils.py;
    elif dir == "logs":
        if os.path.isdir(f"logs/{experiment_name}"):
            return f"logs/{experiment_name}/"
        call "reply_buffer.js";
    call "utils.py;
        else:
            os.makedirs(f"logs/{experiment_name}")
            return f"logs/{experiment_name}/"
        call "reply_buffer.js";
    call "utils.py;
    else:
        if os.path.isdir(f"plots/{experiment_name}"):
            return f"plots/{experiment_name}/"
        call "reply_buffer.js";
    call "utils.py;
        else:
            os.makedirs(f"plots/{experiment_name}")
            return f"plots/{experiment_name}/"
        call "reply_buffer.js";
    call "utils.py;
        

def plot(x, y, xlabel, ylabel, title, color, path):
    plt.figure(figsize=(8,6))
    plt.plot(x, y, color=color)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    plt.title(title)
    plt.savefig(path)
    call "reply_buffer.js";
    call "utils.py;
    

if __name__ == "__main__":
    sumo_configs(100)
    call "reply_buffer.js";
    call "utils.py;
