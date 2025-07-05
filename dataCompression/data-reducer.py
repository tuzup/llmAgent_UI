import json
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Union

def intelligent_json_reducer(data, config=None):
    """
    Intelligent JSON data reducer that handles both simple arrays and nested structures.
    For nested structures, target_size is distributed proportionally across all arrays.
    
    Args:
        data: Can be:
            - List of dictionaries (simple array format)
            - Dictionary with nested structure containing arrays
        config: Dictionary with compression settings {
            "target_size": 200,            # TOTAL target size across all arrays
            "reduction_ratio": 0.3,        # Alternative to target_size
            "preserve_anomalies": True,     # Keep anomalous data points
            "preserve_extremes": True,      # Keep min/max values
            "min_points": 3,               # Minimum points to retain per array
            "method": "hybrid",            # Compression method
            "sequence_key": "Cycle",       # Column that represents sequence/time
            "min_array_size": 10          # Minimum array size to compress
        }
    
    Returns:
        Dictionary with compressed data and metadata
    """
    
    # Default configuration
    default_config = {
        "target_size": None,
        "reduction_ratio": 0.3,
        "preserve_anomalies": True,
        "preserve_extremes": True,
        "min_points": 3,
        "method": "hybrid",
        "sequence_key": "Cycle",
        "min_array_size": 10
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
                "original_type": type(data).__name__
            }
        }

