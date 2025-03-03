from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
import datetime
import time
import json
from ehrllm.backend.app.config import PATH_TO_CACHE_DIR
import litellm
from typing import Any, Dict, List, Optional, Union, Callable, Tuple
from pydantic import BaseModel
from tqdm import tqdm
import traceback
import os
from dotenv import load_dotenv
load_dotenv()

DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gpt-4o-mini")

def run_in_parallel(func: Callable, 
                    args_list: List[Tuple], 
                    kwargs_list: Optional[List[Dict[str, Any]]] = None, 
                    max_workers: int=5, 
                    pool_strat: str = 'thread',
                    merge_strat: str = 'extend') -> List[Any]:
    """
    Run a function in parallel across multiple threads and collect the results.
    
    Expects function to return a list, which will be merged into the final list of results.
    
    Example:
        func = lambda x: [x, x, x]
        args_list = [ (prompt, label) for prompt, label in zip(prompts, labels) ]
        kwargs_list = [ { 'api_key' : '1234' } for _ in range(len(prompts)) ]
        run_in_parallel(func, args_list, kwargs_list, max_workers=3, pool_strat='thread', merge_strat='extend')
    
    Args:
        func (Callable): The function to run in parallel.
        args_list (List[Any]): A list of arguments, each of which will be passed to `func`.
        kwargs_list (Optional[List[Dict[str, Any]]], optional): A list of keyword arguments, each of which will be passed to `func`.
        max_workers (int, optional): The maximum number of threads to use in the pool. Defaults to 5.
        pool_strat (str, optional): The strategy to use for the thread pool. Defaults to 'thread'.
        merge_strat (str, optional): How to merge the results from each thread. Defaults to 'extend'.

    Raises:
        ValueError: If `args_list` and `kwargs_list` are not the same length.

    Returns:
        List[Any]: A list of results from each thread.
    """
    assert merge_strat in ['append', 'extend'], "Invalid merge strategy"
    assert pool_strat in ['thread', 'process'], "Invalid pool strategy"

    # If kwargs_list is not provided, create an empty dict for each corresponding args
    if kwargs_list is not None and len(args_list) != len(kwargs_list):
        raise ValueError("args_list and kwargs_list must have the same length")
    if kwargs_list is None:
        kwargs_list = [{} for _ in range(len(args_list))]

    # If max_workers is 1, run in serial for easier debugging
    if max_workers == 1:
        results: List[Any] = []
        for (args, kwargs) in tqdm(zip(args_list, kwargs_list), total=len(args_list), desc=f"Running `{func.__name__}` serially"):
            if merge_strat == 'append':
                results.append(func(*args, **kwargs))
            elif merge_strat == 'extend':
                results += func(*args, **kwargs)
        return results
    
    # Otherwise, run in parallel
    results: List[Any] = [None] * len(args_list)  # Pre-allocate results list
    pool_executor = ThreadPoolExecutor if pool_strat == 'thread' else ProcessPoolExecutor
    with pool_executor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(func, *args, **kwargs): index
            for index, (args, kwargs) in enumerate(zip(args_list, kwargs_list))
        }
        with tqdm(total=len(futures), desc=f"Running {func.__name__} w/ {max_workers} workers") as pbar:
            for future in as_completed(futures):
                index = futures[future]
                try:
                    results[index] = future.result()
                except Exception as e:
                    print(traceback.format_exc())
                    print(f"An error occurred: {e}")
                pbar.update(1)

    # Merge results
    if merge_strat == 'extend':
        results = [item for sublist in results for item in sublist]
    elif merge_strat == 'append':
        results = results

    return results

def call_llm_with_retries(messages: List[dict], 
                            model: str = DEFAULT_MODEL, 
                            response_format: Optional[BaseModel] = None, 
                            max_retries: int = 5, 
                            temperature: float = 0.0,
                            **kwargs) -> Optional[Union[str, Any]]:
    """Call an LLM with retries and exponential backoff.

    Args:
        messages (List[dict]): The messages to send to the LLM.
        model (str, optional): The model to use. Defaults to 'gpt-4o'.
        response_format (BaseModel, optional): The response format as a Pydantic model. Defaults to None.
        max_retries (int, optional): The maximum number of retries. Defaults to 5.
        temperature (float, optional): The temperature. Defaults to 0

    Returns:
        Optional[str, Any]: The response from the LLM. If response_format is provided, returns the same object parsed from the LLM's JSON response.
    """
    retries: int = 0
    while retries < max_retries:
        try:
            response = litellm.completion(model=model, 
                                            messages=messages, 
                                            response_format=response_format,
                                            temperature=temperature,
                                            **kwargs)
    
            # Cache results
            path_to_cache: str = os.path.join(PATH_TO_CACHE_DIR, "call_llm_with_retries", f"{datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.json")
            os.makedirs(os.path.dirname(path_to_cache), exist_ok=True)
            with open(path_to_cache, 'w') as f:
                json.dump({
                    'model' : model,
                    'response_format' : str(response_format),
                    'response' : response.choices[0].message.content,
                    'messages' : messages,
                }, f, indent=2)
            
            # Parse results
            if response_format:
                return response_format(**json.loads(response.choices[0].message.content))
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error: {e}. Retrying {retries+1}/{max_retries} in 15s...")
            retries += 1
            if retries < max_retries:
                time.sleep(15)
            else:
                print(f"Failed after {max_retries} retries.")
    return None
