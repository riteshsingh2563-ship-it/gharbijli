import zipfile
import os
import shutil
import subprocess

src_apk = "D:/projects/gharbijli/android/app/build/outputs/apk/debug/app-debug.apk"
out_apk = "D:/projects/gharbijli/android/app/build/outputs/apk/debug/app-temp.apk"
www_dir = "D:/projects/gharbijli/www"
desktop_dest = "C:/Users/ritesh singh/Desktop/GharBijli_App/GharBijli.apk"
keystore_path = "C:/Users/ritesh singh/.android/debug.keystore"
jarsigner_path = "D:/tools/jdk-21.0.13+9/bin/jarsigner.exe"

print(f"Reading {src_apk}...")
with zipfile.ZipFile(src_apk, 'r') as zin, zipfile.ZipFile(out_apk, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        filename = item.filename
        # Skip old signature files
        if filename.startswith("META-INF/"):
            continue
        # Keep cordova files if they were in assets/public/
        if filename in ["assets/public/cordova.js", "assets/public/cordova_plugins.js"]:
            zout.writestr(item, zin.read(filename))
            continue
        # Skip any other assets/public/ files because we will add latest from www/
        if filename.startswith("assets/public/"):
            continue
        # Write all other classes.dex, res, AndroidManifest, assets/capacitor etc.
        zout.writestr(item, zin.read(filename))
    
    # Now write all files from www_dir into assets/public/
    print("Injecting latest www files...")
    for root, dirs, files in os.walk(www_dir):
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, www_dir).replace("\\", "/")
            arcname = f"assets/public/{rel_path}"
            zout.write(full_path, arcname)
            print(f"  + {arcname}")

print(f"New APK created at {out_apk}. Signing with jarsigner...")
cmd = [
    jarsigner_path,
    "-sigalg", "SHA256withRSA",
    "-digestalg", "SHA-256",
    "-keystore", keystore_path,
    "-storepass", "android",
    "-keypass", "android",
    out_apk,
    "androiddebugkey"
]

result = subprocess.run(cmd, capture_output=True, text=True)
print("jarsigner output:", result.stdout)
if result.returncode != 0:
    print("jarsigner error:", result.stderr)
    exit(1)

# Verify with jarsigner -verify
verify_cmd = [jarsigner_path, "-verify", out_apk]
verify_res = subprocess.run(verify_cmd, capture_output=True, text=True)
print("Verify:", verify_res.stdout)

# Replace target APK
shutil.copyfile(out_apk, src_apk)
os.remove(out_apk)

# Copy to Desktop folder
os.makedirs(os.path.dirname(desktop_dest), exist_ok=True)
shutil.copyfile(src_apk, desktop_dest)
print(f"[SUCCESS] Updated APK copied to: {desktop_dest}")
