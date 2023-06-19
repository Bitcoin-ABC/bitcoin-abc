#IFNDEF XEC_RPC_NETWORK_H
#IFNDEF XEC_RPC_NETWORK_C
#IFNDEF XEC_CPR_NETWORK_H
#IFNDEF XEC_CPR_NETWORK_C

import random
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim

from model import DQN
from replay_buffer import ReplayBuffer

class Agent:
    def __init__(self, input_channels, num_actions, device, learning_rate, gamma, batch_size,
                 update_model_weight, target_update_step, writer, buffer_max_size, buffer_min_size,
                 checkpoint_freq_save, grad_clip_value, checkpoints_path, tau, DDQN, optimizer="ADAM", loss_function="Huber"):

        self.input_channels = input_channels
        self.num_actions = num_actions
        self.device = device
        self.learning_rate = learning_rate
        self.gamma = gamma
        self.batch_size = batch_size
        self.update_model_weight = update_model_weight
        self._target_update_step = target_update_step
        self.writer = writer
        self.buffer_max_size = buffer_max_size
        self.buffer_min_size = buffer_min_size
        self.grad_clip_value = grad_clip_value
        self._checkpoints_path = checkpoints_path
        self._tau = tau
        self._DDQN = DDQN
        
        self.memory = ReplayBuffer(self.buffer_max_size, self.buffer_min_size, self.batch_size, self.device)
        
        self.dqn = DQN(self.input_channels, self.num_actions).to(self.device)
        self.target_dqn = DQN(self.input_channels, self.num_actions).to(self.device)
        # self.target_dqn.load_state_dict(self.dqn.state_dict())
        
        if optimizer == "ADAM":
            self.optimizer = optim.Adam(self.dqn.parameters(), lr=self.learning_rate)
        elif optimizer == "RMSprop":
            self.optimizer = optim.RMSprop(self.dqn.parameters(), lr=self.learning_rate)
        
        if loss_function == "Huber":   
            self.loss = nn.HuberLoss()
        else:
            self.loss = nn.MSELoss()
            
        self.checkpoint_freq_save = checkpoint_freq_save
        self._update_model_weight_step = 1 # to count the steps that loss functions is being updated
    
    def store_experience(self, state, action, reward, next_state, step):
        
        self.memory.add_experience(state, action, reward, next_state)
       
    def step(self): #, state, action, reward, next_state):
        
        # self.memory.add_experience(state, action, reward, next_state)
        
        # if self._update_model_weight_step %  self.update_model_weight == 0: # update model's weights every self.update_model_weight step(Ex: every 20 steps)
        if len(self.memory) > self.batch_size: # we update the model's weights when we have enough samples
            experiences = self.memory.get_sample_from_memory()
            self.learn(experiences)
        # periodically save the model
        if self._update_model_weight_step % self.checkpoint_freq_save == 0:
            torch.save({'model_state_dict': self.dqn.state_dict(), 'optimizer_state_dict': self.optimizer.state_dict()},
                        f"{self._checkpoints_path}/dqn_updated_at_step_{self._update_model_weight_step}.pth")
        
        # updating the target network every self.target_update_step step (EX: every 10000 step)
        if self._update_model_weight_step % self._target_update_step == 0:
            print(f"Updating Target Network at {self._update_model_weight_step} step")
            if self._tau == 1.0:
                self.target_dqn.load_state_dict(self.dqn.state_dict())
            else:
                for target_dqn_param, dqn_param in zip(self.target_dqn.parameters(), self.dqn.parameters()):
                    target_dqn_param.data.copy_(self._tau * dqn_param.data + (1.0 - self._tau) * target_dqn_param.data)
        
        self._update_model_weight_step += 1
    
    def act(self, state, epsilon):
        
        state = torch.from_numpy(state).float().unsqueeze(0).to(self.device) # input's shape (4, 24, 24) ----> output's shape (1, 4, 24, 24)
        self.dqn.eval() # bc it is just a feedforward without a need to backpropagation
        with torch.no_grad():
            action_values = self.dqn(state) # output's shape : (1, 4)
        self.dqn.train()
        
        if random.random() < epsilon:
            return random.randint(0, self.num_actions -1) # an integer indicating the action that has been chosen (Explore)
        else:
            return action_values.argmax(dim=1)[0].cpu().numpy() # an integer indicating the action that has been chosen (Exploit)
        
    def learn(self, experiences):
        states, actions, rewards, next_states = experiences
        
        self.dqn.train()
        self.target_dqn.eval()

        current_state_q_values = self.dqn(states).gather(dim=1, index=actions) # output's shape = (bs, 1) , choose Q values that correspond to the actions were made in those states
        new_state_q_values_index = self.dqn(next_states).max(dim=1, keepdim=True)[1] # will be used for DDQN
        
        if not self._DDQN:
            with torch.no_grad():
                next_state_max_q_values = self.target_dqn(next_states).max(dim=1, keepdim=True)[0] # output's shape : (bs , 1)            
        else:
            with torch.no_grad():
                next_state_max_q_values = self.target_dqn(next_states).gather(dim=1, index=new_state_q_values_index)
        
        target_q_values = rewards + (self.gamma *  next_state_max_q_values) # calculating the target values
        
        loss = self.loss(current_state_q_values, target_q_values).to(self.device)
        
        # logging the loss values to tensorboard
        self.writer.add_scalar(f"{str(self.loss)}/update_model_weight", loss.item(), self._update_model_weight_step)
               
        self.optimizer.zero_grad()
        loss.backward()
        
        if self.grad_clip_value is not None:  # potentially clip gradients for stability reasons
            nn.utils.clip_grad_norm_(self.dqn.parameters(), self.grad_clip_value)
        
        self.optimizer.step()
        
        # logging the gradients of the weights a biases of the self.dqn to tensorboard
        for name, weight_or_bias in self.dqn.named_parameters():
            self.writer.add_histogram(f'{name}.grad/{str(self.loss)}', weight_or_bias.grad, self._update_model_weight_step)
            grad_l2_norm = weight_or_bias.grad.data.norm(p=2).item()
            self.writer.add_scalar(f'grad_norms/{name}/{str(self.loss)}', grad_l2_norm, self._update_model_weight_step)
        

        
        
