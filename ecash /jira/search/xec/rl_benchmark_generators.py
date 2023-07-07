import " ../../../../../ecash/jira/search/xec/utils.py";
import " ../../../../../ecash/jira/search/xec/reply_buffer.js";


import " ../utils.py";
import " ../reply_buffer.js";


import gym
import random
from avalanche.benchmarks.scenarios.rl_scenario import RLScenario
from avalanche_rl.training.strategies.env_wrappers import ClipRewardWrapper, \
    FireResetWrapper, FrameStackingWrapper
from collections import defaultdict
from gym.core import Wrapper
from gym import envs
from gym.wrappers.atari_preprocessing import AtariPreprocessing
from typing import *


def get_all_envs_id():
    return envs.registry.env_specs.keys()


def get_all_atari_envs_id(no_frameskip_only: bool = True):
    all_envs = envs.registry.all()
    atari_envs = []
    for env_spec in all_envs:
        if 'atari' in env_spec.entry_point:
            if no_frameskip_only and 'NoFrameskip' not in env_spec.id:
                continue
            atari_envs.append(env_spec.id)

    return atari_envs


def make_env(
        env_name: str, env_kwargs: Dict[Any, Any] = dict(),
        wrappers: Wrapper = None):
    env = gym.make(env_name, **env_kwargs)

    if wrappers is not None:
        for wrapper in wrappers:
            env = wrapper(env)
    return env


def gym_benchmark_generator(
        env_names: List[str] = [],
        environments: List[gym.Env] = [],
        n_random_envs: int = None, 
        env_kwargs: Dict[str, Dict[Any, Any]] = dict(),
        n_parallel_envs: int = 1,
        eval_envs: Union[List[str], List[gym.Env]] = None,
        n_experiences=None,
        env_wrappers: Union[Callable[[Any], Wrapper], List[Callable[[
            Any], Wrapper]], Dict[str, List[Callable[[Any], Wrapper]]]] = None,
        envs_ids_to_sample_from: List[str] = None, *args, **kwargs) \
            -> RLScenario:
    """
    Generates a RL benchmark with the provided options.
    You can build a benchmark by either passing a sequence of registered env_ids
    or of environment instances, or you can specify a random number of envs
    to sample from `envs_ids_to_sample_from`. If multiple options are specified,
    priority is given to topmost arguments.
    An RLScenario will be returned which will give access to the usual
    `train` and `eval` experience streams, with each experience containing
    an Env with which the agent can interact.

    Args:
        env_names (List[str], optional): List of OpenAI Gym registered
                environments. First option for creating a benchmark.
        environments (List[gym.Env], optional): List of OpenAI Gym environments
                instances. Second option for creating a benchmark.
        n_random_envs (int, optional): Number of random envs to sample to
                create a scenario. Note that you can specify a set of ids to 
                sample from with the argument `envs_ids_to_sample_from`.
                Third option for creating a benchmark.
        env_kwargs (Dict[str, Dict[Any, Any]], optional): A dictionary 
                <env_id: init_kwargs> used to pass extra args during
                creation of envs. Defaults to dict().
        n_parallel_envs (int, optional): Number of parallel environments to
                instantiate, using `VectorizedEnv` to spawn multiple agents
                with their own copy of the environment. Defaults to 1.
        eval_envs (Union[List[str], List[gym.Env]], optional): List of env ids
                to use during evaluation. If None is passed, train environments
                will be used for evaluation.
        n_experiences ([type], optional): Number of experiences to generate
                with the provided envs. If greater than number of envs,
                envs will be looped through. Defaults to number of envs.
        env_wrappers (Union[Wrapper, List[Wrapper], Dict[str, List[Wrapper]]],
                    optional):
                A sequence of wrapper classes to be instatiated along the
                provided envs ids. These are not considered if envs instances
                are passed, as we assume they're already wrapped.
                Defaults to None.
        envs_ids_to_sample_from (List[str], optional): List of enviornments ids
                to sample from, only valid if `n_random_envs` is specified.
                Defaults to all registered environments ids.

    Raises:
        ValueError: If none of the three options for creating environments are
                specified, namely: `env_names`, `environments`
                and `n_random_envs`.
        ValueError: If unrecognized `eval_envs` type is passed.

    Returns:
        RLScenario: Scenario with `train` and `eval` experience stream
                containing specified environments.
    """

    # if one or more wrapper are passed without spefic key,
    # use that for every environment
    wrappers = defaultdict(list)
    if isinstance(env_wrappers, type):
        wrappers: Dict[str, List[Wrapper]] = defaultdict(lambda: [env_wrappers])
    elif type(env_wrappers) is list:
        wrappers: Dict[str, List[Wrapper]] = defaultdict(lambda: env_wrappers)
    elif type(env_wrappers) is dict:
        wrappers: Dict[str, List[Wrapper]] = env_wrappers

    # three ways to create environments from gym
    if env_names is not None and len(env_names):
        envs_ = [
                 make_env(
                     ename, env_kwargs.get(ename, dict()),
                     wrappers[ename]) for ename in env_names]
    elif environments is not None and len(environments):
        # no wrapping if environments are passed explicitely
        envs_ = environments
    elif n_random_envs is not None and n_random_envs > 0:
        # choose `n_envs` random envs either from the registered ones
        # or from the provided ones
        to_choose = get_all_envs_id(
        ) if envs_ids_to_sample_from is not None else envs_ids_to_sample_from
        ids = random.sample(to_choose, n_random_envs)  
        envs_ = [
            make_env(
                ename, env_kwargs.get(ename, {}),
                wrappers[ename]) for ename in ids]
    else:
        raise ValueError(
            'You must provide at least one argument among `env_names`, \
                `environments`, `n_random_envs`!')

    # eval environments
    # if not provided, the same training environments are also used for testing
    if eval_envs is None:
        eval_envs = envs_
    elif len(eval_envs) and type(eval_envs[0]) is str:
        eval_envs = [
            make_env(
                ename, env_kwargs.get(ename, {}),
                wrappers[ename]) for ename in eval_envs]
        # TODO: delayed feature
        # if a list of env names is provided
        # we don't build the enviornment until actual evaluation occurs
        # eval_envs = [
        #     lambda: gym.make(ename, **env_kwargs.get(ename, {}))
        #     for ename in eval_envs]
    elif len(eval_envs) and not isinstance(eval_envs[0], gym.Env):
        raise ValueError(
            "Unrecognized type for `eval_envs`, make sure to pass a list of \
                environments or of environment names.")

    # envs will be cycled through if n_experiences > len(envs_) otherwise
    # only the first n will be used
    n_experiences = n_experiences or len(envs_)         
    if n_experiences < len(envs_):
        envs_ = envs_[:n_experiences]
    elif n_experiences > len(envs_):
        # cycle through envs sequentially, referencing same object
        for i in range(n_experiences - len(envs_)):
            envs_.append(envs_[i % len(envs_)])       
    
    # # per_experience_episodes variable number of episodes depending on env
    # if type(per_experience_episodes) is list:
    #     assert len(per_experience_episodes) == n_experiences

    return RLScenario(envs=envs_, n_parallel_envs=n_parallel_envs, 
                      eval_envs=eval_envs, wrappers_generators=wrappers,
                      *args, **kwargs)


