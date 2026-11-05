package com.docufolio.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Native Android Keystore plugin for Digital-DocuFolio.
 * Protects the wallet Data Encryption Key (DEK) using a hardware-backed
 * Key Encryption Key (KEK) stored in the Android Keystore system.
 */
@CapacitorPlugin(name = "AndroidKeystorePlugin")
public class AndroidKeystorePlugin extends Plugin {
    private static final String TAG = "AndroidKeystorePlugin";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String PREFS_NAME = "docufolio_keystore_prefs";

    @PluginMethod
    public void isAvailable(PluginCall call) {
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            JSObject ret = new JSObject();
            ret.put("available", true);
            ret.put("provider", "AndroidKeyStore");
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("available", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void getOrCreateMasterKey(PluginCall call) {
        String alias = call.getString("alias", "docufolio_wallet_kek_v1");
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);

            boolean created = false;
            if (!keyStore.containsAlias(alias)) {
                KeyGenerator keyGenerator = KeyGenerator.getInstance(
                    KeyProperties.KEY_ALGORITHM_AES,
                    ANDROID_KEYSTORE
                );
                KeyGenParameterSpec keyGenParameterSpec = new KeyGenParameterSpec.Builder(
                    alias,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
                )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build();

                keyGenerator.init(keyGenParameterSpec);
                keyGenerator.generateKey();
                created = true;
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("created", created);
            ret.put("alias", alias);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to get or create master key in Android Keystore", e);
            call.reject("Android Keystore master key error: " + e.getMessage());
        }
    }

    @PluginMethod
    public void encryptDek(PluginCall call) {
        String alias = call.getString("alias", "docufolio_wallet_kek_v1");
        String rawKeyBase64 = call.getString("rawKey");
        if (rawKeyBase64 == null) {
            call.reject("Missing rawKey argument");
            return;
        }

        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            SecretKey secretKey = (SecretKey) keyStore.getKey(alias, null);
            if (secretKey == null) {
                call.reject("Master key alias not found in Keystore: " + alias);
                return;
            }

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
            byte[] iv = cipher.getIV();
            byte[] rawBytes = Base64.decode(rawKeyBase64, Base64.NO_WRAP);
            byte[] ciphertext = cipher.doFinal(rawBytes);

            String ivBase64 = Base64.encodeToString(iv, Base64.NO_WRAP);
            String ciphertextBase64 = Base64.encodeToString(ciphertext, Base64.NO_WRAP);

            // Persist encrypted wrapped DEK in app-private SharedPreferences
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                .putString("encrypted_dek_" + alias, ciphertextBase64)
                .putString("iv_dek_" + alias, ivBase64)
                .apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("iv", ivBase64);
            ret.put("encryptedDek", ciphertextBase64);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to encrypt DEK with Keystore", e);
            call.reject("Failed to encrypt DEK with Android Keystore: " + e.getMessage());
        }
    }

    @PluginMethod
    public void decryptDek(PluginCall call) {
        String alias = call.getString("alias", "docufolio_wallet_kek_v1");
        String ciphertextBase64 = call.getString("encryptedDek");
        String ivBase64 = call.getString("iv");

        if (ciphertextBase64 == null || ivBase64 == null) {
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            ciphertextBase64 = prefs.getString("encrypted_dek_" + alias, null);
            ivBase64 = prefs.getString("iv_dek_" + alias, null);
        }

        if (ciphertextBase64 == null || ivBase64 == null) {
            call.reject("No encrypted DEK found for alias: " + alias);
            return;
        }

        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            SecretKey secretKey = (SecretKey) keyStore.getKey(alias, null);
            if (secretKey == null) {
                call.reject("Master key alias not found in Keystore: " + alias);
                return;
            }

            byte[] iv = Base64.decode(ivBase64, Base64.NO_WRAP);
            byte[] ciphertext = Base64.decode(ciphertextBase64, Base64.NO_WRAP);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            GCMParameterSpec spec = new GCMParameterSpec(128, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);
            byte[] decryptedBytes = cipher.doFinal(ciphertext);

            String decryptedBase64 = Base64.encodeToString(decryptedBytes, Base64.NO_WRAP);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("decryptedDek", decryptedBase64);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to decrypt DEK with Keystore", e);
            call.reject("Failed to decrypt DEK with Android Keystore: " + e.getMessage());
        }
    }

    @PluginMethod
    public void hasEncryptedDek(PluginCall call) {
        String alias = call.getString("alias", "docufolio_wallet_kek_v1");
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean has = prefs.contains("encrypted_dek_" + alias);
        JSObject ret = new JSObject();
        ret.put("exists", has);
        call.resolve(ret);
    }

    @PluginMethod
    public void deleteKey(PluginCall call) {
        String alias = call.getString("alias", "docufolio_wallet_kek_v1");
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            if (keyStore.containsAlias(alias)) {
                keyStore.deleteEntry(alias);
            }
            SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                .remove("encrypted_dek_" + alias)
                .remove("iv_dek_" + alias)
                .apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to delete key from Keystore: " + e.getMessage());
        }
    }
}