def _compress_nested_with_total_target(data, config):
    """
    Compress nested JSON where target_size is distributed proportionally across all arrays
    """
    
    # First pass: Find all arrays and calculate total size
    array_info = []
    total_items = 0
    
    def _collect_arrays(obj, path="root"):
        nonlocal total_items
        if isinstance(obj, dict):
            for key, value in obj.items():
                _collect_arrays(value, f"{path}.{key}" if path != "root" else key)
        elif isinstance(obj, list) and len(obj) >= config["min_array_size"]:
            # Check if it's an array of objects (compressible)
            if all(isinstance(item, dict) for item in obj):
                array_info.append({
                    "path": path,
                    "size": len(obj),
                    "data": obj
                })
                total_items += len(obj)
    
    _collect_arrays(data)
    
    if not array_info:
        return {
            "data": data,
            "metadata": {
                "message": "No compressible arrays found",
                "arrays_found": 0,
                "total_original_size": 0
            }
        }
    
    print(f"Found {len(array_info)} compressible arrays with total {total_items} items")
    
    # Calculate proportional target sizes
    if config["target_size"] is not None:
        total_target = config["target_size"]
        print(f"Distributing target size of {total_target} across {len(array_info)} arrays")
        
        for info in array_info:
            # Calculate proportional allocation
            proportion = info["size"] / total_items
            proportional_target = int(total_target * proportion)
            
            # Ensure minimum points per array
            info["individual_target"] = max(config["min_points"], proportional_target)
            
            print(f"Array at {info['path']}: {info['size']} items -> target: {info['individual_target']} ({proportion:.1%})")
    else:
        # Use reduction_ratio for each array individually
        for info in array_info:
            info["individual_target"] = None
    
    # Second pass: Compress arrays with their individual targets
    compressed_data = {}
    metadata = {
        "arrays_found": len(array_info),
        "arrays_compressed": 0,
        "total_original_size": total_items,
        "total_compressed_size": 0,
        "compression_details": [],
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
                # Create custom config for this specific array
                array_config = config.copy()
                array_config["target_size"] = matching_info["individual_target"]
                
                print(f"Compressing array at {path} with target size {matching_info['individual_target']}")
                result = _compress_single_array(obj, array_config)
                
                # Update metadata
                metadata["arrays_compressed"] += 1
                metadata["total_compressed_size"] += result["metadata"]["compressed_size"]
                
                # Store compression details
                detail = {
                    "path": path,
                    "original_size": result["metadata"]["original_size"],
                    "compressed_size": result["metadata"]["compressed_size"],
                    "compression_ratio": result["metadata"]["compression_ratio"],
                    "compression_percentage": result["metadata"]["compression_percentage"],
                    "individual_target": matching_info["individual_target"],
                    "proportion_of_total": matching_info["size"] / total_items
                }
                metadata["compression_details"].append(detail)
                metadata["target_distribution"].append({
                    "path": path,
                    "allocated_target": matching_info["individual_target"],
                    "proportion": matching_info["size"] / total_items
                })
                
                return result["data"]
            else:
                return obj
        else:
            return obj
    
    compressed_data = _compress_recursively(data)
    
    # Calculate overall statistics
    if metadata["total_original_size"] > 0:
        overall_ratio = (metadata["total_original_size"] - metadata["total_compressed_size"]) / metadata["total_original_size"]
        metadata["overall_compression_ratio"] = overall_ratio
        metadata["overall_compression_percentage"] = f"{overall_ratio:.1%}"
        metadata["actual_total_size"] = metadata["total_compressed_size"]
        metadata["target_total_size"] = config.get("target_size", "N/A")
    
    return {
        "data": compressed_data,
        "metadata": metadata
    }

def _compress_single_array(data, config):
    """Compress a single array of objects (unchanged from your original)"""
    # Handle edge cases
    if not data or len(data) <= config["min_points"]:
        return {
            "data": data,
            "metadata": {
                "original_size": len(data) if data else 0,
                "compressed_size": len(data) if data else 0,
                "compression_ratio": 0.0,
                "message": "Data too small for compression"
            }
        }
    
    # Convert to DataFrame
    df = pd.DataFrame(data)
    
    # Identify data types
    numerical_cols = []
    categorical_cols = []
    
    for col in df.columns:
        if col == config["sequence_key"]:
            continue
        elif df[col].dtype in ['int64', 'float64']:
            numerical_cols.append(col)
        else:
            categorical_cols.append(col)
    
    n = len(data)
    
    # Calculate target size - prioritize target_size over reduction_ratio
    if config["target_size"] is not None:
        target_size = max(config["min_points"], min(config["target_size"], n))
    else:
        target_size = max(config["min_points"], int(n * (1 - config["reduction_ratio"])))
    
    # Core compression algorithm (unchanged from your original)
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
    for col in categorical_cols:
        for i in range(1, len(df)):
            if df.iloc[i][col] != df.iloc[i-1][col]:
                preserved_indices.update([i-1, i])
    
    # 4. Fill remaining slots with significant points
    if len(preserved_indices) < target_size:
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
        
        # Add most significant points
        sorted_remaining = sorted(remaining_indices, 
                                key=lambda i: significance_scores.get(i, 0), 
                                reverse=True)
        additional_needed = target_size - len(preserved_indices)
        preserved_indices.update(sorted_remaining[:additional_needed])
    
    # Ensure we don't exceed target size - trim if necessary
    elif len(preserved_indices) > target_size:
        preserved_list = sorted(list(preserved_indices))
        must_keep = {0, n-1}
        can_remove = [idx for idx in preserved_list if idx not in must_keep]
        to_remove = len(preserved_indices) - target_size
        preserved_indices = must_keep.union(set(can_remove[:-to_remove]))
    
    # Extract results
    preserved_list = sorted(list(preserved_indices))
    compressed_data = [data[i] for i in preserved_list]
    compression_ratio = (n - len(compressed_data)) / n
    
    metadata = {
        "original_size": n,
        "compressed_size": len(compressed_data),
        "compression_ratio": compression_ratio,
        "compression_percentage": f"{compression_ratio:.1%}",
        "preserved_indices": preserved_list,
        "method": config["method"],
        "config_used": config
    }
    
    return {
        "data": compressed_data,
        "metadata": metadata
    }

def run_example():
    """Run example usage with both simple and nested structures"""
    
    # Example 1: Simple array (unchanged behavior)
    try:
        with open("original_battery_data.json", "r") as f:
            battery_data = json.load(f)
        
        print("=== Simple Array Compression ===")
        result = intelligent_json_reducer(battery_data, {
            "target_size": 50,
            "preserve_anomalies": True,
            "preserve_extremes": True,
            "min_points": 20,
            "sequence_key": "Cycle"
        })
        
        with open("compressed_battery_data.json", "w") as f:
            json.dump(result["data"], f, indent=2)
        
        print(f"Simple array: {result['metadata']['original_size']} -> {result['metadata']['compressed_size']} points")
        print(f"Compression: {result['metadata']['compression_percentage']}")
        
    except FileNotFoundError:
        print("original_battery_data.json not found, skipping simple array example")
    
    # Example 2: Nested structure with total target size
    nested_data = {
        "device_123": {
            "session_A": [{"cycle": i, "voltage": 3.7 + i*0.01, "current": 1.2} for i in range(100)],
            "session_B": [{"cycle": i, "voltage": 3.8 + i*0.01, "current": 1.3} for i in range(200)]
        },
        "device_456": {
            "session_C": [{"cycle": i, "voltage": 3.6 + i*0.01, "current": 1.1} for i in range(150)]
        }
    }
    
    print("\n=== Nested Structure with Total Target Size ===")
    print("Original structure:")
    print(f"  device_123.session_A: 100 items")
    print(f"  device_123.session_B: 200 items") 
    print(f"  device_456.session_C: 150 items")
    print(f"  Total: 450 items")
    print(f"  Target: 90 items (20% of original)")
    
    result = intelligent_json_reducer(nested_data, {
        "target_size": 50,  # TOTAL target across all arrays
        "preserve_anomalies": True,
        "preserve_extremes": True,
        "min_points": 5,
        "sequence_key": "cycle"
    })
    
    with open("compressed_nested_data.json", "w") as f:
        json.dump(result["data"], f, indent=2)
    
    print(f"\nCompression Results:")
    print(f"Total: {result['metadata']['total_original_size']} -> {result['metadata']['total_compressed_size']} points")
    print(f"Overall compression: {result['metadata']['overall_compression_percentage']}")
    print(f"Target was: {result['metadata']['target_total_size']}")
    
    print("\nPer-array breakdown:")
    for detail in result['metadata']['compression_details']:
        print(f"  {detail['path']}: {detail['original_size']} -> {detail['compressed_size']} "
              f"({detail['compression_percentage']}, target: {detail['individual_target']})")

if __name__ == "__main__":
    run_example()