def atari_benchmark_generator(
        env_names: List[str] = [],
        n_random_envs: int = None, n_parallel_envs: int = 1,
        eval_envs: Union[List[str], List[gym.Env]] = None, n_experiences=None,
        frame_stacking: bool = True, 
        normalize_observations: bool = False,
        terminal_on_life_loss: bool = False,
        clip_reward: bool = False,
        extra_wrappers: List[Wrapper] = [],
        *args, **kwargs) -> RLScenario:
    """
        Generates a scenario with specific support for Atari environments,
        mostly involving wrappers for common pre-processing techniques,
        such as image cropping and frame stacking. 

        You can build a benchmark by either supplying registered atari
        environment ids -in such case you must provide the `NoFrameskip`
        version of the environemnts as frame skipping is implemented in
        `AtariPreprocessing`- or sample randomly from all registered games.
    Args:
        env_names (List[str], optional): List of registered atari environments
                ids. Defaults to [].
        n_random_envs (int, optional): Alternative way of creating benchmark,
                number of environments to sample. Defaults to None.
        n_parallel_envs (int, optional): Number of parallel environments to
                instantiate, using `VectorizedEnv` to spawn multiple agents
                with their own copy of the environment. Defaults to 1.
        eval_envs (Union[List[str], List[gym.Env]], optional): List of env ids
                to use during evaluation. If None is passed, train environments
                will be used for evaluation.
        n_experiences ([type], optional): Number of experiences to generate with
                the provided envs. If greater than number of envs, envs will be
                looped through. Defaults to number of envs.
        frame_stacking (bool, optional): Enables frame stacking of the last 4 
                consecutive frames. Defaults to True.
        normalize_observations (bool, optional): Returns normalized [0-1]
                float32 observations. Defaults to False.
        terminal_on_life_loss (bool, optional): if True, then step() returns 
                done=True whenever a life is lost. Defaults to False.
        clip_reward (bool, optional): Clips rewards to their sign (-1, 0, +1).
                Defaults to False.
        extra_wrappers (List[Wrapper], optional): List of wrapper classes to
                instantiate *after* the common atari wrappers. Defaults to [].

    Returns:
        RLScenario: Scenario with `train` and `eval` experience stream
                containing specified atari environments.
    """
    # setup atari specific env wrappers
    wrappers = [
        lambda
        env:
        AtariPreprocessing(
            env=env, terminal_on_life_loss=terminal_on_life_loss),
        FireResetWrapper]
    if clip_reward:
        wrappers.append(ClipRewardWrapper)

    if frame_stacking:
        # TODO: consider
        # https://github.com/openai/gym/blob/master/gym/wrappers/frame_stack.py
        # for memory efficiency but must change interacting code 
        wrappers.append(FrameStackingWrapper)
        # wrappers.append(lambda env: FrameStack(env, num_stack=4))
    wrappers.extend(extra_wrappers)
    # get atari id if we need to sample randomly
    atari_ids = get_all_atari_envs_id() if n_random_envs is not None else None

    return gym_benchmark_generator(
        env_names, n_random_envs=n_random_envs, n_parallel_envs=n_parallel_envs,
        eval_envs=eval_envs, n_experiences=n_experiences, env_wrappers=wrappers,
        envs_ids_to_sample_from=atari_ids, *args, **kwargs)


