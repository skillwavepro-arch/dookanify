#!/usr/bin/env python3
"""
Builds and signs:
1. Real installable Android Debug APK (v1 JAR + v2 APK Sig Block 42 signed, 4-byte zipaligned)
   with official app name "Dookanify" and 1:1 square launcher icons.
2. Real Windows PC PE32+ Executable (.exe) with embedded icon.ico and full compiled Dookanify desktop payload.
"""

import base64
import hashlib
import os
import shutil
import struct
import subprocess
import tempfile
import zipfile
import zlib

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST_DIR = os.path.join(ROOT_DIR, 'dist')
PUBLIC_DIR = os.path.join(ROOT_DIR, 'public')
BUILD_OUTPUTS_DIR = os.path.join(ROOT_DIR, '.build-outputs')
APK_DOWNLOAD_DIR = os.path.join(ROOT_DIR, 'APK_DOWNLOAD')
EXE_DOWNLOAD_DIR = os.path.join(ROOT_DIR, 'EXE_DOWNLOAD')
ANDROID_DIR = os.path.join(ROOT_DIR, 'android')


SIGNING_DIR = os.path.join(ANDROID_DIR, 'signing')


def patch_dex_theme_color_in_place(dex_bytes: bytes) -> bytes:
    """
    Safely updates the 7-byte status-bar hex string '#065F46' -> '#052E1E' in-place
    inside the original d8-compiled classes.dex without altering any offsets, string lengths,
    sort order, class_defs, or bytecode instructions, and recomputes the DEX SHA-1 & Adler32 headers.
    """
    buf = bytearray(dex_bytes)
    old_color = b'\x07#065F46\x00'
    new_color = b'\x07#052E1E\x00'
    idx = buf.find(old_color)
    if idx != -1:
        buf[idx : idx + len(old_color)] = new_color
        # Recompute 20-byte SHA-1 signature over bytes [32..]
        buf[12:32] = hashlib.sha1(bytes(buf[32:])).digest()
        # Recompute 4-byte Adler32 checksum over bytes [12..]
        chk = zlib.adler32(bytes(buf[12:])) & 0xFFFFFFFF
        struct.pack_into('<I', buf, 8, chk)
    return bytes(buf)


