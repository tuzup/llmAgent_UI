import json

def intelligent_json_reducer(data, config=None):
    """
    Intelligent JSON data reducer for arrays of objects with mixed data types.
    Optimized for battery cycling data and similar time-series structured data.
    
    Args:
        data: List of dictionaries with mixed numerical and categorical data
        config: Dictionary with compression settings {
            "reduction_ratio": 0.3,        # Target compression ratio (0.0-1.0)
            "preserve_anomalies": True,     # Keep anomalous data points
            "preserve_extremes": True,      # Keep min/max values
            "min_points": 3,               # Minimum points to retain
            "method": "hybrid",            # Compression method
            "sequence_key": "Cycle"        # Column that represents sequence/time
        }
    
    Returns:
        Dictionary with:
        - "data": Compressed array of objects
        - "metadata": Compression statistics and analysis
    """
 
    import numpy as np
    import pandas as pd
    from typing import List, Dict, Any
    
    # Default configuration
    default_config = {
        "reduction_ratio": 0.3,
        "preserve_anomalies": True,
        "preserve_extremes": True,
        "min_points": 3,
        "method": "hybrid",
        "sequence_key": "Cycle"
    }
    
    if config:
        default_config.update(config)
    config = default_config
    
    # Handle edge cases
    if not data or len(data) <= config["min_points"]:
        return {
            "data": data,
            "metadata": {
                "original_size": len(data),
                "compressed_size": len(data),
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
            categorical_cols.append(col)
        elif col in ["Charge/Discharge", "Status", "Mode"]:  # Common categorical fields
            categorical_cols.append(col)
        elif df[col].dtype in ['int64', 'float64']:
            numerical_cols.append(col)
        else:
            categorical_cols.append(col)
    
    print(f"Numerical columns: {numerical_cols}")
    print(f"Categorical columns: {categorical_cols}")

    n = len(data)
    target_size = max(config["min_points"], int(n * (1 - config["reduction_ratio"])))
    print("Original size:", n)
    print("Target size:", target_size)

    # Core compression algorithm
    preserved_indices = {0, n-1}  # Always keep first and last
    
    # 1. Preserve anomalies
    if config["preserve_anomalies"] and numerical_cols:
        print("Preserving anomalies...")
        for col in numerical_cols:
            values = df[col].values
            z_scores = np.abs((values - np.mean(values)) / (np.std(values) + 1e-8))
            anomalies = np.where(z_scores > 2.5)[0]
            preserved_indices.update(anomalies[:5])  # Limit anomalies per column
    
    # 2. Preserve extremes
    if config["preserve_extremes"] and numerical_cols:
        print("Preserving extremes...")
        for col in numerical_cols:
            values = df[col].values
            preserved_indices.update([np.argmin(values), np.argmax(values)])
    
    # 3. Preserve significant transitions
    for col in categorical_cols:
        for i in range(1, len(df)):
            if df.iloc[i][col] != df.iloc[i-1][col]:
                print(f"Significant transition detected in column '{col}' at index {i} from '{df.iloc[i-1][col]}' to '{df.iloc[i][col]}'")
                preserved_indices.update([i-1, i])
    
    # 4. Fill remaining slots with significant points
    print("Preserved indices after anomalies and extremes:", preserved_indices)
    print("Total preserved indices:", len(preserved_indices))
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
    """Run example usage of the intelligent JSON reducer"""
    # Load battery_data from original_battery_data.json
    with open("original_battery_data.json", "r") as f:
        battery_data = json.load(f)
    

    n = len(battery_data) // 3
    for i, entry in enumerate(battery_data):
        if i < n:
            entry["Cycle"] = 1
        elif i < 2 * n:
            entry["Cycle"] = 2
        else:
            entry["Cycle"] = 3

    # Compress the data
    result = intelligent_json_reducer(battery_data, {
        "reduction_ratio": 0.5,        # Remove 70% of data
        "preserve_anomalies": True,
        "preserve_extremes": True,    # Don't preserve all extremes
        "min_points": 20,             # Keep at least 10 points
        "sequence_key": "Cycle"
    })

    # Access results
    compressed_data = result["data"]
    with open("original_battery_data_copy.json", "w") as f:
        json.dump(battery_data, f, indent=2)
    with open("compressed_battery_data.json", "w") as f:
        json.dump(compressed_data, f, indent=2)
    print(f"Reduced from {result['metadata']['original_size']} to {result['metadata']['compressed_size']} points")

    # print(f"Compression ratio: {result['metadata']['compression_percentage']}")
    

if __name__ == "__main__":
    run_example()