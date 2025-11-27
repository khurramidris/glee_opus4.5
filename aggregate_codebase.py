import os

# --- CONFIGURATION ---
PROJECT_ROOT = r"D:\Glee-Opus4.5\glee"
OUTPUT_FILE = "glee_full_codebase.txt"

# Files to include (The "Meat" of the project)
ALLOWED_EXTENSIONS = {
    # Backend
    '.rs', '.toml', '.sql', 
    # Frontend
    '.ts', '.tsx', '.js', '.css', '.html',
    # Config & Docs
    '.json', '.md', '.sh', '.ps1', '.yaml'
}

# Folders to completely ignore
IGNORE_DIRS = {
    'node_modules', 'target', '.git', '.vscode', '.idea', 
    'dist', 'build', 'coverage', 'release', '__pycache__',
    'icons', 'resources' # We ignore resources because they contain binaries/json data, not code logic
}

# Specific files to ignore (Noise)
IGNORE_FILES = {
    'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'Cargo.lock', 
    'glee_file_structure.txt', 'project_tree.txt', 'aggregate_codebase.py',
    'scan_glee.py', 'scan_project.py'
}

def is_text_file(filename):
    return any(filename.endswith(ext) for ext in ALLOWED_EXTENSIONS)

def aggregate_files():
    if not os.path.exists(PROJECT_ROOT):
        print(f"❌ Error: Path {PROJECT_ROOT} not found.")
        return

    print(f"🚀 Starting aggregation of {PROJECT_ROOT}...")
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
        # Write a header
        outfile.write(f"# GLEE SOURCE CODE AGGREGATION\n")
        outfile.write(f"# Root: {PROJECT_ROOT}\n\n")

        file_count = 0

        for root, dirs, files in os.walk(PROJECT_ROOT):
            # Filter directories in-place
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

            for file in files:
                if file in IGNORE_FILES:
                    continue
                
                if not is_text_file(file):
                    continue

                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, PROJECT_ROOT)
                
                # Normalize path separators to forward slashes for consistency
                relative_path = relative_path.replace("\\", "/")

                try:
                    with open(file_path, "r", encoding="utf-8") as infile:
                        content = infile.read()
                        
                        # Write the file header and content
                        outfile.write(f"### `/{relative_path}`\n\n")
                        outfile.write(content)
                        outfile.write("\n\n\n--- \n\n")
                        
                        print(f"✅ Added: {relative_path}")
                        file_count += 1
                except Exception as e:
                    print(f"⚠️  Skipped {relative_path} (Error reading file)")

    print("=" * 50)
    print(f"🎉 Success! Aggregated {file_count} files.")
    print(f"📄 Output saved to: {os.path.join(PROJECT_ROOT, OUTPUT_FILE)}")

if __name__ == "__main__":
    aggregate_files()