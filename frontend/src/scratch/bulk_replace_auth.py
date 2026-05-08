import os

def replace_in_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace("useStaffAuth", "useAuth")
    new_content = new_content.replace("../contexts/StaffAuthContext", "../contexts/AuthContext")
    new_content = new_content.replace("./contexts/StaffAuthContext", "./contexts/AuthContext")
    new_content = new_content.replace("../../contexts/StaffAuthContext", "../../contexts/AuthContext")
    
    if content != new_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {file_path}")

def main():
    src_dir = r"c:\Users\panda\OneDrive\Desktop\Projects\HTCMS\frontend\src"
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith((".jsx", ".js")):
                replace_in_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
