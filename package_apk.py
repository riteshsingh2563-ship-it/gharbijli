import zipfile
import os
import shutil
import subprocess

src_apk = "D:/projects/gharbijli/android/app/build/outputs/apk/debug/app-debug.apk"
out_apk = "D:/projects/gharbijli/android/app/build/outputs/apk/debug/app-temp.apk"
www_dir = "D:/projects/gharbijli/www"
desktop_dest = "C:/Users/ritesh singh/Desktop/GharBijli_App/GharBijli.apk"
project_apk = "D:/projects/gharbijli/GharBijli.apk"
java_path = "D:/tools/jdk-21.0.13+9/bin/java.exe"
signer_jar = "D:/tools/uber-apk-signer.jar"

print(f"Reading base APK from {src_apk}...")
with zipfile.ZipFile(src_apk, 'r') as zin, zipfile.ZipFile(out_apk, 'w') as zout:
    for item in zin.infolist():
        filename = item.filename
        # Strip old signatures
        if filename.startswith("META-INF/"):
            continue
        # Strip any recursive or unwanted files from assets/public/
        if filename.startswith("assets/public/"):
            # Only keep cordova base files if present
            if filename in ["assets/public/cordova.js", "assets/public/cordova_plugins.js"]:
                zout.writestr(item, zin.read(filename))
            continue
        
        # Copy original framework files (dex, resources.arsc, AndroidManifest, res/)
        zout.writestr(item, zin.read(filename))
    
    # Inject latest clean www customer app files into assets/public/
    print("Injecting latest customer app www files...")
    ignore_files = {"admin.html", "GharBijli.apk", ".DS_Store", "Thumbs.db"}
    for root, dirs, files in os.walk(www_dir):
        for f in files:
            if f in ignore_files or f.endswith(".apk"):
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, www_dir).replace("\\", "/")
            arcname = f"assets/public/{rel_path}"
            
            # Use compression for text, stored for images/binary if needed
            compress = zipfile.ZIP_DEFLATED
            zout.write(full_path, arcname, compress_type=compress)
            print(f"  + {arcname}")

print(f"New base archive assembled at {out_apk}.")
shutil.copyfile(out_apk, src_apk)
os.remove(out_apk)

# Run uber-apk-signer for 4-byte zipalign and APK Signature Scheme v2 + v3
print("Running uber-apk-signer (zipalign + v2/v3 signing)...")
cmd = [
    java_path,
    "-jar", signer_jar,
    "-a", src_apk,
    "--allowResign",
    "--overwrite",
    "--verbose"
]

res = subprocess.run(cmd, capture_output=True, text=True)
print(res.stdout)
if res.returncode != 0:
    print("Signer Error:", res.stderr)
    exit(1)

# Deploy to Desktop and project root
os.makedirs(os.path.dirname(desktop_dest), exist_ok=True)
shutil.copyfile(src_apk, desktop_dest)
shutil.copyfile(src_apk, project_apk)

size_mb = os.path.getsize(desktop_dest) / (1024 * 1024)
print(f"[SUCCESS] 100% Android-compliant v2/v3 signed APK ready: {desktop_dest} ({size_mb:.2f} MB)")
