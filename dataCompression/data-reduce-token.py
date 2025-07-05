import json
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Union
import re

def estimate_tokens(data):
    """
    Estimate token count that closely matches OpenAI's tokenizer.
    Based on GPT tokenization patterns and empirical testing.
    
    Args:
        data: Any serializable data structure
        
    Returns:
        int: Estimated token count that closely matches OpenAI tokenizer
    """
    if data is None:
        return 0
    
    # Convert to JSON string with minimal spacing (like API calls)
    json_str = json.dumps(data, separators=(',', ':'))
    
    # More accurate token estimation based on OpenAI patterns
    tokens = 0
    
    # 1. JSON structural tokens - more accurate counting
    # Each structural character is typically 1 token
    structural_chars = ['{', '}', '[', ']', ',', ':', '"']
    for char in structural_chars:
        tokens += json_str.count(char)
    
    # 2. Extract text content between quotes and analyze
    # This regex finds all string values in JSON
    string_pattern = r'"([^"\\]|\\.)*"'
    strings = re.findall(string_pattern, json_str)
    
    # Remove quotes from strings and process content
    text_content = []
    for string_match in re.finditer(string_pattern, json_str):
        content = string_match.group(1)  # Content without quotes
        text_content.append(content)
    
    # 3. Process numeric values (not in quotes)
    # Remove all quoted strings first, then find numbers
    no_strings = re.sub(string_pattern, '', json_str)
    numbers = re.findall(r'-?\d+\.?\d*(?:[eE][+-]?\d+)?', no_strings)
    
    # 4. Tokenize text content with OpenAI-like patterns
    for text in text_content:
        tokens += _tokenize_text(text)
    
    # 5. Tokenize numbers
    for num in numbers:
        tokens += _tokenize_number_openai_style(num)
    
    return tokens

def _tokenize_text(text):
    """
    Tokenize text content using patterns similar to OpenAI's tokenizer.
    Based on BPE (Byte Pair Encoding) patterns.
    """
    if not text:
        return 0
    
    tokens = 0
    
    # Handle common patterns that OpenAI tokenizer recognizes
    # Split on word boundaries, punctuation, and whitespace
    
    # First, handle whitespace - leading/trailing spaces often become tokens
    if text.startswith(' '):
        tokens += 1
    if text.endswith(' '):
        tokens += 1
    
    # Remove leading/trailing whitespace for main processing
    text = text.strip()
    
    # Split on whitespace and punctuation, keeping delimiters
    parts = re.split(r'(\s+|[^\w\s])', text)
    parts = [part for part in parts if part]  # Remove empty parts
    
    for part in parts:
        if not part:
            continue
            
        if re.match(r'^\s+$', part):
            # Whitespace tokens
            tokens += 1
        elif re.match(r'^[^\w\s]+$', part):
            # Punctuation - each character is often a token
            tokens += len(part)
        else:
            # Word tokens - use length-based heuristic matching OpenAI patterns
            tokens += _estimate_word_tokens(part)
    
    return max(1, tokens)  # Minimum 1 token for non-empty text

