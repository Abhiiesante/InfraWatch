import time
import os
import sys

# Ensure paths are set
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from run_telemetry_pipeline import run_pipeline

def run_continuous():
    print("="*60)
    print("STARTING CONTINUOUS DATA PLATFORM PIPELINE (DAEMON MODE)")
    print("="*60)
    
    iteration = 1
    while True:
        try:
            print(f"\n--- Pipeline Iteration {iteration} ---")
            run_pipeline()
            
            # Wait for more data to land in the Volume
            print("\nSleeping for 15 seconds to await new raw data...")
            time.sleep(15)
            iteration += 1
            
        except KeyboardInterrupt:
            print("\nPipeline stopped by user.")
            break
        except Exception as e:
            print(f"\nPipeline encountered an error: {e}")
            print("Retrying in 15 seconds...")
            time.sleep(15)

if __name__ == "__main__":
    run_continuous()
