package com.docufolio.app;

import android.os.CancellationSignal;

import androidx.annotation.NonNull;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "GoogleAuth")
public class GoogleAuthPlugin extends Plugin {
    private static final String WEB_CLIENT_ID =
            "393681011941-m5r8dpkm1cu82gs34kdvigbofmtet92e.apps.googleusercontent.com";

    @PluginMethod
    public void signIn(final PluginCall call) {
        final CredentialManager credentialManager = CredentialManager.create(getContext());

        final GetGoogleIdOption googleIdOption = new GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId(WEB_CLIENT_ID)
                .setAutoSelectEnabled(false)
                .build();

        final GetCredentialRequest request = new GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build();

        final Executor mainExecutor = getActivity().getMainExecutor();

        credentialManager.getCredentialAsync(
                getActivity(),
                request,
                new CancellationSignal(),
                mainExecutor,
                new CredentialManagerCallback<GetCredentialResponse, androidx.credentials.exceptions.GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse response) {
                        try {
                            Credential credential = response.getCredential();

                            if (!(credential instanceof CustomCredential)) {
                                call.reject("Google credential was not returned.");
                                return;
                            }

                            CustomCredential customCredential = (CustomCredential) credential;
                            if (!GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
                                    .equals(customCredential.getType())) {
                                call.reject("Unsupported Google credential type: "
                                        + customCredential.getType());
                                return;
                            }

                            GoogleIdTokenCredential googleCredential =
                                    GoogleIdTokenCredential.createFrom(customCredential.getData());

                            JSObject result = new JSObject();
                            result.put("idToken", googleCredential.getIdToken());
                            call.resolve(result);
                        } catch (Exception e) {
                            call.reject("Unable to read Google credential: " + e.getMessage());
                        }
                    }

                    @Override
                    public void onError(
                            @NonNull androidx.credentials.exceptions.GetCredentialException e) {
                        call.reject("Google sign-in failed: " + e.getMessage());
                    }
                }
        );
    }
}