def _estimate_word_tokens(word):
    """
    Estimate tokens for a word based on OpenAI tokenization patterns.
    """
    if not word:
        return 0
    
    length = len(word)
    
    # OpenAI tokenizer patterns (empirically derived)
    if length <= 1:
        return 1
    elif length <= 3:
        return 1
    elif length <= 5:
        return 1
    elif length <= 7:
        # Common words up to 7 chars are often 1 token
        # But check for common patterns that split
        if any(char.isupper() for char in word[1:]):  # CamelCase
            return max(1, length // 4)
        return 1
    elif length <= 10:
        # Medium words - often 1-2 tokens
        if word.isalpha() and word.islower():
            return 1 if length <= 8 else 2
        else:
            return max(1, length // 4)
    else:
        # Long words - split more aggressively
        # Check for common patterns
        if '_' in word:
            # snake_case splits on underscores
            return len(word.split('_'))
        elif any(char.isupper() for char in word[1:]):
            # CamelCase - rough approximation
            return max(2, length // 5)
        else:
            # Regular long words
            return max(2, length // 4)

def _tokenize_number_openai_style(number_str):
    """
    Tokenize numbers based on OpenAI patterns.
    """
    if not number_str:
        return 0
    
    # Remove any whitespace
    number_str = number_str.strip()
    
    # Very simple numbers (1-3 digits) are usually 1 token
    if re.match(r'^\d{1,3}$', number_str):
        return 1
    
    # Longer numbers or decimals
    if '.' in number_str:
        # Decimal numbers - often 2-3 tokens
        parts = number_str.split('.')
        tokens = 0
        for part in parts:
            if len(part) <= 3:
                tokens += 1
            else:
                tokens += max(1, len(part) // 3)
        return tokens + 1  # +1 for decimal point
    else:
        # Integer - longer numbers split more
        if len(number_str) <= 4:
            return 1
        else:
            return max(1, len(number_str) // 3)

def estimate_tokens_for_array(data_array):
    """
    Estimate tokens for an array of objects by sampling.
    For large arrays, samples a subset to estimate average tokens per item.
    
    Args:
        data_array: List of objects
        
    Returns:
        int: Estimated total tokens for the array
    """
    if not data_array:
        return 0
    
    # For small arrays, calculate exactly
    if len(data_array) <= 10:
        return estimate_tokens(data_array)
    
    # For larger arrays, sample to estimate
    sample_size = min(20, len(data_array))  # Increased sample size for better accuracy
    
    # Take samples from beginning, middle, and end for better representation
    if len(data_array) <= 20:
        sample_indices = list(range(len(data_array)))
    else:
        start_indices = list(range(min(7, len(data_array))))
        end_indices = list(range(max(0, len(data_array) - 7), len(data_array)))
        middle_start = len(data_array) // 2 - 3
        middle_end = len(data_array) // 2 + 3
        middle_indices = list(range(max(0, middle_start), min(len(data_array), middle_end)))
        
        sample_indices = list(set(start_indices + middle_indices + end_indices))
        sample_indices = sample_indices[:sample_size]
    
    sample_data = [data_array[i] for i in sample_indices]
    
    # Calculate average tokens per item
    sample_tokens = estimate_tokens(sample_data)
    avg_tokens_per_item = sample_tokens / len(sample_data)
    
    # Estimate total tokens with a small buffer for array structure
    # The buffer accounts for the outer array brackets and commas
    array_overhead = 2 + (len(data_array) - 1)  # [ ] + commas between elements
    total_tokens = int(avg_tokens_per_item * len(data_array) + array_overhead)
    
    return total_tokens

def intelligent_json_reducer(data, config=None):
    """
    Intelligent JSON data reducer that handles both simple arrays and nested structures.
    Now works with token-based compression and supports skipping specific fields.
    
    Args:
        data: Can be:
            - List of dictionaries (simple array format)
            - Dictionary with nested structure containing arrays
        config: Dictionary with compression settings {
            "target_tokens": 5000,          # TOTAL target tokens across all arrays
            "reduction_ratio": 0.3,         # Alternative to target_tokens
            "preserve_anomalies": True,     # Keep anomalous data points
            "preserve_extremes": True,      # Keep min/max values
            "method": "hybrid",            # Compression method
            "sequence_key": "Cycle",       # Column that represents sequence/time
            "min_array_tokens": 200,       # Minimum array tokens to compress
            "skip_fields": [],             # Fields/paths to skip compression
            "skip_patterns": []            # Patterns to match for skipping (regex)
        }
    
    Returns:
        Dictionary with compressed data and metadata
    """
    
    # Default configuration
    default_config = {
        "target_tokens": None,
        "reduction_ratio": 0.3,
        "preserve_anomalies": True,
        "preserve_extremes": True,
        "method": "hybrid",
        "sequence_key": "Cycle",
        "significant_cols": [],
        "min_array_tokens": 200,
        "skip_fields": [],
        "skip_patterns": []
    }
    
    if config:
        default_config.update(config)
    config = default_config
    
    # Handle both simple arrays and nested structures
    if isinstance(data, list):
        return _compress_single_array(data, config)
    elif isinstance(data, dict):
        return _compress_nested_with_total_target(data, config)
    else:
        return {
            "data": data,
            "metadata": {
                "message": "Data format not supported",
                "original_type": type(data).__name__,
                "original_tokens": estimate_tokens(data)
            }
        }

def _should_skip_field(path, config):
    """
    Check if a field should be skipped based on configuration.
    
    Args:
        path: Field path (e.g., "device_123.session_A")
        config: Configuration dictionary
        
    Returns:
        bool: True if field should be skipped
    """
    # Check exact field matches
    if path in config.get("skip_fields", []):
        print(f"Skipping field {path} based on exact match")
        return True
    
    # Check if any part of the path matches skip fields
    path_parts = path.split('.')
    for skip_field in config.get("skip_fields", []):
        if skip_field in path_parts:
            return True
    
    # Check pattern matches
    for pattern in config.get("skip_patterns", []):
        if re.search(pattern, path):
            return True
    
    return False

def _compress_nested_with_total_target(data, config):
    """
    Compress nested JSON where target_tokens is distributed proportionally across all arrays
    """
    
    # First pass: Find all arrays and calculate total tokens
    array_info = []
    total_compressible_tokens = 0
    total_skipped_tokens = 0
    
    def _collect_arrays(obj, path="root"):
        nonlocal total_compressible_tokens, total_skipped_tokens
        if isinstance(obj, dict):
            for key, value in obj.items():
                _collect_arrays(value, f"{path}.{key}" if path != "root" else key)
        elif isinstance(obj, list) and len(obj) > 0:
            # Check if it's an array of objects (compressible)
            if all(isinstance(item, dict) for item in obj):
                print(f"Found array at {path} with {len(obj)} items")
                tokens = estimate_tokens_for_array(obj)
                should_skip = _should_skip_field(path, config)
                
                if should_skip:
                    total_skipped_tokens += tokens
                    array_info.append({
                        "path": path,
                        "size": len(obj),
                        "tokens": tokens,
                        "data": obj,
                        "skip": True,
                        "reason": "Matched skip configuration"
                    })
                    print(f"Skipping compression for {path}: {tokens} tokens (matched skip configuration)")
                elif tokens >= config["min_array_tokens"]:
                    array_info.append({
                        "path": path,
                        "size": len(obj),
                        "tokens": tokens,
                        "data": obj,
                        "skip": False
                    })
                    total_compressible_tokens += tokens
                else:
                    array_info.append({
                        "path": path,
                        "size": len(obj),
                        "tokens": tokens,
                        "data": obj,
                        "skip": True,
                        "reason": "Below minimum token threshold"
                    })
                    total_skipped_tokens += tokens
    
    _collect_arrays(data)
    
    # Filter to get only compressible arrays
    compressible_arrays = [info for info in array_info if not info["skip"]]
    skipped_arrays = [info for info in array_info if info["skip"]]
    
    if not compressible_arrays:
        return {
            "data": data,
            "metadata": {
                "message": "No compressible arrays found",
                "arrays_found": len(array_info),
                "arrays_compressible": 0,
                "arrays_skipped": len(skipped_arrays),
                "total_original_tokens": estimate_tokens(data),
                "total_compressible_tokens": total_compressible_tokens,
                "total_skipped_tokens": total_skipped_tokens,
                "skipped_arrays": [{"path": info["path"], "reason": info["reason"], "tokens": info["tokens"]} for info in skipped_arrays]
            }
        }
    
    print(f"Found {len(compressible_arrays)} compressible arrays with {total_compressible_tokens} tokens")
    print(f"Skipped {len(skipped_arrays)} arrays with {total_skipped_tokens} tokens")
    
    # Calculate proportional target tokens ONLY for compressible arrays
    if config["target_tokens"] is not None:
        total_target = config["target_tokens"]
        print(f"Distributing target tokens of {total_target} across {len(compressible_arrays)} compressible arrays")
        
        for info in compressible_arrays:
            # Calculate proportional allocation based on compressible tokens only
            proportion = info["tokens"] / total_compressible_tokens
            proportional_target = int(total_target * proportion)
            
            # Ensure minimum tokens per array
            info["individual_target_tokens"] = proportional_target
            
            print(f"Array at {info['path']}: {info['tokens']} tokens -> target: {info['individual_target_tokens']} ({proportion:.1%})")
    else:
        # Use reduction_ratio for each array individually
        for info in compressible_arrays:
            info["individual_target_tokens"] = None
    
    # Second pass: Compress arrays with their individual targets
    compressed_data = {}
    metadata = {
        "arrays_found": len(array_info),
        "arrays_compressible": len(compressible_arrays),
        "arrays_skipped": len(skipped_arrays),
        "arrays_compressed": 0,
        "total_original_tokens": total_compressible_tokens + total_skipped_tokens,
        "total_compressible_tokens": total_compressible_tokens,
        "total_skipped_tokens": total_skipped_tokens,
        "total_compressed_tokens": total_skipped_tokens,  # Start with skipped tokens
        "compression_details": [],
        "skipped_details": [{"path": info["path"], "reason": info["reason"], "tokens": info["tokens"]} for info in skipped_arrays],
        "target_distribution": []
    }
    
    def _compress_recursively(obj, path="root"):
        if isinstance(obj, dict):
            result = {}
            for key, value in obj.items():
                current_path = f"{path}.{key}" if path != "root" else key
                result[key] = _compress_recursively(value, current_path)
            return result
        elif isinstance(obj, list):
            # Find matching array info
            matching_info = next((info for info in array_info if info["path"] == path), None)
            if matching_info:
                if matching_info["skip"]:
                    # Return original data without compression
                    print(f"Skipping compression for array at {path}: {matching_info['reason']}")
                    return obj
                else:
                    # Create custom config for this specific array
                    array_config = config.copy()
                    array_config["target_tokens"] = matching_info["individual_target_tokens"]
                    
                    print(f"Compressing array at {path} with target tokens {matching_info['individual_target_tokens']}")
                    result = _compress_single_array(obj, array_config)
                    
                    # Update metadata
                    metadata["arrays_compressed"] += 1
                    metadata["total_compressed_tokens"] += result["metadata"]["compressed_tokens"]
                    
                    # Store compression details
                    detail = {
                        "path": path,
                        "original_size": result["metadata"]["original_size"],
                        "compressed_size": result["metadata"]["compressed_size"],
                        "original_tokens": result["metadata"]["original_tokens"],
                        "compressed_tokens": result["metadata"]["compressed_tokens"],
                        "compression_ratio": result["metadata"]["compression_ratio"],
                        "token_compression_ratio": result["metadata"]["token_compression_ratio"],
                        "individual_target_tokens": matching_info["individual_target_tokens"],
                        "proportion_of_compressible": matching_info["tokens"] / total_compressible_tokens if total_compressible_tokens > 0 else 0
                    }
                    metadata["compression_details"].append(detail)
                    metadata["target_distribution"].append({
                        "path": path,
                        "allocated_target_tokens": matching_info["individual_target_tokens"],
                        "proportion": matching_info["tokens"] / total_compressible_tokens if total_compressible_tokens > 0 else 0
                    })
                    
                    return result["data"]
            else:
                return obj
        else:
            return obj
    
    compressed_data = _compress_recursively(data)
    
    # Calculate overall statistics
    if metadata["total_original_tokens"] > 0:
        overall_ratio = (metadata["total_original_tokens"] - metadata["total_compressed_tokens"]) / metadata["total_original_tokens"]
        metadata["overall_compression_ratio"] = overall_ratio
        metadata["overall_compression_percentage"] = f"{overall_ratio:.1%}"
        metadata["actual_total_tokens"] = metadata["total_compressed_tokens"]
        metadata["target_total_tokens"] = config.get("target_tokens", "N/A")
        
        # Calculate compression ratio for compressible arrays only
        if total_compressible_tokens > 0:
            compressible_compressed_tokens = metadata["total_compressed_tokens"] - metadata["total_skipped_tokens"]
            compressible_ratio = (total_compressible_tokens - compressible_compressed_tokens) / total_compressible_tokens
            metadata["compressible_compression_ratio"] = compressible_ratio
            metadata["compressible_compression_percentage"] = f"{compressible_ratio:.1%}"
    
    return {
        "data": compressed_data,
        "metadata": metadata
    }

def _compress_single_array(data, config):
    """Compress a single array of objects based on token count"""
    # Handle edge cases
    if not data:
        return {
            "data": data,
            "metadata": {
                "original_size": 0,
                "compressed_size": 0,
                "original_tokens": 0,
                "compressed_tokens": 0,
                "compression_ratio": 0.0,
                "token_compression_ratio": 0.0,
                "message": "Empty data"
            }
        }
    
    # Calculate original tokens
    original_tokens = estimate_tokens_for_array(data)
    
    # Check if array is too small to compress
    if original_tokens <= config["min_array_tokens"]:
        return {
            "data": data,
            "metadata": {
                "original_size": len(data),
                "compressed_size": len(data),
                "original_tokens": original_tokens,
                "compressed_tokens": original_tokens,
                "compression_ratio": 0.0,
                "token_compression_ratio": 0.0,
                "message": "Data too small for compression"
            }
        }
    
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Identify data types
    numerical_cols = []
    significant_cols = []
    
    for col in df.columns:
        if col == config["sequence_key"]:
            continue
        elif col in config['significant_cols']:
            significant_cols.append(col)
        elif df[col].dtype in ['int64', 'float64']:
            numerical_cols.append(col)

    
    n = len(data)
    
    # Calculate target size based on tokens
    if config["target_tokens"] is not None:
        # Estimate how many items we need to reach target tokens
        avg_tokens_per_item = original_tokens / n
        target_size = max(3, int(config["target_tokens"] / avg_tokens_per_item))
        target_size = min(target_size, n)  # Can't exceed original size
    else:
        target_size = max(3, int(n * (1 - config["reduction_ratio"])))
    
    # Core compression algorithm
    preserved_indices = {0, n-1}  # Always keep first and last
    
    # 1. Preserve anomalies
    if config["preserve_anomalies"] and numerical_cols:
        for col in numerical_cols:
            values = df[col].values
            z_scores = np.abs((values - np.mean(values)) / (np.std(values) + 1e-8))
            anomalies = np.where(z_scores > 2.5)[0]
            preserved_indices.update(anomalies[:5])  # Limit anomalies per column
    
    # 2. Preserve extremes
    if config["preserve_extremes"] and numerical_cols:
        for col in numerical_cols:
            values = df[col].values
            preserved_indices.update([np.argmin(values), np.argmax(values)])
    
    # 3. Preserve significant transitions
    for col in significant_cols:
        for i in range(1, len(df)):
            if df.iloc[i][col] != df.iloc[i-1][col]:
                preserved_indices.update([i-1, i])
    
    # 4. Iteratively adjust based on token estimates
    current_subset = sorted(list(preserved_indices))
    current_data = [data[i] for i in current_subset]
    current_tokens = estimate_tokens_for_array(current_data)
    
    # If we have a token target, adjust the selection
    if config["target_tokens"] is not None:
        target_tokens = config["target_tokens"]
        
        # If we're under target, add more significant points
        if current_tokens < target_tokens and len(preserved_indices) < n:
            remaining_indices = set(range(n)) - preserved_indices
            significance_scores = {}
            
            for idx in remaining_indices:
                score = 0.0
                
                # Local variability
                if 0 < idx < n-1:
                    for col in numerical_cols:
                        prev_val = df.iloc[idx-1][col]
                        curr_val = df.iloc[idx][col]
                        next_val = df.iloc[idx+1][col]
                        local_var = np.var([prev_val, curr_val, next_val])
                        score += local_var
                
                # Distance from mean
                for col in numerical_cols:
                    col_mean = df[col].mean()
                    col_std = df[col].std()
                    if col_std > 0:
                        z_score = abs((df.iloc[idx][col] - col_mean) / col_std)
                        score += z_score
                
                significance_scores[idx] = score
            
            # Add points until we approach target tokens
            sorted_remaining = sorted(remaining_indices, 
                                    key=lambda i: significance_scores.get(i, 0), 
                                    reverse=True)
            
            for idx in sorted_remaining:
                test_indices = preserved_indices.union({idx})
                test_data = [data[i] for i in sorted(test_indices)]
                test_tokens = estimate_tokens_for_array(test_data)
                
                if test_tokens <= target_tokens:
                    preserved_indices.add(idx)
                    current_tokens = test_tokens
                else:
                    break
        
        # If we're over target, remove least significant points
        elif current_tokens > target_tokens and len(preserved_indices) > 3:
            print("Current tokens:", current_tokens, "Target tokens:", target_tokens)
            preserved_list = sorted(list(preserved_indices))
            must_keep = {0, n-1}
            can_remove = [idx for idx in preserved_list if idx not in must_keep]
            
            # Remove points until we're under target
            while current_tokens > target_tokens and can_remove:
                # Remove the point that contributes least to significance
                best_removal = None
                best_tokens = float('inf')
                
                for idx in can_remove[-5:]:  # Check last 5 candidates
                    test_indices = preserved_indices - {idx}
                    test_data = [data[i] for i in sorted(test_indices)]
                    test_tokens = estimate_tokens_for_array(test_data)
                    
                    if test_tokens < best_tokens:
                        best_tokens = test_tokens
                        best_removal = idx
                
                if best_removal is not None:
                    preserved_indices.remove(best_removal)
                    can_remove.remove(best_removal)
                    current_tokens = best_tokens
                else:
                    break
    
    # Extract results
    preserved_list = sorted(list(preserved_indices))
    compressed_data = [data[i] for i in preserved_list]
    final_tokens = estimate_tokens_for_array(compressed_data)
    
    compression_ratio = (n - len(compressed_data)) / n
    token_compression_ratio = (original_tokens - final_tokens) / original_tokens if original_tokens > 0 else 0
    
    metadata = {
        "original_size": n,
        "compressed_size": len(compressed_data),
        "original_tokens": original_tokens,
        "compressed_tokens": final_tokens,
        "compression_ratio": compression_ratio,
        "token_compression_ratio": token_compression_ratio,
        "compression_percentage": f"{compression_ratio:.1%}",
        "token_compression_percentage": f"{token_compression_ratio:.1%}",
        "preserved_indices": preserved_list,
        "method": config["method"],
        "config_used": config
    }
    
    return {
        "data": compressed_data,
        "metadata": metadata
    }

def run_example():
    """Run example usage with both simple and nested structures, including skip fields"""
    
    # Example 1: Simple array with token-based compression
    try:
        with open("original_battery_data.json", "r") as f:
            battery_data = json.load(f)
        
        print("=== Simple Array Token-Based Compression ===")
        # Check original token count
        original_tokens = estimate_tokens_for_array(battery_data)
        print(f"Original data: {len(battery_data)} items, ~{original_tokens} tokens")
        
        result = intelligent_json_reducer(battery_data, {
            "target_tokens": 5000,  # Target 5000 tokens instead of 50 items
            "preserve_anomalies": True,
            "preserve_extremes": True,
            "sequence_key": "Cycle",
            "skip_fields": ['session_B'],  # Skip these fields,
            "significant_cols": [],  # Significant columns to preserve
        })
        
        with open("compressed_battery_data.json", "w") as f:
            json.dump(result["data"], f, indent=2)
        
        print(json.dumps(result["metadata"], indent=2))
        
        # Verify with actual token count
        actual_tokens = estimate_tokens(result["data"])
        print(f"Verification: Actual compressed tokens = {actual_tokens}")
        
    except FileNotFoundError:
        print("original_battery_data.json not found, skipping simple array example")
    
if __name__ == "__main__":
    run_example()