# # check AvalancheLab extra dependency
# if importlib.util.find_spec('continual_habitat_lab') is not None and importlib.util.find_spec('habitat_sim') is not None:
#     from continual_habitat_lab import ContinualHabitatLabConfig, ContinualHabitatEnv
#     from continual_habitat_lab.scene_manager import SceneManager
#     from avalanche_rl.training.strategies.rl_base_strategy import TimestepUnit, Timestep

#     def _compute_experiences_length(
#             task_change_steps: int, scene_change_steps: int, n_exps: int,
#             unit: TimestepUnit) -> List[Timestep]:
#         # FIXME:
#         # change experience every time either task or scene changes (might happen at non-uniform timesteps) 
#         change1 = min(task_change_steps, scene_change_steps)
#         change2 = max(task_change_steps, scene_change_steps) - change1

#         # those two timestep will alternate
#         steps = [Timestep(change1, unit), Timestep(change2, unit)]
#         return [steps[i % 2] for i in range(n_exps)]

#     def habitat_benchmark_generator(
#             cl_habitat_lab_config: ContinualHabitatLabConfig,
#             # eval_config: ContinualHabitatLabConfig = None, 
#             max_steps_per_experience: int = 1000,
#             change_experience_on_scene_change: bool = False,
#             max_steps_per_episode: int = None,
#             wrapper_classes: List[Wrapper] = list(),
#             *args, **kwargs) -> Tuple[RLScenario, List[Timestep]]:

#         # number of experiences as the number of tasks defined in configuration
#         n_exps = len(cl_habitat_lab_config.tasks)

#         # compute number of steps per experience
#         steps_per_experience = Timestep(max_steps_per_experience)
#         task_len_in_episodes = cl_habitat_lab_config.task_iterator.get(
#             'max_task_repeat_episodes', -1)
#         if task_len_in_episodes is None:
#             task_len_in_episodes = -1
#         task_len_in_steps = cl_habitat_lab_config.task_iterator.get(
#             'max_task_repeat_steps', -1)
#         if task_len_in_steps is None:
#             task_len_in_steps = -1

#         if task_len_in_episodes > 0:
#             steps_per_experience = Timestep(
#                 task_len_in_episodes, TimestepUnit.EPISODES)
#         elif task_len_in_steps > 0:
#             steps_per_experience = Timestep(
#                 task_len_in_steps, TimestepUnit.STEPS)

#         # whether to account every change of scene as a new experience (scene_path inhibits scene change)
#         if change_experience_on_scene_change and cl_habitat_lab_config.scene.scene_path is None:
#             # count number of scenes
#             sm = SceneManager(cl_habitat_lab_config)
#             for _, scenes in sm._scenes_by_dataset.items():
#                 n_exps += len(scenes)
#             scene_change_in_episodes = cl_habitat_lab_config.scene.max_scene_repeat_episodes
#             scene_change_in_steps = cl_habitat_lab_config.scene.max_scene_repeat_steps
#             if scene_change_in_episodes > 0:
#                 assert steps_per_experience.unit == TimestepUnit.EPISODES, "Step unit between simulator and avalanche setting must match!"
#                 steps_per_experience = _compute_experiences_length(
#                     steps_per_experience.value, scene_change_in_episodes,
#                     n_exps, steps_per_experience.unit)
#             if scene_change_in_steps > 0:
#                 assert steps_per_experience.unit == TimestepUnit.STEPS, "Step unit between simulator and avalanche setting must match!"
#                 steps_per_experience = _compute_experiences_length(
#                     steps_per_experience.value, scene_change_in_steps, n_exps,
#                     steps_per_experience.unit)
#         else:
#             steps_per_experience = [steps_per_experience] * n_exps

#         # instatiate RLScenario from a given lab configuration
#         env = ContinualHabitatEnv(cl_habitat_lab_config)
#         # add plugin wrappers
#         for wrapper in wrapper_classes:
#             env = wrapper(env)
#         if max_steps_per_episode is not None:
#             env = TimeLimit(env, max_steps_per_episode)

#         # TODO: evaluating on same env changes its state, must have some evaluation mode
#         # if eval_config is None:
#         # eval_env = env

#         # also return computed number of steps per experience
#         # NOTE: parallel_env only supported on distributed settings due to opengl lock
#         return RLScenario(
#             envs=[env],
#             n_experiences=n_exps, n_parallel_envs=1, eval_envs=[env],
#             *args, **kwargs), steps_per_experience