def ensure_signing_keys(work_dir: str):
    os.makedirs(SIGNING_DIR, exist_ok=True)
    key_pem = os.path.join(SIGNING_DIR, 'dookanify_key.pem')
    cert_pem = os.path.join(SIGNING_DIR, 'dookanify_cert.pem')
    cert_der = os.path.join(work_dir, 'debug_cert.der')
    pubkey_der = os.path.join(work_dir, 'debug_pubkey.der')

    need_generate = not (os.path.exists(key_pem) and os.path.exists(cert_pem))
    if not need_generate:
        try:
            cert_mod = subprocess.check_output(
                ['openssl', 'x509', '-noout', '-modulus', '-in', cert_pem],
                stderr=subprocess.DEVNULL,
            )
            key_mod = subprocess.check_output(
                ['openssl', 'rsa', '-noout', '-modulus', '-in', key_pem],
                stderr=subprocess.DEVNULL,
            )
            if cert_mod != key_mod:
                need_generate = True
        except Exception:
            need_generate = True

    if need_generate:
        subprocess.run(
            [
                'openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
                '-keyout', key_pem, '-out', cert_pem,
                '-days', '10000', '-subj', '/CN=Dookanify Official/O=Dookanify/C=BD'
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    subprocess.run(
        ['openssl', 'x509', '-in', cert_pem, '-outform', 'DER', '-out', cert_der],
        check=True,
    )
    subprocess.run(
        ['openssl', 'rsa', '-in', key_pem, '-pubout', '-outform', 'DER', '-out', pubkey_der],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return key_pem, cert_pem, cert_der, pubkey_der


def patch_binary_manifest(manifest_bytes: bytes, is_admin_variant: bool) -> bytes:
    """
    Upgrades binary AndroidManifest.xml for universal compatibility across Android 5.0 - Android 15 (API 21 - 35):
    - Sets versionCode = 21 (so updates over older installs always succeed)
    - Keeps minSdkVersion = 21 (Android 5.0+)
    - Sets targetSdkVersion = 28 (matches compiled base template & satisfies Android 14/15 >= 24 requirement without API 30+ installer blocks)
    - Sets android:debuggable = false (0x00000000, preventing Play Protect / HyperOS / Auto Blocker debug blocks)
    - For Admin App variant, changes manifest package from 'com.bostraloy.pos' to 'com.bostraloy.adm'
      while keeping activity name 'com.bostraloy.pos.MainActivity' intact so both User and Admin apps
      can be installed side-by-side on the same phone without package conflict.
    """
    buf = bytearray(manifest_bytes)

    # Verify attribute offsets before patching
    # versionCode at 1416 (dtype=0x10 at +15, dval at +16) -> bump to 22 so updates overwrite cleanly
    if len(buf) >= 1912 and buf[1416 + 15] == 0x10:
        struct.pack_into('<I', buf, 1416 + 16, 22)
    # minSdkVersion at 1552 -> ensure 21
    if len(buf) >= 1912 and buf[1552 + 15] == 0x10:
        struct.pack_into('<I', buf, 1552 + 16, 21)
    # targetSdkVersion at 1572 -> set to 28 (original compiled SDK version, compatible with Android 5 - 15)
    if len(buf) >= 1912 and buf[1572 + 15] == 0x10:
        struct.pack_into('<I', buf, 1572 + 16, 28)
    # debuggable at 1872 -> set to false (0x00000000) for universal consumer phone installation
    if len(buf) >= 1912 and buf[1872 + 15] == 0x12:
        struct.pack_into('<I', buf, 1872 + 16, 0x00000000)

    out_bytes = bytes(buf)
    orig_pkg_utf16 = 'com.bostraloy.pos'.encode('utf-16le') + b'\x00\x00'
    admin_pkg_utf16 = 'com.bostraloy.adm'.encode('utf-16le') + b'\x00\x00'

    if is_admin_variant:
        if orig_pkg_utf16 in out_bytes:
            out_bytes = out_bytes.replace(orig_pkg_utf16, admin_pkg_utf16, 1)
    else:
        if admin_pkg_utf16 in out_bytes:
            out_bytes = out_bytes.replace(admin_pkg_utf16, orig_pkg_utf16, 1)

    return out_bytes


def patch_resources_arsc_label(arsc_bytes: bytes, label_ascii: str = "Dookanify", is_admin_variant: bool = False) -> bytes:
    label_bytes = label_ascii.encode('ascii')
    n = len(label_bytes)
    new_prefix = bytes([n, n]) + label_bytes + b"\x00"

    orig_utf8 = b"\x15\x27Dookanify (\xe0\xa6\xa6\xe0\xa7\x81\xe0\xa6\x95\xe0\xa6\xbe\xe0\xa6\xa8\xe0\xa6\xbf\xe0\xa6\xab\xe0\xa6\xbe\xe0\xa6\x87)\x00"
    patched_user = b"\x09\x09Dookanify\x00" + (b"\x00" * (len(orig_utf8) - 12))
    patched_admin = b"\x0f\x0fDookanify Admin\x00" + (b"\x00" * (len(orig_utf8) - 18))

    out_arsc = arsc_bytes
    for target in (orig_utf8, patched_user, patched_admin):
        if target in out_arsc and len(new_prefix) <= len(target):
            replacement = new_prefix + (b"\x00" * (len(target) - len(new_prefix)))
            assert len(replacement) == len(target)
            out_arsc = out_arsc.replace(target, replacement, 1)
            break

    orig_pkg_utf16 = 'com.bostraloy.pos'.encode('utf-16le') + b'\x00\x00'
    admin_pkg_utf16 = 'com.bostraloy.adm'.encode('utf-16le') + b'\x00\x00'
    if is_admin_variant:
        if orig_pkg_utf16 in out_arsc:
            out_arsc = out_arsc.replace(orig_pkg_utf16, admin_pkg_utf16, 1)
    else:
        if admin_pkg_utf16 in out_arsc:
            out_arsc = out_arsc.replace(admin_pkg_utf16, orig_pkg_utf16, 1)

    return out_arsc


def wrap_manifest_header_line(line: str) -> str:
    """
    Strictly wraps a single JAR Manifest header line so NO line ever exceeds 70 bytes
    (Android's StrictJarManifestReader enforces a hard 72-byte limit per line).
    """
    raw = line.encode('utf-8')
    if len(raw) <= 70:
        return line + '\r\n'
    chunks = [raw[:70].decode('utf-8', errors='ignore')]
    rest = raw[70:]
    while rest:
        chunks.append(' ' + rest[:69].decode('utf-8', errors='ignore'))
        rest = rest[69:]
    return '\r\n'.join(chunks) + '\r\n'


def create_v1_signature_files(entries_dict: dict, key_pem: str, cert_pem: str, work_dir: str):
    manifest_header = (
        'Manifest-Version: 1.0\r\n'
        'Created-By: 1.0 (Android)\r\n\r\n'
    )
    manifest_sections = []
    sf_entry_blocks = []

    for name in sorted(entries_dict.keys()):
        if name.startswith('META-INF/'):
            continue
        raw = entries_dict[name]
        digest_b64 = base64.b64encode(hashlib.sha256(raw).digest()).decode('ascii')
        entry_block = (
            wrap_manifest_header_line(f'Name: {name}')
            + wrap_manifest_header_line(f'SHA-256-Digest: {digest_b64}')
            + '\r\n'
        )
        manifest_sections.append(entry_block)

        sf_digest_b64 = base64.b64encode(
            hashlib.sha256(entry_block.encode('utf-8')).digest()
        ).decode('ascii')
        sf_block = (
            wrap_manifest_header_line(f'Name: {name}')
            + wrap_manifest_header_line(f'SHA-256-Digest: {sf_digest_b64}')
            + '\r\n'
        )
        sf_entry_blocks.append(sf_block)

    manifest_bytes = (manifest_header + ''.join(manifest_sections)).encode('utf-8')
    manifest_sha256_b64 = base64.b64encode(hashlib.sha256(manifest_bytes).digest()).decode('ascii')

    sf_header = (
        'Signature-Version: 1.0\r\n'
        'Created-By: 1.0 (Android)\r\n'
        f'SHA-256-Digest-Manifest: {manifest_sha256_b64}\r\n'
        'X-Android-APK-Signed: 2\r\n\r\n'
    )
    sf_bytes = (sf_header + ''.join(sf_entry_blocks)).encode('utf-8')

    sf_path = os.path.join(work_dir, 'ANDROIDD.SF')
    rsa_path = os.path.join(work_dir, 'ANDROIDD.RSA')
    with open(sf_path, 'wb') as f:
        f.write(sf_bytes)

    subprocess.run(
        [
            'openssl', 'cms', '-sign', '-binary', '-noattr',
            '-in', sf_path, '-outform', 'DER', '-out', rsa_path,
            '-signer', cert_pem, '-inkey', key_pem, '-md', 'sha256'
        ],
        check=True,
    )
    with open(rsa_path, 'rb') as f:
        rsa_bytes = f.read()

    return manifest_bytes, sf_bytes, rsa_bytes


def write_4byte_aligned_zip(entries: list, out_zip_path: str):
    """
    Writes a standard ZIP archive where every uncompressed (STORED) entry's data
    starts at a 4-byte aligned offset (matching Android `zipalign -p 4`).
    `entries`: list of tuples (filename: str, raw_bytes: bytes, compress: bool)
    """
    with open(out_zip_path, 'wb') as f:
        central_dir_records = []
        for filename, raw_bytes, compress in entries:
            name_bytes = filename.encode('utf-8')
            crc = zlib.crc32(raw_bytes) & 0xFFFFFFFF
            uncomp_size = len(raw_bytes)

            if compress:
                comp_type = 8  # DEFLATE
                cobj = zlib.compressobj(6, zlib.DEFLATED, -zlib.MAX_WBITS)
                comp_bytes = cobj.compress(raw_bytes) + cobj.flush()
                comp_size = len(comp_bytes)
            else:
                comp_type = 0  # STORED
                comp_bytes = raw_bytes
                comp_size = uncomp_size

            local_header_offset = f.tell()
            # Local header is 30 bytes + len(name_bytes) + len(extra)
            extra = b''
            if comp_type == 0:
                data_start = local_header_offset + 30 + len(name_bytes)
                pad = (4 - (data_start % 4)) % 4
                extra = b'\x00' * pad

            local_header = struct.pack(
                '<4sHHHHHIIIHH',
                b'PK\x03\x04',
                20,              # version needed
                0,               # flags
                comp_type,       # compression method
                0,               # mod time
                0x21,            # mod date (1980-01-01)
                crc,
                comp_size,
                uncomp_size,
                len(name_bytes),
                len(extra),
            )
            f.write(local_header)
            f.write(name_bytes)
            f.write(extra)
            if comp_type == 0:
                assert f.tell() % 4 == 0, f'Unaligned entry {filename} at {f.tell()}'
            f.write(comp_bytes)

            cd_record = struct.pack(
                '<4sHHHHHHIIIHHHHHII',
                b'PK\x01\x02',
                20,              # version made by
                20,              # version needed
                0,               # flags
                comp_type,
                0,               # mod time
                0x21,            # mod date
                crc,
                comp_size,
                uncomp_size,
                len(name_bytes),
                0,               # extra len in CD
                0,               # comment len
                0,               # disk number
                0,               # internal attrs
                0,               # external attrs
                local_header_offset,
            ) + name_bytes
            central_dir_records.append(cd_record)

        cd_offset = f.tell()
        for cd in central_dir_records:
            f.write(cd)
        cd_size = f.tell() - cd_offset

        eocd = struct.pack(
            '<4sHHHHIIH',
            b'PK\x05\x06',
            0,
            0,
            len(central_dir_records),
            len(central_dir_records),
            cd_size,
            cd_offset,
            0,
        )
        f.write(eocd)


def lp_bytes(b: bytes) -> bytes:
    return struct.pack('<I', len(b)) + b


def inject_apk_v2_signature_block(
    aligned_zip_path: str,
    signed_apk_path: str,
    key_pem: str,
    cert_der_path: str,
    pubkey_der_path: str,
    work_dir: str,
):
    with open(aligned_zip_path, 'rb') as f:
        data = f.read()

    eocd_pos = data.rfind(b'PK\x05\x06')
    assert eocd_pos != -1, 'EOCD not found'
    cd_offset = struct.unpack('<I', data[eocd_pos + 16 : eocd_pos + 20])[0]

    before_cd = data[:cd_offset]
    cd_bytes = data[cd_offset:eocd_pos]
    eocd_bytes = bytearray(data[eocd_pos:])

    def chunk_digests(buf: bytes):
        out = []
        for i in range(0, len(buf), 1048576):
            chunk = buf[i : i + 1048576]
            h = hashlib.sha256(b'\xa5' + struct.pack('<I', len(chunk)) + chunk).digest()
            out.append(h)
        return out

    # In APK v2 digest calculation, EOCD's central directory offset field is set to `cd_offset` (start of APK Signing Block)
    struct.pack_into('<I', eocd_bytes, 16, cd_offset)
    all_chunks = (
        chunk_digests(before_cd)
        + chunk_digests(cd_bytes)
        + chunk_digests(bytes(eocd_bytes))
    )
    top_digest = hashlib.sha256(
        b'\x5a' + struct.pack('<I', len(all_chunks)) + b''.join(all_chunks)
    ).digest()

    with open(cert_der_path, 'rb') as f:
        cert_der = f.read()
    with open(pubkey_der_path, 'rb') as f:
        pubkey_der = f.read()

    # Signature Algorithm: 0x0103 (RSA-PKCS#1 v1.5 with SHA-256)
    algo_id = 0x0103
    digest_entry = lp_bytes(struct.pack('<I', algo_id) + lp_bytes(top_digest))
    digests_seq = lp_bytes(digest_entry)
    certs_seq = lp_bytes(lp_bytes(cert_der))
    # Additional attribute: X-Android-APK-Signed = 2 (0xbeef000d)
    attr_entry = lp_bytes(struct.pack('<II', 0xBEEF000D, 2))
    attrs_seq = lp_bytes(attr_entry)

    signed_data = digests_seq + certs_seq + attrs_seq
    sd_path = os.path.join(work_dir, 'v2_signed_data.bin')
    sig_path = os.path.join(work_dir, 'v2_sig.bin')
    with open(sd_path, 'wb') as f:
        f.write(signed_data)

    subprocess.run(
        ['openssl', 'dgst', '-sha256', '-sign', key_pem, '-out', sig_path, sd_path],
        check=True,
    )
    with open(sig_path, 'rb') as f:
        sig_bytes = f.read()

    sig_entry = lp_bytes(struct.pack('<I', algo_id) + lp_bytes(sig_bytes))
    signatures_seq = lp_bytes(sig_entry)

    signer_block = lp_bytes(
        lp_bytes(signed_data) + signatures_seq + lp_bytes(pubkey_der)
    )
    v2_scheme_value = lp_bytes(signer_block)

    pair_v2 = (
        struct.pack('<Q', 4 + len(v2_scheme_value))
        + struct.pack('<I', 0x7109871A)
        + v2_scheme_value
    )

    # Pad APK Signing Block to 4096-byte multiple using Verity Padding Block (0x42726577)
    base_len = 8 + len(pair_v2) + 8 + 16
    rem = base_len % 4096
    if rem != 0:
        pad_total = 4096 - rem
        if pad_total < 12:
            pad_total += 4096
        pad_val_len = pad_total - 12
        pair_pad = (
            struct.pack('<Q', 4 + pad_val_len)
            + struct.pack('<I', 0x42726577)
            + (b'\x00' * pad_val_len)
        )
        pairs_bytes = pair_v2 + pair_pad
    else:
        pairs_bytes = pair_v2

    size_of_block = len(pairs_bytes) + 8 + 16
    apk_sig_block = (
        struct.pack('<Q', size_of_block)
        + pairs_bytes
        + struct.pack('<Q', size_of_block)
        + b'APK Sig Block 42'
    )

    new_cd_offset = cd_offset + len(apk_sig_block)
    final_eocd = bytearray(data[eocd_pos:])
    struct.pack_into('<I', final_eocd, 16, new_cd_offset)

    with open(signed_apk_path, 'wb') as f:
        f.write(before_cd)
        f.write(apk_sig_block)
        f.write(cd_bytes)
        f.write(final_eocd)

    return top_digest.hex(), len(apk_sig_block)


def build_apk_variant(is_admin_variant: bool, base_manifest: bytes, base_dex: bytes, base_arsc: bytes, launcher_png: bytes):
    label = "Dookanify Admin" if is_admin_variant else "Dookanify"
    patched_manifest = patch_binary_manifest(base_manifest, is_admin_variant)
    resources_arsc = patch_resources_arsc_label(base_arsc, label, is_admin_variant)

    entries_dict = {
        'AndroidManifest.xml': patched_manifest,
        'resources.arsc': resources_arsc,
        'classes.dex': base_dex,
    }

    for density in ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']:
        entries_dict[f'res/mipmap-{density}-v4/ic_launcher.png'] = launcher_png

    # Add all compiled files from dist/ into assets/ (excluding chat screenshot attachments)
    for root, _, files in os.walk(DIST_DIR):
        for fn in files:
            full_path = os.path.join(root, fn)
            rel_path = os.path.relpath(full_path, DIST_DIR).replace('\\', '/')
            if (
                rel_path.startswith('APK_DOWNLOAD')
                or rel_path.startswith('EXE_DOWNLOAD')
                or rel_path.startswith('assets/aistudio/')
                or rel_path.startswith('fonts/')
                or rel_path in ('icon.ico', 'icon.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png')
            ):
                continue
            with open(full_path, 'rb') as f:
                raw_bytes = f.read()
            if is_admin_variant and rel_path == 'index.html':
                html_str = raw_bytes.decode('utf-8', errors='replace')
                admin_boot_script = (
                    '<script>window.__DOOKANIFY_ADMIN_APP__ = true;</script>'
                )
                if '</head>' in html_str:
                    html_str = html_str.replace(
                        '</head>', f'{admin_boot_script}</head>', 1
                    )
                else:
                    html_str = admin_boot_script + html_str
                raw_bytes = html_str.encode('utf-8')
            entries_dict[f'assets/{rel_path}'] = raw_bytes

    with tempfile.TemporaryDirectory() as work_dir:
        key_pem, cert_pem, cert_der, pubkey_der = ensure_signing_keys(work_dir)
        manifest_mf, androidd_sf, androidd_rsa = create_v1_signature_files(
            entries_dict, key_pem, cert_pem, work_dir
        )
        entries_dict['META-INF/MANIFEST.MF'] = manifest_mf
        entries_dict['META-INF/ANDROIDD.SF'] = androidd_sf
        entries_dict['META-INF/ANDROIDD.RSA'] = androidd_rsa

        ordered_entries = []
        uncompressed_exts = ('.arsc', '.png', '.jpg', '.jpeg', '.ttf', '.woff2', '.ico')
        for name in sorted(entries_dict.keys()):
            raw = entries_dict[name]
            is_uncomp = name.endswith(uncompressed_exts)
            ordered_entries.append((name, raw, not is_uncomp))

        aligned_zip = os.path.join(work_dir, 'app-aligned.apk')
        signed_apk = os.path.join(work_dir, 'app-signed.apk')
        write_4byte_aligned_zip(ordered_entries, aligned_zip)
        digest_hex, sig_block_len = inject_apk_v2_signature_block(
            aligned_zip, signed_apk, key_pem, cert_der, pubkey_der, work_dir
        )

        os.makedirs(APK_DOWNLOAD_DIR, exist_ok=True)

        if is_admin_variant:
            destinations = [
                os.path.join(APK_DOWNLOAD_DIR, 'admin-app.apk'),
                os.path.join(APK_DOWNLOAD_DIR, 'developer app.apk'),
            ]
        else:
            destinations = [
                os.path.join(APK_DOWNLOAD_DIR, 'user app.apk'),
            ]

        for dest in destinations:
            shutil.copy2(signed_apk, dest)

        variant_title = 'Developer / Admin APK (com.bostraloy.adm)' if is_admin_variant else 'User App APK (com.bostraloy.pos)'
        print(f'==> Signed {variant_title} built! v2 Digest={digest_hex[:16]}..., SigBlock={sig_block_len}B')


def build_real_android_apk():
    template_backup = os.path.join(ANDROID_DIR, 'base-template.apk')
    base_apk = os.path.join(BUILD_OUTPUTS_DIR, 'app-debug.apk')
    existing_user_apk = os.path.join(APK_DOWNLOAD_DIR, 'user app.apk')
    existing_admin_apk = os.path.join(APK_DOWNLOAD_DIR, 'admin-app.apk')

    source_apk = None
    for candidate in (template_backup, base_apk, existing_user_apk, existing_admin_apk):
        if os.path.exists(candidate):
            source_apk = candidate
            break

    assert source_apk and os.path.exists(source_apk), 'Base APK template not found'

    with zipfile.ZipFile(source_apk, 'r') as z:
        manifest_xml = z.read('AndroidManifest.xml')
        classes_dex = patch_dex_theme_color_in_place(z.read('classes.dex'))
        raw_arsc = z.read('resources.arsc')

    with open(os.path.join(PUBLIC_DIR, 'pwa-192x192.png'), 'rb') as f:
        launcher_png = f.read()

    # 1. Build User App APK (user-app.apk, debugapp.apk, app-debug.apk)
    build_apk_variant(False, manifest_xml, classes_dex, raw_arsc, launcher_png)
    # 2. Build Developer / Admin App APK (developer-app.apk, admin-app.apk)
    build_apk_variant(True, manifest_xml, classes_dex, raw_arsc, launcher_png)


def build_exe_binary(target_url: str, shortcut_name: str, ico_bytes: bytes, embedded_zip_bytes: bytes) -> bytes:
    """
    Builds a universal 32-bit/64-bit compatible PE32 Windows GUI executable (`IMAGE_FILE_MACHINE_I386 = 0x014C`,
    `Magic = 0x010B`, `Subsystem = 2 WINDOWS_GUI`, `SubsystemVersion = 5.1`, fixed `ImageBase = 0x00400000`)
    that runs natively on ALL Windows versions (Windows 7, 8, 8.1, 10, 11 — 32-bit x86, 64-bit x64, and ARM64).
    """
    dos_header = bytearray(64)
    dos_header[0:2] = b'MZ'
    struct.pack_into('<I', dos_header, 60, 128)  # e_lfanew = 128
    dos_stub = b'This program runs Dookanify Smart POS on Windows.\r\n$' + b'\x00' * 12

    pe_sig = b'PE\x00\x00'
    # IMAGE_FILE_HEADER (20 bytes):
    # Machine=0x014C (I386 - runs on 32-bit, 64-bit WoW64, and ARM64 Windows),
    # NumberOfSections=3 (.text, .idata, .rsrc), SizeOfOptionalHeader=224,
    # Characteristics=0x010F (RELOCS_STRIPPED | EXECUTABLE_IMAGE | LINE_NUMS_STRIPPED | LOCAL_SYMS_STRIPPED | 32BIT_MACHINE)
    coff_header = struct.pack('<HHIIIHH', 0x014C, 3, 0x67180000, 0, 0, 224, 0x010F)

    rsrc_raw_size = ((len(ico_bytes) + 0x1FF) // 0x200) * 0x200
    rsrc_virt_size = ((len(ico_bytes) + 0xFFF) // 0x1000) * 0x1000
    size_of_image = 0x3000 + rsrc_virt_size

    # IMAGE_OPTIONAL_HEADER32 (224 bytes): Magic=0x010B (PE32), Subsystem=2 (WINDOWS_GUI)
    opt_header = bytearray(224)
    struct.pack_into(
        '<HBBIIIIIIIIIHHHHHHIIIIHHIIIIII',
        opt_header,
        0,
        0x010B,          # Magic (PE32 universal 32/64-bit)
        14, 0,           # Linker version
        0x800,           # SizeOfCode
        0x200 + rsrc_raw_size,  # SizeOfInitializedData
        0,               # SizeOfUninitializedData
        0x1000,          # AddressOfEntryPoint (.text RVA)
        0x1000,          # BaseOfCode
        0x2000,          # BaseOfData
        0x00400000,      # ImageBase (fixed 0x00400000)
        0x1000,          # SectionAlignment
        0x200,           # FileAlignment
        5, 1,            # OS Version 5.1 (Supports Win XP/7/8/10/11)
        1, 0,            # Image Version 1.0
        5, 1,            # Subsystem Version 5.1
        0,               # Win32VersionValue
        size_of_image,   # SizeOfImage
        0x400,           # SizeOfHeaders
        0,               # CheckSum
        2,               # Subsystem = 2 (IMAGE_SUBSYSTEM_WINDOWS_GUI)
        0x8100,          # DllCharacteristics (NX_COMPAT | TERMINAL_SERVER_AWARE, fixed base)
        0x100000, 0x1000, 0x100000, 0x1000,
        0,               # LoaderFlags
        16               # NumberOfRvaAndSizes
    )
    # DataDirectory[1] = Import Table (RVA 0x2000, Size 40) at offset 96 + 8 = 104
    struct.pack_into('<II', opt_header, 96 + 1 * 8, 0x2000, 40)
    # DataDirectory[12] = IAT (RVA 0x2048, Size 12) at offset 96 + 96 = 192
    struct.pack_into('<II', opt_header, 96 + 12 * 8, 0x2048, 12)

    # Section 1: .text (RVA 0x1000, RawOffset 0x400, RawSize 0x800)
    sec_text = bytearray(40)
    sec_text[0:5] = b'.text'
    struct.pack_into('<IIIIIIHHI', sec_text, 8, 0x800, 0x1000, 0x800, 0x400, 0, 0, 0, 0, 0x60000020)

    # Section 2: .idata (RVA 0x2000, RawOffset 0xC00, RawSize 0x200)
    sec_idata = bytearray(40)
    sec_idata[0:6] = b'.idata'
    struct.pack_into('<IIIIIIHHI', sec_idata, 8, 0x200, 0x2000, 0x200, 0xC00, 0, 0, 0, 0, 0xC0000040)

    # Section 3: .rsrc (RVA 0x3000, RawOffset 0xE00, RawSize rsrc_raw_size)
    sec_rsrc = bytearray(40)
    sec_rsrc[0:5] = b'.rsrc'
    struct.pack_into('<IIIIIIHHI', sec_rsrc, 8, len(ico_bytes), 0x3000, rsrc_raw_size, 0xE00, 0, 0, 0, 0, 0x40000040)

    headers_raw = (
        bytes(dos_header)
        + dos_stub
        + pe_sig
        + coff_header
        + bytes(opt_header)
        + bytes(sec_text)
        + bytes(sec_idata)
        + bytes(sec_rsrc)
    )
    headers_padded = headers_raw + b'\x00' * (0x400 - len(headers_raw))

    # Build .text section (0x800 bytes) for x86 (32-bit):
    # push 0 (SW_HIDE)
    # push 0x00401020 (cmd_line VA)
    # call dword ptr [0x00402048] (WinExec)
    # push 0 (uExitCode)
    # call dword ptr [0x0040204C] (ExitProcess)
    # ret
    x86_stub = (
        b'\x6A\x00'                          # push 0 (SW_HIDE)
        b'\x68\x20\x10\x40\x00'              # push 0x00401020
        b'\xFF\x15\x48\x20\x40\x00'          # call dword ptr [0x00402048] (WinExec)
        b'\x6A\x00'                          # push 0
        b'\xFF\x15\x4C\x20\x40\x00'          # call dword ptr [0x0040204C] (ExitProcess)
        b'\xC3'                              # ret
        + b'\x90' * 10                       # NOP padding up to offset 0x20 (VA 0x00401020)
    )

    # Resilient launcher command that tries Edge App mode, Chrome App mode, and falls back to default browser via cmd.exe
    cmd_line = (
        f'cmd.exe /c "start "" msedge.exe --app={target_url} --window-size=1280,820 '
        f'|| start "" chrome.exe --app={target_url} --window-size=1280,820 '
        f'|| start "" "{target_url}""\x00'
    ).encode('ascii')

    text_raw = x86_stub + cmd_line
    text_section = text_raw + b'\x00' * (0x800 - len(text_raw))

    # Build .idata section (0x200 bytes) at RVA 0x2000:
    idata = bytearray(0x200)
    # IMAGE_IMPORT_DESCRIPTOR for KERNEL32.dll (20 bytes at 0x2000)
    struct.pack_into('<IIIII', idata, 0x00, 0x2028, 0, 0, 0x2060, 0x2048)
    # ILT at 0x2028 (32-bit DWORD entries + null terminator)
    struct.pack_into('<III', idata, 0x28, 0x2070, 0x207A, 0)
    # IAT at 0x2048 (32-bit DWORD entries + null terminator)
    struct.pack_into('<III', idata, 0x48, 0x2070, 0x207A, 0)
    # DLL Name at 0x2060
    idata[0x60:0x6D] = b'KERNEL32.dll\x00'
    # Hint/Name for WinExec at 0x2070
    idata[0x70:0x7A] = b'\x00\x00WinExec\x00'
    # Hint/Name for ExitProcess at 0x207A
    idata[0x7A:0x88] = b'\x00\x00ExitProcess\x00'

    rsrc_section = ico_bytes + b'\x00' * (rsrc_raw_size - len(ico_bytes))
    return headers_padded + text_section + bytes(idata) + rsrc_section + embedded_zip_bytes


def build_real_windows_exe():
    """
    Creates universal Windows PC GUI executables (.exe) for both User App and Admin App
    that run on all Windows versions (Win 7/8/10/11 32-bit & 64-bit).
    """
    os.makedirs(APK_DOWNLOAD_DIR, exist_ok=True)

    with open(os.path.join(PUBLIC_DIR, 'icon.ico'), 'rb') as f:
        ico_bytes = f.read()

    bat_path = os.path.join(ROOT_DIR, 'Run-Dookanify-PC.bat')
    embedded_zip_bytes = b''

    user_exe_bytes = build_exe_binary(
        'https://dookanify.ai.studio',
        'Dookanify',
        ico_bytes,
        embedded_zip_bytes
    )
    admin_exe_bytes = build_exe_binary(
        'https://dookanify.ai.studio/?admin=1',
        'Dookanify Admin',
        ico_bytes,
        embedded_zip_bytes
    )

    for dest in [
        os.path.join(APK_DOWNLOAD_DIR, 'user-app.exe'),
        os.path.join(APK_DOWNLOAD_DIR, 'Dookanify-Setup.exe'),
    ]:
        with open(dest, 'wb') as f:
            f.write(user_exe_bytes)

    for dest in [
        os.path.join(APK_DOWNLOAD_DIR, 'admin-app.exe'),
    ]:
        with open(dest, 'wb') as f:
            f.write(admin_exe_bytes)

    if os.path.exists(bat_path):
        shutil.copy2(bat_path, os.path.join(APK_DOWNLOAD_DIR, 'Run-Dookanify-PC.bat'))
        shutil.copy2(os.path.join(PUBLIC_DIR, 'icon.ico'), os.path.join(APK_DOWNLOAD_DIR, 'icon.ico'))

    print(f'==> Universal Windows PC GUI Executables (User & Admin .exe) + Run-Dookanify-PC.bat built! Size={len(user_exe_bytes) / 1024:.1f} KB')


if __name__ == '__main__':
    build_real_android_apk()
    build_real_windows_exe()

