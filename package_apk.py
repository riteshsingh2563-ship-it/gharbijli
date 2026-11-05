import zipfile
import os
import shutil
import subprocess

base_template = "D:/projects/gharbijli/android/app/build/outputs/apk/debug/app-debug.apk"
unaligned_apk = "D:/projects/gharbijli/android/app/build/outputs/apk/debug/app-unaligned.apk"
aligned_apk = "D:/projects/gharbijli/android/app/build/outputs/apk/debug/app-aligned.apk"
final_apk = "D:/projects/gharbijli/android/app/build/outputs/apk/debug/GharBijli_Production.apk"

www_dir = "D:/projects/gharbijli/www"
desktop_dest = "C:/Users/ritesh singh/Desktop/GharBijli_App/GharBijli.apk"
project_apk = "D:/projects/gharbijli/GharBijli.apk"
www_apk = "D:/projects/gharbijli/www/GharBijli.apk"

java_path = "D:/tools/jdk-21.0.13+9/bin/java.exe"
signer_jar = "D:/tools/uber-apk-signer.jar"
zipalign_exe = "D:/tools/bin/win-zipalign_33_0_2.exe"
keystore_path = "C:/Users/ritesh singh/.android/debug.keystore"

print(f"[1/5] Building clean unaligned APK from base: {base_template}...")
if os.path.exists(unaligned_apk):
    os.remove(unaligned_apk)

with zipfile.ZipFile(base_template, 'r') as zin, zipfile.ZipFile(unaligned_apk, 'w') as zout:
    for item in zin.infolist():
        fn = item.filename
        # Strip all signature blocks and manifests - apksigner creates pristine ones
        if fn.startswith("META-INF/"):
            continue
        # Strip existing assets/public files to replace with latest clean customer files
        if fn.startswith("assets/public/"):
            if fn in ["assets/public/cordova.js", "assets/public/cordova_plugins.js"]:
                zout.writestr(item, zin.read(fn))
            continue
        
        # Keep everything else (classes.dex, resources.arsc, res, AndroidManifest, assets/capacitor)
        zout.writestr(item, zin.read(fn))
    
    # Inject latest www files
    print("  + Injecting latest www files into assets/public/...")
    ignore_files = {"admin.html", "GharBijli.apk", ".DS_Store", "Thumbs.db"}
    for root, dirs, files in os.walk(www_dir):
        for f in files:
            if f in ignore_files or f.endswith(".apk"):
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, www_dir).replace("\\", "/")
            arcname = f"assets/public/{rel_path}"
            
            compress = zipfile.ZIP_DEFLATED
            zout.write(full_path, arcname, compress_type=compress)

print(f"[2/5] Running 4-byte zipalign via {zipalign_exe}...")
if os.path.exists(aligned_apk):
    os.remove(aligned_apk)

zipalign_cmd = [
    zipalign_exe,
    "-p", "-f", "4",
    unaligned_apk,
    aligned_apk
]
res = subprocess.run(zipalign_cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("Zipalign error:", res.stderr)
    exit(1)

# Verify zipalign
verify_align_cmd = [zipalign_exe, "-c", "4", aligned_apk]
res = subprocess.run(verify_align_cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("Zipalign verify failed:", res.stderr)
    exit(1)
print("  [OK] 4-byte zipalign verified successfully!")

print(f"[3/5] Signing with official Google Android ApkSignerTool (v1 + v2 + v3)...")
if os.path.exists(final_apk):
    os.remove(final_apk)

sign_cmd = [
    java_path,
    "-cp", signer_jar,
    "com.android.apksigner.ApkSignerTool",
    "sign",
    "--ks", keystore_path,
    "--ks-pass", "pass:android",
    "--ks-key-alias", "androiddebugkey",
    "--key-pass", "pass:android",
    "--v1-signing-enabled", "true",
    "--v2-signing-enabled", "true",
    "--v3-signing-enabled", "true",
    "--out", final_apk,
    aligned_apk
]

res = subprocess.run(sign_cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("ApkSigner error:", res.stderr)
    exit(1)
print("  [OK] Signed successfully!")

print(f"[4/5] Running rigorous Android multi-scheme signature verification...")
verify_sign_cmd = [
    java_path,
    "-cp", signer_jar,
    "com.android.apksigner.ApkSignerTool",
    "verify",
    "--verbose",
    "--min-sdk-version", "19",
    final_apk
]
res = subprocess.run(verify_sign_cmd, capture_output=True, text=True)
print(res.stdout)
if "Verifies" not in res.stdout:
    print("APK Verification Failed!")
    exit(1)

print(f"[5/5] Deploying production verified APK...")
os.makedirs(os.path.dirname(desktop_dest), exist_ok=True)
shutil.copyfile(final_apk, desktop_dest)
shutil.copyfile(final_apk, project_apk)
shutil.copyfile(final_apk, www_apk)

# Clean up temp files
if os.path.exists(unaligned_apk): os.remove(unaligned_apk)
if os.path.exists(aligned_apk): os.remove(aligned_apk)

size_mb = os.path.getsize(desktop_dest) / (1024 * 1024)
print(f"============================================================")
print(f"[SUCCESS] GharBijli APK is 100% Android-compliant & Verified!")
print(f"Path: {desktop_dest} ({size_mb:.2f} MB)")
print(f"Path: {project_apk}")
print(f"Path: {www_apk}")
print(f"============================================================")
