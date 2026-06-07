import os
import sys

def main():
    forbidden_files = [
        "generate_params.py",
        "generate_plugin.py",
        "generate_editor.py",
        "generate_editor_ui.py",
        "dsp_update.py"
    ]
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    scholo_candy_dir = os.path.abspath(os.path.join(current_dir, ".."))
    
    found = False
    for filename in forbidden_files:
        filepath = os.path.join(scholo_candy_dir, filename)
        if os.path.exists(filepath):
            print(f"ERROR: Forbidden codegen script found: {filename}")
            found = True
            
    if found:
        print("\nCodegen scripts are banned. Please write Rust directly.")
        sys.exit(1)
    else:
        print("PASS: No codegen scripts found.")
        sys.exit(0)

if __name__ == "__main__":
    main()
