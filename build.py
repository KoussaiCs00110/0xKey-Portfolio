import os
import hashlib

def main():
    # 1. Try to read from environment variables (first priority, e.g., Netlify dashboard)
    admin_user = os.environ.get("ADMIN_USER")
    admin_pass = os.environ.get("ADMIN_PASS")

    # 2. If not found in environment, try to read from .env file
    if not admin_user or not admin_pass:
        env_path = ".env"
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k == "ADMIN_USER":
                            admin_user = v
                        elif k == "ADMIN_PASS":
                            admin_pass = v

    # 3. Fallback to default if absolutely nothing is provided (for local testing/robustness)
    if not admin_user:
        admin_user = "0xKeyAdmin"
    
    if admin_pass:
        # Calculate SHA-256 hash of the password
        admin_hash = hashlib.sha256(admin_pass.encode("utf-8")).hexdigest()
    else:
        # Default hash for 0xKey@2026
        admin_hash = "e66d6ee9eec41bb7a3345da0cd326e53c9a89a23091bfc36d2a77aba06c13824"

    # 4. Generate the admin_config.js file
    config_content = f"""// Generated dynamically by build.py. Do not modify directly.
window.ADMIN_USER = {repr(admin_user)};
window.ADMIN_HASH = {repr(admin_hash)};
"""
    with open("admin_config.js", "w", encoding="utf-8") as f:
        f.write(config_content)
    
    print(f"Successfully generated admin_config.js. Username: {admin_user}, Hash: {admin_hash}")

if __name__ == "__main__":
    main()
